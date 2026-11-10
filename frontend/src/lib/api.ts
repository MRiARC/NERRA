const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

let cachedToken: string | null = null;
let authPromise: Promise<string> | null = null;

async function fetchFreshToken(): Promise<string> {
  try {
    const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        username: "author@nerra.dev",
        password: "nerra_dev_password",
      }),
    });

    if (loginRes.ok) {
      const data = await loginRes.json();
      if (data.access_token) {
        cachedToken = data.access_token;
        if (typeof window !== "undefined") {
          localStorage.setItem("nerra_token", cachedToken!);
        }
        return cachedToken!;
      }
    }

    // Otherwise register default author and login
    const regRes = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "author@nerra.dev",
        password: "nerra_dev_password",
      }),
    });

    if (regRes.ok || regRes.status === 409) {
      const retryLogin = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          username: "author@nerra.dev",
          password: "nerra_dev_password",
        }),
      });
      if (retryLogin.ok) {
        const data = await retryLogin.json();
        if (data.access_token) {
          cachedToken = data.access_token;
          if (typeof window !== "undefined") {
            localStorage.setItem("nerra_token", cachedToken!);
          }
          return cachedToken!;
        }
      }
    }
  } catch (err) {
    console.error("Auth initialization failed:", err);
  }
  return "";
}

