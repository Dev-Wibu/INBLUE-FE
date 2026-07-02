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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { codingProblemManager, type CodingProblem } from "@/services/coding-problem.manager";
import Editor from "@monaco-editor/react";
import {
  ArrowLeft,
  CheckCircle2,
  Code2,
  FileText,
  Loader2,
  PlaySquare,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

// ─── Sub-components ───────────────────────────────────────────────────────────

/** A pill-style tag for a type */
function TypeBadge({ value }: { value: string }) {
  const colorMap: Record<string, string> = {
    integer: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    "integer[]": "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800",
    String: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    boolean: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  };
  const cls = colorMap[value] ?? "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs font-semibold ${cls}`}>
      {value || "?"}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface CodingProblemEditorProps {
  initialData: Partial<CodingProblem> | null;
  onBack: () => void;
  onSaved: () => void;
}

type TabKey = "general" | "testcases" | "codestubs";

export function CodingProblemEditor({ initialData, onBack, onSaved }: CodingProblemEditorProps) {
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [activeLang, setActiveLang] = useState("JAVA");

  // Test Case card expansion state
  const [expandedTc, setExpandedTc] = useState<number | null>(null);

  const isEditing = !!initialData?.id;
  const paramCount = formData.paramTypes?.length || 0;

  useEffect(() => {
    if (initialData?.id) {
      fetchDetails(initialData.id);
    } else {
      setFormData((prev) => ({ ...prev, ...initialData }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  const fetchDetails = async (id: number | string) => {
    setIsLoadingData(true);
    try {
      const res = await codingProblemManager.getById(id);
      if (res.success && res.data) {
        setFormData(res.data);
      } else {
        toast.error(res.error || "Không thể tải chi tiết bài tập.");
        onBack();
      }
    } catch {
      toast.error("Lỗi hệ thống khi tải dữ liệu.");
      onBack();
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleFormChange = (updates: Partial<CodingProblem>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

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
      } else {
        toast.error(res.error || t("general.addFailed"));
      }
    } catch {
      toast.error(t("compCodingSubmissionModal.errorOccurred"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!aiTopic.trim()) {
      toast.error(t("general.pleaseFillAllRequiredFields"));
      return;
    }
    setAiLoading(true);
    try {
      const res = await codingProblemManager.generate({
        topic: aiTopic,
        difficulty: aiDifficulty,
        targetLevel: "INTERMEDIATE",
      });
      if (res.success && res.data) {
        setFormData((prev) => ({ ...prev, ...res.data }));
        toast.success(t("ai.generationSuccess"));
      } else {
        toast.error(res.error || t("ai.generationFailed"));
      }
    } catch {
      toast.error(t("compCodingSubmissionModal.errorOccurred"));
    } finally {
      setAiLoading(false);
    }
  };

  const getMonacoLanguage = (langKey: string) => {
    const map: Record<string, string> = {
      JAVA: "java", PYTHON: "python", CPP: "cpp", JS: "javascript",
      TYPESCRIPT: "typescript", GO: "go", CSHARP: "csharp",
      SCALA: "scala", SWIFT: "swift", KOTLIN: "kotlin",
    };
    return map[langKey] ?? "plaintext";
  };

  // ── TC helpers ──────────────────────────────────────────────────────────────
  const addHiddenTc = () => {
    const newList = [
      ...(formData.hiddenTestCases || []),
      { inputs: Array(paramCount).fill(""), expectedOutput: "", weightPoints: 10 },
    ];
    handleFormChange({ hiddenTestCases: newList });
    setExpandedTc(newList.length - 1);
  };

  const removeHiddenTc = (idx: number) => {
    const newList = [...(formData.hiddenTestCases || [])];
    newList.splice(idx, 1);
    handleFormChange({ hiddenTestCases: newList });
    if (expandedTc === idx) setExpandedTc(null);
    else if (expandedTc !== null && expandedTc > idx) setExpandedTc(expandedTc - 1);
  };

  const updateHiddenTc = (idx: number, patch: Partial<typeof formData.hiddenTestCases extends (infer T)[] | undefined ? NonNullable<T> : never>) => {
    const newList = [...(formData.hiddenTestCases || [])] as NonNullable<CodingProblem["hiddenTestCases"]>;
    newList[idx] = { ...newList[idx], ...patch };
    handleFormChange({ hiddenTestCases: newList });
  };

  if (isLoadingData) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-500">Đang tải bài tập...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
      {/* ── TOP HEADER ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex flex-col border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex h-14 items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
            <nav className="flex items-center gap-1.5 text-sm">
              <span className="text-slate-400">Bài thi Coding</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formData.title || "Tạo mới"}
              </span>
            </nav>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSubmitting}
            size="sm"
            className="h-8 bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors">
            {isSubmitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Lưu Bài Tập
          </Button>
        </div>

        {/* tabs */}
        <div className="flex gap-0 px-5">
          {[
            { id: "general", label: "Đề bài", icon: FileText },
            { id: "testcases", label: "Test Cases Ẩn", icon: PlaySquare, count: formData.hiddenTestCases?.length },
            { id: "codestubs", label: "Code Stubs", icon: Code2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabKey)}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}>
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              {"count" in tab && tab.count !== undefined && (
                <span className={`rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums ${
                  activeTab === tab.id ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── WORKSPACE ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* ═══════════ TAB: GENERAL ═══════════════════════════════════════ */}
        {activeTab === "general" && (
          <div className="mx-auto max-w-3xl space-y-0 px-6 py-8 pb-24">

            {/* ── Row 1: Title + Difficulty + Settings ── */}
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tiêu đề</Label>
                <Input
                  value={formData.title || ""}
                  onChange={(e) => handleFormChange({ title: e.target.value })}
                  className="h-11 border-slate-200 text-base font-bold placeholder:font-normal focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-800"
                  placeholder="Ví dụ: Two Sum"
                />
              </div>
              <div className="w-36 space-y-1">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Độ khó</Label>
                <Select
                  value={formData.difficulty || "MEDIUM"}
                  onValueChange={(val: "EASY" | "MEDIUM" | "HARD") => handleFormChange({ difficulty: val })}>
                  <SelectTrigger className={`h-11 border font-semibold text-sm focus:ring-1 focus:ring-indigo-500 ${
                    formData.difficulty === "EASY"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
                      : formData.difficulty === "HARD"
                        ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400"
                        : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
                  }`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EASY">EASY</SelectItem>
                    <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                    <SelectItem value="HARD">HARD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSettingsOpen(true)}
                  className="h-11 border-slate-200 px-3 text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-800 dark:hover:border-slate-700">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* ── AI Generator (create only) ── */}
            {!isEditing && (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2.5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                <Sparkles className="h-4 w-4 shrink-0 text-indigo-500" />
                <Input
                  placeholder="Chủ đề (VD: Sắp xếp mảng)…"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  className="h-8 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 placeholder:text-indigo-300 dark:placeholder:text-indigo-700"
                />
                <Select value={aiDifficulty} onValueChange={(v: "EASY" | "MEDIUM" | "HARD") => setAiDifficulty(v)}>
                  <SelectTrigger className="h-8 w-28 border-indigo-200 bg-white text-xs dark:border-indigo-800 dark:bg-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EASY">EASY</SelectItem>
                    <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                    <SelectItem value="HARD">HARD</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleGenerateAI} disabled={aiLoading}
                  className="h-8 bg-indigo-600 px-3 text-xs hover:bg-indigo-700">
                  {aiLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Tạo tự động
                </Button>
              </div>
            )}

            {/* ── Section Divider ── */}
            <div className="mt-8 border-t border-slate-100 pt-8 dark:border-slate-800/60">

              {/* Problem Statement */}
              <div className="mb-8">
                <h2 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-200">Nội dung Đề bài</h2>
                <Textarea
                  placeholder="Mô tả bài toán bằng Markdown…"
                  value={formData.problemStatement || ""}
                  onChange={(e) => handleFormChange({ problemStatement: e.target.value })}
                  className="min-h-64 resize-y border-slate-200 bg-white font-mono text-sm leading-relaxed focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900"
                />
              </div>

              {/* Visible Examples */}
              <div className="mb-8">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Ví dụ Mẫu</h2>
                  <button
                    onClick={() => {
                      const newList = [
                        ...(formData.visibleExamples || []),
                        { inputs: Array(paramCount).fill(""), output: "", explanation: "" },
                      ];
                      handleFormChange({ visibleExamples: newList });
                    }}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30">
                    <Plus className="h-3.5 w-3.5" /> Thêm
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.visibleExamples?.map((ex, exIdx) => (
                    <div key={exIdx} className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
                      {/* Example header */}
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                          Ví dụ {exIdx + 1}
                        </span>
                        <button
                          onClick={() => {
                            const list = [...(formData.visibleExamples || [])];
                            list.splice(exIdx, 1);
                            handleFormChange({ visibleExamples: list });
                          }}
                          className="rounded p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/30">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid gap-4 p-4 md:grid-cols-2">
                        {/* Inputs */}
                        <div className="space-y-2">
                          <span className="text-xs font-semibold text-slate-500">Input</span>
                          {paramCount === 0 ? (
                            <p className="text-xs italic text-slate-400">Thiết lập Param Types trong Cài đặt trước.</p>
                          ) : (
                            <div className="space-y-2">
                              {formData.paramTypes?.map((pt, pIdx) => (
                                <div key={pIdx} className="flex items-center gap-2">
                                  <TypeBadge value={pt} />
                                  <Input
                                    value={ex.inputs?.[pIdx] || ""}
                                    onChange={(e) => {
                                      const list = [...(formData.visibleExamples || [])];
                                      if (!list[exIdx].inputs) list[exIdx].inputs = Array(paramCount).fill("");
                                      list[exIdx].inputs[pIdx] = e.target.value;
                                      handleFormChange({ visibleExamples: list });
                                    }}
                                    className="h-8 flex-1 border-slate-200 font-mono text-xs dark:border-slate-700"
                                    placeholder={pt}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Output + Explanation */}
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-500">Output</span>
                              {formData.returnType && <TypeBadge value={formData.returnType} />}
                            </div>
                            <Input
                              value={ex.output || ""}
                              onChange={(e) => {
                                const list = [...(formData.visibleExamples || [])];
                                list[exIdx].output = e.target.value;
                                handleFormChange({ visibleExamples: list });
                              }}
                              className="h-8 border-slate-200 font-mono text-xs dark:border-slate-700"
                              placeholder="Giá trị trả về"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <span className="text-xs font-semibold text-slate-500">Giải thích</span>
                            <Textarea
                              value={ex.explanation || ""}
                              onChange={(e) => {
                                const list = [...(formData.visibleExamples || [])];
                                list[exIdx].explanation = e.target.value;
                                handleFormChange({ visibleExamples: list });
                              }}
                              className="h-16 resize-none border-slate-200 text-xs dark:border-slate-700"
                              placeholder="Giải thích kết quả…"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!formData.visibleExamples || formData.visibleExamples.length === 0) && (
                    <button
                      onClick={() => {
                        const newList = [{ inputs: Array(paramCount).fill(""), output: "", explanation: "" }];
                        handleFormChange({ visibleExamples: newList });
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 py-6 text-sm text-slate-400 transition-colors hover:border-indigo-300 hover:text-indigo-500 dark:border-slate-800 dark:hover:border-indigo-700">
                      <Plus className="h-4 w-4" />
                      Thêm ví dụ đầu tiên
                    </button>
                  )}
                </div>
              </div>

              {/* Constraints */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Điều kiện</h2>
                  <button
                    onClick={() => handleFormChange({ rulesAndConstraints: [...(formData.rulesAndConstraints || []), ""] })}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30">
                    <Plus className="h-3.5 w-3.5" /> Thêm
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.rulesAndConstraints?.map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 text-center font-mono text-xs text-slate-400">{idx + 1}.</span>
                      <Input
                        value={rule}
                        onChange={(e) => {
                          const list = [...(formData.rulesAndConstraints || [])];
                          list[idx] = e.target.value;
                          handleFormChange({ rulesAndConstraints: list });
                        }}
                        className="h-8 flex-1 border-slate-200 font-mono text-xs dark:border-slate-700"
                        placeholder="VD: 2 ≤ nums.length ≤ 10⁴"
                      />
                      <button
                        onClick={() => {
                          const list = [...(formData.rulesAndConstraints || [])];
                          list.splice(idx, 1);
                          handleFormChange({ rulesAndConstraints: list });
                        }}
                        className="rounded p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/30">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {(!formData.rulesAndConstraints || formData.rulesAndConstraints.length === 0) && (
                    <p className="py-3 text-center text-xs italic text-slate-400">Chưa có điều kiện nào.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ TAB: TEST CASES ════════════════════════════════════ */}
        {activeTab === "testcases" && (
          <div className="mx-auto max-w-3xl px-6 py-8 pb-24">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Test Cases Ẩn</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Dùng để chấm điểm. Thí sinh không thấy nội dung cụ thể.
                </p>
              </div>
              <Button
                size="sm"
                onClick={addHiddenTc}
                className="h-8 bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Thêm Test Case
              </Button>
            </div>

            {/* Summary row */}
            {(formData.hiddenTestCases?.length ?? 0) > 0 && (
              <div className="mb-4 flex items-center gap-4 rounded-lg border border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="text-xs text-slate-500">
                  <strong className="text-slate-800 dark:text-slate-200">{formData.hiddenTestCases?.length}</strong> test cases
                </span>
                <span className="text-xs text-slate-500">
                  Tổng điểm:{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {formData.hiddenTestCases?.reduce((sum, tc) => sum + (tc.weightPoints || 0), 0)} điểm
                  </strong>
                </span>
                {paramCount > 0 && (
                  <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
                    Params:
                    {formData.paramTypes?.map((p, i) => <TypeBadge key={i} value={p} />)}
                    →
                    <TypeBadge value={formData.returnType || "?"} />
                  </span>
                )}
              </div>
            )}

            {/* Card list */}
            <div className="space-y-2">
              {formData.hiddenTestCases?.map((tc, idx) => {
                const isOpen = expandedTc === idx;
                const isComplete = tc.inputs?.every(Boolean) && !!tc.expectedOutput;
                return (
                  <div
                    key={idx}
                    className={`overflow-hidden rounded-lg border transition-all ${
                      isOpen
                        ? "border-indigo-200 shadow-sm dark:border-indigo-800"
                        : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40"
                    }`}>
                    {/* Card header — always visible, clickable */}
                    <button
                      onClick={() => setExpandedTc(isOpen ? null : idx)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isOpen ? "bg-indigo-50 dark:bg-indigo-900/20" : "bg-white hover:bg-slate-50 dark:bg-slate-900/40 dark:hover:bg-slate-900/80"
                      }`}>
                      {/* Status dot */}
                      <div className={`h-2 w-2 shrink-0 rounded-full ${isComplete ? "bg-emerald-500" : "bg-amber-400"}`} />

                      <div className="flex flex-1 items-center gap-3 min-w-0">
                        <span className="shrink-0 font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                          TC {String(idx + 1).padStart(2, "0")}
                        </span>
                        {/* Input preview */}
                        <div className="flex min-w-0 flex-1 gap-2 overflow-hidden">
                          {tc.inputs?.slice(0, 3).map((inp, i) => (
                            <span key={i} className="truncate rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              {inp || <span className="italic text-slate-400">vống</span>}
                            </span>
                          ))}
                          {(tc.inputs?.length ?? 0) > 3 && (
                            <span className="text-[11px] text-slate-400">+{(tc.inputs?.length ?? 0) - 3}</span>
                          )}
                          {tc.expectedOutput && (
                            <>
                              <span className="text-slate-300 dark:text-slate-600">→</span>
                              <span className="truncate rounded bg-emerald-50 px-2 py-0.5 font-mono text-[11px] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                {tc.expectedOutput}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`text-xs font-bold ${tc.weightPoints ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                          {tc.weightPoints || 0}đ
                        </span>
                        {isComplete && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeHiddenTc(idx); }}
                          className="rounded p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/30">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </button>

                    {/* Expanded body */}
                    {isOpen && (
                      <div className="border-t border-indigo-100 bg-white px-4 py-4 dark:border-indigo-900/40 dark:bg-slate-900/60">
                        <div className="grid gap-4 md:grid-cols-2">
                          {/* Input fields */}
                          <div className="space-y-2">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Dữ liệu Đầu vào</span>
                            {paramCount === 0 ? (
                              <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                                Chưa có Param Types. Vào Cài đặt để thêm.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {formData.paramTypes?.map((pt, pIdx) => (
                                  <div key={pIdx} className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                      <TypeBadge value={pt} />
                                      <span className="text-[10px] text-slate-400">Tham số {pIdx + 1}</span>
                                    </div>
                                    <Textarea
                                      value={tc.inputs?.[pIdx] || ""}
                                      onChange={(e) => {
                                        const inputs = [...(tc.inputs || Array(paramCount).fill(""))];
                                        inputs[pIdx] = e.target.value;
                                        updateHiddenTc(idx, { inputs });
                                      }}
                                      className="h-16 resize-none border-slate-200 font-mono text-xs dark:border-slate-700"
                                      placeholder={`Giá trị cho ${pt}`}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Output + Score */}
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Kết quả kỳ vọng</span>
                                {formData.returnType && <TypeBadge value={formData.returnType} />}
                              </div>
                              <Textarea
                                value={tc.expectedOutput || ""}
                                onChange={(e) => updateHiddenTc(idx, { expectedOutput: e.target.value })}
                                className="h-16 resize-none border-slate-200 font-mono text-xs dark:border-slate-700"
                                placeholder="Output string"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Điểm số</span>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={tc.weightPoints ?? 10}
                                  onChange={(e) => updateHiddenTc(idx, { weightPoints: parseInt(e.target.value) || 0 })}
                                  className="h-8 w-24 border-slate-200 font-mono text-xs font-bold text-emerald-700 dark:border-slate-700 dark:text-emerald-400"
                                />
                                <span className="text-xs text-slate-400">điểm</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {(!formData.hiddenTestCases || formData.hiddenTestCases.length === 0) && (
                <button
                  onClick={addHiddenTc}
                  className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-slate-200 py-10 text-slate-400 transition-colors hover:border-indigo-300 hover:text-indigo-500 dark:border-slate-800 dark:hover:border-indigo-700">
                  <Plus className="h-5 w-5" />
                  <span className="text-sm font-medium">Thêm test case đầu tiên</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ TAB: CODE STUBS ════════════════════════════════════ */}
        {activeTab === "codestubs" && (
          <div className="flex h-[calc(100vh-112px)] flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Mã nguồn Mẫu</p>
                <p className="text-xs text-slate-500">Hiển thị cho thí sinh khi mở bài trên trình biên dịch.</p>
              </div>
              <Select value={activeLang} onValueChange={setActiveLang}>
                <SelectTrigger className="h-8 w-44 border-slate-200 text-xs font-semibold dark:border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[["JAVA","Java"],["PYTHON","Python"],["CPP","C++"],["JS","JavaScript"],
                    ["TYPESCRIPT","TypeScript"],["GO","Go"],["CSHARP","C#"],
                    ["SCALA","Scala"],["SWIFT","Swift"],["KOTLIN","Kotlin"]].map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Editor
                height="100%"
                language={getMonacoLanguage(activeLang)}
                theme="vs-dark"
                value={formData.codeStubs?.[activeLang] || ""}
                onChange={(val) => handleFormChange({ codeStubs: { ...formData.codeStubs, [activeLang]: val || "" } })}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineHeight: 24,
                  padding: { top: 20 },
                  fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── SETTINGS MODAL ─────────────────────────────────────────────────── */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Cài đặt Môi trường & Hàm</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-6">
            {/* Execution Limits */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Giới hạn thực thi</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Thời gian tối đa</Label>
                  <div className="relative">
                    <Input type="number" value={formData.executionTimeLimitMs || 2000}
                      onChange={(e) => handleFormChange({ executionTimeLimitMs: parseInt(e.target.value) || 2000 })}
                      className="h-9 pr-10 font-mono text-sm" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">ms</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Bộ nhớ tối đa</Label>
                  <div className="relative">
                    <Input type="number" value={formData.memoryLimitMb || 256}
                      onChange={(e) => handleFormChange({ memoryLimitMb: parseInt(e.target.value) || 256 })}
                      className="h-9 pr-10 font-mono text-sm" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">MB</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Return Type */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Kiểu trả về (Return Type)</p>
              <Select
                value={COMMON_TYPES.includes(formData.returnType || "") ? (formData.returnType || "") : "__custom__"}
                onValueChange={(v) => { if (v !== "__custom__") handleFormChange({ returnType: v }); }}>
                <SelectTrigger className="h-9 w-full font-mono text-sm">
                  <SelectValue placeholder="Chọn kiểu dữ liệu" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="font-mono text-xs">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!COMMON_TYPES.includes(formData.returnType || "") && (
                <Input value={formData.returnType || ""} onChange={(e) => handleFormChange({ returnType: e.target.value })}
                  className="h-9 font-mono text-sm" placeholder="Kiểu tùy chỉnh, VD: TreeNode" />
              )}
            </div>

            {/* Param Types */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Tham số (Params)</p>
                <button
                  onClick={() => handleFormChange({ paramTypes: [...(formData.paramTypes || []), "integer"] })}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30">
                  <Plus className="h-3 w-3" /> Thêm
                </button>
              </div>
              <div className="space-y-2">
                {formData.paramTypes?.map((param, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-14 text-right font-mono text-xs text-slate-400">Param {idx + 1}</span>
                    <Select
                      value={COMMON_TYPES.includes(param) ? param : "__custom__"}
                      onValueChange={(v) => {
                        const list = [...(formData.paramTypes || [])];
                        if (v !== "__custom__") list[idx] = v;
                        handleFormChange({ paramTypes: list });
                      }}>
                      <SelectTrigger className="h-8 flex-1 font-mono text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="font-mono text-xs">{t}</SelectItem>
                        ))}
                        <SelectItem value="__custom__" className="text-xs text-slate-400">Tùy chỉnh…</SelectItem>
                      </SelectContent>
                    </Select>
                    {!COMMON_TYPES.includes(param) && (
                      <Input value={param}
                        onChange={(e) => {
                          const list = [...(formData.paramTypes || [])];
                          list[idx] = e.target.value;
                          handleFormChange({ paramTypes: list });
                        }}
                        className="h-8 w-32 font-mono text-xs" placeholder="Kiểu tùy chỉnh" />
                    )}
                    <button
                      onClick={() => {
                        const list = [...(formData.paramTypes || [])];
                        list.splice(idx, 1);
                        handleFormChange({ paramTypes: list });
                      }}
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/30">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {(!formData.paramTypes || formData.paramTypes.length === 0) && (
                  <p className="py-2 text-center text-xs italic text-slate-400">Chưa có tham số nào.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
              <Button size="sm" onClick={() => setIsSettingsOpen(false)}
                className="h-8 bg-slate-900 px-4 text-xs text-white dark:bg-slate-100 dark:text-slate-900">
                Xong
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
