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
  const [textTab, setTextTab] = useState<"write" | "preview">("write");

  // AI
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");

  // Monaco Editor State
  const [activeLang, setActiveLang] = useState("java");

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
          <div key={index} className="relative my-3 overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
            {lang && (
              <div className="border-b border-slate-700/50 bg-slate-800/50 px-3 py-1 text-xs font-mono text-slate-400">
                {lang}
              </div>
            )}
            <pre className="overflow-x-auto p-3 text-[13px] font-mono leading-relaxed text-slate-100">
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
    <div className="flex h-full flex-col bg-gray-50 dark:bg-slate-950">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {formData.title || "Tạo Bài tập Coding mới"}
            </h1>
            <p className="text-xs font-medium text-slate-500">
              {initialData?.id ? `Chỉnh sửa bài tập #${initialData.id}` : "Chế độ Authoring"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={isSubmitting}
            className="bg-indigo-600 px-6 text-white shadow-sm hover:bg-indigo-700">
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Lưu Bài Tập
          </Button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Menu */}
        <div className="w-64 border-r bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-1">
            <button
              onClick={() => setActiveTab("general")}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "general"
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}>
              <FileText className="h-4 w-4" />
              Đề bài (Description)
            </button>
            <button
              onClick={() => setActiveTab("testcases")}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "testcases"
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}>
              <PlaySquare className="h-4 w-4" />
              Test Cases
              <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800">
                {(formData.hiddenTestCases?.length || 0) + (formData.visibleExamples?.length || 0)}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("codestubs")}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "codestubs"
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}>
              <Code2 className="h-4 w-4" />
              Code Stubs
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "settings"
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}>
              <Settings2 className="h-4 w-4" />
              Cài đặt (Settings)
            </button>
          </div>

          {/* AI Quick Generator Box */}
          <div className="mt-8 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
            <h3 className="mb-3 flex items-center text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              AI Magic
            </h3>
            <div className="space-y-3">
              <Input
                placeholder="Topic: Sắp xếp, Array..."
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                className="h-8 bg-white text-xs dark:bg-slate-900"
              />
              <Select
                value={aiDifficulty}
                onValueChange={(val: "EASY" | "MEDIUM" | "HARD") => setAiDifficulty(val)}>
                <SelectTrigger className="h-8 bg-white text-xs dark:bg-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EASY">EASY</SelectItem>
                  <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                  <SelectItem value="HARD">HARD</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700"
                onClick={handleGenerateAI}
                disabled={aiLoading}>
                {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Auto Generate"}
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-white p-8 dark:bg-slate-950">
          <div className="mx-auto max-w-4xl">
            {activeTab === "general" && (
              <div className="animate-in fade-in space-y-6">
                <div>
                  <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">
                    Thông tin chung
                  </h2>
                  <div className="grid grid-cols-[1fr_200px] gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Tiêu đề (Title) <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        value={formData.title || ""}
                        onChange={(e) => handleFormChange({ title: e.target.value })}
                        className="h-10 font-semibold focus-visible:ring-indigo-500"
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
                        <SelectTrigger className="h-10 focus:ring-indigo-500">
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
                </div>

                <div className="space-y-2 pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Nội dung Đề bài (Problem Statement) <span className="text-rose-500">*</span>
                    </Label>
                    <div className="flex rounded-md bg-slate-100 p-0.5 dark:bg-slate-800/80">
                      <button
                        type="button"
                        onClick={() => setTextTab("write")}
                        className={`rounded-sm px-4 py-1.5 text-xs font-medium transition-all ${
                          textTab === "write"
                            ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}>
                        Write
                      </button>
                      <button
                        type="button"
                        onClick={() => setTextTab("preview")}
                        className={`rounded-sm px-4 py-1.5 text-xs font-medium transition-all ${
                          textTab === "preview"
                            ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}>
                        Preview
                      </button>
                    </div>
                  </div>

                  {textTab === "write" ? (
                    <Textarea
                      placeholder="Mô tả chi tiết bài toán..."
                      rows={20}
                      value={formData.problemStatement || ""}
                      onChange={(e) => handleFormChange({ problemStatement: e.target.value })}
                      className="resize-none font-mono text-[14px] leading-relaxed focus-visible:ring-indigo-500"
                    />
                  ) : (
                    <div className="min-h-[460px] rounded-md border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/30">
                      {formData.problemStatement ? (
                        renderMarkdown(formData.problemStatement)
                      ) : (
                        <span className="text-sm font-medium italic text-slate-400">
                          Nothing to preview
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "testcases" && (
              <div className="animate-in fade-in space-y-10">
                {/* Visible Examples */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      Ví dụ minh họa (Visible Examples)
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const ex = [...(formData.visibleExamples || []), { inputs: [""], output: "", explanation: "" }];
                        handleFormChange({ visibleExamples: ex });
                      }}>
                      <Plus className="mr-2 h-4 w-4" /> Thêm Ví dụ
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {formData.visibleExamples?.map((ex, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newEx = [...(formData.visibleExamples || [])];
                            newEx.splice(idx, 1);
                            handleFormChange({ visibleExamples: newEx });
                          }}
                          className="absolute right-3 top-3 h-8 w-8 text-slate-400 hover:text-rose-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <h4 className="mb-4 text-sm font-bold text-slate-500 uppercase tracking-wider">
                          Example {idx + 1}
                        </h4>
                        <div className="space-y-4 pr-8">
                          <div className="space-y-2">
                            <Label className="text-xs">Input (JSON array format, vd: ["1", "2"])</Label>
                            <Input
                              value={ex.inputs ? JSON.stringify(ex.inputs) : "[]"}
                              onChange={(e) => {
                                try {
                                  const arr = JSON.parse(e.target.value);
                                  if (Array.isArray(arr)) {
                                    const newEx = [...(formData.visibleExamples || [])];
                                    newEx[idx].inputs = arr.map(String);
                                    handleFormChange({ visibleExamples: newEx });
                                  }
                                } catch {}
                              }}
                              className="font-mono text-sm"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs">Expected Output</Label>
                              <Input
                                value={ex.output || ""}
                                onChange={(e) => {
                                  const newEx = [...(formData.visibleExamples || [])];
                                  newEx[idx].output = e.target.value;
                                  handleFormChange({ visibleExamples: newEx });
                                }}
                                className="font-mono text-sm"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Giải thích (Explanation)</Label>
                              <Input
                                value={ex.explanation || ""}
                                onChange={(e) => {
                                  const newEx = [...(formData.visibleExamples || [])];
                                  newEx[idx].explanation = e.target.value;
                                  handleFormChange({ visibleExamples: newEx });
                                }}
                                className="text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!formData.visibleExamples?.length && (
                      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-800">
                        Chưa có ví dụ nào
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800"></div>

                {/* Hidden Testcases */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      Test Cases Ẩn (Hidden Tests)
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const tc = [...(formData.hiddenTestCases || []), { inputs: [""], expectedOutput: "", weightPoints: 10 }];
                        handleFormChange({ hiddenTestCases: tc });
                      }}>
                      <Plus className="mr-2 h-4 w-4" /> Thêm Test Case
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {formData.hiddenTestCases?.map((tc, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newTc = [...(formData.hiddenTestCases || [])];
                            newTc.splice(idx, 1);
                            handleFormChange({ hiddenTestCases: newTc });
                          }}
                          className="absolute right-3 top-3 h-8 w-8 text-slate-400 hover:text-rose-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="grid grid-cols-[1fr_1fr_100px] gap-4 pr-12">
                          <div className="space-y-2">
                            <Label className="text-xs">Input Array (JSON)</Label>
                            <Input
                              value={tc.inputs ? JSON.stringify(tc.inputs) : "[]"}
                              onChange={(e) => {
                                try {
                                  const arr = JSON.parse(e.target.value);
                                  if (Array.isArray(arr)) {
                                    const newTc = [...(formData.hiddenTestCases || [])];
                                    newTc[idx].inputs = arr.map(String);
                                    handleFormChange({ hiddenTestCases: newTc });
                                  }
                                } catch {}
                              }}
                              className="font-mono text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Expected Output</Label>
                            <Input
                              value={tc.expectedOutput || ""}
                              onChange={(e) => {
                                const newTc = [...(formData.hiddenTestCases || [])];
                                newTc[idx].expectedOutput = e.target.value;
                                handleFormChange({ hiddenTestCases: newTc });
                              }}
                              className="font-mono text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Điểm (Point)</Label>
                            <Input
                              type="number"
                              value={tc.weightPoints || 0}
                              onChange={(e) => {
                                const newTc = [...(formData.hiddenTestCases || [])];
                                newTc[idx].weightPoints = parseInt(e.target.value) || 0;
                                handleFormChange({ hiddenTestCases: newTc });
                              }}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {!formData.hiddenTestCases?.length && (
                      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-800">
                        Chưa có test case ẩn nào
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "codestubs" && (
              <div className="animate-in fade-in flex h-[600px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Code Stubs (Mẫu Code)
                  </h2>
                  <Select value={activeLang} onValueChange={setActiveLang}>
                    <SelectTrigger className="w-[180px]">
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
                <div className="flex-1 p-0.5">
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
                      fontSize: 14,
                      lineHeight: 24,
                      padding: { top: 16 },
                      fontFamily: "JetBrains Mono, Consolas, monospace",
                      scrollBeyondLastLine: false,
                    }}
                  />
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="animate-in fade-in max-w-2xl space-y-8">
                <div>
                  <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">
                    Giới hạn Thực thi (Execution Limits)
                  </h2>
                  <div className="grid grid-cols-2 gap-6 rounded-xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/30">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Thời gian chạy tối đa (ms)
                      </Label>
                      <Input
                        type="number"
                        value={formData.executionTimeLimitMs || 1000}
                        onChange={(e) => handleFormChange({ executionTimeLimitMs: parseInt(e.target.value) || 1000 })}
                        className="h-10 focus-visible:ring-indigo-500"
                      />
                      <p className="text-xs text-slate-500">Khuyến nghị: 1000ms cho C++, 2000ms cho Java/Python</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Bộ nhớ tối đa (MB)
                      </Label>
                      <Input
                        type="number"
                        value={formData.memoryLimitMb || 256}
                        onChange={(e) => handleFormChange({ memoryLimitMb: parseInt(e.target.value) || 256 })}
                        className="h-10 focus-visible:ring-indigo-500"
                      />
                      <p className="text-xs text-slate-500">Khuyến nghị: 256MB hoặc 512MB</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">
                    Kiểu Dữ Liệu (Parameter Types)
                  </h2>
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/30">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Kiểu trả về (Return Type)
                      </Label>
                      <Input
                        value={formData.returnType || ""}
                        onChange={(e) => handleFormChange({ returnType: e.target.value })}
                        className="h-10 focus-visible:ring-indigo-500"
                        placeholder="VD: int[], boolean, String..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Kiểu Tham số (Param Types - JSON Array)
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
                        className="h-10 focus-visible:ring-indigo-500"
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
    </div>
  );
}
