/**
 * Auth Store using Zustand with persistence
 * Manages authentication state including user info and JWT token
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { User } from "@/interfaces/schema.types";
import { getTokenExpiresAt, isSessionExpired } from "@/lib/auth-session";

/**
 * Parse avatarUrl from a JWT token's payload (base64url-decoded).
 * Returns undefined if the token is invalid or avatarUrl is absent.
 */
function getPayloadFromToken(
  token: string | null | undefined
): Record<string, unknown> | undefined {
  if (!token) return undefined;
  try {
    const raw = token.replace(/^Bearer\s+/i, "").trim();
    const parts = raw.split(".");
    if (parts.length < 2) return undefined;
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binaryString = atob(padded);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return JSON.parse(new TextDecoder("utf-8").decode(bytes)) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export interface AuthState {
  // State
  isLoggedIn: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  expiresAt: number | null;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setExpiresAt: (_expiresAt: number | null) => void;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      isLoggedIn: false,
      isLoading: true, // true until rehydration completes
      user: null,
      token: null,
      expiresAt: null,

      // Actions
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token, expiresAt: getTokenExpiresAt(token) }),
      setExpiresAt: (expiresAt) => set({ expiresAt }),
      setIsLoggedIn: (isLoggedIn) => set({ isLoggedIn }),
      setIsLoading: (isLoading) => set({ isLoading }),
      clearAuth: () => {
        // Remove current user ID from localStorage on logout
        localStorage.removeItem("current-user-id");

        // Disconnect socket using dynamic import to avoid circular dependency
        import("@/services/socket.manager")
          .then(({ socketService }) => {
            socketService.disconnect();
          })
          .catch(console.error);

        set({
          isLoggedIn: false,
          user: null,
          token: null,
          expiresAt: null,
        });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist these fields
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        user: state.user,
        token: state.token,
        expiresAt: state.expiresAt,
      }),
      // Set isLoading to false after rehydration completes
      onRehydrateStorage: () => (state) => {
        if (state) {
          const restoredExpiresAt = state.expiresAt ?? getTokenExpiresAt(state.token);

          if (state.expiresAt !== restoredExpiresAt) {
            state.setExpiresAt(restoredExpiresAt);
          }

          if (state.isLoggedIn && isSessionExpired(restoredExpiresAt)) {
            state.clearAuth();
          } else if (state.isLoggedIn && state.user && state.token) {
            // Patch user info from JWT token since the previous state might have
            // corrupted UTF-8 names or missing avatarUrl due to old parsing logic.
            const payload = getPayloadFromToken(state.token);
            if (payload) {
              const tokenAvatar = payload.avatarUrl ?? payload.avatar;
              const tokenName = payload.name ?? payload.fullName ?? payload.preferred_username;

              let shouldUpdate = false;
              const updatedUser = { ...state.user };

              if (
                typeof tokenAvatar === "string" &&
                tokenAvatar.trim().length > 0 &&
                tokenAvatar.trim() !== state.user.avatarUrl
              ) {
                updatedUser.avatarUrl = tokenAvatar.trim();
                shouldUpdate = true;
              }

              if (
                typeof tokenName === "string" &&
                tokenName.trim().length > 0 &&
                tokenName.trim() !== state.user.name
              ) {
                updatedUser.name = tokenName.trim();
                shouldUpdate = true;
              }

              if (shouldUpdate) {
                state.setUser(updatedUser);
              }
            }
          }

          state.setIsLoading(false);
        }
      },
    }
  )
);

/**
 * Get the dashboard path for a given user role.
 */
export function getDashboardPath(role?: string): string {
  switch (role?.toUpperCase()) {
    case "ADMIN":
      return "/admin";
    case "MENTOR":
      return "/mentor";
    case "STAFF":
      return "/staff";
    default:
      return "/user";
  }
}
