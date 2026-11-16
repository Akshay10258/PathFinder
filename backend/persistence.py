"""
Chat history and roadmap-cache persistence — Supabase-backed, no-ops when
Supabase isn't configured (mirrors knowledge_tracing/student_store.py's
graceful-degradation design: the system keeps working with zero external
dependencies before a database is connected, it just doesn't remember
anything across sessions until one is).

Roadmap caching exists specifically because a full generation was observed
taking 10-15 minutes (roadmap/ROADMAP.md) — no real product can make a user
wait that long on every page load. See backend/main.py's
/api/roadmap + /api/roadmap/generate split.
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
from db.client import get_client, is_local_dev_identity, supabase_configured  # noqa: E402


import json
CHAT_STORE = os.path.join(HERE, "chat_history.json")
ROADMAP_STORE = os.path.join(HERE, "roadmap_cache.json")


def save_chat_message(user_id: str, role: str, content: str, metadata: dict = None, session_id: str = "default") -> None:
    if not supabase_configured() or is_local_dev_identity(user_id):
        history = []
        if os.path.exists(CHAT_STORE):
            with open(CHAT_STORE, "r") as f:
                try:
                    data = json.load(f)
                    user_sessions = data.get(user_id, {})
                    history = user_sessions.get(session_id, [])
                except:
                    data = {}
                    user_sessions = {}
        else:
            data = {}
            user_sessions = {}
            
        history.append({"role": role, "content": content, "metadata": metadata})
        user_sessions[session_id] = history
        data[user_id] = user_sessions
        with open(CHAT_STORE, "w") as f:
            json.dump(data, f, indent=2)
        return

    get_client().table("chat_messages").insert({
        "user_id": user_id, "session_id": session_id, "role": role, "content": content, "metadata": metadata,
    }).execute()


def get_chat_history(user_id: str, session_id: str = "default", limit: int = 100) -> list:
    if not supabase_configured() or is_local_dev_identity(user_id):
        if os.path.exists(CHAT_STORE):
            with open(CHAT_STORE, "r") as f:
                try:
                    data = json.load(f)
                    return data.get(user_id, {}).get(session_id, [])
                except:
                    return []
        return []

    response = (
        get_client().table("chat_messages")
        .select("role, content, metadata, created_at")
        .eq("user_id", user_id)
        .eq("session_id", session_id)
        .order("created_at")
        .limit(limit)
        .execute()
    )
    return response.data
    
def get_chat_sessions(user_id: str) -> list:
    if not supabase_configured() or is_local_dev_identity(user_id):
        if os.path.exists(CHAT_STORE):
            with open(CHAT_STORE, "r") as f:
                try:
                    data = json.load(f)
                    user_sessions = data.get(user_id, {})
                    sessions = []
                    for sid, messages in user_sessions.items():
                        title = messages[0]["content"][:30] + "..." if messages else "New Chat"
                        sessions.append({"id": sid, "title": title, "msg_count": len(messages)})
                    return sessions
                except:
                    return []
        return []

    # Supabase grouping isn't trivially supported via postgrest without an RPC or complex view,
    # so we'll just fetch distinct session_ids and grab their first message.
    # For now, just return a dummy if we are on supabase to save time, or do a simple fetch.
    res = get_client().table("chat_messages").select("session_id, content").eq("user_id", user_id).order("created_at").execute()
    sessions_dict = {}
    for row in res.data:
        sid = row.get("session_id", "default")
        if sid not in sessions_dict:
            sessions_dict[sid] = {"id": sid, "title": row["content"][:30] + "...", "msg_count": 0}
        sessions_dict[sid]["msg_count"] += 1
    return list(sessions_dict.values())
    
def clear_chat_history(user_id: str, session_id: str = "default"):
    if not supabase_configured() or is_local_dev_identity(user_id):
        if os.path.exists(CHAT_STORE):
            with open(CHAT_STORE, "r") as f:
                try:
                    data = json.load(f)
                except:
                    data = {}
            if user_id in data and session_id in data[user_id]:
                del data[user_id][session_id]
                with open(CHAT_STORE, "w") as f:
                    json.dump(data, f, indent=2)
        return
        
    get_client().table("chat_messages").delete().eq("user_id", user_id).eq("session_id", session_id).execute()


def get_cached_roadmap(user_id: str):
    if not supabase_configured() or is_local_dev_identity(user_id):
        if os.path.exists(ROADMAP_STORE):
            with open(ROADMAP_STORE, "r") as f:
                try:
                    data = json.load(f)
                    return data.get(user_id)
                except:
                    return None
        return None

    response = (
        get_client().table("roadmaps")
        .select("payload, time_budget_hours, generated_at")
        .eq("user_id", user_id)
        .execute()
    )
    return response.data[0] if response.data else None


def save_roadmap_cache(user_id: str, payload: dict, time_budget_hours: float) -> None:
    if not supabase_configured() or is_local_dev_identity(user_id):
        data = {}
        if os.path.exists(ROADMAP_STORE):
            with open(ROADMAP_STORE, "r") as f:
                try:
                    data = json.load(f)
                except:
                    pass
        data[user_id] = {"payload": payload, "time_budget_hours": time_budget_hours}
        with open(ROADMAP_STORE, "w") as f:
            json.dump(data, f, indent=2)
        return

    get_client().table("roadmaps").upsert({
        "user_id": user_id, "payload": payload, "time_budget_hours": time_budget_hours,
    }).execute()


def clear_roadmap_cache(user_id: str) -> None:
    if not supabase_configured() or is_local_dev_identity(user_id):
        if os.path.exists(ROADMAP_STORE):
            try:
                with open(ROADMAP_STORE, "r") as f:
                    data = json.load(f)
                if user_id in data:
                    del data[user_id]
                    with open(ROADMAP_STORE, "w") as f:
                        json.dump(data, f, indent=2)
            except Exception:
                pass
        return

    try:
        get_client().table("roadmaps").delete().eq("user_id", user_id).execute()
    except Exception:
        pass

