"use client";

import {
  Check,
  Code2,
  FolderOpen,
  Loader2,
  Plus,
  Search,
  Timer,
  Trash2,
  Wand2,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScoreInput } from "@/components/ui/score-input";
import { cn } from "@/lib/utils";
import { codingProblemManager, type CodingProblem } from "@/services/coding-problem.manager";
import { toast } from "sonner";

interface CodingEditorProps {
  codingProblemsId: number[];
  codingProblems: { problemId?: number; title?: string; difficulty?: string }[];
  onChange: (
    _ids: number[],
    _problems: { problemId?: number; title?: string; difficulty?: string }[]
  ) => void;
  disabled?: boolean;
  maxScore: number;
  onMaxScoreChange: (_val: number) => void;
  passThreshold: number;
  onPassThresholdChange: (_val: number) => void;
  timeLimitMinutes: number;
  onTimeLimitMinutesChange: (_val: number) => void;
}

type RightPaneView = "idle" | "view" | "bank" | "create";

export function CodingEditor({
  codingProblemsId = [],
  codingProblems = [],
  onChange,
  disabled = false,
  maxScore,
  onMaxScoreChange,
  passThreshold,
  onPassThresholdChange,
  timeLimitMinutes,
  onTimeLimitMinutesChange,
}: CodingEditorProps) {
  const [rightView, setRightView] = React.useState<RightPaneView>("idle");
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);

  // System problem bank states
  const [bankProblems, setBankProblems] = React.useState<CodingProblem[]>([]);
  const [isLoadingBank, setIsLoadingBank] = React.useState(false);
  const [selectedBankIds, setSelectedBankIds] = React.useState<number[]>([]);
  const [bankSearch, setBankSearch] = React.useState("");
  const [bankDifficulty, setBankDifficulty] = React.useState<"ALL" | "EASY" | "MEDIUM" | "HARD">(
    "ALL"
  );

  // Create problem form states
  const [newProblem, setNewProblem] = React.useState<{
    title: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    problemStatement: string;
    rulesAndConstraints: string[];
    paramTypes: string[];
    returnType: string;
    executionTimeLimitMs: number;
    memoryLimitMb: number;
    visibleExamples: { inputs: string[]; output: string; explanation: string }[];
    hiddenTestCases: { inputs: string[]; expectedOutput: string; weightPoints: number }[];
    codeStubs: Record<string, string>;
  }>({
    title: "",
    difficulty: "EASY",
    problemStatement: "",
    rulesAndConstraints: [],
    paramTypes: [],
    returnType: "",
    executionTimeLimitMs: 1000,
    memoryLimitMb: 256,
    visibleExamples: [{ inputs: [""], output: "", explanation: "" }],
    hiddenTestCases: [{ inputs: [""], expectedOutput: "", weightPoints: 10 }],
    codeStubs: { java: "", python: "" },
  });

  // AI generation states
  const [aiTopic, setAiTopic] = React.useState("");
  const [aiLevel, setAiLevel] = React.useState("Junior");
  const [aiDifficulty, setAiDifficulty] = React.useState<"EASY" | "MEDIUM" | "HARD">("EASY");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [creationMode, setCreationMode] = React.useState<"ai" | "manual">("ai");
  const [aiGeneratedLoaded, setAiGeneratedLoaded] = React.useState(false);
  const [aiContext, setAiContext] = React.useState({
    jobTitle: "",
    requirement: "",
    prompting: "",
  });

  const handleAddExample = () => {
    setNewProblem((prev) => ({
      ...prev,
      visibleExamples: [...prev.visibleExamples, { inputs: [""], output: "", explanation: "" }],
    }));
  };

  const handleRemoveExample = (index: number) => {
    setNewProblem((prev) => ({
      ...prev,
      visibleExamples: prev.visibleExamples.filter((_, i) => i !== index),
    }));
  };

  const handleAddTestCase = () => {
    setNewProblem((prev) => ({
      ...prev,
      hiddenTestCases: [
        ...prev.hiddenTestCases,
        { inputs: [""], expectedOutput: "", weightPoints: 10 },
      ],
    }));
  };

  const handleRemoveTestCase = (index: number) => {
    setNewProblem((prev) => ({
      ...prev,
      hiddenTestCases: prev.hiddenTestCases.filter((_, i) => i !== index),
    }));
  };

  const openCreate = () => {
    setRightView("create");
    setSelectedIndex(null);
    setCreationMode("ai");
    setAiGeneratedLoaded(false);
    setNewProblem({
      title: "",
      difficulty: "EASY",
      problemStatement: "",
      rulesAndConstraints: [],
      paramTypes: [],
      returnType: "",
      executionTimeLimitMs: 1000,
      memoryLimitMb: 256,
      visibleExamples: [{ inputs: [""], output: "", explanation: "" }],
      hiddenTestCases: [{ inputs: [""], expectedOutput: "", weightPoints: 10 }],
      codeStubs: { java: "", python: "" },
    });
    setAiTopic("");
    setAiContext({
      jobTitle: "",
      requirement: "",
      prompting: "",
    });
  };

  const handleAiGenerate = async () => {
    if (!aiTopic.trim()) {
      toast.warning("Vui lòng nhập chủ đề bài toán để AI sinh đề");
      return;
    }
    setIsGenerating(true);
    try {
      const res = await codingProblemManager.generate({
        topic: aiTopic,
        difficulty: aiDifficulty,
        targetLevel: aiLevel,
        context: {
          jobTitle: aiContext.jobTitle || "Software Engineer",
          requirement: aiContext.requirement || "Cơ bản và thực tế",
          prompting: aiContext.prompting || "",
        },
      });
      if (res.success && res.data) {
        const gen = res.data;
        const rawHidden =
          gen.hiddenTestCases || (gen as Record<string, unknown>).hiddenTestcases || [];
        const mappedHidden =
          Array.isArray(rawHidden) && rawHidden.length > 0
            ? (
                rawHidden as Array<{
                  inputs?: string[];
                  expectedOutput?: string;
                  output?: string;
                  weightPoints?: number;
                }>
              ).map((tc) => ({
                inputs: tc.inputs || [],
                expectedOutput: tc.expectedOutput || tc.output || "",
                weightPoints: tc.weightPoints || 10,
              }))
            : [{ inputs: [""], expectedOutput: "", weightPoints: 10 }];

        setNewProblem({
          title: gen.title || "",
          difficulty: (gen.difficulty as "EASY" | "MEDIUM" | "HARD") || aiDifficulty,
          problemStatement: gen.problemStatement || "",
          rulesAndConstraints: gen.rulesAndConstraints || [],
          paramTypes: gen.paramTypes || [],
          returnType: gen.returnType || "",
          executionTimeLimitMs: gen.executionTimeLimitMs || 1000,
          memoryLimitMb: gen.memoryLimitMb || 256,
          visibleExamples: gen.visibleExamples?.map((ex) => ({
            inputs: ex.inputs || [],
            output: ex.output || "",
            explanation: ex.explanation || "",
          })) || [{ inputs: [""], output: "", explanation: "" }],
          hiddenTestCases: mappedHidden,
          codeStubs: gen.codeStubs || { java: "", python: "" },
        });
        toast.success("AI đã sinh đề bài thành công!");
        setAiGeneratedLoaded(true);
      } else {
        toast.error(res.error || "Không thể sinh đề bài tự động");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi khi sinh đề bằng AI");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveProblem = async () => {
    if (!newProblem.title.trim()) {
      toast.warning("Vui lòng nhập tiêu đề bài tập");
      return;
    }
    if (!newProblem.problemStatement.trim()) {
      toast.warning("Vui lòng nhập mô tả bài tập");
      return;
    }

    try {
      const res = await codingProblemManager.create(newProblem);
      if (res.success && res.data) {
        toast.success("Tạo bài tập lập trình thành công!");
        await fetchProblemBank();
        const createdId = res.data.id;
        const newIds = [...codingProblemsId, createdId];
        const newProblems = [
          ...codingProblems,
          {
            problemId: createdId,
            title: res.data.title,
            difficulty: res.data.difficulty,
          },
        ];
        onChange(newIds, newProblems);
        setSelectedIndex(newIds.length - 1);
        setRightView("view");
      } else {
        toast.error(res.error || "Không thể lưu bài tập mới");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi khi lưu bài tập");
    }
  };

  // Inline editing for time
  const [editingTime, setEditingTime] = React.useState(false);

  // Load problem bank from GET /api/coding-problems
  const fetchProblemBank = async () => {
    setIsLoadingBank(true);
    try {
      const res = await codingProblemManager.getAll();
      if (res.success && res.data) {
        setBankProblems(res.data);
      } else {
        toast.error(res.error || "Không thể tải danh sách đề lập trình");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi khi tải danh sách đề");
    } finally {
      setIsLoadingBank(false);
    }
  };

  React.useEffect(() => {
    fetchProblemBank();
  }, []);

  const handleSelectProblem = (index: number) => {
    setSelectedIndex(index);
    setRightView("view");
  };

  const openBank = () => {
    setSelectedBankIds([]);
    setBankSearch("");
    setBankDifficulty("ALL");
    setRightView("bank");
  };

  const handleDeleteProblem = (index: number) => {
    const newIds = codingProblemsId.filter((_, idx) => idx !== index);
    const newProblems = codingProblems.filter((_, idx) => idx !== index);
    onChange(newIds, newProblems);

    if (selectedIndex === index) {
      setRightView("idle");
      setSelectedIndex(null);
    } else if (selectedIndex !== null && selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleAddSelectedFromBank = () => {
    const newIds = [...codingProblemsId];
    const newProblems = [...codingProblems];

    selectedBankIds.forEach((id) => {
      if (!newIds.includes(id)) {
        newIds.push(id);
        const systemProblem = bankProblems.find((p) => p.id === id);
        newProblems.push({
          problemId: id,
          title: systemProblem?.title || `Bài tập #${id}`,
          difficulty: systemProblem?.difficulty || "EASY",
        });
      }
    });

    onChange(newIds, newProblems);
    setRightView("idle");
    setSelectedBankIds([]);
    toast.success(`Đã thêm ${selectedBankIds.length} bài tập vào vòng thi`);
  };

  const toggleBankSelection = (id: number) => {
    setSelectedBankIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Filter bank problems
  const filteredBank = bankProblems.filter((p) => {
    const matchesSearch =
      (p.title || "").toLowerCase().includes(bankSearch.toLowerCase()) ||
      (p.problemStatement || "").toLowerCase().includes(bankSearch.toLowerCase());
    const matchesDifficulty = bankDifficulty === "ALL" || p.difficulty === bankDifficulty;
    return matchesSearch && matchesDifficulty;
  });

  const passScore = Math.round(passThreshold * maxScore);
  const selectedProblemDetails =
    selectedIndex !== null
      ? bankProblems.find((p) => p.id === codingProblemsId[selectedIndex])
      : null;

  return (
    <div className="grid h-full grid-cols-12 gap-0">
      {/* ==================== LEFT COLUMN ==================== */}
      <div className="col-span-4 flex flex-col border-r border-slate-100 dark:border-slate-800/60">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {/* --- Score Settings --- */}
          <div className="space-y-3">
            <div className="flex items-start gap-4">
              <div className="w-[55%] space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                  Điểm tối đa
                </Label>
                <ScoreInput
                  value={maxScore}
                  min={1}
                  max={500}
                  step={5}
                  accent="indigo"
                  variant="simple"
                  onChange={onMaxScoreChange}
                />
              </div>

              <div className="w-[45%] space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                  Thời gian
                </Label>
                {editingTime ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      autoFocus
                      value={timeLimitMinutes}
                      onChange={(e) => onTimeLimitMinutesChange(Number(e.target.value))}
                      onBlur={() => setEditingTime(false)}
                      onKeyDown={(e) => e.key === "Enter" && setEditingTime(false)}
                      className="h-11 w-full [appearance:textfield] border-slate-200 bg-white text-center text-xs font-bold dark:border-slate-800 dark:bg-slate-950 dark:text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="shrink-0 text-[9px] text-slate-400">phút</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingTime(true)}
                    className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-400">
                    <Timer className="h-4 w-4 text-slate-400" />
                    {timeLimitMinutes > 0 ? `${timeLimitMinutes} phút` : "Không hạn chế"}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                Điểm đạt tối thiểu
              </Label>
              <div className="flex justify-center">
                <ScoreInput
                  value={passScore}
                  min={0}
                  max={maxScore}
                  step={1}
                  accent="emerald"
                  variant="circular"
                  size="sm"
                  onChange={(val) => {
                    onPassThresholdChange(maxScore > 0 ? val / maxScore : 0.8);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/60" />

          {/* --- Coding Problems Navigation --- */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500">
                Bài tập ({codingProblemsId.length})
              </h4>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={openBank}
                className={cn(
                  "h-7 flex-1 justify-start border-slate-200 text-[11px] font-semibold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900",
                  rightView === "bank" &&
                    "border-indigo-500 bg-indigo-50/50 text-indigo-600 dark:border-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400"
                )}>
                <FolderOpen className="mr-1.5 h-3 w-3 text-indigo-500" />
                Ngân hàng đề
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={openCreate}
                className={cn(
                  "h-7 flex-1 justify-start border-slate-200 text-[11px] font-semibold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900",
                  rightView === "create" &&
                    "border-emerald-500 bg-emerald-50/50 text-emerald-600 dark:border-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                )}>
                <Plus className="mr-1.5 h-3 w-3 text-emerald-500" />
                Tạo đề bài
              </Button>
            </div>

            {/* Horizontal Cards list */}
            <div className="flex flex-col gap-2">
              {codingProblemsId.map((id, idx) => {
                const isActive = selectedIndex === idx && rightView === "view";
                const problem = codingProblems[idx] || {};
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectProblem(idx)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all",
                      isActive
                        ? "border-indigo-500 bg-indigo-50/50 shadow-sm dark:border-indigo-600 dark:bg-indigo-950/20"
                        : "hover:border-slate-350 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/20 dark:hover:border-slate-700"
                    )}>
                    <span
                      className={cn(
                        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ring-1 ring-inset",
                        isActive
                          ? "bg-indigo-600 text-white ring-indigo-600"
                          : "bg-slate-50 text-slate-500 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800"
                      )}>
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="dark:text-slate-250 truncate text-xs font-semibold text-slate-800">
                        {problem.title || `Bài tập #${id}`}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold ring-1 ring-inset",
                            problem.difficulty === "EASY" &&
                              "bg-green-50 text-green-700 ring-green-600/10 dark:bg-green-950/20 dark:text-green-400",
                            problem.difficulty === "MEDIUM" &&
                              "bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-950/20 dark:text-amber-400",
                            problem.difficulty === "HARD" &&
                              "bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-950/20 dark:text-red-400"
                          )}>
                          {problem.difficulty === "EASY"
                            ? "Dễ"
                            : problem.difficulty === "MEDIUM"
                              ? "Trung bình"
                              : "Khó"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {codingProblemsId.length === 0 && (
              <p className="text-[10px] leading-relaxed text-slate-400">
                Chưa chọn bài tập. Nhấn <strong>Ngân hàng bài tập</strong> để lựa chọn bài tập hệ
                thống.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ==================== RIGHT COLUMN ==================== */}
      <div className="col-span-8 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5">
          {/* --- IDLE STATE --- */}
          {rightView === "idle" && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="rounded-2xl border-2 border-dashed border-slate-200 px-10 py-12 dark:border-slate-800">
                <Code2 className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Chọn bài tập để xem chi tiết
                </p>
                <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                  Nhấn vào ô số bên trái hoặc mở <strong>Ngân hàng bài tập</strong>.
                </p>
              </div>
            </div>
          )}

          {/* --- VIEW STATE --- */}
          {rightView === "view" && selectedIndex !== null && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
                    {selectedIndex + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {codingProblems[selectedIndex]?.title ||
                        `Bài tập #${codingProblemsId[selectedIndex]}`}
                    </h3>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold ring-1 ring-inset",
                          codingProblems[selectedIndex]?.difficulty === "EASY" &&
                            "bg-green-50 text-green-700 ring-green-600/10 dark:bg-green-950/20 dark:text-green-400",
                          codingProblems[selectedIndex]?.difficulty === "MEDIUM" &&
                            "bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-950/20 dark:text-amber-400",
                          codingProblems[selectedIndex]?.difficulty === "HARD" &&
                            "bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-950/20 dark:text-red-400"
                        )}>
                        {codingProblems[selectedIndex]?.difficulty === "EASY"
                          ? "Dễ"
                          : codingProblems[selectedIndex]?.difficulty === "MEDIUM"
                            ? "Trung bình"
                            : "Khó"}
                      </span>
                    </div>
                  </div>
                </div>

                {!disabled && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteProblem(selectedIndex)}
                    className="h-8 border-red-200 text-xs text-red-500 hover:bg-red-50 hover:text-red-600 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30">
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Xóa khỏi vòng
                  </Button>
                )}
              </div>

              {selectedProblemDetails ? (
                <div className="space-y-4">
                  {/* Problem Statement */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/20">
                    <h4 className="mb-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                      Mô tả bài toán
                    </h4>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                      {selectedProblemDetails.problemStatement}
                    </p>
                  </div>

                  {/* Constraints */}
                  {selectedProblemDetails.rulesAndConstraints &&
                    selectedProblemDetails.rulesAndConstraints.length > 0 && (
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                          Ràng buộc & Quy tắc
                        </Label>
                        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600 dark:text-slate-400">
                          {selectedProblemDetails.rulesAndConstraints.map((rule, idx) => (
                            <li key={idx}>{rule}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {/* Examples */}
                  {selectedProblemDetails.visibleExamples &&
                    selectedProblemDetails.visibleExamples.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                          Ví dụ mẫu
                        </Label>
                        <div className="space-y-2">
                          {selectedProblemDetails.visibleExamples.map((ex, idx) => (
                            <div
                              key={idx}
                              className="space-y-1 rounded-lg border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/30">
                              <div className="text-xs font-bold text-slate-500">
                                Ví dụ {idx + 1}:
                              </div>
                              <div className="font-mono text-xs text-slate-600 dark:text-slate-300">
                                <strong>Đầu vào:</strong> {ex.inputs?.join(", ")}
                              </div>
                              <div className="font-mono text-xs text-slate-600 dark:text-slate-300">
                                <strong>Đầu ra:</strong> {ex.output}
                              </div>
                              {ex.explanation && (
                                <div className="text-xs text-slate-500 italic">
                                  <strong>Giải thích:</strong> {ex.explanation}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Resource Limits */}
                  <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800/40">
                    <div>
                      Giới hạn thời gian chạy:{" "}
                      <strong>{selectedProblemDetails.executionTimeLimitMs} ms</strong>
                    </div>
                    <div>
                      Giới hạn bộ nhớ: <strong>{selectedProblemDetails.memoryLimitMb} MB</strong>
                    </div>
                  </div>

                  {/* Hidden Test Cases */}
                  {selectedProblemDetails.hiddenTestCases &&
                    selectedProblemDetails.hiddenTestCases.length > 0 && (
                      <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800/40">
                        <Label className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                          Bộ Test Case ẩn chấm điểm ({selectedProblemDetails.hiddenTestCases.length}
                          )
                        </Label>
                        <div className="grid grid-cols-1 gap-2">
                          {selectedProblemDetails.hiddenTestCases.map((tc, idx) => (
                            <div
                              key={idx}
                              className="flex flex-wrap items-center justify-between rounded-lg border border-slate-100 bg-slate-50/40 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/20">
                              <div className="font-mono text-slate-600 dark:text-slate-300">
                                <strong>TC {idx + 1}:</strong> {tc.inputs?.join(", ")} &rarr;{" "}
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                  {tc.expectedOutput}
                                </span>
                              </div>
                              <div className="text-[10px] font-bold text-slate-400">
                                Điểm:{" "}
                                <span className="font-semibold text-emerald-600">
                                  {tc.weightPoints}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-slate-400 italic">
                  Đang tải thông tin chi tiết của bài tập...
                </div>
              )}
            </div>
          )}

          {/* --- BANK STATE --- */}
          {rightView === "bank" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 dark:border-slate-800/60">
                <FolderOpen className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Ngân hàng bài tập lập trình
                </h3>
                <span className="ml-auto text-xs font-medium text-slate-400">
                  Đã chọn{" "}
                  <strong className="text-indigo-600 dark:text-indigo-400">
                    {selectedBankIds.length}
                  </strong>
                </span>
              </div>

              {/* Filters */}
              <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-3 md:flex-row dark:border-slate-800 dark:bg-slate-950">
                <div className="relative flex-1">
                  <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    placeholder="Tìm kiếm bài tập..."
                    className="h-9 border-slate-200 bg-white pl-8 text-xs dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  {(["ALL", "EASY", "MEDIUM", "HARD"] as const).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setBankDifficulty(diff)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-[10px] font-bold transition-all",
                        bankDifficulty === diff
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
                      )}>
                      {diff === "ALL"
                        ? "Tất cả"
                        : diff === "EASY"
                          ? "Dễ"
                          : diff === "MEDIUM"
                            ? "Trung bình"
                            : "Khó"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Problem list */}
              <div className="max-h-[360px] space-y-2.5 overflow-y-auto pr-1">
                {isLoadingBank ? (
                  <div className="py-10 text-center text-xs text-slate-400">
                    Đang tải danh sách bài tập...
                  </div>
                ) : (
                  filteredBank.map((p, idx) => {
                    const isSelected = selectedBankIds.includes(p.id);
                    const isAdded = codingProblemsId.includes(p.id);

                    return (
                      <div
                        key={idx}
                        onClick={() => !isAdded && toggleBankSelection(p.id)}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border p-3 transition-all",
                          isAdded
                            ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-900/10"
                            : isSelected
                              ? "cursor-pointer border-indigo-500 bg-indigo-500/[0.04] dark:bg-indigo-950/15"
                              : "cursor-pointer border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/20 dark:hover:border-slate-700"
                        )}>
                        <div className="mt-0.5">
                          <div
                            className={cn(
                              "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                              isAdded
                                ? "border-slate-350 bg-slate-300 text-white dark:bg-slate-700"
                                : isSelected
                                  ? "border-indigo-600 bg-indigo-600 text-white"
                                  : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950"
                            )}>
                            {(isSelected || isAdded) && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={cn(
                                "inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold ring-1 ring-inset",
                                p.difficulty === "EASY" &&
                                  "bg-green-50 text-green-700 ring-green-600/10 dark:bg-green-950/20 dark:text-green-400",
                                p.difficulty === "MEDIUM" &&
                                  "bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-950/20 dark:text-amber-400",
                                p.difficulty === "HARD" &&
                                  "bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-950/20 dark:text-red-400"
                              )}>
                              {p.difficulty === "EASY"
                                ? "Dễ"
                                : p.difficulty === "MEDIUM"
                                  ? "Trung bình"
                                  : "Khó"}
                            </span>
                            <span className="text-slate-850 text-xs font-semibold dark:text-slate-200">
                              {p.title}
                            </span>
                            {isAdded && (
                              <span className="ml-auto text-[10px] text-slate-400 italic">
                                Đã có trong vòng
                              </span>
                            )}
                          </div>
                          <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                            {p.problemStatement}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}

                {!isLoadingBank && filteredBank.length === 0 && (
                  <div className="py-10 text-center text-xs text-slate-500">
                    Không tìm thấy bài tập phù hợp.
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRightView("idle");
                    setSelectedIndex(null);
                  }}
                  className="h-8 border-slate-200 text-xs dark:border-slate-800">
                  Hủy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={selectedBankIds.length === 0}
                  onClick={handleAddSelectedFromBank}
                  className="h-8 bg-indigo-600 px-4 text-xs text-white hover:bg-indigo-700">
                  Thêm{selectedBankIds.length > 0 ? ` (${selectedBankIds.length})` : ""} vào vòng
                  thi
                </Button>
              </div>
            </div>
          )}

          {/* --- CREATE STATE --- */}
          {rightView === "create" && (
            <div className="flex h-full flex-col space-y-4">
              {/* Header & Mode Select */}
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 dark:border-slate-800/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-emerald-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Tạo đề bài lập trình mới
                    </h3>
                  </div>
                </div>

                {/* Tabs to switch mode */}
                <div className="w-fit rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCreationMode("ai");
                      }}
                      className={cn(
                        "rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all",
                        creationMode === "ai"
                          ? "text-indigo-650 bg-white shadow-sm dark:bg-slate-800 dark:text-indigo-400"
                          : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                      )}>
                      Sinh đề bằng AI
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreationMode("manual");
                        setAiGeneratedLoaded(false);
                      }}
                      className={cn(
                        "rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all",
                        creationMode === "manual"
                          ? "text-indigo-650 bg-white shadow-sm dark:bg-slate-800 dark:text-indigo-400"
                          : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                      )}>
                      Tạo đề thủ công
                    </button>
                  </div>
                </div>
              </div>

              {/* View 1: AI Input (Only shown if mode is AI and AI hasn't loaded yet) */}
              {creationMode === "ai" && !aiGeneratedLoaded && (
                <div className="flex flex-1 flex-col space-y-4 overflow-y-auto pr-1">
                  <div className="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/20 p-5 dark:border-indigo-950/20 dark:bg-indigo-950/5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400">
                      <Wand2 className="h-4 w-4 animate-pulse" />
                      Nhập thông tin yêu cầu để AI tự động sinh đề
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase">
                        Chủ đề bài tập
                      </Label>
                      <Input
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        placeholder="Ví dụ: Tìm số lớn thứ hai trong mảng, Đảo ngược danh sách liên kết..."
                        className="h-10 bg-white text-xs dark:bg-slate-950"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">
                          Độ khó mong muốn
                        </Label>
                        <select
                          value={aiDifficulty}
                          onChange={(e) =>
                            setAiDifficulty(e.target.value as "EASY" | "MEDIUM" | "HARD")
                          }
                          className="dark:border-slate-850 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm focus-visible:ring-1 focus-visible:ring-indigo-500 dark:bg-slate-950 dark:text-slate-200">
                          <option value="EASY">Dễ (Easy)</option>
                          <option value="MEDIUM">Trung bình (Medium)</option>
                          <option value="HARD">Khó (Hard)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">
                          Cấp độ ứng viên
                        </Label>
                        <select
                          value={aiLevel}
                          onChange={(e) => setAiLevel(e.target.value)}
                          className="dark:border-slate-850 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm focus-visible:ring-1 focus-visible:ring-indigo-500 dark:bg-slate-950 dark:text-slate-200">
                          <option value="Intern">Intern</option>
                          <option value="Junior">Junior</option>
                          <option value="Senior">Senior</option>
                        </select>
                      </div>
                    </div>

                    <div className="dark:border-slate-850 my-2 border-t border-slate-100" />

                    <div className="space-y-3">
                      <h4 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                        Ngữ cảnh bổ sung
                      </h4>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">
                          Vị trí công việc (Job Title)
                        </Label>
                        <Input
                          value={aiContext.jobTitle}
                          onChange={(e) => setAiContext({ ...aiContext, jobTitle: e.target.value })}
                          placeholder="Ví dụ: Backend Developer (Java), Frontend Developer (React)..."
                          className="h-9 bg-white text-xs dark:bg-slate-950"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">
                          Yêu cầu đặc biệt (Requirement)
                        </Label>
                        <Input
                          value={aiContext.requirement}
                          onChange={(e) =>
                            setAiContext({ ...aiContext, requirement: e.target.value })
                          }
                          placeholder="Ví dụ: Không dùng thư viện sort sẵn có, tối ưu O(N)..."
                          className="h-9 bg-white text-xs dark:bg-slate-950"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">
                          Gợi ý prompt (Prompting)
                        </Label>
                        <textarea
                          value={aiContext.prompting}
                          onChange={(e) =>
                            setAiContext({ ...aiContext, prompting: e.target.value })
                          }
                          rows={2}
                          placeholder="Bổ sung thêm hướng dẫn hoặc mô tả phong cách ra đề của bạn..."
                          className="dark:border-slate-850 flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm focus-visible:ring-1 focus-visible:ring-indigo-500 dark:bg-slate-950 dark:text-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* AI Generation action */}
                  <div className="flex justify-end gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRightView("idle");
                      }}
                      className="h-9 border-slate-200 text-xs dark:border-slate-800">
                      Hủy
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isGenerating}
                      onClick={handleAiGenerate}
                      className="bg-indigo-650 h-9 px-5 text-xs text-white hover:bg-indigo-700 disabled:opacity-60">
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          AI đang sinh đề bài...
                        </>
                      ) : (
                        <>
                          <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                          Sinh đề với AI
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* View 2: Redesigned Grouped Form (Shown if manual mode, or AI mode and AI response is loaded) */}
              {(creationMode === "manual" || (creationMode === "ai" && aiGeneratedLoaded)) && (
                <div className="flex min-h-0 flex-1 flex-col space-y-4">
                  {creationMode === "ai" && aiGeneratedLoaded && (
                    <div className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/60 p-2.5 text-xs font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400">
                      <span>
                        ✨ Đã sinh đề bài từ AI thành công! Bạn có thể chỉnh sửa lại các thông tin
                        dưới đây.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAiGeneratedLoaded(false);
                        }}
                        className="text-[10px] underline hover:text-emerald-900 dark:hover:text-emerald-300">
                        Sinh lại đề khác
                      </button>
                    </div>
                  )}

                  {/* Form Scroll Area */}
                  <div className="flex-1 space-y-5 overflow-y-auto pr-1">
                    {/* SECTION 1: THÔNG TIN CHUNG */}
                    <div className="dark:border-slate-850 space-y-3 rounded-xl border border-slate-100 bg-white p-4 dark:bg-slate-950/20">
                      <h4 className="text-indigo-650 dark:border-slate-850 border-b border-slate-100 pb-1.5 text-xs font-bold tracking-wider uppercase dark:text-indigo-400">
                        1. Thông tin chung
                      </h4>
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-8 space-y-1">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase">
                            Tiêu đề bài toán
                          </Label>
                          <Input
                            value={newProblem.title}
                            onChange={(e) =>
                              setNewProblem({ ...newProblem, title: e.target.value })
                            }
                            placeholder="Ví dụ: Hai số có tổng bằng Target"
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="col-span-4 space-y-1">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase">
                            Độ khó
                          </Label>
                          <select
                            value={newProblem.difficulty}
                            onChange={(e) =>
                              setNewProblem({
                                ...newProblem,
                                difficulty: e.target.value as "EASY" | "MEDIUM" | "HARD",
                              })
                            }
                            className="dark:border-slate-850 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm focus-visible:ring-1 focus-visible:ring-indigo-500 dark:bg-slate-950 dark:text-slate-200">
                            <option value="EASY">Dễ</option>
                            <option value="MEDIUM">Trung bình</option>
                            <option value="HARD">Khó</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">
                          Mô tả chi tiết đề bài
                        </Label>
                        <textarea
                          value={newProblem.problemStatement}
                          onChange={(e) =>
                            setNewProblem({ ...newProblem, problemStatement: e.target.value })
                          }
                          rows={4}
                          placeholder="Mô tả bài toán, quy tắc, hướng dẫn..."
                          className="dark:border-slate-850 flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-sans text-xs shadow-sm focus-visible:ring-1 focus-visible:ring-indigo-500 dark:bg-slate-950 dark:text-slate-200"
                        />
                      </div>
                    </div>

                    {/* SECTION 2: CHỮ KÝ HÀM & GIỚI HẠN */}
                    <div className="dark:border-slate-850 space-y-3 rounded-xl border border-slate-100 bg-white p-4 dark:bg-slate-950/20">
                      <h4 className="text-indigo-650 dark:border-slate-850 border-b border-slate-100 pb-1.5 text-xs font-bold tracking-wider uppercase dark:text-indigo-400">
                        2. Cấu hình & Giới hạn chạy
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase">
                            Kiểu dữ liệu tham số (Param Types)
                          </Label>
                          <Input
                            value={newProblem.paramTypes.join(", ")}
                            onChange={(e) =>
                              setNewProblem({
                                ...newProblem,
                                paramTypes: e.target.value
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              })
                            }
                            placeholder="Ví dụ: int[], int"
                            className="h-9 text-xs"
                          />
                          <p className="text-[9px] text-slate-400 italic">Cách nhau bởi dấu phẩy</p>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase">
                            Kiểu trả về (Return Type)
                          </Label>
                          <Input
                            value={newProblem.returnType}
                            onChange={(e) =>
                              setNewProblem({ ...newProblem, returnType: e.target.value })
                            }
                            placeholder="Ví dụ: int[]"
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase">
                            Giới hạn thời gian (ms)
                          </Label>
                          <Input
                            type="number"
                            value={newProblem.executionTimeLimitMs}
                            onChange={(e) =>
                              setNewProblem({
                                ...newProblem,
                                executionTimeLimitMs: Number(e.target.value),
                              })
                            }
                            placeholder="1000"
                            className="h-9 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase">
                            Giới hạn bộ nhớ (MB)
                          </Label>
                          <Input
                            type="number"
                            value={newProblem.memoryLimitMb}
                            onChange={(e) =>
                              setNewProblem({
                                ...newProblem,
                                memoryLimitMb: Number(e.target.value),
                              })
                            }
                            placeholder="256"
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">
                          Ràng buộc & Quy tắc (Constraints)
                        </Label>
                        <Input
                          value={newProblem.rulesAndConstraints.join("; ")}
                          onChange={(e) =>
                            setNewProblem({
                              ...newProblem,
                              rulesAndConstraints: e.target.value
                                .split(";")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="Ví dụ: nums.length <= 10^4; target <= 10^9"
                          className="h-9 text-xs"
                        />
                        <p className="text-[9px] text-slate-400 italic">
                          Cách nhau bằng dấu chấm phẩy (;)
                        </p>
                        {newProblem.rulesAndConstraints.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {newProblem.rulesAndConstraints.map((constraint, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-500/10 ring-inset dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800">
                                {constraint}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SECTION 3: VÍ DỤ MẪU */}
                    <div className="dark:border-slate-850 space-y-3 rounded-xl border border-slate-100 bg-white p-4 dark:bg-slate-950/20">
                      <div className="dark:border-slate-850 flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <h4 className="text-indigo-650 text-xs font-bold tracking-wider uppercase dark:text-indigo-400">
                          3. Ví dụ mẫu ({newProblem.visibleExamples.length})
                        </h4>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleAddExample}
                          className="h-6 text-[10px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                          <Plus className="mr-1 h-3 w-3" />
                          Thêm ví dụ
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {newProblem.visibleExamples.map((ex, idx) => (
                          <div
                            key={idx}
                            className="relative space-y-2 rounded-lg border border-slate-100 bg-slate-50/40 p-3.5 dark:border-slate-800 dark:bg-slate-900/20">
                            <button
                              type="button"
                              onClick={() => handleRemoveExample(idx)}
                              className="absolute top-2.5 right-2.5 text-slate-400 hover:text-red-500"
                              title="Xóa ví dụ">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>

                            <div className="text-[10px] font-bold text-slate-500 uppercase">
                              Ví dụ #{idx + 1}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[9px] font-semibold text-slate-400">
                                  Đầu vào (inputs)
                                </Label>
                                <Input
                                  value={ex.inputs?.join(", ") || ""}
                                  onChange={(e) => {
                                    const list = [...newProblem.visibleExamples];
                                    list[idx] = {
                                      ...list[idx],
                                      inputs: e.target.value
                                        .split(",")
                                        .map((s) => s.trim())
                                        .filter(Boolean),
                                    };
                                    setNewProblem({ ...newProblem, visibleExamples: list });
                                  }}
                                  placeholder="Ví dụ: [2, 7], 9"
                                  className="h-8 bg-white text-xs dark:bg-slate-950"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[9px] font-semibold text-slate-400">
                                  Đầu ra (output)
                                </Label>
                                <Input
                                  value={ex.output}
                                  onChange={(e) => {
                                    const list = [...newProblem.visibleExamples];
                                    list[idx] = { ...list[idx], output: e.target.value };
                                    setNewProblem({ ...newProblem, visibleExamples: list });
                                  }}
                                  placeholder="Ví dụ: [0, 1]"
                                  className="h-8 bg-white text-xs dark:bg-slate-950"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[9px] font-semibold text-slate-400">
                                Giải thích (Explanation)
                              </Label>
                              <Input
                                value={ex.explanation}
                                onChange={(e) => {
                                  const list = [...newProblem.visibleExamples];
                                  list[idx] = { ...list[idx], explanation: e.target.value };
                                  setNewProblem({ ...newProblem, visibleExamples: list });
                                }}
                                placeholder="Giải thích logic chạy thử..."
                                className="h-8 bg-white text-xs dark:bg-slate-950"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SECTION 4: TESTCASES ẨN */}
                    <div className="dark:border-slate-850 space-y-3 rounded-xl border border-slate-100 bg-white p-4 dark:bg-slate-950/20">
                      <div className="dark:border-slate-850 flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <h4 className="text-indigo-650 text-xs font-bold tracking-wider uppercase dark:text-indigo-400">
                          4. Bộ Test Case ẩn chấm điểm ({newProblem.hiddenTestCases.length})
                        </h4>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleAddTestCase}
                          className="h-6 text-[10px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                          <Plus className="mr-1 h-3 w-3" />
                          Thêm Test Case
                        </Button>
                      </div>

                      <div className="space-y-2.5">
                        {newProblem.hiddenTestCases.map((tc, idx) => (
                          <div
                            key={idx}
                            className="relative space-y-2.5 rounded-lg border border-slate-100 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-900/20">
                            <button
                              type="button"
                              onClick={() => handleRemoveTestCase(idx)}
                              className="absolute top-2.5 right-2.5 text-slate-400 hover:text-red-500"
                              title="Xóa Test Case">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>

                            <div className="text-[10px] font-bold text-slate-500 uppercase">
                              Test Case #{idx + 1}
                            </div>

                            <div className="grid grid-cols-12 items-end gap-3">
                              <div className="col-span-5 space-y-1">
                                <Label className="text-[9px] font-semibold text-slate-400">
                                  Đầu vào ẩn (inputs)
                                </Label>
                                <Input
                                  value={tc.inputs?.join(", ") || ""}
                                  onChange={(e) => {
                                    const list = [...newProblem.hiddenTestCases];
                                    list[idx] = {
                                      ...list[idx],
                                      inputs: e.target.value
                                        .split(",")
                                        .map((s) => s.trim())
                                        .filter(Boolean),
                                    };
                                    setNewProblem({ ...newProblem, hiddenTestCases: list });
                                  }}
                                  placeholder="Ví dụ: [3, 2, 4], 6"
                                  className="h-8 bg-white text-xs dark:bg-slate-950"
                                />
                              </div>
                              <div className="col-span-5 space-y-1">
                                <Label className="text-[9px] font-semibold text-slate-400">
                                  Đầu ra ẩn (expectedOutput)
                                </Label>
                                <Input
                                  value={tc.expectedOutput}
                                  onChange={(e) => {
                                    const list = [...newProblem.hiddenTestCases];
                                    list[idx] = { ...list[idx], expectedOutput: e.target.value };
                                    setNewProblem({ ...newProblem, hiddenTestCases: list });
                                  }}
                                  placeholder="Ví dụ: [1, 2]"
                                  className="h-8 bg-white text-xs dark:bg-slate-950"
                                />
                              </div>
                              <div className="col-span-2 space-y-1">
                                <Label className="text-[9px] font-semibold text-slate-400">
                                  Điểm số
                                </Label>
                                <Input
                                  type="number"
                                  value={tc.weightPoints}
                                  onChange={(e) => {
                                    const list = [...newProblem.hiddenTestCases];
                                    list[idx] = {
                                      ...list[idx],
                                      weightPoints: Number(e.target.value),
                                    };
                                    setNewProblem({ ...newProblem, hiddenTestCases: list });
                                  }}
                                  className="h-8 bg-white text-center text-xs dark:bg-slate-950"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Form Actions Footer */}
                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800/60">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRightView("idle");
                        setSelectedIndex(null);
                      }}
                      className="h-9 border-slate-200 text-xs dark:border-slate-800">
                      Hủy
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveProblem}
                      className="bg-emerald-650 h-9 px-5 text-xs text-white hover:bg-emerald-700">
                      Lưu & Thêm vào vòng thi
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
