import sys
import os
import threading

# Add project root to path so we can import our modules
HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(HERE, ".."))
RETRIEVAL_DIR = os.path.join(PROJECT_ROOT, "retrieval")
GENERATION_DIR = os.path.join(PROJECT_ROOT, "generation")
sys.path.insert(0, HERE)            # so `from pathfinder import ...` resolves regardless of invocation cwd
sys.path.insert(0, PROJECT_ROOT)
sys.path.insert(0, RETRIEVAL_DIR)   # so `from topic_map import ...` works inside retriever.py
sys.path.insert(0, GENERATION_DIR)  # so `from generator import ...` works inside question_generator.py

from typing import Optional, List
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from retrieval.retriever import Retriever
from generation.generator import AnswerGenerator
from generation.question_generator import QuestionGenerator
from evaluation.answer_evaluator import AnswerEvaluator
from knowledge_tracing.predict import predict_mastery, predict_mastery_detail, update_history
from knowledge_tracing.concept_bridge import CANONICAL_TOPICS
from roadmap.roadmap_engine import get_roadmap, DEFAULT_TIME_BUDGET_HOURS
from pathfinder import PathfinderValidator
from auth import get_current_user_id
import persistence
from db.client import get_client, is_local_dev_identity, supabase_configured

app = FastAPI(title="Mastery-Adaptive RAG API")

import os

cors_origins_env = os.environ.get("CORS_ORIGINS", "http://localhost:3000")
allow_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize our core components globally
print("Initializing Retriever and Generator...")
retriever = Retriever()
generator = AnswerGenerator()
pathfinder = PathfinderValidator(retriever)
question_generator = QuestionGenerator(retriever, generator)
answer_evaluator = AnswerEvaluator(generator, embedder=retriever.embedder)
print("Initialization complete.")

# In-memory roadmap generation status — single-process assumption, same
# scale-honesty as knowledge_tracing/student_store.py's JSON-file era.
# Wouldn't survive multiple uvicorn workers; fine for this project's scale.
_roadmap_jobs: dict = {}  # user_id -> "generating" | "done" | "error"
_comparison_jobs: dict = {}  # job_id -> {user_id, status, result/error}


def _judge_comparison_quality(query: str, answer_a: str, answer_d: str, context: str) -> dict:
    """Score both answers with one shared answer-quality rubric."""
    import json
    import secrets
    answer_pairs = [("Answer 1", answer_a), ("Answer 2", answer_d)]
    if secrets.randbelow(2):
        answer_pairs.reverse()
    first_label, first_answer = answer_pairs[0]
    second_label, second_answer = answer_pairs[1]
    prompt = f"""You are a strict expert evaluator comparing two answers to the same DSA question.
Score each answer independently from 1 to 5. Do not reward length alone.
Evaluate relevance, factual_accuracy, completeness, clarity, and overall quality for BOTH answers.
Also evaluate groundedness separately: only judge whether an answer is supported by
the supplied context when that context is relevant; otherwise return null for groundedness.
Do not infer which system produced either answer, and do not favor a particular style.

Question: {query}
{first_label}:
{first_answer[:5000]}

Retrieved context (available for groundedness analysis only):
{context[:5000]}

{second_label}:
{second_answer[:5000]}

Respond ONLY with valid JSON in exactly this shape:
{{"answer_1": {{"relevance": 1, "factual_accuracy": 1, "completeness": 1, "clarity": 1, "groundedness": null, "overall": 1, "reason": "brief"}}, "answer_2": {{"relevance": 1, "factual_accuracy": 1, "completeness": 1, "clarity": 1, "groundedness": null, "overall": 1, "reason": "brief"}}}}"""
    raw = generator._llm_call(prompt, temperature=0.1)
    try:
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1].rsplit("```", 1)[0]
        scores = json.loads(clean)
        metrics = ("relevance", "factual_accuracy", "completeness", "clarity", "groundedness", "overall")
        for label in ("answer_1", "answer_2"):
            for metric in metrics:
                if metric == "groundedness" and scores[label].get(metric) is None:
                    continue
                scores[label][metric] = max(1, min(5, int(round(float(scores[label][metric])))))
        mapped = {"pathfinder": scores["answer_1"] if first_label == "Answer 1" else scores["answer_2"],
                  "baseline": scores["answer_2"] if first_label == "Answer 1" else scores["answer_1"]}
        # Baseline has no retrieved context, so groundedness is always N/A
        mapped["baseline"]["groundedness"] = None
        return mapped
    except (ValueError, TypeError, KeyError, json.JSONDecodeError, IndexError):
        return {"pathfinder": {}, "baseline": {}, "error": "quality judge returned invalid JSON"}


