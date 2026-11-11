/**
 * Central API Client for NERRA backend services.
 * Features:
 * - Automatic HttpOnly cookie credentials (`credentials: "include"`)
 * - 401 interception with rotating refresh token recycling
 * - Type-safe endpoint wrappers
 */

import type {
  Issue,
  Project,
  TokenOut,
  User,
  UserSession,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001";

class ApiError extends Error {
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
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
  const defaultHeaders: Record<string, string> = {
    Accept: "application/json",
  };

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
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (refreshRes.ok) {
          isRefreshing = false;
          onRefreshed(true);
          // Retry initial request with updated rotated cookies
          return fetch(url, mergedOptions);
        } else {
          isRefreshing = false;
          onRefreshed(false);
        }
      } catch {
        isRefreshing = false;
        onRefreshed(false);
      }
    } else {
      // Another request is refreshing; wait for completion
      const retryPromise = new Promise<Response>((resolve, reject) => {
        refreshSubscribers.push(async (success) => {
          if (success) {
            try {
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
      const res = await fetch(`${API_BASE}/auth/login`, {
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
      return res.json();
    },

    async me(): Promise<User> {
      return request<User>("/auth/me");
    },

    async refresh(): Promise<TokenOut> {
      return request<TokenOut>("/auth/refresh", { method: "POST" });
    },

    async logout(): Promise<{ message: string }> {
      return request<{ message: string }>("/auth/logout", { method: "POST" });
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

    async create(title: string): Promise<Project> {
      return request<Project>("/projects", {
        method: "POST",
        body: JSON.stringify({ title }),
      });
    },

    async get(id: string): Promise<Project> {
      return request<Project>(`/projects/${id}`);
    },

    async update(id: string, payload: { title: string }): Promise<Project> {
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
      const res = await fetchWithAuth(`/projects/${id}/manuscripts`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Import failed" }));
        throw new ApiError(res.status, err.detail || "Failed to upload manuscript");
      }
      return res.json();
    },

    async getIssues(projectId: string): Promise<Issue[]> {
      return request<Issue[]>(`/projects/${projectId}/issues`);
    },
  },
};
