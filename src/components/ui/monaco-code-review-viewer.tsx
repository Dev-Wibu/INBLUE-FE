import { registerInblueMonacoThemes } from "@/hooks/useMonacoTheme";
import Editor, { type OnMount, useMonaco } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";

export interface CodeIssue {
  filename: string;
  lineNumber: number;
  severity: string;
  description: string;
}

interface MonacoCodeReviewViewerProps {
  content: string;
  language: string;
  issues: CodeIssue[];
  theme?: string;
}

// Generate an eye icon SVG encoded for CSS background
const eyeIconSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%238b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
const eyeOffIconSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%238b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-off"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`;

export function MonacoCodeReviewViewer({
  content,
  language,
  issues,
  theme,
}: MonacoCodeReviewViewerProps) {
  const monaco = useMonaco();
  const [editorInstance, setEditorInstance] = useState<Parameters<OnMount>[0] | null>(null);
  const [expandedIssues, setExpandedIssues] = useState<Record<number, boolean>>({});

  // Ref to hold the current zones so we can remove them
  const viewZonesRef = useRef<Record<number, string>>({});
  const decorationsRef = useRef<string[]>([]);
  const issuesRef = useRef<CodeIssue[]>(issues);

  useEffect(() => {
    issuesRef.current = issues;
  }, [issues]);

  // Ensure the CSS classes for glyphs exist
  useEffect(() => {
    if (!document.getElementById("monaco-review-styles")) {
      const style = document.createElement("style");
      style.id = "monaco-review-styles";
      style.innerHTML = `
        .bug-glyph-margin-icon {
          background-image: url('${eyeIconSvg}');
          background-repeat: no-repeat;
          background-position: center;
          background-size: 14px 14px;
          cursor: pointer;
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        .bug-glyph-margin-icon:hover {
          opacity: 1;
        }
        .bug-glyph-margin-icon-expanded {
          background-image: url('${eyeOffIconSvg}');
          background-repeat: no-repeat;
          background-position: center;
          background-size: 14px 14px;
          cursor: pointer;
        }
        .monaco-issue-zone-container {
          padding: 12px 16px 12px 24px;
          border-top: 1px solid rgba(239, 68, 68, 0.15);
          border-bottom: 1px solid rgba(239, 68, 68, 0.15);
          background-color: rgba(239, 68, 68, 0.08);
          box-shadow: inset 3px 0 0 #ef4444;
          z-index: 10;
        }
        .monaco-issue-zone-container.warning {
          border-top-color: rgba(245, 158, 11, 0.15);
          border-bottom-color: rgba(245, 158, 11, 0.15);
          background-color: rgba(245, 158, 11, 0.08);
          box-shadow: inset 3px 0 0 #f59e0b;
        }
        .monaco-issue-zone-container.info {
          border-top-color: rgba(59, 130, 246, 0.15);
          border-bottom-color: rgba(59, 130, 246, 0.15);
          background-color: rgba(59, 130, 246, 0.08);
          box-shadow: inset 3px 0 0 #3b82f6;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const updateDecorations = () => {
    if (!editorInstance || !monaco) return;

    const newDecorations = issues.map((issue) => {
      const isExpanded = expandedIssues[issue.lineNumber];
      return {
        range: new monaco.Range(issue.lineNumber, 1, issue.lineNumber, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: isExpanded
            ? "bug-glyph-margin-icon-expanded"
            : "bug-glyph-margin-icon",
          glyphMarginHoverMessage: { value: "**Issue Details**\nClick to toggle description." },
        },
      };
    });

    decorationsRef.current = editorInstance.deltaDecorations(
      decorationsRef.current,
      newDecorations
    );
  };

  const updateViewZones = () => {
    if (!editorInstance || !monaco) return;

    editorInstance.changeViewZones((changeAccessor) => {
      // Remove all existing zones
      Object.values(viewZonesRef.current).forEach((id) => changeAccessor.removeZone(id));
      viewZonesRef.current = {};

      // Add zones for expanded issues
      issues.forEach((issue) => {
        if (expandedIssues[issue.lineNumber]) {
          const domNode = document.createElement("div");
          const severityClass = issue.severity ? issue.severity.toLowerCase() : "warning";
          domNode.className = `monaco-issue-zone-container ${severityClass}`;

          // Create the content based on dark/light mode context (we can inject style directly)
          // For simplicity we use standard colors that work reasonably well on both
          const isDark = theme && theme.includes("dark");
          const textColor = isDark ? "#f8fafc" : "#1e293b";
          const titleColor =
            severityClass === "warning"
              ? "#f59e0b"
              : severityClass === "error"
                ? "#ef4444"
                : "#3b82f6";

          domNode.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div style="font-weight: 600; font-size: 13px; color: ${titleColor}; display: flex; align-items: center; gap: 6px;">
                <span>${issue.severity || "Issue"} at line ${issue.lineNumber}</span>
              </div>
              <p style="font-size: 13px; color: ${textColor}; line-height: 1.5; margin: 0; padding-right: 16px; white-space: pre-wrap; word-break: break-word;">${escapeHtml(issue.description)}</p>
            </div>
          `;

          // Estimate height dynamically based on description length
          const charsPerLine = 90; // Approximate chars per line in editor
          const descLines = Math.ceil(issue.description.length / charsPerLine);
          const headerPx = 36; // padding + header + gap
          const descPx = descLines * 20; // 13px font * 1.5 line height
          const totalPx = headerPx + descPx + 16; // + bottom padding
          const editorLineHeight = 19; // Default editor line height
          const estimatedLines = Math.max(4, Math.ceil(totalPx / editorLineHeight));

          const zoneId = changeAccessor.addZone({
            afterLineNumber: issue.lineNumber,
            heightInLines: estimatedLines,
            domNode: domNode,
            marginDomNode: null,
          });

          viewZonesRef.current[issue.lineNumber] = zoneId;
        }
      });
    });
  };

  // Safe HTML escaping for description
  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  useEffect(() => {
    updateDecorations();
    updateViewZones();
  }, [expandedIssues, issues, editorInstance, monaco]);

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    setEditorInstance(editor);

    // Listen for clicks on the glyph margin
    editor.onMouseDown((e) => {
      if (e.target.type === monacoInstance.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const lineNumber = e.target.position?.lineNumber;
        if (lineNumber) {
          // Check if there is an issue at this line
          const hasIssue = issuesRef.current.some((iss) => iss.lineNumber === lineNumber);
          if (hasIssue) {
            setExpandedIssues((prev) => ({
              ...prev,
              [lineNumber]: !prev[lineNumber],
            }));
          }
        }
      }
    });
  };

  // Format the content correctly if it came from the DB with escaped newlines
  const formattedContent = content ? content.replace(/\\\\n/g, "\\n") : "";

  return (
    <Editor
      height="100%"
      language={language}
      value={formattedContent}
      theme={theme}
      beforeMount={registerInblueMonacoThemes}
      onMount={handleEditorDidMount}
      options={{
        readOnly: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 13,
        lineNumbers: "on",
        folding: true,
        wordWrap: "on",
        padding: { top: 12, bottom: 12 },
        scrollbar: {
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
        },
        renderLineHighlight: "none",
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        overviewRulerBorder: false,
        glyphMargin: true, // Enable glyph margin for the eye icon!
      }}
    />
  );
}
