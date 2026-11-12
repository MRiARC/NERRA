import { create } from "zustand";
import { api } from "@/lib/api";
import type { User, UserSession } from "@/lib/types";

interface AuthState {
  user: User | null;
  sessions: UserSession[];
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, displayName: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchSessions: () => Promise<void>;
  revokeSession: (id: string) => Promise<void>;
  revokeAllOtherSessions: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  sessions: [],
  isLoading: true,
  isAuthenticated: false,
  error: null,

  checkAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await api.auth.me();
      set({ user, isAuthenticated: true, isLoading: false });
      // Pre-fetch active sessions in background
      get().fetchSessions();
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.append("username", email);
      params.append("password", password);
      await api.auth.login(params);
      const user = await api.auth.me();
      set({ user, isAuthenticated: true, isLoading: false });
      get().fetchSessions();
      return true;
    } catch (err: any) {
      set({ error: err.message || "Failed to log in", isLoading: false });
      return false;
    }
  },

  register: async (email, password, displayName) => {
    set({ isLoading: true, error: null });
    try {
      await api.auth.register({
        email,
        password,
        display_name: displayName,
      });
      // Automatically log in after registration
      return await get().login(email, password);
    } catch (err: any) {
      set({ error: err.message || "Failed to register account", isLoading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore logout errors and reset local state anyway
    }
    set({ user: null, isAuthenticated: false, sessions: [] });
  },

  fetchSessions: async () => {
    try {
      const sessions = await api.auth.listSessions();
      set({ sessions });
    } catch {
      // Soft failure
    }
  },

  revokeSession: async (id: string) => {
    try {
      await api.auth.revokeSession(id);
      await get().fetchSessions();
    } catch (err: any) {
      set({ error: err.message || "Failed to revoke session" });
    }
  },

  revokeAllOtherSessions: async () => {
    try {
      await api.auth.revokeAllOtherSessions();
      await get().fetchSessions();
    } catch (err: any) {
      set({ error: err.message || "Failed to revoke sessions" });
    }
  },

  clearError: () => set({ error: null }),
}));
