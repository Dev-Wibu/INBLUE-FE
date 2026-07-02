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
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface CodingProblemEditorProps {
  initialData: Partial<CodingProblem> | null;
  onBack: () => void;
  onSaved: () => void;
}

type TabKey = "general" | "testcases" | "codestubs" | "settings";

export function CodingProblemEditor({ initialData, onBack, onSaved }: CodingProblemEditorProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>("general");

  const [formData, setFormData] = useState<Partial<CodingProblem>>(
    initialData || {
      title: "",
      difficulty: "MEDIUM",
      problemStatement: "",
      rulesAndConstraints: [],
      paramTypes: [],
      returnType: "",
      visibleExamples: [],
      hiddenTestCases: [],
      executionTimeLimitMs: 1000,
      memoryLimitMb: 256,
      codeStubs: {},
    }
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");

  // Monaco Editor State
  const [activeLang, setActiveLang] = useState("java");

  // Master-Detail State for Testcases
  const [selectedTcIndex, setSelectedTcIndex] = useState<number | null>(null);

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

  const renderMarkdown = (rawText: string) => {
    if (!rawText) return null;
    const text = rawText.replace(/\\n/g, "\n");
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const match = part.match(/```([^\n]*)\n([\s\S]*?)```/);
        const code = match ? match[2] : part.slice(3, -3);
        const lang = match && match[1] ? match[1].trim() : "";
        return (
          <div key={index} className="relative my-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            {lang && (
              <div className="border-b border-slate-200/50 bg-slate-100/50 px-3 py-1 text-xs font-mono text-slate-500 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-400">
                {lang}
              </div>
            )}
            <pre className="overflow-x-auto p-3 text-[13px] font-mono leading-relaxed text-slate-800 dark:text-slate-100">
              <code>{code}</code>
            </pre>
          </div>
        );
      }
      return (
        <p key={index} className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
          {part}
        </p>
      );
    });
  };

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
      {/* 1. STICKY HEADER */}
      <div className="sticky top-0 z-10 flex flex-col border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span>Bài thi Coding</span>
                <span>/</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {formData.title || "Tạo mới"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={isSubmitting}
              className="bg-indigo-600 px-6 font-medium text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 transition-all">
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Lưu Bài Tập
            </Button>
          </div>
        </div>

        {/* 2. TOP TABS */}
        <div className="flex px-6 space-x-8">
          {[
            { id: "general", label: "Đề bài", icon: FileText },
            { id: "testcases", label: "Test Cases", icon: PlaySquare },
            { id: "codestubs", label: "Code Stubs", icon: Code2 },
            { id: "settings", label: "Cài đặt", icon: Settings2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabKey)}
              className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}>
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.id === "testcases" && (
                <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800">
                  {(formData.hiddenTestCases?.length || 0) + (formData.visibleExamples?.length || 0)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 3. MAIN WORKSPACE */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-7xl h-full">
          
          {/* TAB: GENERAL (SPLIT VIEW) */}
          {activeTab === "general" && (
            <div className="flex h-full flex-col space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-[1fr_200px] gap-6 items-end">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Tiêu đề (Title)
                  </Label>
                  <Input
                    value={formData.title || ""}
                    onChange={(e) => handleFormChange({ title: e.target.value })}
                    className="h-12 text-lg font-bold focus-visible:ring-indigo-500 shadow-sm"
                    placeholder="Ví dụ: Two Sum"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Độ khó
                  </Label>
                  <Select
                    value={formData.difficulty || "MEDIUM"}
                    onValueChange={(val: "EASY" | "MEDIUM" | "HARD") =>
                      handleFormChange({ difficulty: val })
                    }>
                    <SelectTrigger className="h-12 font-medium focus:ring-indigo-500 shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EASY">EASY</SelectItem>
                      <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                      <SelectItem value="HARD">HARD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* AI Magic Generator */}
              <div className="flex items-center gap-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 shadow-sm dark:border-indigo-900/50 dark:bg-indigo-950/20">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="Gõ chủ đề vào đây (VD: Sắp xếp mảng) để AI tự động sinh Đề bài & Test Cases..."
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 text-indigo-900 placeholder:text-indigo-300 dark:text-indigo-100 dark:placeholder:text-indigo-700/50 font-medium"
                  />
                </div>
                <Select
                  value={aiDifficulty}
                  onValueChange={(val: "EASY" | "MEDIUM" | "HARD") => setAiDifficulty(val)}>
                  <SelectTrigger className="w-[120px] h-10 bg-white dark:bg-slate-900 shadow-sm border-indigo-200 dark:border-indigo-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EASY">EASY</SelectItem>
                    <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                    <SelectItem value="HARD">HARD</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  className="h-10 bg-indigo-600 hover:bg-indigo-700 px-6 shadow-sm"
                  onClick={handleGenerateAI}
                  disabled={aiLoading}>
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Tạo tự động
                </Button>
              </div>

              {/* Split Editor */}
              <div className="flex flex-1 gap-6 min-h-[500px]">
                <div className="flex flex-1 flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-950">
                  <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                    Markdown Source
                  </div>
                  <Textarea
                    placeholder="Gõ Markdown tại đây..."
                    value={formData.problemStatement || ""}
                    onChange={(e) => handleFormChange({ problemStatement: e.target.value })}
                    className="flex-1 resize-none rounded-none border-0 p-6 font-mono text-[14px] leading-relaxed focus-visible:ring-0 shadow-none bg-transparent"
                  />
                </div>
                <div className="flex flex-1 flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-950">
                  <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                    Preview Realtime
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-slate-900/10">
                    {formData.problemStatement ? (
                      renderMarkdown(formData.problemStatement)
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-400 italic text-sm">
                        Chưa có nội dung để hiển thị
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TEST CASES (MASTER-DETAIL) */}
          {activeTab === "testcases" && (
            <div className="flex h-[700px] gap-6 animate-in fade-in slide-in-from-bottom-2">
              {/* Master List */}
              <div className="flex w-[320px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="font-bold text-slate-700 dark:text-slate-300">Danh sách Test Cases</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newTc = [...(formData.hiddenTestCases || []), { inputs: [""], expectedOutput: "", weightPoints: 10 }];
                      handleFormChange({ hiddenTestCases: newTc });
                      setSelectedTcIndex(newTc.length - 1);
                    }}
                    className="h-8 w-8 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {formData.hiddenTestCases?.map((tc, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedTcIndex(idx)}
                      className={`group flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition-colors ${
                        selectedTcIndex === idx
                          ? "bg-indigo-50 ring-1 ring-indigo-200 dark:bg-indigo-900/30 dark:ring-indigo-800"
                          : "hover:bg-slate-50 dark:hover:bg-slate-900"
                      }`}>
                      <div>
                        <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          Hidden Test #{idx + 1}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1 font-mono">
                          {tc.inputs ? JSON.stringify(tc.inputs) : "[]"}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newTc = [...(formData.hiddenTestCases || [])];
                          newTc.splice(idx, 1);
                          handleFormChange({ hiddenTestCases: newTc });
                          if (selectedTcIndex === idx) setSelectedTcIndex(null);
                        }}
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </button>
                  ))}
                  {(!formData.hiddenTestCases || formData.hiddenTestCases.length === 0) && (
                    <div className="py-8 text-center text-sm italic text-slate-400">
                      Chưa có Test Case nào
                    </div>
                  )}
                </div>
              </div>

              {/* Detail Form */}
              <div className="flex-1 rounded-xl border border-slate-200 bg-white shadow-sm p-8 dark:border-slate-800 dark:bg-slate-950">
                {selectedTcIndex !== null && formData.hiddenTestCases?.[selectedTcIndex] ? (
                  <div className="space-y-6 max-w-2xl">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">
                      Chi tiết Hidden Test #{selectedTcIndex + 1}
                    </h2>
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Đầu vào (Inputs - JSON Array format)
                      </Label>
                      <Input
                        value={formData.hiddenTestCases[selectedTcIndex].inputs ? JSON.stringify(formData.hiddenTestCases[selectedTcIndex].inputs) : "[]"}
                        onChange={(e) => {
                          try {
                            const arr = JSON.parse(e.target.value);
                            if (Array.isArray(arr)) {
                              const newTc = [...(formData.hiddenTestCases || [])];
                              newTc[selectedTcIndex].inputs = arr.map(String);
                              handleFormChange({ hiddenTestCases: newTc });
                            }
                          } catch {}
                        }}
                        className="h-12 font-mono text-sm shadow-sm"
                        placeholder='Ví dụ: ["1", "2"] hoặc ["[1,2,3]", "4"]'
                      />
                      <p className="text-xs text-slate-500">Mỗi phần tử trong mảng đại diện cho một tham số truyền vào hàm.</p>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Kết quả kỳ vọng (Expected Output)
                      </Label>
                      <Input
                        value={formData.hiddenTestCases[selectedTcIndex].expectedOutput || ""}
                        onChange={(e) => {
                          const newTc = [...(formData.hiddenTestCases || [])];
                          newTc[selectedTcIndex].expectedOutput = e.target.value;
                          handleFormChange({ hiddenTestCases: newTc });
                        }}
                        className="h-12 font-mono text-sm shadow-sm"
                        placeholder="Kết quả hàm trả về (string format)"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Trọng số điểm (Weight Points)
                      </Label>
                      <Input
                        type="number"
                        value={formData.hiddenTestCases[selectedTcIndex].weightPoints || 0}
                        onChange={(e) => {
                          const newTc = [...(formData.hiddenTestCases || [])];
                          newTc[selectedTcIndex].weightPoints = parseInt(e.target.value) || 0;
                          handleFormChange({ hiddenTestCases: newTc });
                        }}
                        className="h-12 max-w-[200px] text-sm shadow-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center space-y-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900">
                      <PlaySquare className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                    </div>
                    <p className="text-slate-500 font-medium">Chọn một Test Case bên trái để bắt đầu chỉnh sửa</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: CODE STUBS */}
          {activeTab === "codestubs" && (
            <div className="animate-in fade-in flex h-[700px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between bg-slate-50 px-6 py-4 border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Mã nguồn Mẫu (Code Stubs)
                  </h2>
                  <p className="text-sm text-slate-500">Mã nguồn ban đầu hiển thị cho thí sinh trên trình biên dịch.</p>
                </div>
                <Select value={activeLang} onValueChange={setActiveLang}>
                  <SelectTrigger className="w-[200px] h-10 font-semibold shadow-sm bg-white dark:bg-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="java">Java</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="cpp">C++</SelectItem>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 relative">
                <Editor
                  height="100%"
                  language={activeLang === "cpp" ? "cpp" : activeLang}
                  theme="vs-dark"
                  value={formData.codeStubs?.[activeLang] || ""}
                  onChange={(val) => {
                    handleFormChange({
                      codeStubs: { ...formData.codeStubs, [activeLang]: val || "" },
                    });
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 15,
                    lineHeight: 26,
                    padding: { top: 24 },
                    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                    formatOnPaste: true,
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === "settings" && (
            <div className="animate-in fade-in max-w-3xl space-y-8">
              <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 pb-4 dark:border-slate-800">
                  Giới hạn Môi trường Thực thi (Execution Limits)
                </h2>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Thời gian chạy tối đa (Time Limit)
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={formData.executionTimeLimitMs || 1000}
                        onChange={(e) => handleFormChange({ executionTimeLimitMs: parseInt(e.target.value) || 1000 })}
                        className="h-12 pl-4 pr-12 text-lg focus-visible:ring-indigo-500 shadow-sm font-mono"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">ms</span>
                    </div>
                    <p className="text-sm text-slate-500">Khuyến nghị: 1000ms cho C++, 2000ms cho Java/Python</p>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Bộ nhớ tối đa (Memory Limit)
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={formData.memoryLimitMb || 256}
                        onChange={(e) => handleFormChange({ memoryLimitMb: parseInt(e.target.value) || 256 })}
                        className="h-12 pl-4 pr-12 text-lg focus-visible:ring-indigo-500 shadow-sm font-mono"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">MB</span>
                    </div>
                    <p className="text-sm text-slate-500">Khuyến nghị: 256MB hoặc 512MB</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 pb-4 dark:border-slate-800">
                  Cấu hình Hàm Chính (Main Function Signature)
                </h2>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Kiểu trả về (Return Type)
                    </Label>
                    <Input
                      value={formData.returnType || ""}
                      onChange={(e) => handleFormChange({ returnType: e.target.value })}
                      className="h-12 font-mono shadow-sm"
                      placeholder="VD: int[], boolean, String..."
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Danh sách tham số (Param Types - JSON Array)
                    </Label>
                    <Input
                      value={formData.paramTypes ? JSON.stringify(formData.paramTypes) : "[]"}
                      onChange={(e) => {
                        try {
                          const arr = JSON.parse(e.target.value);
                          if (Array.isArray(arr)) {
                            handleFormChange({ paramTypes: arr.map(String) });
                          }
                        } catch {}
                      }}
                      className="h-12 font-mono shadow-sm"
                      placeholder='VD: ["int[]", "int"]'
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