export async function getAuthToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    if (cachedToken && cachedToken !== "undefined" && cachedToken !== "null") {
      return cachedToken;
    }
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("nerra_token");
      if (stored && stored !== "undefined" && stored !== "null") {
        cachedToken = stored;
        return stored;
      }
    }
  } else {
    cachedToken = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("nerra_token");
    }
  }

  if (!authPromise) {
    authPromise = fetchFreshToken().finally(() => {
      authPromise = null;
    });
  }
  return authPromise;
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let token = await getAuthToken();

  const makeRequest = async (bearerToken: string) => {
    const headers = new Headers(options.headers || {});
    if (bearerToken) {
      headers.set("Authorization", `Bearer ${bearerToken}`);
    }
    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    return fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  };

  let res = await makeRequest(token);

  // If 401 (expired or invalid cached token), refresh token once and retry
  if (res.status === 401) {
    token = await getAuthToken(true);
    if (token) {
      res = await makeRequest(token);
    }
  }

  if (!res.ok) {
    const errorText = await res.text();
    let detail = errorText;
    try {
      const parsed = JSON.parse(errorText);
      detail = parsed.detail || errorText;
    } catch {}
    throw new Error(detail || `API error: ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  created_at: string;
}

export interface Issue {
  id: string;
  type:
    | "contradiction"
    | "knowledge_violation"
    | "unresolved_thread"
    | "continuity_note"
    | "spatiotemporal_conflict"
    | "custody_paradox"
    | "world_rule_violation";
  severity: "red" | "yellow" | "green" | "blue";
  description: string;
  evidence: Array<{ chapter: number; quote?: string; fact?: string }>;
  confidence?: number;
  ai_reasoning?: string | null;
  intent_classification?: string;
  claim_a_id?: string;
  claim_b_id?: string;
  status: "open" | "accepted" | "rejected" | "intentional";
}

export interface WorldRule {
  id: string;
  category: "magic" | "physics" | "society" | "setting";
  rule_text: string;
  source_chapter?: number | null;
  is_author_defined: boolean;
  status: string;
}

export interface Character {
  id: string;
  name: string;
  aliases: string[];
  description?: string;
  status: string;
  physical_traits?: Record<string, string>;
  first_chapter?: number;
  last_chapter?: number;
}

export interface Location {
  id: string;
  name: string;
  description?: string;
  first_chapter?: number;
}

export interface StoryObject {
  id: string;
  name: string;
  description?: string;
  first_chapter?: number;
  mention_chapters: number[];
}

export interface WorldOut {
  locations: Location[];
  objects: StoryObject[];
}

export interface Claim {
  id: string;
  subject: string;
  attribute: string;
  value: string;
  chapter: number;
  evidence_quote?: string;
  confidence?: number;
  validation_state?: string;
}

export interface ManuscriptStatus {
  manuscript_id: string;
  status: "pending" | "processing" | "ready" | "failed";
  chapters_done: number;
  chapters_total: number;
  error_note?: string;
}

export interface ChatResponse {
  answer: string;
  citations: Array<{ chapter: number; excerpt: string }>;
}

export interface GraphNode {
  id: string;
  label: string;
  kind: "character" | "location" | "object" | "event";
  chapter?: number | null;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  sentiment: string;
  since_chapter?: number | null;
  until_chapter?: number | null;
  description?: string | null;
}

export interface StoryGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  neo4j_connected: boolean;
  max_chapter: number;
}

export interface TimelineEvent {
  id: string;
  chapter_number: number;
  scene_order: number;
  story_time_order: number;
  temporal_anchor?: string | null;
  is_flashback: boolean;
  is_flashforward: boolean;
  summary: string;
  participants: string[];
  location?: string | null;
}

export interface TimelineData {
  order: "chronological" | "narrative";
  events: TimelineEvent[];
  characters: string[];
  flashback_count: number;
  flashforward_count: number;
  spatiotemporal_conflict_chapters: number[];
}

export interface ObjectCustodyEvent {
  id: string;
  object_id: string;
  chapter: number;
  holder_type: string;
  holder_name: string;
  action: string;
  evidence_quote?: string | null;
}

export interface KnowledgeMatrixCell {
  character: string;
  fact: string;
  knows: boolean;
  since_chapter?: number | null;
  how_learned?: string | null;
  source_character?: string | null;
  propagated: boolean;
}

export interface KnowledgeMatrix {
  characters: string[];
  facts: string[];
  cells: KnowledgeMatrixCell[];
  max_chapter: number;
}

export const api = {
  getProjects: () => apiFetch<Project[]>("/projects"),
  createProject: (title: string, description?: string) =>
    apiFetch<Project>("/projects", {
      method: "POST",
      body: JSON.stringify({ title, genre: description }),
    }),
  importManuscript: (projectId: string, title: string, text: string) => {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("text", text);
    return apiFetch<{ manuscript_id: string; project_id: string; status: string }>(
      `/projects/${projectId}/manuscripts/import`,
      { method: "POST", body: formData }
    );
  },
  getManuscriptStatus: (manuscriptId: string, projectId: string) =>
    apiFetch<ManuscriptStatus>(`/manuscripts/${manuscriptId}/status?project_id=${projectId}`),
  reanalyzeManuscript: (manuscriptId: string, projectId: string, chapterNumber?: number) =>
    apiFetch<ManuscriptStatus>(
      `/manuscripts/${manuscriptId}/reanalyze?project_id=${projectId}${
        chapterNumber ? `&chapter_number=${chapterNumber}` : ""
      }`,
      { method: "POST" }
    ),
  getCharacters: (projectId: string) => apiFetch<Character[]>(`/projects/${projectId}/characters`),
  getWorld: (projectId: string) => apiFetch<WorldOut>(`/projects/${projectId}/world`),
  getLocations: async (projectId: string) => {
    const world = await apiFetch<WorldOut>(`/projects/${projectId}/world`);
    return world.locations;
  },
  getClaims: (projectId: string) => apiFetch<Claim[]>(`/projects/${projectId}/claims`),
  getIssues: (projectId: string) => apiFetch<Issue[]>(`/projects/${projectId}/issues`),
  updateIssue: (
    projectId: string,
    issueId: string,
    status: "open" | "accepted" | "rejected" | "intentional"
  ) =>
    apiFetch<Issue>(`/projects/${projectId}/issues/${issueId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  mergeCharacters: (projectId: string, targetId: string, sourceId: string) =>
    apiFetch<Character>(`/projects/${projectId}/characters/merge`, {
      method: "POST",
      body: JSON.stringify({
        target_character_id: targetId,
        duplicate_character_id: sourceId,
      }),
    }),
  sendChat: (projectId: string, question: string) =>
    apiFetch<ChatResponse>(`/projects/${projectId}/chat`, {
      method: "POST",
      body: JSON.stringify({ question }),
    }),
  getGraph: (projectId: string, chapter?: number | null, refresh = false) => {
    const params = new URLSearchParams();
    if (chapter !== undefined && chapter !== null) params.set("chapter", String(chapter));
    if (refresh) params.set("refresh", "true");
    const qs = params.toString();
    return apiFetch<StoryGraph>(`/projects/${projectId}/graph${qs ? `?${qs}` : ""}`);
  },
  getTimeline: (
    projectId: string,
    order: "chronological" | "narrative" = "chronological",
    character?: string
  ) => {
    const params = new URLSearchParams({ order });
    if (character) params.set("character", character);
    return apiFetch<TimelineData>(`/projects/${projectId}/timeline?${params.toString()}`);
  },
  getKnowledgeMatrix: (projectId: string, chapter?: number | null) => {
    const qs = chapter !== undefined && chapter !== null ? `?chapter=${chapter}` : "";
    return apiFetch<KnowledgeMatrix>(`/projects/${projectId}/knowledge-matrix${qs}`);
  },
  getObjectCustody: (projectId: string, objectId: string) =>
    apiFetch<ObjectCustodyEvent[]>(`/projects/${projectId}/objects/${objectId}/custody`),
  reasonAboutIssue: (projectId: string, issueId: string) =>
    apiFetch<Issue>(`/projects/${projectId}/issues/${issueId}/reason`, { method: "POST" }),
  getWorldRules: (projectId: string) => apiFetch<WorldRule[]>(`/projects/${projectId}/world-rules`),
  createWorldRule: (
    projectId: string,
    category: WorldRule["category"],
    ruleText: string
  ) =>
    apiFetch<WorldRule>(`/projects/${projectId}/world-rules`, {
      method: "POST",
      body: JSON.stringify({ category, rule_text: ruleText }),
    }),
  deleteWorldRule: (projectId: string, ruleId: string) =>
    apiFetch<void>(`/projects/${projectId}/world-rules/${ruleId}`, { method: "DELETE" }),
};
