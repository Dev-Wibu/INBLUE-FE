/**
 * Theme Store using Zustand with persistence
 * Manages dark/light mode globally across the application
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

/**
 * Get the effective theme based on system preference
 */
export function getEffectiveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme): void {
  const effectiveTheme = getEffectiveTheme(theme);
  const root = document.documentElement;

  if (effectiveTheme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
    }),
    {
      name: "theme-storage",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // Apply theme when store rehydrates
        if (state) {
          applyTheme(state.theme);
        }
      },
    }
  )
);

// Initialize theme on app load (only in browser environment)
// Check for window to prevent errors during server-side rendering
if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
  // Listen for system theme changes
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", () => {
    const { theme } = useThemeStore.getState();
    if (theme === "system") {
      applyTheme(theme);
    }
  });
}
