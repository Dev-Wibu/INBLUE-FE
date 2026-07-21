import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { codingProblemManager, type CodingProblem } from "@/services/coding-problem.manager";
import Editor from "@monaco-editor/react";
import {
  ArrowLeft,
  Code2,
  FileText,
  Loader2,
  PlaySquare,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const COMMON_TYPES = [
  "integer",
  "integer[]",
  "integer[][]",
  "long",
  "long[]",
  "double",
  "double[]",
  "String",
  "String[]",
  "boolean",
  "char",
  "char[]",
  "void",
];

function TypeTag({ value }: { value: string }) {
  const colors: Record<string, string> = {
    integer: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    "integer[]": "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    "integer[][]": "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    String: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    "String[]": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    boolean: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    double: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  };
  const cls = colors[value] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${cls}`}>
      {value || "?"}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface CodingProblemEditorProps {
  initialData: Partial<CodingProblem> | null;
  onBack: () => void;
  onSaved: () => void;
  onGenerateAI?: () => void;
}

type TabKey = "general" | "testcases" | "codestubs";

export function CodingProblemEditor({
  initialData,
  onBack,
  onSaved,
  onGenerateAI,
}: CodingProblemEditorProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [isLoadingData, setIsLoadingData] = useState(!!initialData?.id);
  const [formData, setFormData] = useState<Partial<CodingProblem>>({
    title: "",
    difficulty: "MEDIUM",
    problemStatement: "",
    rulesAndConstraints: [],
    paramTypes: [],
    returnType: "",
    visibleExamples: [],
    hiddenTestCases: [],
    executionTimeLimitMs: 2000,
    memoryLimitMb: 256,
    codeStubs: {},
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeLang, setActiveLang] = useState("JAVA");
  const [expandedTc, setExpandedTc] = useState<number | null>(null);

  const paramCount = formData.paramTypes?.length || 0;

  useEffect(() => {
    if (initialData?.id) fetchDetails(initialData.id);
    else setFormData((p) => ({ ...p, ...initialData }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  const fetchDetails = async (id: number | string) => {
    setIsLoadingData(true);
    try {
      const res = await codingProblemManager.getById(id);
      if (res.success && res.data) setFormData(res.data);
      else {
        toast.error(res.error || "Không thể tải chi tiết.");
        onBack();
      }
    } catch {
      toast.error("Lỗi hệ thống.");
      onBack();
    } finally {
      setIsLoadingData(false);
    }
  };

  const patch = (u: Partial<CodingProblem>) => setFormData((p) => ({ ...p, ...u }));

  const handleSave = async () => {
    if (!formData.title?.trim() || !formData.problemStatement?.trim()) {
      toast.error(t("general.pleaseFillAllRequiredFields"));
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await codingProblemManager.create(formData);
      if (res.success) {
        toast.success(t("general.addSuccess"));
        onSaved();
      } else toast.error(res.error || t("general.addFailed"));
    } catch {
      toast.error(t("compCodingSubmissionModal.errorOccurred"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMonacoLang = (k: string) =>
    ({
      JAVA: "java",
      PYTHON: "python",
      CPP: "cpp",
      JS: "javascript",
      TYPESCRIPT: "typescript",
      GO: "go",
      CSHARP: "csharp",
      SCALA: "scala",
      SWIFT: "swift",
      KOTLIN: "kotlin",
    })[k] ?? "plaintext";

  const addHiddenTc = () => {
    const list = [
      ...(formData.hiddenTestCases || []),
      { inputs: Array(paramCount).fill(""), expectedOutput: "", weightPoints: 10 },
    ];
    patch({ hiddenTestCases: list });
    setExpandedTc(list.length - 1);
  };
  const removeHiddenTc = (i: number) => {
    const list = [...(formData.hiddenTestCases || [])];
    list.splice(i, 1);
    patch({ hiddenTestCases: list });
    if (expandedTc === i) setExpandedTc(null);
    else if (expandedTc !== null && expandedTc > i) setExpandedTc(expandedTc - 1);
  };
  const updateHiddenTc = (i: number, up: Record<string, unknown>) => {
    const list = [...(formData.hiddenTestCases || [])] as NonNullable<
      CodingProblem["hiddenTestCases"]
    >;
    list[i] = { ...list[i], ...up };
    patch({ hiddenTestCases: list });
  };

  if (isLoadingData)
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-500">Đang tải bài tập…</p>
        </div>
      </div>
    );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-950">
      {/* ── TOP BAR ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-none items-center justify-between border-b border-slate-200/60 bg-white/50 px-6 py-4 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-900/50">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {formData.id ? "Chi tiết vòng coding" : "Tạo vòng coding mới"}
            </h2>
          </div>
        </div>
      </div>

      {/* ── TAB BAR ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-none justify-center border-b border-slate-200/80 bg-white/50 px-6 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/50">
        <div className="flex gap-6">
          {[
            { id: "general", label: "Đề bài & Cấu hình", icon: FileText },
            {
              id: "testcases",
              label: "Test Cases Ẩn",
              icon: PlaySquare,
              badge: formData.hiddenTestCases?.length,
            },
            { id: "codestubs", label: "Mã nguồn Mẫu", icon: Code2 },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabKey)}
                className={`relative flex items-center gap-2 py-3.5 text-xs font-bold transition-colors ${
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                }`}>
                <tab.icon className={`h-4 w-4 ${isActive ? "text-indigo-500" : ""}`} />
                {tab.label}
                {"badge" in tab && tab.badge !== undefined && (
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-bold ${
                      isActive
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}>
                    {tab.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute right-0 bottom-0 left-0 h-0.5 rounded-t-full bg-indigo-600 dark:bg-indigo-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {/* ═══ GENERAL TAB — 2-column layout ══════════════════════════════════ */}
        {activeTab === "general" && (
          <div className="flex h-full p-6">
            <div className="mx-auto flex h-full w-full max-w-7xl gap-6">
              {/* LEFT: Markdown editor (primary, takes most space) */}
              <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
                <div className="flex flex-none items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-800/50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                      Nội dung đề bài
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">Hỗ trợ Markdown</span>
                </div>
                <Textarea
                  value={formData.problemStatement || ""}
                  onChange={(e) => patch({ problemStatement: e.target.value })}
                  placeholder="Mô tả bài toán chi tiết tại đây (hỗ trợ Markdown)..."
                  className="flex-1 resize-none rounded-none border-0 bg-transparent p-6 font-mono text-[13px] leading-relaxed focus-visible:ring-0 dark:text-slate-200"
                />
              </div>

              {/* RIGHT: Configuration */}
              <div className="flex w-[480px] shrink-0 flex-col overflow-y-auto rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
                <div className="flex flex-none items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-800/50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                      <Code2 className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                      Cấu Hình Bài Tập
                    </span>
                  </div>
                  {formData.id && (
                    <div className="flex items-center gap-1 rounded-md border border-indigo-100/50 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold tracking-wide text-indigo-700 shadow-sm dark:border-indigo-800/30 dark:bg-indigo-900/30 dark:text-indigo-400">
                      ID: #{formData.id}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                  {/* Core Settings: Title, Difficulty, Limits */}
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Tiêu đề
                      </Label>
                      <Input
                        value={formData.title || ""}
                        onChange={(e) => patch({ title: e.target.value })}
                        className="h-10 border-slate-200 bg-slate-50/50 font-semibold shadow-none focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950/50"
                        placeholder="VD: Two Sum"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                          Độ khó
                        </Label>
                        <Select
                          value={formData.difficulty || "MEDIUM"}
                          onValueChange={(v: "EASY" | "MEDIUM" | "HARD") =>
                            patch({ difficulty: v })
                          }>
                          <SelectTrigger
                            className={`h-9 border text-xs font-bold shadow-none ${
                              formData.difficulty === "EASY"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/20 dark:text-emerald-400"
                                : formData.difficulty === "HARD"
                                  ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-900/20 dark:text-rose-400"
                                  : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-400"
                            }`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EASY" className="text-xs font-bold text-emerald-600">
                              EASY
                            </SelectItem>
                            <SelectItem value="MEDIUM" className="text-xs font-bold text-amber-600">
                              MEDIUM
                            </SelectItem>
                            <SelectItem value="HARD" className="text-xs font-bold text-rose-600">
                              HARD
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                          Thời gian
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={formData.executionTimeLimitMs || 2000}
                            onChange={(e) =>
                              patch({ executionTimeLimitMs: parseInt(e.target.value) || 2000 })
                            }
                            className="h-9 border-slate-200 bg-slate-50/50 pr-8 font-mono text-xs shadow-none dark:border-slate-700 dark:bg-slate-950/50"
                          />
                          <span className="absolute top-1/2 right-2.5 -translate-y-1/2 text-xs font-medium text-slate-400">
                            ms
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                          Bộ nhớ
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={formData.memoryLimitMb || 256}
                            onChange={(e) =>
                              patch({ memoryLimitMb: parseInt(e.target.value) || 256 })
                            }
                            className="h-9 border-slate-200 bg-slate-50/50 pr-8 font-mono text-xs shadow-none dark:border-slate-700 dark:bg-slate-950/50"
                          />
                          <span className="absolute top-1/2 right-2.5 -translate-y-1/2 text-xs font-medium text-slate-400">
                            MB
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Constraints moved from bottom */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Điều kiện & Giới hạn
                        </Label>
                        <button
                          onClick={() =>
                            patch({
                              rulesAndConstraints: [...(formData.rulesAndConstraints || []), ""],
                            })
                          }
                          className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-600 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50">
                          <Plus className="h-3 w-3" /> Thêm
                        </button>
                      </div>
                      <div className="space-y-2">
                        {formData.rulesAndConstraints?.map((rule, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-800/80 dark:bg-slate-950/50">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-200/50 font-mono text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              {idx + 1}
                            </span>
                            <Input
                              value={rule}
                              onChange={(e) => {
                                const l = [...(formData.rulesAndConstraints || [])];
                                l[idx] = e.target.value;
                                patch({ rulesAndConstraints: l });
                              }}
                              className="h-8 flex-1 border-slate-200 bg-white font-mono text-xs shadow-none dark:border-slate-700 dark:bg-slate-900"
                              placeholder="2 ≤ n ≤ 10⁴"
                            />
                            <button
                              onClick={() => {
                                const l = [...(formData.rulesAndConstraints || [])];
                                l.splice(idx, 1);
                                patch({ rulesAndConstraints: l });
                              }}
                              className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/30">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        {(!formData.rulesAndConstraints ||
                          formData.rulesAndConstraints.length === 0) && (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-6 text-center dark:border-slate-800 dark:bg-slate-900/30">
                            <p className="text-xs text-slate-400">Chưa có điều kiện nào.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="my-6 h-px w-full bg-slate-100 dark:bg-slate-800" />

                  {/* Data Signatures */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Kiểu dữ liệu trả về
                      </Label>
                      <Select
                        value={
                          COMMON_TYPES.includes(formData.returnType || "")
                            ? formData.returnType || ""
                            : "__custom__"
                        }
                        onValueChange={(v) => {
                          if (v !== "__custom__") patch({ returnType: v });
                        }}>
                        <SelectTrigger className="h-10 w-full border-slate-200 bg-slate-50/50 font-mono text-xs shadow-none dark:border-slate-700 dark:bg-slate-950/50">
                          <SelectValue placeholder="Chọn kiểu trả về…" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMMON_TYPES.map((t) => (
                            <SelectItem key={t} value={t} className="font-mono text-xs">
                              {t}
                            </SelectItem>
                          ))}
                          <SelectItem value="__custom__" className="text-xs text-slate-400">
                            Tùy chỉnh…
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {!COMMON_TYPES.includes(formData.returnType || "") && (
                        <Input
                          value={formData.returnType || ""}
                          onChange={(e) => patch({ returnType: e.target.value })}
                          className="mt-2 h-10 border-slate-200 bg-slate-50/50 font-mono text-xs shadow-none focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950/50"
                          placeholder="VD: TreeNode"
                        />
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Danh sách tham số (Params)
                        </Label>
                        <button
                          onClick={() =>
                            patch({ paramTypes: [...(formData.paramTypes || []), "integer"] })
                          }
                          className="flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50">
                          <Plus className="h-3 w-3" /> Thêm
                        </button>
                      </div>
                      <div className="space-y-2">
                        {formData.paramTypes?.map((p, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2 dark:border-slate-800/80 dark:bg-slate-950/50">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-200/50 font-mono text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              P{i + 1}
                            </span>
                            <Select
                              value={COMMON_TYPES.includes(p) ? p : "__custom__"}
                              onValueChange={(v) => {
                                const l = [...(formData.paramTypes || [])];
                                if (v !== "__custom__") l[i] = v;
                                patch({ paramTypes: l });
                              }}>
                              <SelectTrigger className="h-8 flex-1 border-slate-200 bg-white font-mono text-xs shadow-none dark:border-slate-700 dark:bg-slate-900">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {COMMON_TYPES.map((t) => (
                                  <SelectItem key={t} value={t} className="font-mono text-xs">
                                    {t}
                                  </SelectItem>
                                ))}
                                <SelectItem value="__custom__" className="text-xs text-slate-400">
                                  Tùy chỉnh…
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {!COMMON_TYPES.includes(p) && (
                              <Input
                                value={p}
                                onChange={(e) => {
                                  const l = [...(formData.paramTypes || [])];
                                  l[i] = e.target.value;
                                  patch({ paramTypes: l });
                                }}
                                className="h-8 w-28 border-slate-200 bg-white font-mono text-xs shadow-none dark:border-slate-700 dark:bg-slate-900"
                              />
                            )}
                            <button
                              onClick={() => {
                                const l = [...(formData.paramTypes || [])];
                                l.splice(i, 1);
                                patch({ paramTypes: l });
                              }}
                              className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/30">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        {(!formData.paramTypes || formData.paramTypes.length === 0) && (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-6 text-center dark:border-slate-800 dark:bg-slate-900/30">
                            <p className="text-xs text-slate-400">Chưa có tham số đầu vào.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="my-6 h-px w-full bg-slate-100 dark:bg-slate-800" />

                  {/* Examples */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Ví dụ mẫu
                      </Label>
                      <button
                        onClick={() =>
                          patch({
                            visibleExamples: [
                              ...(formData.visibleExamples || []),
                              { inputs: Array(paramCount).fill(""), output: "", explanation: "" },
                            ],
                          })
                        }
                        className="flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50">
                        <Plus className="h-3 w-3" /> Thêm
                      </button>
                    </div>
                    <div className="space-y-4">
                      {formData.visibleExamples?.map((ex, exIdx) => (
                        <div
                          key={exIdx}
                          className="overflow-hidden rounded-xl border border-slate-200/80 shadow-sm dark:border-slate-800">
                          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-2.5 dark:border-slate-800/50 dark:bg-slate-900/50">
                            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                              Ví dụ {exIdx + 1}
                            </span>
                            <button
                              onClick={() => {
                                const l = [...(formData.visibleExamples || [])];
                                l.splice(exIdx, 1);
                                patch({ visibleExamples: l });
                              }}
                              className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/30">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="space-y-3 bg-white p-4 dark:bg-slate-950/30">
                            {/* Inputs */}
                            <div className="space-y-2">
                              {paramCount === 0 ? (
                                <p className="text-xs text-slate-400 italic">
                                  Vui lòng khai báo tham số đầu vào trước.
                                </p>
                              ) : (
                                formData.paramTypes?.map((pt, pIdx) => (
                                  <div key={pIdx} className="flex items-center gap-3">
                                    <TypeTag value={pt} />
                                    <Input
                                      value={ex.inputs?.[pIdx] || ""}
                                      onChange={(e) => {
                                        const l = [...(formData.visibleExamples || [])];
                                        if (!l[exIdx].inputs)
                                          l[exIdx].inputs = Array(paramCount).fill("");
                                        l[exIdx].inputs[pIdx] = e.target.value;
                                        patch({ visibleExamples: l });
                                      }}
                                      className="h-8 flex-1 border-slate-200 bg-slate-50/50 font-mono text-xs shadow-none focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                                      placeholder={`Giá trị ${pt}`}
                                    />
                                  </div>
                                ))
                              )}
                            </div>
                            {/* Output */}
                            <div className="flex items-center gap-3 pt-2">
                              <span className="w-12 shrink-0 text-xs font-semibold text-slate-500">
                                Output
                              </span>
                              {formData.returnType && <TypeTag value={formData.returnType} />}
                              <Input
                                value={ex.output || ""}
                                onChange={(e) => {
                                  const l = [...(formData.visibleExamples || [])];
                                  l[exIdx].output = e.target.value;
                                  patch({ visibleExamples: l });
                                }}
                                className="h-8 flex-1 border-slate-200 bg-slate-50/50 font-mono text-xs shadow-none focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                                placeholder="Kết quả trả về..."
                              />
                            </div>
                            {/* Explanation */}
                            <div className="pt-2">
                              <Textarea
                                value={ex.explanation || ""}
                                onChange={(e) => {
                                  const l = [...(formData.visibleExamples || [])];
                                  l[exIdx].explanation = e.target.value;
                                  patch({ visibleExamples: l });
                                }}
                                className="h-16 resize-none border-slate-200 bg-slate-50/50 text-xs shadow-none focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                                placeholder="Giải thích (không bắt buộc)…"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!formData.visibleExamples || formData.visibleExamples.length === 0) && (
                        <button
                          onClick={() =>
                            patch({
                              visibleExamples: [
                                { inputs: Array(paramCount).fill(""), output: "", explanation: "" },
                              ],
                            })
                          }
                          className="group flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-8 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-800 dark:bg-slate-900/30 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-900/20">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm transition-colors group-hover:text-indigo-500 dark:bg-slate-800 dark:group-hover:text-indigo-400">
                            <Plus className="h-5 w-5" />
                          </div>
                          <span className="text-sm font-medium text-slate-500 group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-indigo-400">
                            Thêm ví dụ đầu tiên
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/50 dark:bg-slate-900/50">
                  {onGenerateAI && (
                    <Button
                      variant="outline"
                      onClick={onGenerateAI}
                      className="h-10 w-full rounded-xl border-indigo-200 bg-white font-bold text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:border-indigo-800 dark:bg-slate-900 dark:hover:bg-indigo-900/40">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Tạo AI
                    </Button>
                  )}
                  <Button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className={`h-10 w-full rounded-xl bg-indigo-600 px-4 font-bold text-white shadow-sm shadow-indigo-500/20 transition-colors hover:bg-indigo-700 ${!onGenerateAI ? "col-span-2" : ""}`}>
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Lưu Bài Tập
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TEST CASES TAB ══════════════════════════════════════════════════ */}
        {activeTab === "testcases" && (
          <div className="flex h-full flex-col bg-slate-50/30 p-6 dark:bg-slate-950/30">
            <div className="mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
              {/* Full-width toolbar */}
              <div className="flex flex-none items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                    <PlaySquare className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Test Cases Ẩn
                    </p>
                    <p className="text-[11px] font-medium text-slate-500">
                      Dùng để chấm điểm hệ thống (thí sinh không thấy được)
                    </p>
                  </div>
                  {(formData.hiddenTestCases?.length ?? 0) > 0 && (
                    <>
                      <div className="mx-2 h-8 w-px bg-slate-200 dark:bg-slate-700" />
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-medium dark:bg-slate-800">
                          <strong className="text-slate-800 dark:text-slate-200">
                            {formData.hiddenTestCases?.length}
                          </strong>{" "}
                          test cases
                        </span>
                        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                          Tổng điểm:{" "}
                          <strong>
                            {formData.hiddenTestCases?.reduce(
                              (s, tc) => s + (tc.weightPoints || 0),
                              0
                            )}
                            đ
                          </strong>
                        </span>
                        {paramCount > 0 && (
                          <span className="flex items-center gap-1 opacity-70">
                            {formData.paramTypes?.map((p, i) => (
                              <TypeTag key={i} value={p} />
                            ))}
                            <span className="text-slate-400">→</span>
                            <TypeTag value={formData.returnType || "?"} />
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <Button
                  onClick={addHiddenTc}
                  className="h-9 bg-indigo-600 px-4 text-xs font-bold text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-700">
                  <Plus className="mr-1.5 h-4 w-4" /> Thêm Test Case
                </Button>
              </div>

              {/* Flat Table list */}
              <div className="flex-1 overflow-y-auto p-6">
                {!formData.hiddenTestCases || formData.hiddenTestCases.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center">
                    <div className="flex max-w-md flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center dark:border-slate-800 dark:bg-slate-900/30">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-500 dark:bg-indigo-900/50 dark:text-indigo-400">
                        <PlaySquare className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          Chưa có Test Case nào
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Thêm test case ẩn để hệ thống có thể chấm điểm bài làm của thí sinh tự
                          động.
                        </p>
                      </div>
                      <Button
                        onClick={addHiddenTc}
                        className="mt-2 bg-indigo-600 px-6 text-sm font-bold text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-700">
                        <Plus className="mr-1.5 h-4 w-4" /> Thêm test case đầu tiên
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-200/80 shadow-sm dark:border-slate-800">
                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                        <thead className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800/80 dark:bg-slate-900/50">
                          <tr>
                            <th className="w-16 px-5 py-4 text-center text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                              #
                            </th>
                            {paramCount > 0 ? (
                              formData.paramTypes?.map((pt, i) => (
                                <th
                                  key={i}
                                  className="min-w-[150px] px-5 py-4 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                                  <div className="flex items-center gap-2">
                                    <span>Tham số {i + 1}</span>
                                    <TypeTag value={pt} />
                                  </div>
                                </th>
                              ))
                            ) : (
                              <th className="min-w-[150px] px-5 py-4 text-[11px] font-bold tracking-wider text-slate-400 uppercase italic">
                                Cần định nghĩa tham số
                              </th>
                            )}
                            <th className="min-w-[200px] px-5 py-4 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                              <div className="flex items-center gap-2">
                                <span>Kết quả kỳ vọng</span>
                                {formData.returnType && <TypeTag value={formData.returnType} />}
                              </div>
                            </th>
                            <th className="w-32 px-5 py-4 text-center text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                              Điểm số
                            </th>
                            <th className="w-16 px-5 py-4 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {formData.hiddenTestCases.map((tc, idx) => (
                            <tr
                              key={idx}
                              className="group transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                              <td className="px-5 py-4 pt-6 text-center align-top font-mono text-[11px] font-bold text-slate-400">
                                {String(idx + 1).padStart(2, "0")}
                              </td>
                              {paramCount > 0 ? (
                                formData.paramTypes?.map((_pt, pIdx) => (
                                  <td key={pIdx} className="px-5 py-4 align-top">
                                    <Textarea
                                      value={tc.inputs?.[pIdx] || ""}
                                      onChange={(e) => {
                                        const inputs = [
                                          ...(tc.inputs || Array(paramCount).fill("")),
                                        ];
                                        inputs[pIdx] = e.target.value;
                                        updateHiddenTc(idx, { inputs });
                                      }}
                                      className="h-10 min-h-[40px] resize-y border-slate-200 bg-white font-mono text-[13px] shadow-none focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950/50"
                                      placeholder="Giá trị..."
                                    />
                                  </td>
                                ))
                              ) : (
                                <td className="px-5 py-4"></td>
                              )}
                              <td className="px-5 py-4 align-top">
                                <Textarea
                                  value={tc.expectedOutput || ""}
                                  onChange={(e) =>
                                    updateHiddenTc(idx, { expectedOutput: e.target.value })
                                  }
                                  className="h-10 min-h-[40px] resize-y border-slate-200 bg-white font-mono text-[13px] shadow-none focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950/50"
                                  placeholder="Output..."
                                />
                              </td>
                              <td className="px-5 py-4 pt-5 align-top">
                                <div className="flex justify-center">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={tc.weightPoints ?? 10}
                                    onChange={(e) =>
                                      updateHiddenTc(idx, {
                                        weightPoints: parseInt(e.target.value) || 0,
                                      })
                                    }
                                    className="h-10 w-20 border-emerald-200/50 bg-emerald-50/50 text-center font-mono text-[13px] font-bold text-emerald-600 shadow-none focus-visible:ring-emerald-500 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-400"
                                  />
                                </div>
                              </td>
                              <td className="px-5 py-4 pt-6 text-center align-top">
                                <button
                                  onClick={() => removeHiddenTc(idx)}
                                  className="rounded-lg p-2 text-slate-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/30">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ CODE STUBS TAB ═════════════════════════════════════════════════ */}
        {activeTab === "codestubs" && (
          <div className="flex h-full flex-col bg-slate-50/30 p-6 dark:bg-slate-950/30">
            <div className="mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900">
              <div className="flex flex-none items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                    <Code2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Mã Nguồn Mẫu (Code Stubs)
                    </p>
                    <p className="text-[11px] font-medium text-slate-500">
                      Đoạn mã được nạp sẵn cho thí sinh khi mở bài trên trình biên dịch.
                    </p>
                  </div>
                </div>
                <Select value={activeLang} onValueChange={setActiveLang}>
                  <SelectTrigger className="h-9 w-40 border-slate-200 bg-white text-xs font-bold shadow-sm focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      ["JAVA", "Java"],
                      ["PYTHON", "Python"],
                      ["CPP", "C++"],
                      ["JS", "JavaScript"],
                      ["TYPESCRIPT", "TypeScript"],
                      ["GO", "Go"],
                      ["CSHARP", "C#"],
                      ["SCALA", "Scala"],
                      ["SWIFT", "Swift"],
                      ["KOTLIN", "Kotlin"],
                    ].map(([k, l]) => (
                      <SelectItem key={k} value={k} className="font-bold">
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 bg-slate-950">
                <Editor
                  height="100%"
                  language={getMonacoLang(activeLang)}
                  theme="vs-dark"
                  value={formData.codeStubs?.[activeLang] || ""}
                  onChange={(v) =>
                    patch({ codeStubs: { ...formData.codeStubs, [activeLang]: v || "" } })
                  }
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineHeight: 24,
                    padding: { top: 20 },
                    fontFamily: "'JetBrains Mono','Fira Code',Consolas,monospace",
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
