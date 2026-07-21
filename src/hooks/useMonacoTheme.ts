import { useThemeStore } from "@/stores/themeStore";
import { type Monaco } from "@monaco-editor/react";

export function registerInblueMonacoThemes(monaco: Monaco) {
  monaco.editor.defineTheme("inblue-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#020617", // slate-950
      "editor.lineHighlightBackground": "#0f172a", // slate-900
      "editorLineNumber.foreground": "#475569", // slate-600
      "editor.selectionBackground": "#1e293b", // slate-800
      "editorIndentGuide.background": "#0f172a",
      "editorIndentGuide.activeBackground": "#1e293b",
    },
  });
  monaco.editor.defineTheme("inblue-light", {
    base: "vs",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#ffffff",
      "editor.lineHighlightBackground": "#f8fafc", // slate-50
      "editorLineNumber.foreground": "#94a3b8", // slate-400
      "editor.selectionBackground": "#e2e8f0", // slate-200
      "editorIndentGuide.background": "#f1f5f9",
      "editorIndentGuide.activeBackground": "#e2e8f0",
    },
  });
}

/**
 * Returns the Monaco Editor theme name based on the current app theme.
 */
export function useMonacoTheme(): string {
  const theme = useThemeStore((state) => state.theme);
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "inblue-dark"
      : "inblue-light";
  }
  return theme === "dark" ? "inblue-dark" : "inblue-light";
}
