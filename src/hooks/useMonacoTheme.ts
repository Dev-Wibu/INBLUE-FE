import { useThemeStore } from "@/stores/themeStore";

/**
 * Returns the Monaco Editor theme name based on the current app theme.
 * Monaco Editor supports: "vs-dark", "vs-light", "hc-black"
 */
export function useMonacoTheme(): "vs-dark" | "vs-light" {
  const theme = useThemeStore((state) => state.theme);
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "vs-dark" : "vs-light";
  }
  return theme === "dark" ? "vs-dark" : "vs-light";
}
