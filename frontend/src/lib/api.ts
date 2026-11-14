/**
 * Central API Client for NERRA backend services.
 * Features:
 * - Dual-auth: Bearer token + automatic HttpOnly cookie credentials
 * - Host-matched API resolution (localhost:3000 -> localhost:8001)
 * - 401 interception with rotating refresh token recycling
 * - Type-safe endpoint wrappers matching FastAPI router schemas
 */

import type {
  AiConnectionTestResult,
  BibleExport,
  ChapterDetail,
  ChapterSummary,
  Character,
  ChatOut,
  Claim,
  Event,
  Issue,
  KnowledgeMatrix,
  Manuscript,
  ManuscriptStatus,
  ManuscriptVersion,
  PlotThread,
  Project,
  ProjectCustomization,
  StoryGraph,
  Timeline,
  TokenOut,
  User,
  UserSession,
  UserSettings,
  UserSettingsIn,
  ValidationCandidate,
  WorldData,
  WorldRule,
  HealthOut,
  AuditOut,
} from "./types";

/**
 * Resolve the API base.
 *
 * By default requests go to the same origin under `/api`, which Next.js rewrites
 * to the FastAPI server (`NERRA_API_URL`). That keeps cookies first-party and
 * avoids CORS entirely. Set `NEXT_PUBLIC_API_URL` to call the API directly.
 */
export function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return "/api";
}

let inMemoryToken: string | null = null;

export function setAccessToken(token: string | null) {
  // Access tokens stay in memory only: the HttpOnly cookie is the durable copy.
  // On reload the 401 interceptor rotates a fresh token from the refresh cookie.
  inMemoryToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryToken;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

let isRefreshing = false;
let refreshSubscribers: Array<(ok: boolean) => void> = [];

function onRefreshed(ok: boolean) {
  refreshSubscribers.forEach((cb) => cb(ok));
  refreshSubscribers = [];
}

function getSovereignAiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("nerra_global_studio_settings");
      if (stored) {
        const parsed = JSON.parse(stored);
        const state = parsed.state || parsed;
        if (state.apiKeyOverride && typeof state.apiKeyOverride === "string" && state.apiKeyOverride.trim()) {
          headers["X-Anthropic-Key"] = state.apiKeyOverride.trim();
        }
        if (state.customBaseUrl && typeof state.customBaseUrl === "string" && state.customBaseUrl.trim()) {
          headers["X-Anthropic-Base-Url"] = state.customBaseUrl.trim();
        }
        if (state.primaryModel && typeof state.primaryModel === "string" && state.primaryModel.trim()) {
          headers["X-Primary-Model"] = state.primaryModel.trim();
        }
      }
    } catch {
      // ignore JSON parse errors in localStorage
    }
  }
  return headers;
}

