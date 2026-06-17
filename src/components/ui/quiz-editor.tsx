"use client";

import {
  Check,
  Code,
  Edit2,
  FolderOpen,
  HelpCircle,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import * as React from "react";

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
import { cn } from "@/lib/utils";

export interface QuizQuestion {
  questionText?: string;
  options?: string[];
  correctAnswer?: string;
  points?: number;
}

interface QuizEditorProps {
  questions: QuizQuestion[];
  onChange: (questions: QuizQuestion[]) => void;
  disabled?: boolean;
}

const MOCK_QUESTION_BANK = [
  {
    questionText: "Trong JavaScript, kết quả của biểu thức console.log(typeof NaN) là gì?",
    options: ['"number"', '"NaN"', '"undefined"', '"object"'],
    correctAnswer: '"number"',
    points: 10,
    category: "JavaScript",
    difficulty: "Dễ",
  },
  {
    questionText:
      "Đâu là kết quả đúng của đoạn mã sau:\n```javascript\nconst a = [1, 2, 3];\nconst b = a;\nb.push(4);\nconsole.log(a.length);\n```",
    options: ["3", "4", "5", "Undefined"],
    correctAnswer: "4",
    points: 10,
    category: "JavaScript",
    difficulty: "Trung bình",
  },
  {
    questionText:
      "Trong CSS, thuộc tính nào dùng để căn giữa một phần tử con có vị trí tuyệt đối (position: absolute) cả theo chiều dọc và chiều ngang?",
    options: [
      "top: 50%; left: 50%; transform: translate(-50%, -50%);",
      "align-items: center; justify-content: center;",
      "margin: auto;",
      "vertical-align: middle;",
    ],
    correctAnswer: "top: 50%; left: 50%; transform: translate(-50%, -50%);",
    points: 15,
    category: "CSS",
    difficulty: "Trung bình",
  },
  {
    questionText:
      "Trong React, Hook `useEffect` với mảng phụ thuộc rỗng (empty dependency array `[]`) sẽ thực thi khi nào?",
    options: [
      "Chỉ chạy một lần duy nhất sau khi component được mount (chèn vào DOM)",
      "Chạy sau mỗi lần component re-render",
      "Chạy trước khi component unmount",
      "Không bao giờ chạy",
    ],
    correctAnswer: "Chỉ chạy một lần duy nhất sau khi component được mount (chèn vào DOM)",
    points: 10,
    category: "React",
    difficulty: "Dễ",
  },
  {
    questionText: "Câu lệnh SQL nào dùng để đếm số dòng có giá trị khác NULL trong một cột?",
    options: ["COUNT(column_name)", "COUNT(*)", "SUM(column_name)", "TOTAL(column_name)"],
    correctAnswer: "COUNT(column_name)",
    points: 10,
    category: "SQL",
    difficulty: "Dễ",
  },
  {
    questionText:
      "Cho đoạn mã SQL sau:\n```sql\nSELECT name, salary \nFROM employees \nWHERE salary > (SELECT AVG(salary) FROM employees);\n```\nTruy vấn con này được gọi là gì?",
    options: [
      "Subquery độc lập (Non-correlated Subquery)",
      "Subquery tương quan (Correlated Subquery)",
      "Subquery lồng ghép chéo (Cross Join Subquery)",
      "Recursive CTE",
    ],
    correctAnswer: "Subquery độc lập (Non-correlated Subquery)",
    points: 20,
    category: "SQL",
    difficulty: "Khó",
  },
  {
    questionText:
      "Trong lập trình hướng đối tượng (OOP), tính chất nào cho phép các lớp con định nghĩa lại một phương thức đã có ở lớp cha?",
    options: [
      "Tính đa hình (Polymorphism / Overriding)",
      "Tính kế thừa (Inheritance)",
      "Tính đóng gói (Encapsulation)",
      "Tính trừu tượng (Abstraction)",
    ],
    correctAnswer: "Tính đa hình (Polymorphism / Overriding)",
    points: 10,
    category: "OOP",
    difficulty: "Dễ",
  },
];

export function QuizEditor({ questions = [], onChange, disabled = false }: QuizEditorProps) {
  // Modal states
  const [editorModalOpen, setEditorModalOpen] = React.useState(false);
  const [bankModalOpen, setBankModalOpen] = React.useState(false);

  // Edit states
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [editForm, setEditForm] = React.useState<QuizQuestion>({
    questionText: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    points: 10,
  });

  // Question Bank selection states
  const [selectedBankIndexes, setSelectedBankIndexes] = React.useState<number[]>([]);
  const [bankSearch, setBankSearch] = React.useState("");
  const [bankCategory, setBankCategory] = React.useState("All");
  const [bankDifficulty, setBankDifficulty] = React.useState("All");

  const openAddModal = () => {
    setEditingIndex(-1);
    setEditForm({
      questionText: "",
      options: ["", "", "", ""],
      correctAnswer: "",
      points: 10,
    });
    setEditorModalOpen(true);
  };

  const openEditModal = (index: number) => {
    const q = questions[index];
    setEditingIndex(index);
    setEditForm({
      questionText: q.questionText || "",
      options: [...(q.options || ["", "", "", ""])],
      correctAnswer: q.correctAnswer || "",
      points: q.points ?? 10,
    });
    setEditorModalOpen(true);
  };

  const saveQuestion = () => {
    if (!editForm.questionText?.trim()) return;

    const updated = [...questions];
    const finalForm = {
      questionText: editForm.questionText || "",
      options: editForm.options || ["", "", "", ""],
      correctAnswer: editForm.correctAnswer || (editForm.options && editForm.options[0]) || "",
      points: editForm.points ?? 10,
    };

    if (editingIndex === -1) {
      updated.push(finalForm);
    } else if (editingIndex !== null) {
      updated[editingIndex] = finalForm;
    }

    onChange(updated);
    setEditorModalOpen(false);
    setEditingIndex(null);
  };

  const deleteQuestion = (index: number) => {
    const updated = questions.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  // Question bank filters
  const filteredBank = MOCK_QUESTION_BANK.filter((q) => {
    const matchesSearch = (q.questionText || "").toLowerCase().includes(bankSearch.toLowerCase());
    const matchesCategory = bankCategory === "All" || q.category === bankCategory;
    const matchesDifficulty = bankDifficulty === "All" || q.difficulty === bankDifficulty;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const toggleBankSelection = (index: number) => {
    setSelectedBankIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const addSelectedFromBank = () => {
    const selectedQuestions = selectedBankIndexes.map((idx) => {
      const q = MOCK_QUESTION_BANK[idx];
      return {
        questionText: q.questionText,
        options: [...q.options],
        correctAnswer: q.correctAnswer,
        points: q.points,
      };
    });

    onChange([...questions, ...selectedQuestions]);
    setBankModalOpen(false);
    setSelectedBankIndexes([]);
  };

  const categories = ["All", "JavaScript", "CSS", "React", "SQL", "OOP"];

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Câu hỏi trắc nghiệm ({questions.length})
          </h4>
          <p className="text-[11px] text-slate-500">
            Tổng số điểm: {questions.reduce((sum, q) => sum + (q.points || 0), 0)} điểm
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Question Bank Trigger */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => {
              setSelectedBankIndexes([]);
              setBankSearch("");
              setBankCategory("All");
              setBankDifficulty("All");
              setBankModalOpen(true);
            }}
            className="h-8 border-slate-200 text-xs font-semibold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900">
            <FolderOpen className="mr-1.5 h-3.5 w-3.5 text-indigo-500" />
            Ngân hàng câu hỏi
          </Button>

          {/* Add Question Button */}
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            onClick={openAddModal}
            className="h-8 bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Thêm câu hỏi
          </Button>
        </div>
      </div>

      {/* List of current questions */}
      <div className="max-h-[350px] space-y-2.5 overflow-y-auto pr-1">
        {questions.map((q, idx) => {
          const qText = q.questionText || "";
          const isCode = qText.includes("```");
          return (
            <div
              key={idx}
              className="group flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-slate-700">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-5 items-center justify-center rounded-md bg-slate-100 px-1.5 text-[10px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                    Câu {idx + 1}
                  </span>
                  <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-600/10 ring-inset dark:bg-emerald-950/30 dark:text-emerald-400">
                    {q.points ?? 10} điểm
                  </span>
                  {isCode && (
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-600/10 ring-inset dark:bg-indigo-950/30 dark:text-indigo-400">
                      <Code className="h-3 w-3" /> Chứa code
                    </span>
                  )}
                </div>

                <p className="line-clamp-2 text-xs leading-relaxed font-medium break-words text-slate-800 dark:text-slate-300">
                  {qText.replace(/```[\s\S]*?```/g, "[Đoạn mã code]")}
                </p>

                {/* Compact choices preview */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 text-[10px] text-slate-500">
                  {(q.options || []).slice(0, 4).map((opt, oIdx) => {
                    const isCorrect = opt === q.correctAnswer;
                    return (
                      <div key={oIdx} className="flex min-w-0 items-center gap-1">
                        <span
                          className={cn(
                            "shrink-0 font-bold",
                            isCorrect ? "text-emerald-500" : "text-slate-400"
                          )}>
                          {String.fromCharCode(65 + oIdx)}.
                        </span>
                        <span
                          className={cn(
                            "truncate",
                            isCorrect && "font-semibold text-emerald-600 dark:text-emerald-400"
                          )}>
                          {opt}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              {!disabled && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditModal(idx)}
                    className="h-8 w-8 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteQuestion(idx)}
                    className="h-8 w-8 text-slate-400 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {questions.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-10 dark:border-slate-800">
            <HelpCircle className="text-slate-350 mb-2 h-8 w-8 dark:text-slate-600" />
            <p className="text-xs text-slate-500">Chưa có câu hỏi trắc nghiệm nào.</p>
            <p className="mt-1 text-[10px] text-slate-400">
              Bấm nút ở trên để tạo câu hỏi tay hoặc lấy từ ngân hàng câu hỏi.
            </p>
          </div>
        )}
      </div>

      {/* Editor Overlay Modal (Manual Add / Edit) */}
      {editorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                {editingIndex === -1
                  ? "Thêm câu hỏi mới"
                  : `Chỉnh sửa câu hỏi #${(editingIndex || 0) + 1}`}
              </h3>
              <button
                type="button"
                onClick={() => setEditorModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[75vh] space-y-4 overflow-y-auto p-5">
              {/* Question Text */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nội dung câu hỏi
                </Label>
                <textarea
                  value={editForm.questionText || ""}
                  onChange={(e) => setEditForm({ ...editForm, questionText: e.target.value })}
                  placeholder="Nhập nội dung câu hỏi (ví dụ: JavaScript là gì?)... Bạn có thể sử dụng ký hiệu ``` để bọc mã code nếu cần."
                  className="min-h-[100px] w-full rounded-lg border border-slate-200 bg-white p-3 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Options */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Các phương án lựa chọn (A, B, C, D)
                </Label>
                {(editForm.options || ["", "", "", ""]).map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <span className="w-5 text-center text-xs font-bold text-slate-400">
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...(editForm.options || ["", "", "", ""])];
                        newOpts[oIdx] = e.target.value;
                        setEditForm({ ...editForm, options: newOpts });
                      }}
                      placeholder={`Phương án ${String.fromCharCode(65 + oIdx)}`}
                      className="h-8.5 border-slate-200 bg-white text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                ))}
              </div>

              {/* Correct Answer & Score */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Đáp án đúng
                  </Label>
                  <Select
                    value={editForm.correctAnswer || ""}
                    onValueChange={(val) => setEditForm({ ...editForm, correctAnswer: val })}>
                    <SelectTrigger className="h-8.5 border-slate-200 bg-white text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                      <SelectValue placeholder="Chọn đáp án đúng" />
                    </SelectTrigger>
                    <SelectContent className="border-slate-200 bg-white text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                      {(editForm.options || ["", "", "", ""]).map((opt, oIdx) => (
                        <SelectItem
                          key={oIdx}
                          value={opt || `Option-${oIdx}`}
                          disabled={!opt.trim()}>
                          {String.fromCharCode(65 + oIdx)}. {opt || "(Chưa nhập)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Điểm số
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={editForm.points ?? 10}
                    onChange={(e) => setEditForm({ ...editForm, points: Number(e.target.value) })}
                    className="h-8.5 border-slate-200 bg-white text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditorModalOpen(false)}
                className="h-8 border-slate-200 text-xs dark:border-slate-800">
                Hủy
              </Button>
              <Button
                type="button"
                onClick={saveQuestion}
                className="h-8 bg-emerald-600 px-4 text-xs text-white hover:bg-emerald-700">
                Lưu câu hỏi
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Question Bank Modal */}
      {bankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Ngân hàng câu hỏi trắc nghiệm
                </h3>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  Chọn các câu hỏi có sẵn để điền nhanh vào vòng thi tuyển dụng này.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBankModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 p-4 md:flex-row dark:border-slate-800 dark:bg-slate-950/20">
              <div className="relative flex-1">
                <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  placeholder="Tìm kiếm nội dung câu hỏi..."
                  className="h-8.5 border-slate-200 bg-white pl-8 text-xs dark:border-slate-800 dark:bg-slate-950"
                />
              </div>

              {/* Category selector */}
              <div className="flex flex-wrap items-center gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setBankCategory(cat)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[10px] font-bold transition-all",
                      bankCategory === cat
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-sm shadow-indigo-600/10"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
                    )}>
                    {cat === "All" ? "Tất cả" : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Questions list */}
            <div className="max-h-[50vh] space-y-3 overflow-y-auto p-4">
              {filteredBank.map((q, idx) => {
                // Find original index in MOCK_QUESTION_BANK
                const originalIndex = MOCK_QUESTION_BANK.findIndex(
                  (bq) => bq.questionText === q.questionText
                );
                const isSelected = selectedBankIndexes.includes(originalIndex);

                return (
                  <div
                    key={idx}
                    onClick={() => toggleBankSelection(originalIndex)}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all",
                      isSelected
                        ? "border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/10"
                        : "hover:border-slate-350 dark:hover:border-slate-750 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/20"
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
                        <span className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 ring-1 ring-indigo-600/10 ring-inset dark:bg-indigo-950/30 dark:text-indigo-400">
                          {q.category}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold ring-1 ring-inset",
                            q.difficulty === "Dễ" &&
                              "bg-green-50 text-green-700 ring-green-600/10 dark:bg-green-950/20 dark:text-green-400",
                            q.difficulty === "Trung bình" &&
                              "bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-950/20 dark:text-amber-400",
                            q.difficulty === "Khó" &&
                              "bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-950/20 dark:text-green-400" // Note: fixed syntax here
                          )}>
                          {q.difficulty}
                        </span>
                        <span className="ml-auto text-[10px] font-semibold text-slate-400">
                          {q.points} điểm
                        </span>
                      </div>

                      <p className="dark:border-slate-850 rounded-lg border border-slate-100 bg-slate-50 p-2 font-mono text-xs leading-relaxed font-semibold whitespace-pre-wrap text-slate-800 dark:bg-slate-900/40 dark:text-slate-200">
                        {q.questionText}
                      </p>

                      <div className="grid grid-cols-2 gap-2 pl-1 text-[10px] text-slate-500">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="truncate">
                            <span className="font-bold text-slate-400">
                              {String.fromCharCode(65 + oIdx)}.{" "}
                            </span>
                            <span>{opt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredBank.length === 0 && (
                <div className="py-10 text-center text-xs text-slate-500">
                  Không tìm thấy câu hỏi phù hợp.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-b-2xl border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <span className="text-xs font-medium text-slate-500">
                Đã chọn{" "}
                <strong className="text-indigo-600 dark:text-indigo-400">
                  {selectedBankIndexes.length}
                </strong>{" "}
                câu hỏi
              </span>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBankModalOpen(false)}
                  className="h-8 border-slate-200 text-xs dark:border-slate-800">
                  Hủy
                </Button>
                <Button
                  type="button"
                  disabled={selectedBankIndexes.length === 0}
                  onClick={addSelectedFromBank}
                  className="h-8 bg-indigo-600 px-4 text-xs text-white hover:bg-indigo-700">
                  Thêm vào vòng thi
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