# ---------------------------------------------------------------
# SCHEMAS
# ---------------------------------------------------------------

class AskRequest(BaseModel):
    query: str
    mastery: Optional[float] = None
    topic: Optional[str] = None  # only needed to derive `mastery` from SAKT when it's omitted
    session_id: Optional[str] = None


class GenerateQuestionsRequest(BaseModel):
    topic: str
    mastery: Optional[float] = None
    n_questions: int = 3


class SubmitAnswerRequest(BaseModel):
    concept: str
    question: str
    student_answer: str
    reference_answer: str
    expected_concepts: List[str] = []
    mastery: Optional[float] = None  # only used for grading-tone calibration, not stored


DEFAULT_MASTERY = 0.5


def _detect_topic_from_query(query: str, generator) -> str:
    from knowledge_tracing.concept_bridge import CANONICAL_TOPICS
    prompt = f"""You are a query classifier for a Data Structures & Algorithms tutor.
Classify the following query into exactly one of these topics:
{CANONICAL_TOPICS}

Respond ONLY with the exact string of the chosen topic, or 'algorithm_foundations' if it's general/unclear. No quotes or extra text.
Query: "{query}"
"""
    result = generator._llm_call(prompt, temperature=0.1)
    if result:
        topic = result.strip()
        if topic in CANONICAL_TOPICS:
            return topic
    return "algorithm_foundations"


def _resolve_mastery(mastery: Optional[float], user_id: str, topic: Optional[str]) -> float:
    """Explicit `mastery` always wins. Falls back to SAKT when a topic is
    given instead, else a neutral default."""
    if mastery is not None:
        return mastery
    if topic:
        return predict_mastery(user_id, topic)
    return DEFAULT_MASTERY


# ---------------------------------------------------------------
# /api/ask — retrieval + generation, guarded by the Pathfinder layer
# ---------------------------------------------------------------