async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiBase = getApiBase();
  const url = endpoint.startsWith("http") ? endpoint : `${apiBase}${endpoint}`;
  const sovereignHeaders = getSovereignAiHeaders();
  const defaultHeaders: Record<string, string> = {
    Accept: "application/json",
    ...sovereignHeaders,
  };

  const token = getAccessToken();
  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  const mergedOptions: RequestInit = {
    ...options,
    credentials: "include", // transmits cookies automatically
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(url, mergedOptions);

  // If 401 and not already a refresh or login request, attempt token rotation
  if (
    response.status === 401 &&
    !endpoint.includes("/auth/refresh") &&
    !endpoint.includes("/auth/login") &&
    !endpoint.includes("/auth/register")
  ) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${apiBase}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (refreshRes.ok) {
          const refreshedData = (await refreshRes.json()) as TokenOut;
          if (refreshedData.access_token) {
            setAccessToken(refreshedData.access_token);
            if (mergedOptions.headers) {
              (mergedOptions.headers as Record<string, string>)["Authorization"] =
                `Bearer ${refreshedData.access_token}`;
            }
          }
          isRefreshing = false;
          onRefreshed(true);
          return fetch(url, mergedOptions);
        } else {
          setAccessToken(null);
          isRefreshing = false;
          onRefreshed(false);
        }
      } catch {
        setAccessToken(null);
        isRefreshing = false;
        onRefreshed(false);
      }
    } else {
      const retryPromise = new Promise<Response>((resolve, reject) => {
        refreshSubscribers.push(async (success) => {
          if (success) {
            try {
              const newToken = getAccessToken();
              if (newToken && mergedOptions.headers) {
                (mergedOptions.headers as Record<string, string>)["Authorization"] =
                  `Bearer ${newToken}`;
              }
              resolve(await fetch(url, mergedOptions));
            } catch (err) {
              reject(err);
            }
          } else {
            resolve(response);
          }
        });
      });
      return retryPromise;
    }
  }

  return response;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetchWithAuth(endpoint, options);
  if (!res.ok) {
    let errDetail = "An unexpected error occurred";
    try {
      const errJson = await res.json();
      errDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      errDetail = await res.text().catch(() => res.statusText);
    }
    throw new ApiError(res.status, errDetail);
  }
  if (res.status === 204) {
    return {} as T;
  }
  const text = await res.text();
  if (!text || !text.trim()) {
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export const api = {
  auth: {
    async register(payload: { email: string; password: string; display_name: string }): Promise<User> {
      return request<User>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async login(formData: URLSearchParams): Promise<TokenOut> {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: formData.toString(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Login failed" }));
        throw new ApiError(res.status, err.detail || "Invalid credentials");
      }
      const data = (await res.json()) as TokenOut;
      if (data.access_token) {
        setAccessToken(data.access_token);
      }
      return data;
    },

    async me(): Promise<User> {
      return request<User>("/auth/me");
    },

    async refresh(): Promise<TokenOut> {
      const res = await request<TokenOut>("/auth/refresh", { method: "POST" });
      if (res.access_token) {
        setAccessToken(res.access_token);
      }
      return res;
    },

    async logout(): Promise<{ message: string }> {
      try {
        return await request<{ message: string }>("/auth/logout", { method: "POST" });
      } finally {
        setAccessToken(null);
      }
    },

    async listSessions(): Promise<UserSession[]> {
      return request<UserSession[]>("/auth/sessions");
    },

    async revokeSession(sessionId: string): Promise<{ message: string }> {
      return request<{ message: string }>(`/auth/sessions/${sessionId}/revoke`, {
        method: "POST",
      });
    },

    async revokeAllOtherSessions(): Promise<{ message: string }> {
      return request<{ message: string }>("/auth/sessions/revoke-all", {
        method: "POST",
      });
    },
  },

  projects: {
    async list(): Promise<Project[]> {
      return request<Project[]>("/projects");
    },

    async create(title: string, genre?: string): Promise<Project> {
      return request<Project>("/projects", {
        method: "POST",
        body: JSON.stringify({ title, genre: genre || undefined }),
      });
    },

    async get(id: string): Promise<Project> {
      return request<Project>(`/projects/${id}`);
    },

    async update(id: string, payload: { title?: string; genre?: string }): Promise<Project> {
      return request<Project>(`/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },

    async delete(id: string): Promise<{ message: string }> {
      return request<{ message: string }>(`/projects/${id}`, {
        method: "DELETE",
      });
    },

    async importManuscript(id: string, file: File): Promise<{ message: string; manuscript_id: string }> {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetchWithAuth(`/projects/${id}/manuscripts/import`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Import failed" }));
        throw new ApiError(res.status, err.detail || "Failed to upload manuscript");
      }
      return res.json();
    },

    async getManuscripts(projectId: string): Promise<Manuscript[]> {
      return request<Manuscript[]>(`/projects/${projectId}/manuscripts`);
    },

    async getManuscriptStatus(projectId: string, manuscriptId: string): Promise<ManuscriptStatus> {
      return request<ManuscriptStatus>(`/manuscripts/${manuscriptId}/status?project_id=${projectId}`);
    },

    async getChapters(projectId: string, manuscriptId: string): Promise<ChapterSummary[]> {
      return request<ChapterSummary[]>(`/projects/${projectId}/manuscripts/${manuscriptId}/chapters`);
    },

    async getChapter(projectId: string, manuscriptId: string, chapterNumber: number): Promise<ChapterDetail> {
      return request<ChapterDetail>(`/projects/${projectId}/manuscripts/${manuscriptId}/chapters/${chapterNumber}`);
    },

    async updateChapter(
      projectId: string,
      manuscriptId: string,
      chapterNumber: number,
      payload: { content: string; title?: string }
    ): Promise<ChapterDetail> {
      return request<ChapterDetail>(`/projects/${projectId}/manuscripts/${manuscriptId}/chapters/${chapterNumber}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },

    async reanalyzeChapter(projectId: string, manuscriptId: string, chapterNumber?: number): Promise<ManuscriptStatus> {
      const q = chapterNumber !== undefined ? `&chapter_number=${chapterNumber}` : "";
      return request<ManuscriptStatus>(`/manuscripts/${manuscriptId}/reanalyze?project_id=${projectId}${q}`, {
        method: "POST",
      });
    },
  },

  story: {
    async getCharacters(projectId: string): Promise<Character[]> {
      return request<Character[]>(`/projects/${projectId}/characters`);
    },

    async getCharacter(projectId: string, characterId: string): Promise<Character> {
      return request<Character>(`/projects/${projectId}/characters/${characterId}`);
    },

    async getEvents(projectId: string): Promise<Event[]> {
      return request<Event[]>(`/projects/${projectId}/events`);
    },

    async getTimeline(projectId: string, order = "narrative"): Promise<Timeline> {
      return request<Timeline>(`/projects/${projectId}/timeline?order=${order}`);
    },

    async getGraph(projectId: string): Promise<StoryGraph> {
      return request<StoryGraph>(`/projects/${projectId}/graph`);
    },

    async getKnowledgeMatrix(projectId: string, maxChapter?: number): Promise<KnowledgeMatrix> {
      const q = maxChapter ? `?chapter=${maxChapter}` : "";
      return request<KnowledgeMatrix>(`/projects/${projectId}/knowledge-matrix${q}`);
    },

    async getClaims(projectId: string, chapter?: number): Promise<Claim[]> {
      const q = chapter ? `?chapter=${chapter}` : "";
      return request<Claim[]>(`/projects/${projectId}/claims${q}`);
    },

    async getIssues(projectId: string, status?: string): Promise<Issue[]> {
      const q = status ? `?status_filter=${status}` : "";
      return request<Issue[]>(`/projects/${projectId}/issues${q}`);
    },

    async audit(projectId: string): Promise<AuditOut> {
      return request<AuditOut>(`/projects/${projectId}/audit`, { method: "POST" });
    },

    async patchIssue(projectId: string, issueId: string, status: string): Promise<Issue> {
      return request<Issue>(`/projects/${projectId}/issues/${issueId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },

    async reasonIssue(projectId: string, issueId: string): Promise<Issue> {
      return request<Issue>(`/projects/${projectId}/issues/${issueId}/reason`, {
        method: "POST",
      });
    },

    async getWorld(projectId: string): Promise<WorldData> {
      return request<WorldData>(`/projects/${projectId}/world`);
    },

    async getWorldRules(projectId: string): Promise<WorldRule[]> {
      return request<WorldRule[]>(`/projects/${projectId}/world-rules`);
    },

    async createWorldRule(projectId: string, payload: { category: string; rule_text: string }): Promise<WorldRule> {
      return request<WorldRule>(`/projects/${projectId}/world-rules`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async deleteWorldRule(projectId: string, ruleId: string): Promise<void> {
      return request<void>(`/projects/${projectId}/world-rules/${ruleId}`, {
        method: "DELETE",
      });
    },

    async getPlotThreads(projectId: string): Promise<PlotThread[]> {
      return request<PlotThread[]>(`/projects/${projectId}/plot-threads`);
    },

    async createPlotThread(
      projectId: string,
      payload: {
        title: string;
        description: string;
        setup_chapter?: number;
        payoff_chapter?: number | null;
        status?: string;
        related_entities?: string[];
        evidence_quote?: string | null;
      }
    ): Promise<PlotThread> {
      return request<PlotThread>(`/projects/${projectId}/plot-threads`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async patchPlotThread(
      projectId: string,
      threadId: string,
      payload: {
        title?: string;
        description?: string;
        payoff_chapter?: number | null;
        status?: string;
        related_entities?: string[];
      }
    ): Promise<PlotThread> {
      return request<PlotThread>(`/projects/${projectId}/plot-threads/${threadId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },

    async syncPlotThreads(projectId: string): Promise<PlotThread[]> {
      return request<PlotThread[]>(`/projects/${projectId}/plot-threads/sync`, {
        method: "POST",
      });
    },

    async exportBible(projectId: string): Promise<BibleExport> {
      return request<BibleExport>(`/projects/${projectId}/export/bible`);
    },

    async getCandidates(projectId: string): Promise<ValidationCandidate[]> {
      return request<ValidationCandidate[]>(`/projects/${projectId}/candidates`);
    },

    async resolveCandidate(
      projectId: string,
      candidateId: string,
      payload: { action: "approve" | "reject" | "merge" | "split"; target_character_id?: string; split_name?: string }
    ): Promise<ValidationCandidate> {
      return request<ValidationCandidate>(`/projects/${projectId}/candidates/${candidateId}/resolve`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async chat(projectId: string, question: string): Promise<ChatOut> {
      return request<ChatOut>(`/projects/${projectId}/chat`, {
        method: "POST",
        body: JSON.stringify({ question }),
      });
    },

    async getVersions(projectId: string): Promise<ManuscriptVersion[]> {
      return request<ManuscriptVersion[]>(`/projects/${projectId}/versions`);
    },

    async getCustomization(projectId: string): Promise<ProjectCustomization> {
      return request<ProjectCustomization>(`/projects/${projectId}/customization`);
    },

    async updateCustomization(
      projectId: string,
      payload: Partial<ProjectCustomization>
    ): Promise<ProjectCustomization> {
      return request<ProjectCustomization>(`/projects/${projectId}/customization`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
  },

  system: {
    async health(): Promise<HealthOut> {
      return request<HealthOut>("/health");
    },
  },

  settings: {
    async getAiSettings(): Promise<UserSettings> {
      return request<UserSettings>("/settings/ai");
    },
    async updateAiSettings(payload: UserSettingsIn): Promise<UserSettings> {
      return request<UserSettings>("/settings/ai", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    async testAiConnection(payload?: UserSettingsIn): Promise<AiConnectionTestResult> {
      return request<AiConnectionTestResult>("/settings/ai/test", {
        method: "POST",
        body: payload ? JSON.stringify(payload) : undefined,
      });
    },
  },
};
