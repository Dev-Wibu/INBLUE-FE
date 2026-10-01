"use client";

import {
  Check,
  Edit2,
  FolderOpen,
  HelpCircle,
  Plus,
  Search,
  Sparkles,
  Timer,
  Trash2,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScoreInput } from "@/components/ui/score-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SpinnerBlock } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { questionBankManager, type QuestionBank } from "@/services/question-bank.manager";
import {
  questionCategoryManager,
  type QuestionCategory,
} from "@/services/question-category.manager";
import { useTranslation } from "react-i18next";

export interface QuizQuestion {
  questionText?: string;
  options?: string[];
  correctAnswer?: string;
  points?: number;
  questionLevel?: string;
}

interface QuizEditorProps {
  questions: QuizQuestion[];
  onChange: (questions: QuizQuestion[]) => void;
  disabled?: boolean;
  // General Settings Props
  maxScore: number;
  onMaxScoreChange: (val: number) => void;
  passThreshold: number;
  onPassThresholdChange: (val: number) => void;
  timeLimitMinutes: number;
  onTimeLimitMinutesChange: (val: number) => void;
  onSubflowChange?: (_active: boolean) => void;
}

type RightPaneView = "idle" | "view" | "edit" | "bank";

export function QuizEditor({
  questions = [],
  onChange,
  disabled = false,
  maxScore,
  onMaxScoreChange,
  passThreshold,
  onPassThresholdChange,
  timeLimitMinutes,
  onTimeLimitMinutesChange,
  onSubflowChange,
}: QuizEditorProps) {
  const { t } = useTranslation();
  // Question Bank API state
  const [bankQuestions, setBankQuestions] = React.useState<QuestionBank[]>([]);
  const [bankCategories, setBankCategories] = React.useState<QuestionCategory[]>([]);
  const [isLoadingBank, setIsLoadingBank] = React.useState(false);
  const [hasFetchedBank, setHasFetchedBank] = React.useState(false);

  const fetchBankQuestions = React.useCallback(async () => {
    setIsLoadingBank(true);
    try {
      // Fetch questions + categories in parallel so the Category dropdown is always populated,
      // even before the question list finishes loading or if the user has no questions yet.
      const [banksRes, catRes] = await Promise.all([
        questionBankManager.getAll(),
        questionCategoryManager.getAll(),
      ]);
      if (banksRes.success && banksRes.data) {
        setBankQuestions(banksRes.data.filter((q) => !q.isDeleted));
      }
      if (catRes.success && catRes.data) {
        const raw = catRes.data as unknown;
        const list = Array.isArray(raw)
          ? (raw as QuestionCategory[])
          : ((raw as { data?: QuestionCategory[] }).data ?? []);
        setBankCategories(list);
      }
    } catch {
      // Intentionally ignored.
    } finally {
      setIsLoadingBank(false);
      setHasFetchedBank(true);
    }
  }, []);

  // Right pane state
  const [rightView, setRightView] = React.useState<RightPaneView>("idle");
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    onSubflowChange?.(rightView === "bank");
    return () => onSubflowChange?.(false);
  }, [onSubflowChange, rightView]);

  // Edit form states
  const [editForm, setEditForm] = React.useState<QuizQuestion>({
    questionText: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    points: 10,
  });

  // Question Bank states
  const [selectedBankIndexes, setSelectedBankIndexes] = React.useState<number[]>([]);
  const [bankSearch, setBankSearch] = React.useState("");
  const [bankCategory, setBankCategory] = React.useState("All");
  const [bankLevel, setBankLevel] = React.useState<LevelFilter>("All");

  // Time edit inline
  const [editingTime, setEditingTime] = React.useState(false);

  const categoryOptions = React.useMemo(() => {
    // Prefer the full list from /api/question-categories so the dropdown always shows every
    // category the admin has created - even if those categories have zero questions yet.
    const fromApi = bankCategories
      .map((c) => c.categoryName)
      .filter((n): n is string => typeof n === "string" && n.trim().length > 0);
    if (fromApi.length > 0) return ["All", ...fromApi];
    // Fallback: derive names from the questions themselves (older behaviour).
    const set = new Set<string>();
    bankQuestions.forEach((q) => {
      const name = q.questionCategory?.name ?? q.questionCategory?.categoryName;
      if (name) set.add(name);
    });
    return ["All", ...Array.from(set)];
  }, [bankCategories, bankQuestions]);

  type LevelFilter = "All" | "EASY" | "MEDIUM" | "HARD";

  const LEVEL_FILTERS: Array<{ key: LevelFilter }> = [
    { key: "All" },
    { key: "EASY" },
    { key: "MEDIUM" },
    { key: "HARD" },
  ];

  // --- Left column actions ---

  const handleSelectQuestion = (index: number) => {
    setSelectedIndex(index);
    setRightView("view");
  };

  const handleAddNew = () => {
    setSelectedIndex(-1);
    setEditForm({
      questionText: "",
      options: ["", "", "", ""],
      correctAnswer: "",
      points: 10,
    });
    setRightView("edit");
  };

  const handleEditQuestion = (index: number) => {
    const q = questions[index];
    setSelectedIndex(index);
    setEditForm({
      questionText: q.questionText || "",
      options: [...(q.options || ["", "", "", ""])],
      correctAnswer: q.correctAnswer || "",
      points: q.points ?? 10,
    });
    setRightView("edit");
  };

  const handleDeleteQuestion = (index: number) => {
    const updated = questions.filter((_, idx) => idx !== index);
    onChange(updated);
    if (selectedIndex === index) {
      setRightView("idle");
      setSelectedIndex(null);
    } else if (selectedIndex !== null && selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleSaveQuestion = () => {
    if (!editForm.questionText?.trim()) return;

    const updated = [...questions];
    const finalForm: QuizQuestion = {
      questionText: editForm.questionText || "",
      options: editForm.options || ["", "", "", ""],
      correctAnswer: editForm.correctAnswer || (editForm.options && editForm.options[0]) || "",
      points: editForm.points ?? 10,
    };

    if (selectedIndex === -1) {
      updated.push(finalForm);
      setSelectedIndex(updated.length - 1);
    } else if (selectedIndex !== null) {
      updated[selectedIndex] = finalForm;
    }

    onChange(updated);
    setRightView("view");
  };

  const openBank = () => {
    setSelectedBankIndexes([]);
    setBankSearch("");
    setBankCategory("All");
    setBankLevel("All");
    setRightView("bank");
    if (!hasFetchedBank) {
      fetchBankQuestions();
    }
  };

  // Question bank filters
  const filteredBank = React.useMemo(() => {
    return bankQuestions.filter((q) => {
      const matchesSearch = (q.questionText || "").toLowerCase().includes(bankSearch.toLowerCase());
      // NOTE: the backend returns questionCategory as { id, name } (legacy shape),
      // not { id, categoryName } (the QuestionCategory service manager uses the
      // latter). Older code compared against categoryName, so the filter silently
      // matched nothing. Use `name` as the canonical category label.
      const qCategoryName = q.questionCategory?.name ?? q.questionCategory?.categoryName;
      const matchesCategory = bankCategory === "All" || qCategoryName === bankCategory;
      const matchesLevel = bankLevel === "All" || q.questionLevel === bankLevel;
      return matchesSearch && matchesCategory && matchesLevel;
    });
  }, [bankQuestions, bankSearch, bankCategory, bankLevel]);

  const toggleBankSelection = (index: number) => {
    setSelectedBankIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const addSelectedFromBank = () => {
    const selectedQuestions: QuizQuestion[] = selectedBankIndexes.map((idx) => {
      const q = bankQuestions[idx];
      return {
        questionText: q?.questionText || "",
        options: q?.options && q.options.length > 0 ? [...q.options] : ["", "", "", ""],
        correctAnswer: q?.correctAnswer || (q?.options ? q.options[0] : ""),
        points: 10,
        questionLevel: q?.questionLevel,
      };
    });
    onChange([...questions, ...selectedQuestions]);
    setRightView("idle");
    setSelectedBankIndexes([]);
  };

  const passScore = Math.round((passThreshold / 100) * maxScore);

  // ========================== RENDER ==========================
  return (
    <div className="grid min-h-full grid-cols-1 min-[1100px]:grid-cols-[360px_minmax(0,1fr)] md:h-full md:min-h-0 md:grid-cols-[300px_minmax(0,1fr)]">
      {/* ==================== LEFT COLUMN ==================== */}
      <div className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50/70 md:border-r md:border-b-0 dark:border-slate-600 dark:bg-slate-950/45">
        <div className="border-b border-slate-200 px-7 py-4 dark:border-slate-700">
          <h4 className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
            {t("general.generalConfiguration")}
          </h4>
        </div>
        <div className="flex-1 space-y-8 overflow-y-visible py-6 pr-5 pl-7 md:min-h-0 md:overflow-y-auto">
          {/* --- Score Settings Compact --- */}
          <div className="space-y-7">
            {/* Max Score + Time in one row */}
            <div className="grid grid-cols-2 items-start gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                  {t("adminCodeReviewProblem.maxScore")}
                </Label>
                <ScoreInput
                  value={maxScore}
                  min={1}
                  max={500}
                  step={5}
                  accent="indigo"
                  variant="simple"
                  className="[&>div]:h-[42px] [&>div]:rounded-[10px]"
                  onChange={onMaxScoreChange}
                />
              </div>

              {/* Time - compact badge style */}
              <div className="space-y-2">
                <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                  {t("common.time")}
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
                      className="h-[42px] w-full [appearance:textfield] rounded-[10px] border-slate-200 bg-white text-center text-xs font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="shrink-0 text-[9px] text-slate-400">{t("common.minute")}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingTime(true)}
                    className="flex h-[42px] w-full items-center justify-center gap-1.5 rounded-[10px] border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300">
                    <Timer className="h-4 w-4 text-slate-400" />
                    {timeLimitMinutes > 0
                      ? `${timeLimitMinutes} ${t("common.minutes", "phút")}`
                      : t("common.unlimited")}
                  </button>
                )}
              </div>
            </div>

            {/* Pass Score - circular */}
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white px-4 py-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
              <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                {t("adminCodingProblem.minimumPassingScore")}
              </Label>
              <div className="flex justify-center">
                <ScoreInput
                  value={passScore}
                  min={0}
                  max={maxScore}
                  step={1}
                  accent="emerald"
                  variant="circular"
                  size="md"
                  onChange={(val) => {
                    onPassThresholdChange(maxScore > 0 ? Math.round((val / maxScore) * 100) : 80);
                  }}
                />
              </div>
            </div>
          </div>

          {/* --- Divider --- */}
          {/* --- Questions Navigation --- */}
          <div className="space-y-4 border-t border-slate-200 pt-8 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500">
                {t("adminQuizProblem.questionWithParen")}
                {questions.length})
              </h4>
              <span className="text-[10px] font-medium text-slate-400">
                {questions.reduce((s, q) => s + (q.points || 0), 0)} {t("common.pointsAbbr", "đ")}
              </span>
            </div>

            {/* Question Bank Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={openBank}
              className={cn(
                "h-9 w-full justify-start rounded-[10px] border-slate-200 text-xs font-semibold hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30",
                rightView === "bank" &&
                  "border-indigo-500 bg-indigo-50/50 text-indigo-600 dark:border-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400"
              )}>
              <FolderOpen className="mr-1.5 h-3 w-3 text-indigo-500" />
              {t("adminQuizProblem.questionBank")}
            </Button>

            <div className="space-y-2">
              {questions.map((q, idx) => {
                const isActive =
                  selectedIndex === idx && (rightView === "view" || rightView === "edit");
                const difficulty = q.questionLevel;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectQuestion(idx)}
                    className={cn(
                      "group flex min-h-12 w-full min-w-0 items-center gap-2.5 rounded-[10px] border px-3 py-2 text-left transition-all",
                      isActive
                        ? "border-indigo-500 bg-indigo-50 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/30"
                        : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/60 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/20"
                    )}>
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        isActive
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      )}>
                      {idx + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                      {q.questionText || `${t("adminQuizProblem.questionNumber")}${idx + 1}`}
                    </span>
                    {difficulty && (
                      <span
                        className={cn(
                          "shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-semibold",
                          difficulty === "EASY" &&
                            "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
                          difficulty === "MEDIUM" &&
                            "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
                          difficulty === "HARD" &&
                            "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                        )}>
                        {difficulty === "EASY"
                          ? t("common.difficultyEasy")
                          : difficulty === "MEDIUM"
                            ? t("common.difficultyMedium")
                            : t("common.difficultyHard")}
                      </span>
                    )}
                  </button>
                );
              })}

              {!disabled && (
                <button
                  type="button"
                  onClick={handleAddNew}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-slate-300 text-xs font-semibold text-slate-500 transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-emerald-600 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-400">
                  <Plus className="h-4 w-4" />
                  {t("adminQuestionbankmanagement.addQuestion")}
                </button>
              )}
            </div>

            {questions.length === 0 && (
              <p className="text-[10px] leading-relaxed text-slate-400">
                {t("adminQuizProblem.noQuestionPress")}
                <strong>[ + ]</strong> {t("common.orOpen")}{" "}
                <strong>{t("adminQuizProblem.questionBank")}</strong>.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ==================== RIGHT COLUMN ==================== */}
      <div className="flex min-h-[420px] min-w-0 flex-col overflow-hidden md:min-h-0">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <h4 className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
            {t("general.detailedConfiguration")}
          </h4>
        </div>
        <div
          className={cn(
            "flex-1",
            rightView === "bank" ? "min-h-0 overflow-hidden" : "overflow-y-auto py-6 pr-7 pl-6"
          )}>
          {/* --- IDLE STATE --- */}
          {rightView === "idle" && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="rounded-2xl border-2 border-dashed border-slate-200 px-10 py-12 dark:border-slate-800">
                <HelpCircle className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {t("adminQuizProblem.selectQuestionToViewDetails")}
                </p>
                <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                  {t("adminQuizProblem.pressLeftBoxOrPress")}
                  <strong>[ + ]</strong> {t("adminQuizProblem.toCreateNew")}
                  <br />
                  {t("common.orOpen")}
                  <strong>{t("adminQuizProblem.questionBank")}</strong>{" "}
                  {t("adminQuizProblem.toGetExistingQuestion")}
                </p>
              </div>
            </div>
          )}

          {/* --- VIEW STATE: Question detail --- */}
          {rightView === "view" &&
            selectedIndex !== null &&
            selectedIndex >= 0 &&
            questions[selectedIndex] && (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
                      {selectedIndex + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {t("adminQuizProblem.questionNumber")}
                        {selectedIndex + 1}
                      </h3>
                      <p className="text-[10px] font-medium text-slate-400">
                        {questions[selectedIndex].points ?? 10} {t("common.score")}
                        {(questions[selectedIndex].questionText || "").includes("```") &&
                          t("adminQuizProblem.containsCode")}
                      </p>
                    </div>
                  </div>

                  {!disabled && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditQuestion(selectedIndex)}
                        className="h-8 border-slate-200 text-xs dark:border-slate-800">
                        <Edit2 className="mr-1 h-3.5 w-3.5" />
                        {t("common.editShort")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteQuestion(selectedIndex)}
                        className="h-8 border-red-200 text-xs text-red-500 hover:bg-red-50 hover:text-red-600 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30">
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        {t("common.delete")}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Question content */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/20">
                  <p className="font-mono text-sm leading-relaxed font-semibold whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                    {questions[selectedIndex].questionText || ""}
                  </p>
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                    {t("adminQuizProblem.options")}
                  </Label>
                  <div className="grid grid-cols-1 gap-2">
                    {(questions[selectedIndex].options || []).map((opt, oIdx) => {
                      const isCorrect = opt === questions[selectedIndex].correctAnswer;
                      return (
                        <div
                          key={oIdx}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all",
                            isCorrect
                              ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/20"
                              : "border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-950/30"
                          )}>
                          <span
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                              isCorrect
                                ? "bg-emerald-500 text-white"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            )}>
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span
                            className={cn(
                              "text-sm",
                              isCorrect
                                ? "font-semibold text-emerald-700 dark:text-emerald-400"
                                : "text-slate-600 dark:text-slate-300"
                            )}>
                            {opt}
                          </span>
                          {isCorrect && (
                            <Check className="ml-auto h-4 w-4 shrink-0 text-emerald-500" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

          {/* --- EDIT STATE: Add/Edit question form --- */}
          {rightView === "edit" && (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 dark:border-slate-800/60">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedIndex === -1
                    ? t("adminQuizProblem.addNewQuestion")
                    : t("adminQuizProblem.editQuestionNum", {
                        num: (selectedIndex || 0) + 1,
                      })}
                </h3>
              </div>

              {/* Question Text */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t("adminQuizProblem.questionContent")}
                </Label>
                <textarea
                  value={editForm.questionText || ""}
                  onChange={(e) => setEditForm({ ...editForm, questionText: e.target.value })}
                  placeholder={t("compQuizEditor.placeholderQuestionText")}
                  className="min-h-[160px] w-full rounded-lg border border-slate-200 bg-white p-3 font-mono text-sm font-medium text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Options */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t("adminQuizProblem.optionsABCD")}
                </Label>
                {(editForm.options || ["", "", "", ""]).map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...(editForm.options || ["", "", "", ""])];
                        newOpts[oIdx] = e.target.value;
                        setEditForm({ ...editForm, options: newOpts });
                      }}
                      placeholder={t(
                        "adminQuizProblem.optionLetterPlaceholder",
                        "Phương án {{letter}}",
                        { letter: String.fromCharCode(65 + oIdx) }
                      )}
                      className="h-10 border-slate-200 bg-white text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                ))}
              </div>

              {/* Correct Answer & Score */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("adminQuizProblem.correctAnswer")}
                  </Label>
                  <Select
                    value={editForm.correctAnswer || ""}
                    onValueChange={(val) => setEditForm({ ...editForm, correctAnswer: val })}>
                    <SelectTrigger className="h-10 border-slate-200 bg-white text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                      <SelectValue placeholder={t("adminQuizProblem.selectAnswer")} />
                    </SelectTrigger>
                    <SelectContent className="border-slate-200 bg-white text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                      {(editForm.options || ["", "", "", ""]).map((opt, oIdx) => (
                        <SelectItem
                          key={oIdx}
                          value={opt || `Option-${oIdx}`}
                          disabled={!opt.trim()}>
                          {String.fromCharCode(65 + oIdx)}.{" "}
                          {opt || t("adminQuizProblem.notEntered")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("adminQuizProblem.scoreValue")}
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={editForm.points ?? 10}
                    onChange={(e) => setEditForm({ ...editForm, points: Number(e.target.value) })}
                    className="h-10 border-slate-200 bg-white text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              {/* Save / Cancel */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedIndex !== null && selectedIndex >= 0) {
                      setRightView("view");
                    } else {
                      setRightView("idle");
                      setSelectedIndex(null);
                    }
                  }}
                  className="h-8 border-slate-200 text-xs dark:border-slate-800">
                  {t("common.cancel")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveQuestion}
                  className="h-8 bg-emerald-600 px-4 text-xs text-white hover:bg-emerald-700">
                  {t("adminQuizProblem.saveQuestion")}
                </Button>
              </div>
            </div>
          )}

          {/* --- BANK STATE: Question Bank Browser --- */}
          {rightView === "bank" && (
            <div className="flex h-full min-h-0 flex-col bg-white dark:bg-slate-900">
              {/* Header */}
              <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-slate-200 px-6 dark:border-slate-700">
                <FolderOpen className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("adminQuizProblem.questionBank")}
                </h3>
                <span className="ml-auto rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                  {t("common.selected")}{" "}
                  <strong className="text-indigo-600 dark:text-indigo-400">
                    {selectedBankIndexes.length}
                  </strong>
                </span>
              </div>

              <div className="shrink-0 border-b border-slate-200 bg-slate-50/70 px-6 py-3 dark:border-slate-700 dark:bg-slate-950/35">
                <div className="flex gap-2.5">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      placeholder={t("adminQuizProblem.searchQuestion", "Tìm câu hỏi...")}
                      className="h-9 w-full rounded-[10px] border-slate-200 bg-white pl-10 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                  <div className="w-48 shrink-0">
                    <Label className="sr-only">{t("general.category", "Danh mục")}</Label>
                    <Select value={bankCategory} onValueChange={(val) => setBankCategory(val)}>
                      <SelectTrigger className="h-9 w-full rounded-[10px] border-slate-200 bg-white text-sm dark:border-slate-700 dark:bg-slate-950">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-slate-200 bg-white text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                        {categoryOptions.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat === "All" ? t("common.all", "Tất cả") : cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {LEVEL_FILTERS.map(({ key }) => {
                    const isActive = bankLevel === key;
                    const levelColor =
                      key === "EASY"
                        ? isActive
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-400"
                        : key === "MEDIUM"
                          ? isActive
                            ? "border-amber-600 bg-amber-600 text-white"
                            : "border-amber-200 bg-white text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:bg-slate-950 dark:text-amber-400"
                          : key === "HARD"
                            ? isActive
                              ? "border-rose-600 bg-rose-600 text-white"
                              : "border-rose-200 bg-white text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:bg-slate-950 dark:text-rose-400"
                            : isActive
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400";
                    const label =
                      key === "All"
                        ? t("common.all", "Tất cả")
                        : key === "EASY"
                          ? t("common.difficultyEasy", "Dễ")
                          : key === "MEDIUM"
                            ? t("common.difficultyMedium", "Trung bình")
                            : t("common.difficultyHard", "Khó");
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setBankLevel(key)}
                        className={cn(
                          "h-7 rounded-full border px-3 text-[10px] font-semibold transition-all",
                          levelColor
                        )}>
                        {label}
                      </button>
                    );
                  })}
                  <span className="ml-auto text-[10px] font-semibold text-slate-400">
                    {t("common.showing", "Hiển thị")}{" "}
                    <strong className="text-indigo-600 dark:text-indigo-400">
                      {filteredBank.length}
                    </strong>
                    /{bankQuestions.length}
                  </span>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
                {isLoadingBank ? (
                  <div className="flex h-48 items-center justify-center">
                    <SpinnerBlock size="sm" />
                  </div>
                ) : (
                  <div className="space-y-3 pr-1">
                    {filteredBank.map((q, idx) => {
                      const originalIndex = bankQuestions.findIndex((bq) => bq === q);
                      const isSelected = selectedBankIndexes.includes(originalIndex);
                      const qText = q.questionText || "";
                      const categoryName =
                        q.questionCategory?.name ?? q.questionCategory?.categoryName;
                      const difficultyLabel =
                        q.questionLevel === "EASY"
                          ? t("common.difficultyEasy")
                          : q.questionLevel === "MEDIUM"
                            ? t("common.difficultyMedium")
                            : q.questionLevel === "HARD"
                              ? t("common.difficultyHard")
                              : q.questionLevel;

                      return (
                        <div
                          key={q.id ?? idx}
                          onClick={() => toggleBankSelection(originalIndex)}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-[10px] border p-3.5 transition-all",
                            isSelected
                              ? "border-indigo-500 bg-indigo-500/[0.04] dark:bg-indigo-950/15"
                              : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/20 dark:hover:border-slate-700"
                          )}>
                          <div className="mt-0.5">
                            <div
                              className={cn(
                                "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                                isSelected
                                  ? "border-indigo-600 bg-indigo-600 text-white"
                                  : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950"
                              )}>
                              {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {categoryName && (
                                <span className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-600/10 ring-inset dark:bg-indigo-950/30 dark:text-indigo-400">
                                  {categoryName}
                                </span>
                              )}
                              {difficultyLabel && (
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset",
                                    q.questionLevel === "EASY" &&
                                      "bg-green-50 text-green-700 ring-green-600/10 dark:bg-green-950/20 dark:text-green-400",
                                    q.questionLevel === "MEDIUM" &&
                                      "bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-950/20 dark:text-amber-400",
                                    q.questionLevel === "HARD" &&
                                      "bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-950/20 dark:text-red-400"
                                  )}>
                                  {difficultyLabel}
                                </span>
                              )}
                              <span className="ml-auto text-[10px] font-semibold text-slate-400">
                                10 {t("common.score")}
                              </span>
                            </div>
                            <p className="line-clamp-2 text-sm leading-5 font-medium text-slate-700 dark:text-slate-200">
                              {qText.length > 160 ? qText.substring(0, 160) + "..." : qText}
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    {filteredBank.length === 0 && (
                      <div className="py-10 text-center text-xs text-slate-500">
                        {t("adminQuizProblem.noMatchingQuestion")}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-slate-100/80 px-6 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedBankIndexes.length > 0
                    ? `${selectedBankIndexes.length} ${t("common.selected").toLowerCase()}`
                    : t("adminQuizProblem.selectQuestionToViewDetails")}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRightView("idle");
                      setSelectedIndex(null);
                    }}
                    className="h-9 rounded-[10px] border-slate-300 bg-white px-4 text-xs dark:border-slate-700 dark:bg-slate-950">
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={selectedBankIndexes.length === 0}
                    onClick={addSelectedFromBank}
                    className="h-9 min-w-44 rounded-[10px] bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700">
                    {t("common.add")}
                    {selectedBankIndexes.length > 0 ? ` (${selectedBankIndexes.length})` : ""}{" "}
                    {t("adminQuizProblem.intoRound")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
