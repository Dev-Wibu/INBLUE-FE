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
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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
    executionTimeLimitMs: 1000,
    memoryLimitMb: 256,
    codeStubs: {},
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // AI
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");

  // Monaco Editor State
  const [activeLang, setActiveLang] = useState("JAVA");

  // Testcases Master-Detail
  const [selectedTcIndex, setSelectedTcIndex] = useState<number | null>(null);

  useEffect(() => {
    if (initialData?.id) {
      fetchDetails(initialData.id);
    } else {
      setFormData((prev) => ({ ...prev, ...initialData }));
    }
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
    switch (langKey) {
      case "JAVA": return "java";
      case "PYTHON": return "python";
      case "CPP": return "cpp";
      case "JS": return "javascript";
      case "TYPESCRIPT": return "typescript";
      case "GO": return "go";
      case "CSHARP": return "csharp";
      case "SCALA": return "scala";
      case "SWIFT": return "swift";
      case "KOTLIN": return "kotlin";
      default: return "plaintext";
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm text-slate-500">Đang tải dữ liệu bài tập...</p>
        </div>
      </div>
    );
  }

  const isEditing = !!initialData?.id;

  // Number of expected parameters
  const paramCount = formData.paramTypes?.length || 0;

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
            { id: "testcases", label: "Test Cases Ẩn", icon: PlaySquare },
            { id: "codestubs", label: "Code Stubs", icon: Code2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabKey);
                if (tab.id === "testcases") setSelectedTcIndex(null);
              }}
              className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}>
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.id === "testcases" && (
                <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800">
                  {formData.hiddenTestCases?.length || 0}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 3. MAIN WORKSPACE */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* TAB: GENERAL (Full layout) */}
        {activeTab === "general" && (
          <div className="flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-2 pb-20">
            {/* Header Form */}
            <div className="flex items-end justify-between">
              <div className="grid flex-1 grid-cols-[1fr_200px] gap-6 items-end">
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
              <div className="ml-6">
                <Button 
                  variant="outline" 
                  onClick={() => setIsSettingsOpen(true)}
                  className="h-12 shadow-sm border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  <Settings2 className="mr-2 h-4 w-4 text-slate-500" />
                  Cài đặt Params & Limits
                </Button>
              </div>
            </div>

            {/* AI Magic Generator */}
            {!isEditing && (
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
            )}

            {/* Full Layout: Statement -> Examples -> Constraints */}
            <div className="flex flex-col space-y-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              
              {/* 1. Problem Statement */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Nội dung Đề bài (Markdown)</h3>
                </div>
                <Textarea
                  placeholder="Gõ Markdown tại đây..."
                  value={formData.problemStatement || ""}
                  onChange={(e) => handleFormChange({ problemStatement: e.target.value })}
                  className="min-h-[300px] resize-y rounded-xl border border-slate-200 p-6 font-mono text-[15px] leading-relaxed focus-visible:ring-indigo-500 bg-slate-50 dark:bg-slate-900 dark:border-slate-800"
                />
              </div>

              {/* 2. Visible Examples */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Ví dụ Mẫu (Visible Examples)</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newTc = [...(formData.visibleExamples || []), { inputs: Array(paramCount).fill(""), output: "", explanation: "" }];
                      handleFormChange({ visibleExamples: newTc });
                    }}
                    className="h-8 shadow-sm text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-900/50 dark:text-indigo-400 dark:hover:bg-indigo-900/30">
                    <Plus className="mr-1 h-4 w-4" /> Thêm Ví dụ
                  </Button>
                </div>
                
                <div className="space-y-6">
                  {formData.visibleExamples?.map((ex, exIdx) => (
                    <div key={exIdx} className="relative rounded-xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/30">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newTc = [...(formData.visibleExamples || [])];
                          newTc.splice(exIdx, 1);
                          handleFormChange({ visibleExamples: newTc });
                        }}
                        className="absolute right-4 top-4 h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-4">Example {exIdx + 1}</h4>
                      
                      <div className="grid gap-6">
                        {/* Inputs Dynamic */}
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Tham số Đầu vào (Input)</Label>
                          {paramCount === 0 ? (
                            <p className="text-sm italic text-slate-400">Vui lòng thiết lập Param Types trong phần Cài đặt.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {formData.paramTypes?.map((paramType, pIdx) => (
                                <div key={pIdx} className="space-y-1">
                                  <div className="text-xs font-mono text-slate-500">Param {pIdx + 1} <span className="text-indigo-500">({paramType})</span></div>
                                  <Input
                                    value={ex.inputs?.[pIdx] || ""}
                                    onChange={(e) => {
                                      const newTc = [...(formData.visibleExamples || [])];
                                      if (!newTc[exIdx].inputs) newTc[exIdx].inputs = Array(paramCount).fill("");
                                      newTc[exIdx].inputs[pIdx] = e.target.value;
                                      handleFormChange({ visibleExamples: newTc });
                                    }}
                                    className="font-mono bg-white dark:bg-slate-950"
                                    placeholder={`Giá trị cho ${paramType}`}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Expected Output */}
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                            Kết quả (Output) <span className="text-xs font-normal text-slate-400">- Kiểu {formData.returnType || "?"}</span>
                          </Label>
                          <Input
                            value={ex.output || ""}
                            onChange={(e) => {
                              const newTc = [...(formData.visibleExamples || [])];
                              newTc[exIdx].output = e.target.value;
                              handleFormChange({ visibleExamples: newTc });
                            }}
                            className="font-mono bg-white dark:bg-slate-950 max-w-md"
                            placeholder="Giá trị trả về"
                          />
                        </div>

                        {/* Explanation */}
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Giải thích (Explanation)</Label>
                          <Textarea
                            value={ex.explanation || ""}
                            onChange={(e) => {
                              const newTc = [...(formData.visibleExamples || [])];
                              newTc[exIdx].explanation = e.target.value;
                              handleFormChange({ visibleExamples: newTc });
                            }}
                            className="resize-none h-20 bg-white dark:bg-slate-950"
                            placeholder="Giải thích vì sao có kết quả này..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!formData.visibleExamples || formData.visibleExamples.length === 0) && (
                    <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center dark:border-slate-800">
                      <p className="text-sm text-slate-500">Chưa có ví dụ mẫu nào.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Rules & Constraints */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Điều kiện & Giới hạn (Constraints)</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleFormChange({ rulesAndConstraints: [...(formData.rulesAndConstraints || []), ""] });
                    }}
                    className="h-8 shadow-sm text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-900/30">
                    <Plus className="mr-1 h-4 w-4" /> Thêm Điều kiện
                  </Button>
                </div>
                <div className="space-y-3">
                  {formData.rulesAndConstraints?.map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-mono text-sm font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {idx + 1}
                      </div>
                      <Input
                        value={rule}
                        onChange={(e) => {
                          const newRules = [...(formData.rulesAndConstraints || [])];
                          newRules[idx] = e.target.value;
                          handleFormChange({ rulesAndConstraints: newRules });
                        }}
                        className="font-mono bg-slate-50 dark:bg-slate-900"
                        placeholder="VD: 2 <= nums.length <= 10^4"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newRules = [...(formData.rulesAndConstraints || [])];
                          newRules.splice(idx, 1);
                          handleFormChange({ rulesAndConstraints: newRules });
                        }}
                        className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {(!formData.rulesAndConstraints || formData.rulesAndConstraints.length === 0) && (
                    <div className="py-6 text-center text-sm italic text-slate-400">Chưa có điều kiện nào.</div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB: TEST CASES (Hidden only) */}
        {activeTab === "testcases" && (
          <div className="flex h-[750px] gap-6 animate-in fade-in slide-in-from-bottom-2">
            {/* Master List */}
            <div className="flex w-[320px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="font-bold text-slate-700 dark:text-slate-300">Test Cases Ẩn</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const newTc = [...(formData.hiddenTestCases || []), { inputs: Array(paramCount).fill(""), expectedOutput: "", weightPoints: 10 }];
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
                      <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                        {tc.weightPoints} Điểm
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
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </button>
                ))}
                {(!formData.hiddenTestCases || formData.hiddenTestCases.length === 0) && (
                  <div className="py-8 text-center text-sm italic text-slate-400">
                    Chưa có Test Case Ẩn
                  </div>
                )}
              </div>
            </div>

            {/* Detail Form */}
            <div className="flex-1 rounded-xl border border-slate-200 bg-white shadow-sm p-8 dark:border-slate-800 dark:bg-slate-950">
              {selectedTcIndex !== null && formData.hiddenTestCases?.[selectedTcIndex] ? (
                <div className="space-y-6 animate-in fade-in max-w-4xl">
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      Thiết lập Hidden Test #{selectedTcIndex + 1}
                    </h2>
                  </div>
                  
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/30 space-y-8">
                    
                    {/* Inputs Dynamic */}
                    <div className="space-y-4">
                      <Label className="text-base font-bold text-slate-700 dark:text-slate-300">Tham số Đầu vào (Input)</Label>
                      {paramCount === 0 ? (
                        <p className="text-sm italic text-slate-400">Vui lòng thiết lập Param Types trong phần Cài đặt.</p>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {formData.paramTypes?.map((paramType, pIdx) => (
                            <div key={pIdx} className="space-y-2">
                              <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                                Tham số {pIdx + 1} <span className="font-mono text-indigo-500 ml-1 bg-indigo-50 px-1.5 py-0.5 rounded dark:bg-indigo-900/30">{paramType}</span>
                              </div>
                              <Textarea
                                value={formData.hiddenTestCases![selectedTcIndex].inputs?.[pIdx] || ""}
                                onChange={(e) => {
                                  const newTc = [...(formData.hiddenTestCases || [])];
                                  if (!newTc[selectedTcIndex].inputs) newTc[selectedTcIndex].inputs = Array(paramCount).fill("");
                                  newTc[selectedTcIndex].inputs[pIdx] = e.target.value;
                                  handleFormChange({ hiddenTestCases: newTc });
                                }}
                                className="font-mono bg-white dark:bg-slate-950 resize-y h-24"
                                placeholder={`Dữ liệu cho ${paramType}`}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <div className="space-y-2">
                        <Label className="text-base font-bold text-slate-700 dark:text-slate-300">
                          Kết quả kỳ vọng (Expected Output)
                        </Label>
                        <Input
                          value={formData.hiddenTestCases[selectedTcIndex].expectedOutput || ""}
                          onChange={(e) => {
                            const newTc = [...(formData.hiddenTestCases || [])];
                            newTc[selectedTcIndex].expectedOutput = e.target.value;
                            handleFormChange({ hiddenTestCases: newTc });
                          }}
                          className="h-12 font-mono text-sm bg-white dark:bg-slate-950 focus-visible:ring-indigo-500"
                          placeholder={`Kiểu dữ liệu: ${formData.returnType || "?"}`}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-base font-bold text-slate-700 dark:text-slate-300">
                          Điểm số (Points)
                        </Label>
                        <Input
                          type="number"
                          value={formData.hiddenTestCases[selectedTcIndex].weightPoints || 0}
                          onChange={(e) => {
                            const newTc = [...(formData.hiddenTestCases || [])];
                            newTc[selectedTcIndex].weightPoints = parseInt(e.target.value) || 0;
                            handleFormChange({ hiddenTestCases: newTc });
                          }}
                          className="h-12 w-full text-sm font-bold bg-white dark:bg-slate-950 focus-visible:ring-indigo-500 text-emerald-600 dark:text-emerald-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center space-y-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900">
                    <PlaySquare className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                  </div>
                  <p className="text-slate-500 font-medium">Chọn một Test Case bên trái để thiết lập</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: CODE STUBS */}
        {activeTab === "codestubs" && (
          <div className="animate-in fade-in flex h-[750px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between bg-slate-50 px-6 py-4 border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Mã nguồn Mẫu (Code Stubs)
                </h2>
                <p className="text-sm text-slate-500">Mã nguồn ban đầu hiển thị cho thí sinh trên trình biên dịch.</p>
              </div>
              <Select value={activeLang} onValueChange={setActiveLang}>
                <SelectTrigger className="w-[200px] h-10 font-semibold shadow-sm bg-white dark:bg-slate-950 focus:ring-indigo-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JAVA">Java</SelectItem>
                  <SelectItem value="PYTHON">Python</SelectItem>
                  <SelectItem value="CPP">C++</SelectItem>
                  <SelectItem value="JS">JavaScript</SelectItem>
                  <SelectItem value="TYPESCRIPT">TypeScript</SelectItem>
                  <SelectItem value="GO">Go</SelectItem>
                  <SelectItem value="CSHARP">C#</SelectItem>
                  <SelectItem value="SCALA">Scala</SelectItem>
                  <SelectItem value="SWIFT">Swift</SelectItem>
                  <SelectItem value="KOTLIN">Kotlin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 relative">
              <Editor
                height="100%"
                language={getMonacoLanguage(activeLang)}
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
      </div>

      {/* SETTINGS MODAL */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold">Cài đặt Môi trường & Hàm</DialogTitle>
          </DialogHeader>
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 dark:border-slate-800">
                Môi trường Thực thi (Execution Limits)
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Thời gian tối đa</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={formData.executionTimeLimitMs || 1000}
                      onChange={(e) => handleFormChange({ executionTimeLimitMs: parseInt(e.target.value) || 1000 })}
                      className="h-10 pl-3 pr-12 font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">ms</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Bộ nhớ tối đa</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={formData.memoryLimitMb || 256}
                      onChange={(e) => handleFormChange({ memoryLimitMb: parseInt(e.target.value) || 256 })}
                      className="h-10 pl-3 pr-12 font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">MB</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 dark:border-slate-800">
                Hàm Chính (Main Function)
              </h3>
              
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Kiểu trả về (Return Type)</Label>
                <Input
                  value={formData.returnType || ""}
                  onChange={(e) => handleFormChange({ returnType: e.target.value })}
                  className="h-10 font-mono w-1/2"
                  placeholder="VD: int[], boolean..."
                />
              </div>

              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Danh sách tham số (Param Types)</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleFormChange({ paramTypes: [...(formData.paramTypes || []), ""] });
                    }}
                    className="h-8 shadow-sm">
                    <Plus className="mr-1 h-4 w-4" /> Thêm Tham số
                  </Button>
                </div>
                
                <div className="grid gap-3">
                  {formData.paramTypes?.map((param, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="flex h-10 items-center px-3 rounded-lg bg-slate-100 text-sm font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400 whitespace-nowrap">
                        Param {idx + 1}
                      </div>
                      <Input
                        value={param}
                        onChange={(e) => {
                          const newParams = [...(formData.paramTypes || [])];
                          newParams[idx] = e.target.value;
                          handleFormChange({ paramTypes: newParams });
                        }}
                        className="font-mono bg-slate-50 dark:bg-slate-900"
                        placeholder="VD: int[], String"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newParams = [...(formData.paramTypes || [])];
                          newParams.splice(idx, 1);
                          handleFormChange({ paramTypes: newParams });
                        }}
                        className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {(!formData.paramTypes || formData.paramTypes.length === 0) && (
                    <div className="py-4 text-center text-sm italic text-slate-400 border border-dashed border-slate-200 rounded-lg dark:border-slate-800">
                      Chưa có tham số nào. Bấm "Thêm Tham số" để tạo.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button onClick={() => setIsSettingsOpen(false)} className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900">
                Xong
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
