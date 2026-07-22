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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { questionBankManager } from "@/services/question-bank.manager";
import { Loader2, Plus, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { QuestionBank, QuestionBankFormData, QuestionCategory } from "../types";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

  const [formData, setFormData] = useState<Partial<QuestionBankFormData>>({
    options: ["", "", "", ""],
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
      setFormData({ options: ["", "", "", ""] });
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

    if (formData.correctAnswer && formData.correctAnswer === oldValue && oldValue !== "") {
      patch({ options: opts, correctAnswer: value });
    } else {
      patch({ options: opts });
    }
  };

  const toggleCorrectAnswer = (value: string) => {
    if (!value.trim()) return;
    if (formData.correctAnswer === value) {
      patch({ correctAnswer: "" });
    } else {
      patch({ correctAnswer: value });
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

    setIsSubmitting(true);
    try {
      let res;
      if (initialData?.id) {
        res = await questionBankManager.update(initialData.id, formData as QuestionBankFormData);
      } else {
        res = await questionBankManager.create(formData as QuestionBankFormData);
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
        const match = part.match(/```([^\n]*)\n([\s\S]*?)```/);
        const lang = match && match[1] ? match[1].trim() : "javascript";
        const code = match ? match[2] : part.slice(3, -3);
        blocks.push({
          id: `b-${idx}`,
          type: "code",
          lang: lang || "javascript",
          content: code,
        });
      } else {
        blocks.push({
          id: `b-${idx}`,
          type: "text",
          content: part,
        });
      }
    });

    // Filter out redundant empty text blocks when multiple blocks exist
    const filtered = blocks.filter((b) => {
      if (b.type === "text" && b.content.trim() === "" && blocks.length > 1) {
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
          return `\n\`\`\`${b.lang || "javascript"}\n${b.content}\n\`\`\`\n`;
        }
        return b.content;
      })
      .join("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-6xl flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 p-0 shadow-2xl dark:border-slate-800 [&>button]:hidden">
        <DialogHeader className="hidden">
          <DialogTitle>{initialData?.id ? "Chi tiết câu hỏi" : "Tạo câu hỏi mới"}</DialogTitle>
          <DialogDescription>Tạo hoặc chỉnh sửa câu hỏi trắc nghiệm</DialogDescription>
        </DialogHeader>

        <div className="flex h-full flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-950">
          {/* ── TOP BAR (Clean title + Close 'X' button) ────────────────────────── */}
          <div className="flex flex-none items-center justify-between border-b border-slate-200/80 bg-white px-6 py-3.5 dark:border-slate-800/80 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                {initialData?.id ? "Chi tiết câu hỏi" : "Tạo câu hỏi mới"}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* ── MAIN CONTENT (SPLIT PANE) ────────────────────────────────────────── */}
          <div className="flex min-h-[420px] flex-1 overflow-hidden">
            {/* LEFT COLUMN: Question Text & AI */}
            <div className="flex flex-1 flex-col overflow-y-auto p-6 md:p-8">
              <div className="mx-auto w-full max-w-3xl space-y-5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                    Nội dung câu hỏi (Live Document)
                  </Label>
                  {!showAI && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 border-slate-200 px-2.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:border-slate-800 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                      onClick={() => {
                        const blocks = parseBlocks(formData.questionText || "");
                        blocks.push({
                          id: `b-${Date.now()}`,
                          type: "code",
                          lang: "javascript",
                          content: "// Thêm mã nguồn tại đây\n",
                        });
                        patch({ questionText: serializeBlocks(blocks) });
                      }}>
                      <Plus className="h-3.5 w-3.5" /> Chèn Code Block
                    </Button>
                  )}
                </div>

                {showAI && (
                  <div className="animate-in slide-in-from-top-2 fade-in rounded-xl border border-indigo-100 bg-white p-5 shadow-sm dark:border-indigo-900/50 dark:bg-slate-900">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {t("question.relatedTopics")}
                        </Label>
                        <Input
                          placeholder="VD: Spring Boot, AOP, Transactional..."
                          value={aiTopics}
                          onChange={(e) => setAiTopics(e.target.value)}
                          className="h-9 focus-visible:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {t("question.additionalPrompt")}
                        </Label>
                        <Textarea
                          placeholder={t("question.promptExample")}
                          rows={2}
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          className="resize-none focus-visible:ring-indigo-500"
                        />
                      </div>
                      <Button
                        type="button"
                        className="w-full bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
                        onClick={handleGenerate}
                        disabled={aiLoading}>
                        {aiLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        {aiLoading ? t("ai.generatingQuestion") : t("ai.startGenerating")}
                      </Button>
                    </div>
                  </div>
                )}

                {!showAI && (
                  <div className="min-h-[360px] space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
                                Xóa Code Block
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
                              placeholder="Nhập mã nguồn..."
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
                          rows={Math.max(3, block.content.split("\n").length)}
                          placeholder="Nhập nội dung văn bản câu hỏi..."
                          className="w-full resize-y rounded-xl border-slate-200 bg-slate-50/50 p-3.5 text-[14px] leading-relaxed text-slate-800 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Config, Options & Footer Actions */}
            <div className="w-[420px] flex-none overflow-y-auto border-l border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="space-y-6 p-6">
                {/* Category & Difficulty */}
                <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="space-y-2.5">
                    <Label className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                      {t("general.category")}
                    </Label>
                    <Select
                      value={formData.questionCategoryId?.toString() || ""}
                      onValueChange={(val) => patch({ questionCategoryId: parseInt(val) })}>
                      <SelectTrigger className="h-9 bg-slate-50 focus:ring-indigo-500 dark:bg-slate-950">
                        <SelectValue placeholder={t("category.selectCategory")} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id!.toString()}>
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
                            className="h-8 text-xs focus-visible:ring-indigo-500"
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 px-3"
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

                  <div className="space-y-2.5">
                    <Label className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                      {t("common.difficulty")}
                    </Label>
                    <ToggleGroup
                      type="single"
                      value={formData.questionLevel || "EASY"}
                      onValueChange={(val: "EASY" | "MEDIUM" | "HARD") => {
                        if (val) patch({ questionLevel: val });
                      }}
                      className="justify-start gap-2">
                      <ToggleGroupItem
                        value="EASY"
                        className={`flex-1 rounded-lg border px-3 text-xs font-medium transition-colors data-[state=on]:border-emerald-500 data-[state=on]:bg-emerald-50 data-[state=on]:text-emerald-700 dark:data-[state=on]:bg-emerald-950/40 dark:data-[state=on]:text-emerald-400`}>
                        Dễ
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="MEDIUM"
                        className={`flex-1 rounded-lg border px-3 text-xs font-medium transition-colors data-[state=on]:border-amber-500 data-[state=on]:bg-amber-50 data-[state=on]:text-amber-700 dark:data-[state=on]:bg-amber-950/40 dark:data-[state=on]:text-amber-400`}>
                        TB
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="HARD"
                        className={`flex-1 rounded-lg border px-3 text-xs font-medium transition-colors data-[state=on]:border-rose-500 data-[state=on]:bg-rose-50 data-[state=on]:text-rose-700 dark:data-[state=on]:bg-rose-950/40 dark:data-[state=on]:text-rose-400`}>
                        Khó
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                    <Label className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                      {t("question.answers")}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addOption}
                      className="h-6 px-2 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
                      <Plus className="mr-1 h-3 w-3" /> {t("question.addAnswer")}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {(formData.options || []).map((opt, idx) => {
                      const optLetter = String.fromCharCode(65 + idx);
                      const isCorrect =
                        (formData.correctAnswer === opt && opt.trim() !== "") ||
                        formData.correctAnswer?.trim().toUpperCase() === optLetter;

                      return (
                        <div key={idx} className="group relative">
                          <button
                            type="button"
                            onClick={() => toggleCorrectAnswer(opt)}
                            title={t("question.markAsCorrect")}
                            className={`absolute top-1/2 left-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[11px] font-bold transition-all ${
                              isCorrect
                                ? "bg-emerald-500 text-white shadow-md"
                                : "bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-emerald-900/40 dark:hover:text-emerald-300"
                            }`}>
                            {optLetter}
                          </button>
                          <Input
                            value={opt}
                            onChange={(e) => updateOption(idx, e.target.value)}
                            placeholder={`Nhập đáp án...`}
                            className={`h-10 pr-9 pl-10 text-[13px] shadow-sm transition-colors focus-visible:ring-indigo-500 ${
                              isCorrect
                                ? "border-emerald-500 bg-emerald-50/50 font-medium text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-50"
                                : "border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
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

                {/* FOOTER ACTIONS (AI Magic, Hủy, Lưu/Cập nhật) */}
                <div className="space-y-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAI(!showAI)}
                    className={`h-9 w-full justify-center text-xs font-semibold transition-colors ${
                      showAI
                        ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}>
                    <Wand2 className="mr-1.5 h-3.5 w-3.5 text-indigo-500" />
                    {showAI ? "Ẩn AI Magic" : "Sinh câu hỏi bằng AI Magic"}
                  </Button>

                  <div className="flex items-center justify-end gap-2.5">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => onOpenChange(false)}
                      className="h-9 px-4 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
                      {t("general.cancel")}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting || aiLoading}
                      className="h-9 bg-indigo-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                      {isSubmitting ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      {initialData ? t("general.update", "Cập nhật") : t("general.save", "Lưu")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
