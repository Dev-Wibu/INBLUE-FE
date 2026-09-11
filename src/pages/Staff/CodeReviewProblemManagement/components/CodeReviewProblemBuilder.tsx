import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { registerInblueMonacoThemes, useMonacoTheme } from "@/hooks/useMonacoTheme";
import i18n from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  codeReviewProblemManager,
  type CodeFile,
  type CodeReviewProblem,
  type ExpectedIssue,
} from "@/services/code-review-problem.manager";
import Editor, { useMonaco } from "@monaco-editor/react";
import {
  ChevronDown,
  FileCode2,
  Loader2,
  Pencil,
  Plus,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
const t = (k: string, opts?: string | Record<string, unknown>): string =>
  i18n.t(k, opts as string) as unknown as string;

const plusIconSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`;
const eyeIconSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%238b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
const eyeOffIconSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%238b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-off"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`;

function StyledSelect({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (_v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full appearance-none rounded-md border border-slate-200 bg-white py-1 pr-8 pl-3 text-xs shadow-sm transition-colors hover:bg-slate-50 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/80">
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-2.5 right-3 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
    </div>
  );
}

export function CodeReviewProblemBuilder({
  onSuccess,
  onCancel,
  initialData,
}: {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: CodeReviewProblem | null;
}) {
  const monacoTheme = useMonacoTheme();
  const [creationMode, setCreationMode] = React.useState<"ai" | "manual">("manual");
  const monaco = useMonaco();

  // Monaco builder states
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editorInstance, setEditorInstance] = React.useState<any | null>(null);
  const [expandedIssues, setExpandedIssues] = React.useState<Record<number, boolean>>({});
  const hoveredLineRef = React.useRef<number | null>(null);
  const viewZonesRef = React.useRef<Record<number, string>>({});
  const decorationsRef = React.useRef<string[]>([]);
  const activeFileIdxRef = React.useRef<number>(0);

  // Issue dialog state
  const [issueModalOpen, setIssueModalOpen] = React.useState(false);
  const [issueModalData, setIssueModalData] = React.useState<Partial<ExpectedIssue>>({});
  const [editingIssueIndex, setEditingIssueIndex] = React.useState<number | null>(null);

  const [createActiveFileIdx, setCreateActiveFileIdx] = React.useState<number>(0);

  const [newProblem, setNewProblem] = React.useState<{
    title: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    language: string;
    problemStatement: string;
    files: CodeFile[];
    expectedIssues: ExpectedIssue[];
  }>({
    title: initialData?.title || "",
    difficulty: initialData?.difficulty || "EASY",
    language: initialData?.language || "Java",
    problemStatement: initialData?.problemStatement || "",
    files: initialData?.files?.length
      ? initialData.files
      : [{ filename: "Solution.java", content: "", language: "java" }],
    expectedIssues: initialData?.expectedIssues || [],
  });

  const issuesRef = React.useRef<ExpectedIssue[]>(newProblem.expectedIssues);
  React.useEffect(() => {
    issuesRef.current = newProblem.expectedIssues;
  }, [newProblem.expectedIssues]);

  React.useEffect(() => {
    activeFileIdxRef.current = createActiveFileIdx;
  }, [createActiveFileIdx]);

  // AI states
  const [aiTopic, setAiTopic] = React.useState("");
  const [aiLevel, setAiLevel] = React.useState("Junior");
  const [aiDifficulty, setAiDifficulty] = React.useState<"EASY" | "MEDIUM" | "HARD">("EASY");
  const [aiLanguage, setAiLanguage] = React.useState("Java");
  const [aiRequirement, setAiRequirement] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!document.getElementById("monaco-builder-styles")) {
      const style = document.createElement("style");
      style.id = "monaco-builder-styles";
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
        .bug-add-glyph-icon {
          background-image: url('${plusIconSvg}');
          background-color: #6366f1;
          background-repeat: no-repeat;
          background-position: center;
          background-size: 10px 10px;
          border-radius: 4px;
          cursor: pointer;
          opacity: 0.8;
          transition: opacity 0.2s;
          margin-top: 2px;
          height: 14px !important;
          width: 14px !important;
          margin-left: 2px;
        }
        .bug-add-glyph-icon:hover {
          background-color: #4f46e5;
          opacity: 1;
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

  const updateDecorations = React.useCallback(() => {
    if (!editorInstance || !monaco) return;

    const activeFile = newProblem.files[createActiveFileIdx]?.filename || "";
    const fileIssues = issuesRef.current.filter(
      (i) => i.filename === activeFile && i.lineNumber !== undefined
    ) as (ExpectedIssue & { lineNumber: number })[];

    const newDecorations = fileIssues.map((issue) => {
      const isExpanded = expandedIssues[issue.lineNumber];
      return {
        range: new monaco.Range(issue.lineNumber, 1, issue.lineNumber, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: isExpanded
            ? "bug-glyph-margin-icon-expanded"
            : "bug-glyph-margin-icon",
          glyphMarginHoverMessage: { value: "Click to view/edit issue" },
        },
      };
    });

    if (hoveredLineRef.current) {
      const hasIssue = fileIssues.some((i) => i.lineNumber === hoveredLineRef.current);
      if (!hasIssue) {
        newDecorations.push({
          range: new monaco.Range(hoveredLineRef.current, 1, hoveredLineRef.current, 1),
          options: {
            isWholeLine: false,
            glyphMarginClassName: "bug-add-glyph-icon",
            glyphMarginHoverMessage: { value: "Click to add an expected issue here" },
          },
        });
      }
    }

    const decs = editorInstance.deltaDecorations(decorationsRef.current, newDecorations);
    decorationsRef.current = decs;
  }, [editorInstance, monaco, createActiveFileIdx, expandedIssues, newProblem.files]);

  const escapeHtml = (unsafe: string) => {
    if (!unsafe) return "";
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const updateViewZones = React.useCallback(() => {
    if (!editorInstance) return;

    const activeFile = newProblem.files[createActiveFileIdx]?.filename || "";
    const fileIssues = issuesRef.current.filter(
      (i) => i.filename === activeFile && i.lineNumber !== undefined && i.description !== undefined
    ) as (ExpectedIssue & { lineNumber: number; description: string })[];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editorInstance.changeViewZones((changeAccessor: any) => {
      Object.values(viewZonesRef.current).forEach((id) => {
        changeAccessor.removeZone(id);
      });
      viewZonesRef.current = {};

      fileIssues.forEach((issue) => {
        if (expandedIssues[issue.lineNumber]) {
          const domNode = document.createElement("div");

          let severityClass = "critical";
          let badgeColor = "#ef4444";
          let textColor = "#fca5a5";

          if (issue.severity === "WARNING") {
            severityClass = "warning";
            badgeColor = "#f59e0b";
            textColor = "#fde68a";
          } else if (issue.severity === "INFO") {
            severityClass = "info";
            badgeColor = "#3b82f6";
            textColor = "#bfdbfe";
          }

          domNode.className = `monaco-issue-zone-container ${severityClass}`;

          const issueIndex = issuesRef.current.findIndex(
            (i) => i.filename === activeFile && i.lineNumber === issue.lineNumber
          );

          domNode.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 8px; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="background-color: ${badgeColor}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">${issue.severity}</span>
                  <span style="font-size: 12px; font-weight: 500; color: #cbd5e1;">Issue on line ${issue.lineNumber}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px; padding-right: 16px;">
                   <button id="edit-btn-${issue.lineNumber}" style="font-size: 11px; color: #818cf8; font-weight: 600; cursor: pointer; background: none; border: none; outline: none;">EDIT</button>
                   <button id="del-btn-${issue.lineNumber}" style="font-size: 11px; color: #f87171; font-weight: 600; cursor: pointer; background: none; border: none; outline: none;">DELETE</button>
                </div>
              </div>
              <p style="font-size: 13px; color: ${textColor}; line-height: 1.5; margin: 0; padding-right: 16px; white-space: pre-wrap; word-break: break-word;">${escapeHtml(issue.description)}</p>
            </div>
          `;

          domNode
            .querySelector(`#edit-btn-${issue.lineNumber}`)
            ?.addEventListener("mousedown", (e) => {
              e.stopPropagation();
              setIssueModalData({ ...issue });
              setEditingIssueIndex(issueIndex);
              setIssueModalOpen(true);
            });

          domNode
            .querySelector(`#del-btn-${issue.lineNumber}`)
            ?.addEventListener("mousedown", (e) => {
              e.stopPropagation();
              setNewProblem((prev) => ({
                ...prev,
                expectedIssues: prev.expectedIssues.filter((_, i) => i !== issueIndex),
              }));
            });

          const charsPerLine = 90;
          const descLines = Math.ceil(issue.description.length / charsPerLine);
          const headerPx = 36;
          const descPx = descLines * 20;
          const totalPx = headerPx + descPx + 16;
          const editorLineHeight = 19;
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
  }, [editorInstance, createActiveFileIdx, expandedIssues, newProblem.files]);

  React.useEffect(() => {
    updateDecorations();
    updateViewZones();
  }, [
    expandedIssues,
    newProblem.expectedIssues,
    editorInstance,
    monaco,
    createActiveFileIdx,
    updateDecorations,
    updateViewZones,
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEditorDidMount = (editor: any, monacoInstance: any) => {
    setEditorInstance(editor);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.onMouseMove((e: any) => {
      if (
        e.target.type === monacoInstance.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
        e.target.type === monacoInstance.editor.MouseTargetType.GUTTER_LINE_NUMBERS
      ) {
        const line = e.target.position?.lineNumber;
        if (line && line !== hoveredLineRef.current) {
          hoveredLineRef.current = line;
          updateDecorations();
        }
      } else {
        if (hoveredLineRef.current !== null) {
          hoveredLineRef.current = null;
          updateDecorations();
        }
      }
    });

    editor.onMouseLeave(() => {
      if (hoveredLineRef.current !== null) {
        hoveredLineRef.current = null;
        updateDecorations();
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.onMouseDown((e: any) => {
      if (e.target.type === monacoInstance.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const lineNumber = e.target.position?.lineNumber;
        if (lineNumber) {
          const activeFile = newProblem.files[activeFileIdxRef.current]?.filename || "";
          const hasIssue = issuesRef.current.some(
            (iss) => iss.filename === activeFile && iss.lineNumber === lineNumber
          );

          if (hasIssue) {
            setExpandedIssues((prev) => ({
              ...prev,
              [lineNumber]: !prev[lineNumber],
            }));
          } else {
            // Open modal to add new issue
            setIssueModalData({
              filename: activeFile,
              lineNumber: lineNumber,
              severity: "CRITICAL",
              description: "",
            });
            setEditingIssueIndex(null);
            setIssueModalOpen(true);
          }
        }
      }
    });
  };

  const handleAddFile = () => {
    const ext = newProblem.language === "Java" ? "java" : newProblem.language.toLowerCase();
    const filename = `File${newProblem.files.length + 1}.${ext}`;
    setNewProblem((prev) => ({
      ...prev,
      files: [...prev.files, { filename, content: "", language: ext }],
    }));
    setCreateActiveFileIdx(newProblem.files.length);
  };

  const handleAiGenerate = async () => {
    if (!aiTopic.trim()) {
      toast.error(t("problem.enterTopicSecurity"));
      return;
    }
    setIsGenerating(true);
    try {
      const response = await codeReviewProblemManager.generate({
        topic: aiTopic,
        targetLevel: aiLevel,
        programmingLanguage: aiLanguage,
        context: {
          jobTitle: aiLevel,
          requirement: aiRequirement || undefined,
        },
      });
      if (response.success && response.data) {
        const data = response.data as Partial<CodeReviewProblem>;
        setNewProblem({
          title: data.title || "",
          difficulty: aiDifficulty,
          language: data.language || aiLanguage,
          problemStatement: data.problemStatement || "",
          files: data.files || [],
          expectedIssues: data.expectedIssues || [],
        });
        setIsGenerating(false);
        setCreationMode("manual");

        setCreateActiveFileIdx(0);
        toast.success(t("problem.codeReviewGenerated"));
      } else {
        toast.error(response.error || t("adminCodeReviewProblem.generateFailed"));
      }
    } catch {
      toast.error(t("adminCodeReviewProblem.generateFailed"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!newProblem.title.trim()) {
      toast.error(t("adminCodeReviewProblem.pleaseEnterTitle"));
      return;
    }
    setSubmitting(true);
    try {
      const payload: Partial<CodeReviewProblem> = {
        title: newProblem.title.trim(),
        difficulty: newProblem.difficulty,
        language: newProblem.language.trim() || undefined,
        problemStatement: newProblem.problemStatement.trim() || undefined,
        files: newProblem.files.length > 0 ? newProblem.files : undefined,
        expectedIssues:
          newProblem.expectedIssues.length > 0 ? newProblem.expectedIssues : undefined,
      };

      let response;
      if (initialData?.id) {
        response = await codeReviewProblemManager.update(initialData.id, payload);
      } else {
        response = await codeReviewProblemManager.create(payload);
      }

      if (response.success) {
        toast.success(
          initialData?.id ? t("adminCodingProblem.updateSuccess") : t("problem.createdSuccessfully")
        );
        onSuccess();
      } else {
        toast.error(response.error || t("adminCodeReviewProblem.cannotSaveProblem"));
      }
    } catch {
      toast.error(t("adminCodeReviewProblem.cannotSaveProblem"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="flex w-[420px] shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex flex-none flex-col border-b border-slate-100 bg-slate-50/50 dark:border-slate-800/60 dark:bg-slate-900/20">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2 font-sans text-sm font-bold text-slate-800 dark:text-slate-200">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 dark:bg-indigo-500/10">
                <Settings className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              </div>
              {t("adminCodeReviewProblem.problemSetup")}
            </div>
          </div>
          <div className="px-5 pb-4">
            <div className="flex rounded-lg bg-slate-200/50 p-1 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => {
                  setCreationMode("ai");
                }}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-xs font-bold transition-all",
                  creationMode === "ai"
                    ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-950 dark:text-indigo-400"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                )}>
                <div className="flex items-center justify-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("adminCodeReviewProblem.generateWithAI")}
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreationMode("manual");
                }}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-xs font-bold transition-all",
                  creationMode === "manual"
                    ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-950 dark:text-indigo-400"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                )}>
                <div className="flex items-center justify-center gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  {t("adminCodeReviewProblem.manual")}
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {creationMode === "manual" ? (
            <div className="space-y-6 font-sans text-xs">
              <div>
                <Label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">
                  {t("adminCodeReviewProblem.problemTitleStar")}
                </Label>
                <Input
                  value={newProblem.title}
                  onChange={(e) => setNewProblem({ ...newProblem, title: e.target.value })}
                  placeholder={t("adminCodeReviewProblem.exampleApiTokenLeak")}
                  className="h-9 border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 transition-colors focus:bg-white dark:border-slate-800 dark:bg-slate-900/50 dark:text-white dark:focus:bg-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">
                    {t("adminCodeReviewProblem.programmingLanguage")}
                  </Label>
                  <StyledSelect
                    value={newProblem.language}
                    onChange={(v) => setNewProblem({ ...newProblem, language: v })}>
                    <option value="Java">Java</option>
                    <option value="Javascript">Javascript</option>
                    <option value="TypeScript">TypeScript</option>
                    <option value="Python">Python</option>
                    <option value="C#">C#</option>
                    <option value="SQL">SQL</option>
                    <option value="Go">Go</option>
                  </StyledSelect>
                </div>
                <div>
                  <Label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">
                    {t("adminCodeReviewProblem.difficulty")}
                  </Label>
                  <StyledSelect
                    value={newProblem.difficulty}
                    onChange={(v) =>
                      setNewProblem({ ...newProblem, difficulty: v as "EASY" | "MEDIUM" | "HARD" })
                    }>
                    <option value="EASY">{t("common.difficultyEasy", t("common.easy"))}</option>
                    <option value="MEDIUM">
                      {t("common.difficultyMedium", t("common.mediumLevel"))}
                    </option>
                    <option value="HARD">{t("common.difficultyHard", t("common.hard"))}</option>
                  </StyledSelect>
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">
                  {t("adminCodeReviewProblem.requirementContext")}
                </Label>
                <Textarea
                  value={newProblem.problemStatement}
                  onChange={(e) =>
                    setNewProblem({ ...newProblem, problemStatement: e.target.value })
                  }
                  rows={12}
                  placeholder={t("adminCodeReviewProblem.contextPlaceholder")}
                  className="min-h-[220px] resize-y border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 transition-colors focus:bg-white dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 dark:focus:bg-slate-900"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-5 font-sans text-xs">
              <div className="mb-2 flex items-start gap-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-500/20 dark:bg-indigo-500/10">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <p className="text-xs text-indigo-800 dark:text-indigo-300">
                  {t("problem.aiGenerateInstruction2")}
                </p>
              </div>
              <div>
                <Label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">
                  {t("common.error")}
                </Label>
                <Input
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAiGenerate()}
                  placeholder={t("adminCodeReviewProblem.exampleBugTypes")}
                  className="h-9 border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 transition-colors focus:bg-white dark:border-slate-800 dark:bg-slate-900/50 dark:text-white dark:focus:bg-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">
                    {t("common.difficulty")}
                  </Label>
                  <StyledSelect
                    value={aiDifficulty}
                    onChange={(v) => setAiDifficulty(v as "EASY" | "MEDIUM" | "HARD")}>
                    <option value="EASY">{t("common.easy")}</option>
                    <option value="MEDIUM">{t("common.mediumLevel")}</option>
                    <option value="HARD">{t("common.hard")}</option>
                  </StyledSelect>
                </div>
                <div>
                  <Label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">
                    {t("common.language")}
                  </Label>
                  <StyledSelect value={aiLanguage} onChange={setAiLanguage}>
                    <option value="Java">Java</option>
                    <option value="Javascript">Javascript</option>
                    <option value="TypeScript">TypeScript</option>
                    <option value="Python">Python</option>
                    <option value="C#">C#</option>
                    <option value="SQL">SQL</option>
                    <option value="Go">Go</option>
                  </StyledSelect>
                </div>
                <div className="col-span-2">
                  <Label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">
                    {t("adminCodeReviewProblem.candidateLevel")}
                  </Label>
                  <StyledSelect value={aiLevel} onChange={setAiLevel}>
                    <option value="Intern">Intern</option>
                    <option value="Junior">Junior</option>
                    <option value="Senior">Senior</option>
                  </StyledSelect>
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">
                  {t("general.additionalRequirements")}
                </Label>
                <Textarea
                  value={aiRequirement}
                  onChange={(e) => setAiRequirement(e.target.value)}
                  rows={4}
                  placeholder={t("adminCodeReviewProblem.describeProjectContext")}
                  className="min-h-[100px] resize-y border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 transition-colors focus:bg-white dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 dark:focus:bg-slate-900"
                />
              </div>
              <Button
                type="button"
                disabled={isGenerating || !aiTopic}
                onClick={handleAiGenerate}
                className="mt-2 flex h-9 w-full items-center justify-center gap-2 bg-indigo-600 font-sans text-xs font-bold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                <Sparkles className="h-3.5 w-3.5" />
                {t("adminCodeReviewProblem.startGeneratingByAi")}
              </Button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-none items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/60 dark:bg-slate-900/20">
          <Button
            variant="outline"
            className="flex-1 bg-white text-xs dark:bg-slate-900 dark:hover:bg-slate-800"
            onClick={onCancel}
            disabled={submitting}>
            {t("general.cancel", t("common.cancel"))}
          </Button>
          <Button
            className="flex-1 bg-indigo-600 text-xs text-white shadow-sm hover:bg-indigo-700"
            onClick={handleSave}
            disabled={submitting || isGenerating}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t("adminCodeReviewProblem.saveProblem")}
          </Button>
        </div>
      </div>

      {/* RIGHT PANE - IDE WORKSPACE */}
      <div className="relative flex min-w-0 flex-1 flex-col bg-slate-950/20 dark:bg-slate-950">
        {isGenerating && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <span className="text-xs font-semibold text-slate-300">
                {t("adminCodeReviewProblem.aiGenerating")}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-1 flex-col overflow-hidden bg-slate-950/60">
            <div className="flex-1 overflow-y-auto">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-1 overflow-x-auto px-1 pt-1">
                    {newProblem.files.map((f, fIdx) => (
                      <div
                        key={fIdx}
                        className={cn(
                          "group flex cursor-pointer items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2 transition-colors",
                          createActiveFileIdx === fIdx
                            ? "border-b-indigo-500 bg-white dark:border-b-indigo-400 dark:bg-slate-950"
                            : "border-b-transparent hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                        )}>
                        {createActiveFileIdx === fIdx ? (
                          <div className="flex items-center gap-1.5">
                            <FileCode2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                            <input
                              type="text"
                              value={f.filename}
                              onChange={(e) => {
                                const files = [...newProblem.files];
                                files[fIdx].filename = e.target.value;
                                setNewProblem({ ...newProblem, files });
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="h-6 w-[140px] bg-transparent text-xs font-semibold text-indigo-600 focus:outline-none dark:text-indigo-400"
                              placeholder="Untitled"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCreateActiveFileIdx(fIdx)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300">
                            <FileCode2 className="h-3.5 w-3.5" />
                            {f.filename || "Untitled"}
                          </button>
                        )}
                        {newProblem.files.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewProblem((prev) => ({
                                ...prev,
                                files: prev.files.filter((_, idx) => idx !== fIdx),
                              }));
                              if (createActiveFileIdx >= fIdx && createActiveFileIdx > 0) {
                                setCreateActiveFileIdx(createActiveFileIdx - 1);
                              }
                            }}
                            className="ml-1 rounded opacity-0 transition-opacity group-hover:opacity-100 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/20 dark:hover:text-rose-400">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddFile}
                      className="mb-1 ml-1 flex h-7 w-7 items-center justify-center self-end rounded-md text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-1 flex-col">
                  {newProblem.files[createActiveFileIdx] && (
                    <div className="relative flex-1 bg-slate-950">
                      <Editor
                        height="100%"
                        language={
                          newProblem.files[createActiveFileIdx].filename?.split(".").pop() ===
                            "tsx" ||
                          newProblem.files[createActiveFileIdx].filename?.split(".").pop() === "ts"
                            ? "typescript"
                            : newProblem.files[createActiveFileIdx].filename?.split(".").pop() ===
                                  "js" ||
                                newProblem.files[createActiveFileIdx].filename?.split(".").pop() ===
                                  "jsx"
                              ? "javascript"
                              : newProblem.files[createActiveFileIdx].filename?.split(".").pop() ===
                                  "py"
                                ? "python"
                                : newProblem.files[createActiveFileIdx].filename
                                      ?.split(".")
                                      .pop() === "java"
                                  ? "java"
                                  : newProblem.files[createActiveFileIdx].filename
                                        ?.split(".")
                                        .pop() === "cs"
                                    ? "csharp"
                                    : newProblem.files[createActiveFileIdx].filename
                                          ?.split(".")
                                          .pop() === "sql"
                                      ? "sql"
                                      : newProblem.files[createActiveFileIdx].filename
                                            ?.split(".")
                                            .pop() === "go"
                                        ? "go"
                                        : newProblem.files[
                                            createActiveFileIdx
                                          ].language?.toLowerCase() || "csharp"
                        }
                        theme={monacoTheme}
                        value={newProblem.files[createActiveFileIdx].content}
                        beforeMount={registerInblueMonacoThemes}
                        onMount={handleEditorDidMount}
                        onChange={(val) => {
                          const files = [...newProblem.files];
                          files[createActiveFileIdx].content = val || "";
                          setNewProblem({ ...newProblem, files });
                        }}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          lineNumbers: "on",
                          scrollBeyondLastLine: false,
                          wordWrap: "on",
                          automaticLayout: true,
                          glyphMargin: true,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={issueModalOpen} onOpenChange={setIssueModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingIssueIndex !== null ? "Edit Issue" : "Add Issue"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Severity</Label>
              <StyledSelect
                value={issueModalData.severity || "CRITICAL"}
                onChange={(val) =>
                  setIssueModalData({
                    ...issueModalData,
                    severity:
                      val as any /* eslint-disable-line @typescript-eslint/no-explicit-any */,
                  })
                }>
                <option value="CRITICAL">CRITICAL</option>
                <option value="WARNING">WARNING</option>
                <option value="INFO">INFO</option>
              </StyledSelect>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <textarea
                rows={4}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                placeholder="Issue description"
                value={issueModalData.description || ""}
                onChange={(e) =>
                  setIssueModalData({ ...issueModalData, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const updated = { ...newProblem };
                if (editingIssueIndex !== null) {
                  updated.expectedIssues[editingIssueIndex] = {
                    ...updated.expectedIssues[editingIssueIndex],
                    ...issueModalData,
                  };
                } else {
                  updated.expectedIssues.push(
                    issueModalData as any /* eslint-disable-line @typescript-eslint/no-explicit-any */
                  );
                }
                setNewProblem(updated);
                setIssueModalOpen(false);
              }}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
