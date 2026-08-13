import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { questionBankManager } from "@/services/question-bank.manager";
import {
  CheckSquare,
  FileText,
  FolderTree,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { QuestionBank, QuestionBankFormData, QuestionCategory } from "../types";

interface QuestionBankEditorProps {
  initialData: QuestionBank | null;
  categories: QuestionCategory[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onCreateCategory: (name: string) => Promise<number | undefined>;
}

const SUPPORTED_LANGUAGES = [
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "Java", value: "java" },
  { label: "Python", value: "python" },
  { label: "C++", value: "cpp" },
  { label: "C#", value: "csharp" },
  { label: "HTML", value: "html" },
  { label: "CSS", value: "css" },
  { label: "SQL", value: "sql" },
  { label: "JSON", value: "json" },
  { label: "Bash", value: "bash" },
  { label: "Go", value: "go" },
  { label: "PHP", value: "php" },
];

export function QuestionBankEditor({
  initialData,
  categories,
  isOpen,
  onOpenChange,
  onSaved,
  onCreateCategory,
}: QuestionBankEditorProps) {
  const { t } = useTranslation();
  const isEdit = !!initialData?.id;

  const [formData, setFormData] = useState<Partial<QuestionBankFormData>>({
    options: ["", "", "", ""],
    questionLevel: "EASY",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Category creation
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  // AI State
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTopics, setAiTopics] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");

  const normalizeNewlines = (str?: string) => {
    if (!str) return "";
    return str.replace(/\\n/g, "\n");
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        questionCategoryId: initialData.questionCategory?.id,
        questionLevel: initialData.questionLevel,
        questionText: normalizeNewlines(initialData.questionText),
        options: initialData.options || [],
        correctAnswer: initialData.correctAnswer,
      });
    } else {
      setFormData({ options: ["", "", "", ""], questionLevel: "EASY" });
    }
  }, [initialData]);

  const patch = (update: Partial<QuestionBankFormData>) => {
    setFormData((prev) => ({ ...prev, ...update }));
  };

  const handleCreateCategorySubmit = async () => {
    if (!newCategoryName.trim()) return;
    setIsSubmittingCategory(true);
    const newId = await onCreateCategory(newCategoryName.trim());
    if (newId) {
      patch({ questionCategoryId: newId });
      setNewCategoryName("");
    }
    setIsSubmittingCategory(false);
  };

  const handleGenerate = async () => {
    if (!aiTopics.trim()) {
      toast.error(t("question.enterTopicsFirst"));
      return;
    }
    setAiLoading(true);
    const res = await questionBankManager.generateByAI({
      topics: aiTopics
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      additionalPrompt: aiPrompt,
      difficulty: formData.questionLevel || "MEDIUM",
    });
    setAiLoading(false);

    if (res.success && res.data) {
      patch({
        questionText: normalizeNewlines(res.data.questionText),
        options: res.data.options,
        correctAnswer: res.data.correctAnswer,
      });
      toast.success(t("ai.generateQuestionSuccess"));
      setShowAI(false);
    } else {
      toast.error(res.error || t("ai.generateQuestionError"));
    }
  };

  const addOption = () => {
    patch({ options: [...(formData.options || []), ""] });
  };

  const updateOption = (index: number, value: string) => {
    const opts = [...(formData.options || [])];
    const oldValue = opts[index];
    opts[index] = value;

    if (formData.correctAnswer) {
      const optLetter = String.fromCharCode(65 + index);
      const wasSelectedAsText = formData.correctAnswer === oldValue && oldValue !== "";
      const wasSelectedAsLetter = formData.correctAnswer === optLetter;

      if (wasSelectedAsText || wasSelectedAsLetter) {
        const next = value.trim() !== "" ? value : optLetter;
        patch({ options: opts, correctAnswer: next });
        return;
      }
    }

    patch({ options: opts });
  };

  const toggleCorrectAnswer = (index: number) => {
    const optLetter = String.fromCharCode(65 + index);
    const optText = (formData.options || [])[index] ?? "";

    const candidate = optText.trim() !== "" ? optText : optLetter;

    if (formData.correctAnswer === candidate) {
      patch({ correctAnswer: "" });
    } else {
      patch({ correctAnswer: candidate });
    }
  };

  const removeOption = (index: number) => {
    const opts = [...(formData.options || [])];
    opts.splice(index, 1);
    patch({ options: opts });
  };

  const handleSubmit = async () => {
    if (!formData.questionCategoryId || !formData.questionLevel || !formData.questionText) {
      toast.error(t("question.enterAllFields"));
      return;
    }

    const rawAnswer = (formData.correctAnswer ?? "").trim();
    if (!rawAnswer) {
      toast.error(
        t(
          "question.pleaseSelectCorrectAnswer",
          "Vui lòng chọn 1 đáp án đúng (click vào nút A/B/C/D)."
        )
      );
      return;
    }
    const opts = formData.options || [];
    const answerIndex = (() => {
      if (rawAnswer.length === 1) {
        const idx = rawAnswer.toUpperCase().charCodeAt(0) - 65;
        if (idx >= 0 && idx < opts.length) return idx;
      }
      return opts.findIndex((o) => o === rawAnswer);
    })();
    if (answerIndex === -1 || !opts[answerIndex] || opts[answerIndex].trim() === "") {
      toast.error(
        t(
          "question.pleaseSelectCorrectAnswer",
          "Vui lòng chọn 1 đáp án đúng (click vào nút A/B/C/D)."
        )
      );
      return;
    }
    const payload: QuestionBankFormData = {
      ...(formData as QuestionBankFormData),
      correctAnswer: opts[answerIndex],
    };

    setIsSubmitting(true);
    try {
      let res;
      if (initialData?.id) {
        res = await questionBankManager.update(initialData.id, payload);
      } else {
        res = await questionBankManager.create(payload);
      }

      if (res.success) {
        toast.success(initialData ? t("general.updateSuccess") : t("general.addSuccess"));
        onSaved();
        onOpenChange(false);
      } else {
        toast.error(res.error || t("compCodingSubmissionModal.errorOccurred"));
      }
    } catch {
      toast.error(t("error.systemError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const parseBlocks = (rawText: string) => {
    if (!rawText) return [{ id: "b-0", type: "text" as const, content: "" }];
    const text = rawText.replace(/\\n/g, "\n");
    const parts = text.split(/(```[\s\S]*?```)/g);
    const blocks: { id: string; type: "text" | "code"; lang?: string; content: string }[] = [];

    parts.forEach((part, idx) => {
      if (!part) return;
      if (part.startsWith("```") && part.endsWith("```")) {
        const firstNewline = part.indexOf("\n");
        let lang = "javascript";
        let code = "";
        if (firstNewline !== -1) {
          lang = part.slice(3, firstNewline).trim() || "javascript";
          code = part.slice(firstNewline + 1, -3);
        } else {
          code = part.slice(3, -3);
        }
        if (code.endsWith("\n")) {
          code = code.slice(0, -1);
        }
        blocks.push({
          id: `b-${idx}`,
          type: "code",
          lang: lang || "javascript",
          content: code,
        });
      } else {
        let textContent = part;
        if (textContent.startsWith("\n")) textContent = textContent.slice(1);
        if (textContent.endsWith("\n")) textContent = textContent.slice(0, -1);

        if (textContent !== "" || parts.length === 1) {
          blocks.push({
            id: `b-${idx}`,
            type: "text",
            content: textContent,
          });
        }
      }
    });

    const filtered = blocks.filter((b) => {
      if (b.type === "text" && b.content === "" && blocks.length > 1) {
        return false;
      }
      return true;
    });

    return filtered.length > 0 ? filtered : [{ id: "b-0", type: "text" as const, content: "" }];
  };

  const serializeBlocks = (
    blocks: { id: string; type: "text" | "code"; lang?: string; content: string }[]
  ) => {
    return blocks
      .map((b) => {
        if (b.type === "code") {
          return `\`\`\`${b.lang || "javascript"}\n${b.content}\n\`\`\``;
        }
        return b.content;
      })
      .join("\n");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-h-[880px] w-[98vw] flex-col gap-0 overflow-hidden rounded-[24px] border border-slate-200/90 bg-white !p-0 shadow-2xl sm:max-w-[1360px] dark:border-slate-800 dark:bg-slate-900">
        {/* Top Header matching KioskFormDialog format */}
        <div className="border-b border-slate-200/90 bg-slate-100/90 px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-slate-900 dark:text-white">
              <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              {isEdit
                ? t("adminQuestionbankmanagement.questionDetails", "Chi tiết câu hỏi")
                : t("adminQuestionbankmanagement.createQuestion", "Tạo câu hỏi mới")}
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t(
                "adminQuestionbankmanagement.createOrEditDesc",
                "Quản lý thông tin câu hỏi trắc nghiệm và các lựa chọn đáp án"
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Form Body Split View */}
        <div className="flex min-h-0 flex-1 overflow-hidden bg-white dark:bg-slate-900">
          {/* Left Column: Live Document / Question Text Editor */}
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-6 [scrollbar-gutter:stable] md:p-8">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300">
                  {t("adminQuestionbankmanagement.liveDocTitle", "Nội dung câu hỏi")}
                </span>
                {!showAI && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 rounded-xl border-slate-200 px-3 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-slate-800 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                    onClick={() => {
                      const blocks = parseBlocks(formData.questionText || "");
                      blocks.push({
                        id: `b-${Date.now()}`,
                        type: "code",
                        lang: "javascript",
                        content: `${t("adminQuestionbankmanagement.addCodeHereComment", "// Thêm mã nguồn tại đây")}\n`,
                      });
                      patch({ questionText: serializeBlocks(blocks) });
                    }}>
                    <Plus className="h-3.5 w-3.5" />{" "}
                    {t("adminQuestionbankmanagement.insertCodeBlock", "Chèn Code Block")}
                  </Button>
                )}
              </div>

              {showAI && (
                <div className="animate-in slide-in-from-top-2 fade-in rounded-xl border border-indigo-200 bg-indigo-50/40 p-6 shadow-2xs dark:border-indigo-900/50 dark:bg-slate-950/80">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-indigo-200/80 pb-3 dark:border-indigo-950">
                      <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-xs font-bold tracking-wider text-indigo-900 uppercase dark:text-indigo-200">
                        {t(
                          "adminQuestionbankmanagement.aiGenTitle",
                          "Sinh câu hỏi thông minh bằng AI"
                        )}
                      </h3>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {t("question.relatedTopics")}
                      </Label>
                      <Input
                        placeholder="VD: Spring Boot, AOP, Transactional..."
                        value={aiTopics}
                        onChange={(e) => setAiTopics(e.target.value)}
                        className="h-10 rounded-xl bg-white focus-visible:ring-indigo-500 dark:bg-slate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {t("question.additionalPrompt")}
                      </Label>
                      <Textarea
                        placeholder={t("question.promptExample")}
                        rows={3}
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="resize-none rounded-xl bg-white focus-visible:ring-indigo-500 dark:bg-slate-900"
                      />
                    </div>
                    <Button
                      type="button"
                      className="h-10 w-full rounded-xl bg-indigo-600 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                      onClick={handleGenerate}
                      disabled={aiLoading}>
                      {aiLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="mr-2 h-4 w-4" />
                      )}
                      {aiLoading ? t("ai.generatingQuestion") : t("ai.startGenerating")}
                    </Button>
                  </div>
                </div>
              )}

              {!showAI && (
                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-950/80">
                  {parseBlocks(formData.questionText || "").map((block, index, allBlocks) => {
                    if (block.type === "code") {
                      return (
                        <div
                          key={block.id}
                          className="relative my-3 overflow-hidden rounded-xl border border-slate-800 bg-[#0f172a] shadow-md">
                          <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/90 px-3.5 py-1.5 text-xs text-slate-400">
                            <div className="flex items-center gap-2">
                              <Select
                                value={block.lang || "javascript"}
                                onValueChange={(val) => {
                                  const nextBlocks = [...allBlocks];
                                  nextBlocks[index] = { ...block, lang: val };
                                  patch({ questionText: serializeBlocks(nextBlocks) });
                                }}>
                                <SelectTrigger className="h-6 w-32 border-slate-700 bg-slate-900 font-mono text-xs font-bold text-emerald-400 focus:ring-0 dark:border-slate-700 dark:bg-slate-900">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="dark border-slate-800 bg-slate-900 text-slate-200">
                                  {SUPPORTED_LANGUAGES.map((l) => (
                                    <SelectItem
                                      key={l.value}
                                      value={l.value}
                                      className="font-mono text-xs">
                                      {l.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <span className="font-mono text-[10px] text-slate-500 uppercase">
                                CODE BLOCK
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const nextBlocks = allBlocks.filter((_, i) => i !== index);
                                patch({ questionText: serializeBlocks(nextBlocks) });
                              }}
                              className="text-xs text-slate-500 transition-colors hover:text-rose-400">
                              {t("adminQuestionbankmanagement.deleteCodeBlock", "Xóa Code Block")}
                            </button>
                          </div>
                          <Textarea
                            value={block.content}
                            onChange={(e) => {
                              const nextBlocks = [...allBlocks];
                              nextBlocks[index] = { ...block, content: e.target.value };
                              patch({ questionText: serializeBlocks(nextBlocks) });
                            }}
                            rows={Math.max(4, block.content.split("\n").length)}
                            placeholder={t(
                              "adminQuestionbankmanagement.enterSourceCode",
                              "Nhập mã nguồn..."
                            )}
                            className="w-full resize-y border-0 bg-transparent p-4 font-mono text-[13px] leading-relaxed text-emerald-400 focus:outline-none focus-visible:ring-0 dark:text-emerald-300"
                          />
                        </div>
                      );
                    }

                    return (
                      <Textarea
                        key={block.id}
                        value={block.content}
                        onChange={(e) => {
                          const nextBlocks = [...allBlocks];
                          nextBlocks[index] = { ...block, content: e.target.value };
                          patch({ questionText: serializeBlocks(nextBlocks) });
                        }}
                        rows={Math.max(4, block.content.split("\n").length)}
                        placeholder={t(
                          "adminQuestionbankmanagement.enterTextContent",
                          "Nhập nội dung câu hỏi phỏng vấn tại đây..."
                        )}
                        className="w-full resize-y rounded-xl border-slate-200 bg-white p-4 text-[14.5px] leading-relaxed text-slate-900 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Config Cards */}
          <div className="flex w-[480px] flex-none flex-col border-l border-slate-200/90 bg-slate-50/30 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex-1 space-y-5 overflow-y-auto p-6 [scrollbar-gutter:stable]">
              {/* CARD 1: CẤU HÌNH CÂU HỎI */}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-800/50 dark:bg-slate-950/50">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                      <FolderTree className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[11px] font-bold tracking-wider text-slate-600 uppercase dark:text-slate-400">
                      {t("adminQuestionbankmanagement.questionConfig", "Cấu Hình Câu Hỏi")}
                    </span>
                  </div>
                  {initialData?.id && (
                    <span className="rounded-md border border-indigo-100/50 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:border-indigo-800/30 dark:bg-indigo-900/30 dark:text-indigo-400">
                      ID: #{initialData.id}
                    </span>
                  )}
                </div>
                <div className="space-y-4 p-5">
                  {/* Chuyên mục */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t("general.category")}
                    </Label>
                    <Select
                      value={formData.questionCategoryId?.toString() || ""}
                      onValueChange={(val) => patch({ questionCategoryId: parseInt(val) })}>
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50/50 text-xs font-semibold focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950/50">
                        <SelectValue placeholder={t("category.selectCategory")} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id!.toString()} className="text-xs">
                            {c.categoryName}
                          </SelectItem>
                        ))}
                        <div className="mt-1 flex items-center gap-2 border-t border-slate-100 p-2 dark:border-slate-800">
                          <Input
                            placeholder={t("category.enterCategoryName2")}
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleCreateCategorySubmit();
                              }
                            }}
                            className="h-8 rounded-lg text-xs focus-visible:ring-indigo-500"
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 rounded-lg bg-indigo-600 px-3 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateCategorySubmit();
                            }}
                            disabled={!newCategoryName.trim() || isSubmittingCategory}>
                            {isSubmittingCategory ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Độ khó */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t("common.difficulty")}
                    </Label>
                    <ToggleGroup
                      type="single"
                      value={formData.questionLevel ?? "EASY"}
                      onValueChange={(val: "EASY" | "MEDIUM" | "HARD") => {
                        if (val) patch({ questionLevel: val });
                      }}
                      className="justify-start gap-2">
                      <ToggleGroupItem
                        value="EASY"
                        aria-label="easy"
                        className="flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-all data-[state=on]:border-emerald-500 data-[state=on]:bg-emerald-50 data-[state=on]:text-emerald-700 dark:data-[state=on]:border-emerald-600 dark:data-[state=on]:bg-emerald-950/40 dark:data-[state=on]:text-emerald-400">
                        {t("adminQuestionbankmanagement.easy", "Dễ")}
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="MEDIUM"
                        aria-label="medium"
                        className="flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-all data-[state=on]:border-amber-500 data-[state=on]:bg-amber-50 data-[state=on]:text-amber-700 dark:data-[state=on]:border-amber-600 dark:data-[state=on]:bg-amber-950/40 dark:data-[state=on]:text-amber-400">
                        {t("adminQuestionbankmanagement.medium", "TB")}
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="HARD"
                        aria-label="hard"
                        className="flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-all data-[state=on]:border-rose-500 data-[state=on]:bg-rose-50 data-[state=on]:text-rose-700 dark:data-[state=on]:border-rose-600 dark:data-[state=on]:bg-rose-950/40 dark:data-[state=on]:text-rose-400">
                        {t("adminQuestionbankmanagement.hard", "Khó")}
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </div>
              </div>

              {/* CARD 2: CÁC ĐÁP ÁN */}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-800/50 dark:bg-slate-950/50">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                      <CheckSquare className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[11px] font-bold tracking-wider text-slate-600 uppercase dark:text-slate-400">
                      {t("question.answers")}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addOption}
                    className="h-7 gap-1 px-2.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30">
                    <Plus className="h-3.5 w-3.5" /> {t("question.addAnswer")}
                  </Button>
                </div>
                <div className="space-y-3 p-5">
                  {(formData.options || []).map((opt, idx) => {
                    const optLetter = String.fromCharCode(65 + idx);
                    const isCorrect =
                      (formData.correctAnswer != null &&
                        formData.correctAnswer !== "" &&
                        (formData.correctAnswer === opt ||
                          formData.correctAnswer.toUpperCase() === optLetter)) ||
                      false;

                    return (
                      <div key={idx} className="group relative">
                        <button
                          type="button"
                          onClick={() => toggleCorrectAnswer(idx)}
                          title={t("question.markAsCorrect")}
                          className={`absolute top-1/2 left-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[11px] font-bold transition-all ${
                            isCorrect
                              ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                              : "bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-900/40 dark:hover:text-emerald-300"
                          }`}>
                          {optLetter}
                        </button>
                        <Input
                          value={opt}
                          onChange={(e) => updateOption(idx, e.target.value)}
                          placeholder={t(
                            "adminQuestionbankmanagement.enterAnswerPlaceholder",
                            "Nhập đáp án..."
                          )}
                          className={`h-10 rounded-xl pr-9 pl-10 text-[13px] shadow-none transition-colors focus-visible:ring-indigo-500 ${
                            isCorrect
                              ? "border-emerald-500/80 bg-emerald-50/50 font-medium text-emerald-950 dark:border-emerald-500/50 dark:bg-emerald-950/20 dark:text-emerald-50"
                              : "border-slate-200 bg-slate-50/30 text-slate-900 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100"
                          }`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2 text-slate-400 opacity-100 focus-within:opacity-100 hover:text-rose-600 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 dark:text-slate-500 dark:hover:text-rose-500"
                          onClick={() => removeOption(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DialogFooter matching KioskFormDialog format */}
        <DialogFooter className="gap-2 border-t border-slate-200/90 bg-slate-100/90 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-950">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAI((p) => !p)}
            className={`h-9.5 rounded-xl border-indigo-200 bg-white px-4 text-xs font-bold transition-all dark:border-indigo-800 dark:bg-slate-900 dark:hover:bg-indigo-900/40 ${
              showAI
                ? "border-indigo-300 bg-indigo-50 text-indigo-700 shadow-inner dark:bg-indigo-950/60 dark:text-indigo-200"
                : "text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-indigo-300"
            }`}>
            <Sparkles className="mr-1.5 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            {showAI
              ? t("adminQuestionbankmanagement.hideAiGen", "Ẩn Sinh AI")
              : t("adminQuestionbankmanagement.createAi", "Tạo AI")}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}>
            {t("common.cancel", "Hủy")}
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || aiLoading}
            className="h-9.5 min-w-32 gap-2 rounded-xl bg-indigo-600 px-6 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("common.saving", "Đang lưu...")}
              </>
            ) : isEdit ? (
              t("general.update", "Cập nhật")
            ) : (
              t("general.save", "Tạo câu hỏi")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