@app.post("/api/ask")
async def ask_question(request: AskRequest, user_id: str = Depends(get_current_user_id)):
    try:
        topic = request.topic or _detect_topic_from_query(request.query, generator)
        mastery = _resolve_mastery(request.mastery, user_id, topic)

        retrieval_result = pathfinder.validated_retrieve(request.query, mastery)
        generation_result = generator.generate(
            query=request.query,
            mastery=mastery,
            retrieval_result=retrieval_result,
            verify=True,
        )

        session_id = request.session_id or "default"
        persistence.save_chat_message(user_id, "user", request.query, session_id=session_id)
        persistence.save_chat_message(
            user_id, "assistant", generation_result["answer"], metadata=generation_result["metadata"], session_id=session_id
        )

        return {
            "answer": generation_result["answer"],
            "metadata": generation_result["metadata"],
            "retrieval_stats": {
                "chunks_found": len(retrieval_result.get("results", [])),
                "complexity": retrieval_result.get("complexity", "SIMPLE"),
                "mastery_used": mastery,
                "pathfinder": retrieval_result.get("pathfinder", {}),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ask/stream")
async def ask_question_stream(request: AskRequest, user_id: str = Depends(get_current_user_id)):
    import queue
    import json
    from fastapi.responses import StreamingResponse

    try:
        event_queue = queue.Queue()

        def on_stage(message: str):
            event_queue.put({"event": "stage", "data": json.dumps({"message": message})})

        def run_pipeline():
            try:
                topic = request.topic
                if not topic:
                    on_stage("Detecting topic to calibrate mastery...")
                    topic = _detect_topic_from_query(request.query, generator)
                    
                mastery = _resolve_mastery(request.mastery, user_id, topic)
                on_stage(f"Calibrated mastery: {mastery:.2f} (Topic: {topic})")
                
                retrieval_result = pathfinder.validated_retrieve(request.query, mastery, on_stage=on_stage)
                generation_result = generator.generate(
                    query=request.query,
                    mastery=mastery,
                    retrieval_result=retrieval_result,
                    verify=True,
                    on_stage=on_stage,
                )

                session_id = request.session_id or "default"
                persistence.save_chat_message(user_id, "user", request.query, session_id=session_id)
                persistence.save_chat_message(
                    user_id, "assistant", generation_result["answer"], metadata=generation_result["metadata"], session_id=session_id
                )

                payload = {
                    "answer": generation_result["answer"],
                    "metadata": generation_result["metadata"],
                    "retrieval_stats": {
                        "chunks_found": len(retrieval_result.get("results", [])),
                        "complexity": retrieval_result.get("complexity", "SIMPLE"),
                        "mastery_used": mastery,
                        "pathfinder": retrieval_result.get("pathfinder", {}),
                    },
                }
                event_queue.put({"event": "done", "data": json.dumps(payload)})
            except Exception as e:
                event_queue.put({"event": "error", "data": json.dumps({"message": str(e)})})
            finally:
                event_queue.put(None)

        threading.Thread(target=run_pipeline, daemon=True).start()

        import asyncio
        async def event_generator():
            loop = asyncio.get_event_loop()
            while True:
                item = await loop.run_in_executor(None, event_queue.get)
                if item is None:
                    break
                # Format as Server-Sent Events (SSE)
                yield f"event: {item['event']}\ndata: {item['data']}\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chat/sessions")
async def get_chat_sessions(user_id: str = Depends(get_current_user_id)):
    return {"sessions": persistence.get_chat_sessions(user_id)}

@app.get("/api/chat/history")
async def get_chat_history(session_id: str = "default", user_id: str = Depends(get_current_user_id)):
    return {"messages": persistence.get_chat_history(user_id, session_id)}

@app.delete("/api/chat/history")
async def clear_chat_history(session_id: str = "default", user_id: str = Depends(get_current_user_id)):
    persistence.clear_chat_history(user_id, session_id)
    return {"status": "cleared"}


@app.post("/api/ask/compare")
async def start_compare(request: AskRequest, user_id: str = Depends(get_current_user_id)):
    """Start the expensive A/D comparison without blocking this request."""
    import uuid
    job_id = str(uuid.uuid4())
    _comparison_jobs[job_id] = {"user_id": user_id, "status": "queued"}

    def run_comparison():
      try:
        mastery = _resolve_mastery(request.mastery, user_id, request.topic)
        _comparison_jobs[job_id]["status"] = "retrieving"
        retrieval_result = pathfinder.validated_retrieve(request.query, mastery)
        _comparison_jobs[job_id]["status"] = "generating_pathfinder"
        result_a = generator.generate(
            query=request.query,
            mastery=mastery,
            retrieval_result=retrieval_result,
            verify=True,
        )
        _comparison_jobs[job_id]["status"] = "generating_baseline"
        naive_prompt = f"You are a helpful assistant. Answer this question:\n\n{request.query}"
        answer_d = generator._llm_call(naive_prompt, temperature=0.3)
        _comparison_jobs[job_id]["status"] = "judging_quality"
        quality = _judge_comparison_quality(
            request.query, result_a["answer"], answer_d or "", retrieval_result.get("context", "")
        )
        verification = result_a["metadata"].get("verification") or {}
        comparison_metrics = {
            "query": request.query,
            "condition_a": {
                "mastery_used": mastery,
                "chunks_found": len(retrieval_result.get("results", [])),
                "source_count": len(result_a["metadata"].get("sources", [])),
                "complexity": retrieval_result.get("complexity", "SIMPLE"),
                "retrieval_confidence": retrieval_result.get("retrieval_confidence", 0.0),
                "pathfinder": retrieval_result.get("pathfinder", {}),
                "tier_distribution": result_a["metadata"].get("tier_distribution", {}),
                "faithfulness": verification.get("faithfulness"),
                "completeness": verification.get("completeness"),
                "answer_characters": len(result_a["answer"]),
            },
            "condition_d": {
                "mastery_used": None,
                "chunks_found": 0,
                "source_count": 0,
                "complexity": "N/A",
                "retrieval_confidence": None,
                "pathfinder": None,
                "tier_distribution": {},
                "faithfulness": None,
                "completeness": None,
                "answer_characters": len(answer_d or ""),
            },
            "quality": quality,
        }
        _comparison_jobs[job_id] = {"user_id": user_id, "status": "done", "result": {
            "query": request.query,
            "metrics": comparison_metrics,
            "condition_a": {
                "answer": result_a["answer"],
                "metadata": result_a["metadata"],
                "retrieval_stats": {
                    "chunks_found": len(retrieval_result.get("results", [])),
                    "complexity": retrieval_result.get("complexity", "SIMPLE"),
                    "mastery_used": mastery,
                    "pathfinder": retrieval_result.get("pathfinder", {}),
                },
            },
            "condition_d": {
                "answer": answer_d or "(Baseline returned no response)",
                "metadata": {"mastery_label": "N/A", "sources": [], "verification": None},
            },
        }}
      except Exception as e:
        _comparison_jobs[job_id] = {"user_id": user_id, "status": "error", "error": str(e)}

    threading.Thread(target=run_comparison, daemon=True).start()
    return {"job_id": job_id, "status": "queued"}


@app.get("/api/ask/compare/{job_id}")
async def get_compare(job_id: str, user_id: str = Depends(get_current_user_id)):
    job = _comparison_jobs.get(job_id)
    if not job or job.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Comparison job not found")
    if job["status"] == "error":
        raise HTTPException(status_code=500, detail=job["error"])
    if job["status"] == "done":
        return {"job_id": job_id, "status": "done", **job["result"]}
    return {"job_id": job_id, "status": job["status"]}


# ---------------------------------------------------------------
# /api/mastery — full per-topic mastery map from SAKT, for the caller only
# (was /api/mastery/{student_id} — any caller could read anyone's mastery
# by guessing an id; now always scoped to the authenticated user)
# ---------------------------------------------------------------

@app.get("/api/mastery")
async def get_mastery(user_id: str = Depends(get_current_user_id)):
    """Returns per-topic mastery with forgetting-curve detail.
    concept_scores: flat {topic: float} for backward compatibility.
    concept_details: rich {topic: {raw, effective, half_life, ...}} for the dashboard."""
    try:
        details = {}
        for topic in CANONICAL_TOPICS:
            d = predict_mastery_detail(user_id, topic)
            details[topic] = {
                "mastery": d["effective_mastery"],
                "raw_mastery": d["raw_mastery"],
                "effective_mastery": d["effective_mastery"],
                "days_since_last_practice": d["days_since_last_practice"],
                "half_life_days": d["half_life_days"],
                "observations": d["observations"],
            }
        return {
            "concept_scores": {t: details[t]["mastery"] for t in CANONICAL_TOPICS},
            "concept_details": details,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------
# /api/generate-questions — mastery-calibrated Practice Loop entry point
# ---------------------------------------------------------------

@app.post("/api/generate-questions")
async def generate_questions(request: GenerateQuestionsRequest, user_id: str = Depends(get_current_user_id)):
    try:
        mastery = _resolve_mastery(request.mastery, user_id, request.topic)
        return question_generator.generate(request.topic, mastery, n_questions=request.n_questions)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------
# /api/submit-answer — grades a student's response and closes the KT loop
# ---------------------------------------------------------------

@app.post("/api/submit-answer")
async def submit_answer(request: SubmitAnswerRequest, user_id: str = Depends(get_current_user_id)):
    try:
        mastery_for_grading = request.mastery if request.mastery is not None else \
            predict_mastery(user_id, request.concept)

        result = answer_evaluator.evaluate(
            question=request.question,
            student_answer=request.student_answer,
            reference_answer=request.reference_answer,
            expected_concepts=request.expected_concepts,
            mastery=mastery_for_grading,
            canonical_topic=request.concept,
        )

        update_history(user_id, request.concept, result["correct"], misconception=result.get("misconception"))
        new_mastery = predict_mastery(user_id, request.concept)

        return {**result, "new_mastery": new_mastery}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------
# /api/roadmap — cache-first (generation takes 10-15 min, see ROADMAP.md);
# /api/roadmap/generate kicks off a fresh run in the background and returns
# immediately, since no HTTP client should sit on a 15-minute request.
# ---------------------------------------------------------------

@app.get("/api/roadmap")
async def get_cached_roadmap(user_id: str = Depends(get_current_user_id)):
    cached = persistence.get_cached_roadmap(user_id)
    if cached:
        return {"cached": True, **cached}
    return {"cached": False, "status": _roadmap_jobs.get(user_id, "idle")}


@app.post("/api/roadmap/generate")
async def generate_roadmap(hours: float = DEFAULT_TIME_BUDGET_HOURS, user_id: str = Depends(get_current_user_id)):
    if _roadmap_jobs.get(user_id) == "generating":
        return {"status": "already_generating"}

    def _job():
        _roadmap_jobs[user_id] = "generating"
        try:
            result = get_roadmap(user_id, retriever, time_budget_hours=hours)
            persistence.save_roadmap_cache(user_id, result, hours)
            _roadmap_jobs[user_id] = "done"
        except Exception as e:
            print(f"[Roadmap] Generation failed for {user_id}: {e}")
            _roadmap_jobs[user_id] = "error"

    threading.Thread(target=_job, daemon=True).start()
    return {"status": "generating"}


@app.post("/api/roadmap/clear")
async def clear_roadmap_cache(user_id: str = Depends(get_current_user_id)):
    persistence.clear_roadmap_cache(user_id)
    if user_id in _roadmap_jobs:
        del _roadmap_jobs[user_id]
    return {"status": "cleared"}



# ---------------------------------------------------------------
# /api/profile — display info for the authenticated user
# ---------------------------------------------------------------

@app.get("/api/profile")
async def get_profile(user_id: str = Depends(get_current_user_id)):
    if not supabase_configured() or is_local_dev_identity(user_id):
        return {"id": user_id, "display_name": user_id, "avatar_emoji": "🧑‍💻", "is_demo": False}
    response = get_client().table("profiles").select("*").eq("id", user_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return response.data[0]


@app.get("/api/stats")
async def get_stats(user_id: str = Depends(get_current_user_id)):
    """Aggregated practice statistics: topic breakdown, daily accuracy trend,
    and misconception frequency — feeds the Profile page's charts."""
    from knowledge_tracing import student_store
    from collections import Counter, defaultdict
    from datetime import datetime, timezone

    history = student_store.get_history(user_id)

    total = len(history)
    correct = sum(1 for h in history if h["correct"])
    practiced_topics = set(h["concept"] for h in history)
    topics_practiced = len(practiced_topics)

    masteries = {}
    for topic in practiced_topics:
        try:
            masteries[topic] = predict_mastery(user_id, topic)
        except ValueError:
            pass

    mastered = sum(1 for m in masteries.values() if m >= 0.7)
    avg_mastery = sum(masteries.values()) / len(masteries) if masteries else 0.3

    # Per-topic breakdown with misconception count
    breakdown = []
    for topic in practiced_topics:
        topic_hist = [h for h in history if h["concept"] == topic]
        breakdown.append({
            "topic": topic,
            "attempts": len(topic_hist),
            "accuracy": sum(1 for h in topic_hist if h["correct"]) / len(topic_hist),
            "mastery": masteries[topic],
            "misconceptions": len([h for h in topic_hist if h.get("misconception")])
        })

    # Daily accuracy trend (last 30 data-points) for the Profile chart
    daily_stats = defaultdict(lambda: {"correct": 0, "total": 0})
    for h in history:
        ts = h.get("ts")
        if ts is None:
            continue
        try:
            if isinstance(ts, str):
                dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            else:
                dt = datetime.fromtimestamp(ts, tz=timezone.utc)
            day_key = dt.strftime("%Y-%m-%d")
            daily_stats[day_key]["total"] += 1
            if h["correct"]:
                daily_stats[day_key]["correct"] += 1
        except (ValueError, TypeError, OSError):
            continue

    recent_trend = sorted([
        {"date": day, "attempts": s["total"],
         "accuracy": round(s["correct"] / s["total"], 3) if s["total"] else 0}
        for day, s in daily_stats.items()
    ], key=lambda x: x["date"])[-30:]

    # Misconception frequency across all practice history
    misconception_counts = Counter()
    for h in history:
        mid = h.get("misconception")
        if mid:
            misconception_counts[mid] += 1
    misconception_frequency = [
        {"id": mid, "count": count}
        for mid, count in misconception_counts.most_common(20)
    ]

    return {
        "total_attempts": total,
        "overall_accuracy": correct / total if total else 0.0,
        "topics_practiced": topics_practiced,
        "topics_mastered": mastered,
        "total_topics": len(CANONICAL_TOPICS),
        "avg_mastery": avg_mastery,
        "current_streak": 0,
        "recent_trend": recent_trend,
        "trend": recent_trend,       # backward-compat alias used by TrendChart
        "topic_breakdown": breakdown,
        "misconception_frequency": misconception_frequency,
    }

@app.get("/api/recommendations")
async def get_recommendations(user_id: str = Depends(get_current_user_id)):
    from knowledge_tracing import student_store
    history = student_store.get_history(user_id)
    
    # Calculate stats
    practiced_topics = set(h["concept"] for h in history)
    masteries = {}
    for topic in practiced_topics:
        try:
            masteries[topic] = predict_mastery(user_id, topic)
        except ValueError:
            pass
    
    # Find decayed topics
    decayed = []
    from knowledge_tracing.predict import predict_mastery_detail
    for topic in practiced_topics:
        try:
            d = predict_mastery_detail(user_id, topic)
            if d["raw_mastery"] - d["effective_mastery"] > 0.1 and d["observations"] > 0:
                decayed.append({
                    "topic": topic,
                    "decay": d["raw_mastery"] - d["effective_mastery"],
                    "days": d["days_since_last_practice"]
                })
        except ValueError:
            pass

            
    decayed.sort(key=lambda x: x["decay"], reverse=True)
    
    # Find weak topics
    weak = [t for t, m in masteries.items() if m < 0.4]
    
    suggestions = []
    if decayed:
        suggestions.append({
            "topic": decayed[0]["topic"],
            "reason": f"Forgetting curve: {int(decayed[0]['days'])}d since last practice, mastery decayed significantly.",
            "priority": "urgent"
        })
    if weak:
        suggestions.append({
            "topic": weak[0],
            "reason": "Weak area: Mastery is currently below 40%.",
            "priority": "high"
        })
        
    if not suggestions and practiced_topics:
        suggestions.append({
            "topic": list(practiced_topics)[0],
            "reason": "Keep up the momentum with a quick review.",
            "priority": "medium"
        })
        
    return {
        "next_action": "practice",
        "next_action_reason": "You have topics experiencing active decay.",
        "suggested_topics": suggestions,
        "strengths": [t for t, m in masteries.items() if m >= 0.75],
        "focus_areas": [t for t, m in masteries.items() if m < 0.4],
        "session_summary": f"You've practiced {len(history)} questions across {len(practiced_topics)} topics."
    }

@app.get("/api/evidence")
async def get_evidence():
    import json
    def _load(name):
        path = os.path.join(PROJECT_ROOT, "evaluation", name)
        if not os.path.exists(path):
            return {"available": False, "data": None, "error": f"{name} not generated yet. Run tests."}
        try:
            with open(path, "r", encoding="utf-8") as f:
                return {"available": True, "data": json.load(f)}
        except Exception as e:
            return {"available": False, "data": None, "error": str(e)}

    return {
        "ablation": _load("ablation_results.json"),
        "calibration": _load("calibration_summary.json"),
        "pathfinder": _load("pathfinder_results.json"),
        "roadmap_ablation": _load("roadmap_results.json"),
        "answer_evaluator": _load("evaluator_results.json"),
        "end_to_end": _load("end_to_end_results.json")
    }

@app.get("/api/problems")
async def get_problems(topic: str, mastery: Optional[float] = None, user_id: str = Depends(get_current_user_id)):
    """Curated, mastery-calibrated LeetCode & GFG coding challenges for deep practice."""
    resolved_mastery = _resolve_mastery(mastery, user_id, topic)
    
    # Topic aliasing mapping
    aliases = {
        "arrays": "arrays",
        "hashing": "hashing",
        "stacks": "stacks",
        "queues": "queues",
        "linked_lists": "linked_lists",
        "searching": "searching",
        "sorting": "sorting",
        "dynamic_programming": "dynamic_programming",
        "graph_algorithms": "graph_algorithms",
        "recursion_backtracking": "recursion_backtracking",
        "trees": "trees",
        "binary_search_trees": "binary_search_trees",
        "heap": "heap",
        "shortest_paths": "shortest_paths",
        "greedy_algorithms": "greedy_algorithms",
        "disjoint_sets": "disjoint_sets",
        "string_matching": "string_matching",
        "strings": "strings",
    }
    canonical = aliases.get(topic.lower(), topic.lower())
    
    difficulty = "easy" if resolved_mastery < 0.35 else ("medium" if resolved_mastery < 0.72 else "hard")
    
    return {
        "topic": topic,
        "canonical_topic": canonical,
        "resolved_mastery": round(resolved_mastery, 2),
        "difficulty_tier": difficulty,
        "direct_tag_url": f"https://leetcode.com/tag/{canonical.replace('_', '-')}/",
        "recommended_count": 5
    }

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Mastery-Adaptive RAG Backend is running"}


if __name__ == "__main__":
    import os
    import uvicorn
    reload_flag = os.getenv("UVICORN_RELOAD", "false").lower() in ("1", "true")
    uvicorn.run("backend.main:app" if os.path.exists("backend") else "main:app", host="0.0.0.0", port=8000, reload=reload_flag)
