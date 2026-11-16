import type {
  AskResponse,
  ChatHistoryResponse,
  GenerateQuestionsResponse,
  MasteryResponse,
  ProfileResponse,
  RoadmapCacheResponse,
  RoadmapGenerateResponse,
  StatsResponse,
  SubmitAnswerResponse,
  EvidenceResponse,
  ComparisonResponse,
  ComparisonJob,
  RecommendationResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

/** Minimal Server-Sent Events parser over a fetch() body stream. Not using
 * the browser's native EventSource here because it can't send custom
 * headers (no Authorization Bearer) or a POST body — both required for
 * /api/ask/stream. Permissive: unrecognized SSE fields (id:, retry:,
 * comments) are silently skipped rather than erroring. */
async function* parseSSEStream(response: Response): AsyncGenerator<{ event: string; data: string }> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary: number;
    while (true) {
      const boundaryRn = buffer.indexOf("\r\n\r\n");
      const boundaryN = buffer.indexOf("\n\n");
      
      let boundaryLen = 2;
      boundary = boundaryN;
      
      if (boundaryRn !== -1 && (boundaryN === -1 || boundaryRn < boundaryN)) {
        boundary = boundaryRn;
        boundaryLen = 4;
      }
      
      if (boundary === -1) break;

      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + boundaryLen);

      let eventType = "message";
      let data = "";
      for (const line of rawEvent.split("\n")) {
        if (line.startsWith("event:")) eventType = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (data) yield { event: eventType, data };
    }
  }
}

/** Bound to the current auth state by useApi() — every call carries either a
 * real Supabase bearer token or the dev-mode header, matching whichever
 * backend/auth.py accepts (see AuthProvider.tsx). */
export function createApiClient(authHeaders: Record<string, string>) {
  async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...authHeaders },
      ...options,
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`${response.status} ${response.statusText}${body ? `: ${body}` : ""}`);
    }
    return response.json();
  }

  return {
    ask(query: string, mastery?: number, topic?: string): Promise<AskResponse> {
      return request("/api/ask", { method: "POST", body: JSON.stringify({ query, mastery, topic }) });
    },

    /** Same pipeline as ask(), but calls onStage(message) live as each real
     * pipeline step runs (see backend/main.py's /api/ask/stream), instead of
     * returning silently after 5-15s. Resolves with the same shape ask()
     * returns once the "done" event arrives. */
    async askStream(query: string, mastery: number | undefined, topic: string | undefined,
                     onStage: (message: string) => void, sessionId: string = "default"): Promise<AskResponse> {
      const response = await fetch(`${API_BASE}/api/ask/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ query, mastery, topic, session_id: sessionId }),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`${response.status} ${response.statusText}${body ? `: ${body}` : ""}`);
      }

      for await (const evt of parseSSEStream(response)) {
        if (evt.event === "stage") {
          onStage((JSON.parse(evt.data) as { message: string }).message);
        } else if (evt.event === "done") {
          return JSON.parse(evt.data) as AskResponse;
        } else if (evt.event === "error") {
          throw new Error((JSON.parse(evt.data) as { message: string }).message);
        }
      }
      throw new Error("Stream ended without a result");
    },

    getChatHistory(sessionId: string = "default"): Promise<ChatHistoryResponse> {
      return request(`/api/chat/history?session_id=${encodeURIComponent(sessionId)}`);
    },

    getChatSessions(): Promise<{ sessions: Array<{ id: string; title: string; msg_count: number }> }> {
      return request("/api/chat/sessions");
    },
    
    clearChatHistory(sessionId: string = "default"): Promise<{status: string}> {
      return request(`/api/chat/history?session_id=${encodeURIComponent(sessionId)}`, { method: "DELETE" });
    },

    getMastery(): Promise<MasteryResponse> {
      return request("/api/mastery");
    },

    generateQuestions(topic: string, mastery: number, nQuestions = 3): Promise<GenerateQuestionsResponse> {
      return request("/api/generate-questions", {
        method: "POST",
        body: JSON.stringify({ topic, mastery, n_questions: nQuestions }),
      });
    },

    submitAnswer(params: {
      concept: string;
      question: string;
      studentAnswer: string;
      referenceAnswer: string;
      expectedConcepts: string[];
      mastery?: number;
    }): Promise<SubmitAnswerResponse> {
      return request("/api/submit-answer", {
        method: "POST",
        body: JSON.stringify({
          concept: params.concept,
          question: params.question,
          student_answer: params.studentAnswer,
          reference_answer: params.referenceAnswer,
          expected_concepts: params.expectedConcepts,
          mastery: params.mastery,
        }),
      });
    },

    getCachedRoadmap(): Promise<RoadmapCacheResponse> {
      return request("/api/roadmap");
    },

    generateRoadmap(hours: number): Promise<RoadmapGenerateResponse> {
      return request(`/api/roadmap/generate?hours=${hours}`, { method: "POST" });
    },

    clearRoadmap(): Promise<{ status: string }> {
      return request("/api/roadmap/clear", { method: "POST" });
    },


    getProfile(): Promise<ProfileResponse> {
      return request("/api/profile");
    },

    getStats(): Promise<StatsResponse> {
      return request("/api/stats");
    },

    startCompare(query: string, mastery?: number, topic?: string): Promise<ComparisonJob> {
      return request("/api/ask/compare", { method: "POST", body: JSON.stringify({ query, mastery, topic }) });
    },

    getCompare(jobId: string): Promise<ComparisonJob & Partial<ComparisonResponse>> {
      return request(`/api/ask/compare/${encodeURIComponent(jobId)}`);
    },

    getRecommendations(): Promise<RecommendationResponse> {
      return request("/api/recommendations");
    },

    getEvidence(): Promise<EvidenceResponse> {
      return request("/api/evidence");
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
