/**
 * Central API Client for NERRA backend services.
 * Features:
 * - Dual-auth: Bearer token + automatic HttpOnly cookie credentials
 * - Host-matched API resolution (localhost:3000 -> localhost:8001)
 * - 401 interception with rotating refresh token recycling
 * - Type-safe endpoint wrappers matching FastAPI router schemas
 */

import type {
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
  PlotThread,
  Project,
  ProjectCustomization,
  StoryGraph,
  Timeline,
  TokenOut,
  User,
  UserSession,
  ValidationCandidate,
  WorldData,
  WorldRule,
} from "./types";

export function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "127.0.0.1";
    return `http://${host}:8001`;
  }
  return "http://127.0.0.1:8001";
}

let inMemoryToken: string | null = null;

export function setAccessToken(token: string | null) {
  inMemoryToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("nerra_access_token", token);
    } else {
      localStorage.removeItem("nerra_access_token");
    }
  }
}

export function getAccessToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window !== "undefined") {
    return localStorage.getItem("nerra_access_token");
  }
  return null;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
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

async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiBase = getApiBase();
  const url = endpoint.startsWith("http") ? endpoint : `${apiBase}${endpoint}`;
  const defaultHeaders: Record<string, string> = {
    Accept: "application/json",
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

  let response = await fetch(url, mergedOptions);

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
  return res.json() as Promise<T>;
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
      const q = maxChapter ? `?max_chapter=${maxChapter}` : "";
      return request<KnowledgeMatrix>(`/projects/${projectId}/knowledge-matrix${q}`);
    },

    async getClaims(projectId: string, chapter?: number): Promise<Claim[]> {
      const q = chapter ? `?chapter=${chapter}` : "";
      return request<Claim[]>(`/projects/${projectId}/claims${q}`);
    },

    async getIssues(projectId: string, severity?: string): Promise<Issue[]> {
      const q = severity ? `?severity=${severity}` : "";
      return request<Issue[]>(`/projects/${projectId}/issues${q}`);
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
};
