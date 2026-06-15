import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { jobDescriptionManager } from "@/services/job-description.manager";
import { roundManager } from "@/services/round.manager";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Clock,
  Code2,
  Eye,
  FileText,
  HelpCircle,
  Mail,
  Plus,
  PlusCircle,
  Save,
  Settings,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { JobDescription } from "../types";

// Types matching API
type RoundType =
  | "CV_SCREENING"
  | "EMAIL_SIMULATOR"
  | "QUIZ"
  | "CODING"
  | "CODE_REVIEW"
  | "MENTROR_REVIEW"
  | "AI_INTERVIEW";

interface UIRoundConfig {
  instruction?: string;
  submissionFormat?: string;
  timeLimitMinutes?: number;
  maxScore?: number;
  aiSystemPrompt?: string;
  evaluationCriteria?: string;
  quizQuestions?: {
    questionText?: string;
    options?: string[];
    correctAnswer?: string;
    points?: number;
  }[];
  codingProblemsId?: number[];
  codingProblems?: { problemId?: number; title?: string; difficulty?: string }[];
}

interface UIRound {
  id?: number;
  name?: string;
  roundOrder?: number;
  roundType?: RoundType;
  passThreshold?: number;
  configData?: UIRoundConfig;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface JobDescriptionRoundsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  jobDescription: JobDescription | null;
  onSaved?: () => void;
}

// Available rounds configurations
const AVAILABLE_ROUNDS_TEMPLATES: {
  type: RoundType;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  defaultConfig: UIRoundConfig;
}[] = [
  {
    type: "CV_SCREENING",
    title: "Lọc CV",
    description: "Đánh giá hồ sơ và kỹ năng ứng viên.",
    color: "text-blue-500 border-blue-500/20",
    bgColor: "bg-blue-500/10",
    icon: <FileText className="h-5 w-5" />,
    defaultConfig: {
      instruction: "Vui lòng tải lên CV định dạng PDF.",
      submissionFormat: "pdf",
    },
  },
  {
    type: "EMAIL_SIMULATOR",
    title: "Mô phỏng Email",
    description: "Kiểm tra kỹ năng viết và giao tiếp qua Email.",
    color: "text-purple-500 border-purple-500/20",
    bgColor: "bg-purple-500/10",
    icon: <Mail className="h-5 w-5" />,
    defaultConfig: {
      instruction: "Hãy trả lời email của khách hàng phàn nàn về sản phẩm.",
      timeLimitMinutes: 15,
    },
  },
  {
    type: "QUIZ",
    title: "Trắc nghiệm",
    description: "Bài đánh giá năng lực trắc nghiệm.",
    color: "text-amber-500 border-amber-500/20",
    bgColor: "bg-amber-500/10",
    icon: <HelpCircle className="h-5 w-5" />,
    defaultConfig: {
      instruction: "Làm bài kiểm tra trắc nghiệm lý thuyết.",
      timeLimitMinutes: 20,
      quizQuestions: [],
    },
  },
  {
    type: "CODING",
    title: "Lập trình",
    description: "Đánh giá kỹ năng viết mã nguồn giải thuật.",
    color: "text-emerald-500 border-emerald-500/20",
    bgColor: "bg-emerald-500/10",
    icon: <Code2 className="h-5 w-5" />,
    defaultConfig: {
      instruction: "Hoàn thành các bài tập lập trình yêu cầu.",
      timeLimitMinutes: 45,
      codingProblemsId: [],
    },
  },
  {
    type: "CODE_REVIEW",
    title: "Đánh giá Code",
    description: "Kiểm tra tư duy phản biện và tối ưu hóa code.",
    color: "text-teal-500 border-teal-500/20",
    bgColor: "bg-teal-500/10",
    icon: <Eye className="h-5 w-5" />,
    defaultConfig: {
      instruction: "Review đoạn mã nguồn sau và chỉ ra các điểm cần tối ưu.",
      timeLimitMinutes: 30,
    },
  },
  {
    type: "MENTROR_REVIEW",
    title: "Đánh giá Mentor",
    description: "Buổi đánh giá trực tiếp cùng hội đồng chuyên gia.",
    color: "text-rose-500 border-rose-500/20",
    bgColor: "bg-rose-500/10",
    icon: <UserCheck className="h-5 w-5" />,
    defaultConfig: {
      instruction: "Thực hiện phỏng vấn trực tiếp với Mentor.",
    },
  },
  {
    type: "AI_INTERVIEW",
    title: "Phỏng vấn AI",
    description: "Phỏng vấn giả lập tự động với Trợ lý AI.",
    color: "text-indigo-500 border-indigo-500/20",
    bgColor: "bg-indigo-500/10",
    icon: <Bot className="h-5 w-5" />,
    defaultConfig: {
      instruction: "Trả lời các câu hỏi phỏng vấn bằng giọng nói/văn bản với AI.",
      timeLimitMinutes: 20,
      aiSystemPrompt: "Bạn là một nhà tuyển dụng kỹ thuật chuyên hỏi về Java/NodeJS...",
      evaluationCriteria:
        "Đánh giá dựa trên kỹ năng giao tiếp, giải quyết vấn đề và kiến thức cốt lõi.",
    },
  },
];

export function JobDescriptionRoundsDialog({
  isOpen,
  onOpenChange,
  jobDescription,
  onSaved,
}: JobDescriptionRoundsDialogProps) {
  const [rounds, setRounds] = useState<UIRound[]>([]);
  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExistingRounds, setHasExistingRounds] = useState(false);
  const [availableTypes, setAvailableTypes] = useState<RoundType[]>([]);

  // Drag and drop states
  const [activeDragType, setActiveDragType] = useState<RoundType | null>(null);
  const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null);

  // Load detailed JD information (including all rounds) and available round types
  useEffect(() => {
    if (isOpen && jobDescription?.id) {
      setIsLoading(true);
      setSelectedRoundIndex(null);

      const fetchJd = jobDescriptionManager.getById(jobDescription.id);
      const fetchTypes = roundManager.getAvailableRoundTypes();

      Promise.all([fetchJd, fetchTypes])
        .then(([jdRes, typesRes]) => {
          if (typesRes.success && typesRes.data) {
            setAvailableTypes(typesRes.data);
          } else {
            // Fallback to all if API fails
            setAvailableTypes(AVAILABLE_ROUNDS_TEMPLATES.map((t) => t.type));
          }

          if (jdRes.success && jdRes.data) {
            const fetchedRounds = jdRes.data.rounds ?? [];
            // Sort by order
            const sortedRounds = [...fetchedRounds].sort(
              (a, b) => (a.roundOrder ?? 0) - (b.roundOrder ?? 0)
            );
            const uiRounds: UIRound[] = sortedRounds.map((r) => ({
              ...r,
              roundType: r.roundType as RoundType,
              configData: {
                ...r.configData,
                codingProblemsId:
                  r.configData?.codingProblems
                    ?.map((cp) => cp.problemId)
                    .filter((id): id is number => id !== undefined) ?? [],
              },
            }));
            setRounds(uiRounds);
            setHasExistingRounds(fetchedRounds.length > 0);
          } else {
            setRounds([]);
            setHasExistingRounds(false);
          }
        })
        .catch((err) => {
          console.error("Error loading JD rounds/types:", err);
          toast.error("Không thể tải thông tin quy trình phỏng vấn.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, jobDescription]);

  // Handle drop from toolbox
  const handleDropFromToolbox = (type: RoundType, targetIndex: number) => {
    const template = AVAILABLE_ROUNDS_TEMPLATES.find((t) => t.type === type);
    if (!template) return;

    const newRound: UIRound = {
      name: template.title,
      roundType: type,
      passThreshold: 0.8, // Default 80%
      configData: JSON.parse(JSON.stringify(template.defaultConfig)),
    };

    const updated = [...rounds];
    updated.splice(targetIndex, 0, newRound);

    // Re-assign order
    const reordered = updated.map((r, idx) => ({
      ...r,
      roundOrder: idx + 1,
    }));

    setRounds(reordered);
    setSelectedRoundIndex(targetIndex);
    toast.success(`Đã thêm vòng ${template.title}`);
  };

  // Handle reordering drop
  const handleReorder = (dragIndex: number, dropIndex: number) => {
    if (dragIndex === dropIndex) return;

    const updated = [...rounds];
    const [draggedItem] = updated.splice(dragIndex, 1);

    // Adjust drop index if it shifted after splice
    let targetIndex = dropIndex;
    if (dragIndex < dropIndex) {
      targetIndex = dropIndex - 1;
    }

    updated.splice(targetIndex, 0, draggedItem);

    // Re-assign order
    const reordered = updated.map((r, idx) => ({
      ...r,
      roundOrder: idx + 1,
    }));

    setRounds(reordered);
    setSelectedRoundIndex(targetIndex);
  };

  const handleRemoveRound = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = rounds
      .filter((_, idx) => idx !== index)
      .map((r, idx) => ({
        ...r,
        roundOrder: idx + 1,
      }));
    setRounds(updated);
    if (selectedRoundIndex === index) {
      setSelectedRoundIndex(null);
    } else if (selectedRoundIndex !== null && selectedRoundIndex > index) {
      setSelectedRoundIndex(selectedRoundIndex - 1);
    }
    toast.info("Đã xóa vòng khỏi quy trình.");
  };

  // Update specific round field
  const updateRoundField = (index: number, field: keyof UIRound, value: unknown) => {
    const updated = [...rounds];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setRounds(updated);
  };

  // Update specific round config field
  const updateRoundConfigField = (index: number, field: string, value: unknown) => {
    const updated = [...rounds];
    const currentConfig = updated[index].configData || {};
    updated[index] = {
      ...updated[index],
      configData: {
        ...currentConfig,
        [field]: value,
      },
    };
    setRounds(updated);
  };

  // Save current rounds config to server
  const handleSave = async () => {
    if (!jobDescription?.id) return;
    setIsSaving(true);

    try {
      // Validate rounds
      if (rounds.length === 0) {
        toast.error("Vui lòng thêm ít nhất 1 vòng phỏng vấn.");
        setIsSaving(false);
        return;
      }

      // Check validation for Quiz rounds
      const invalidQuizIndex = rounds.findIndex(
        (r) =>
          r.roundType === "QUIZ" &&
          (!r.configData?.quizQuestions || r.configData.quizQuestions.length === 0)
      );
      if (invalidQuizIndex !== -1) {
        toast.error(`Vòng ${invalidQuizIndex + 1} (Trắc nghiệm) chưa cấu hình câu hỏi.`);
        setSelectedRoundIndex(invalidQuizIndex);
        setIsSaving(false);
        return;
      }

      const payload = {
        // Map UI format to Dto expected by Backend API
        rounds: rounds.map((r, idx) => ({
          name: r.name || `Vòng ${idx + 1}`,
          roundOrder: idx + 1,
          roundType: r.roundType as RoundType,
          passThreshold: Number(r.passThreshold ?? 0.8),
          configData: {
            instruction: r.configData?.instruction || "",
            submissionFormat: r.configData?.submissionFormat || "",
            timeLimitMinutes: Number(r.configData?.timeLimitMinutes ?? 0),
            maxScore: Number(r.configData?.maxScore ?? 100),
            aiSystemPrompt: r.configData?.aiSystemPrompt || "",
            evaluationCriteria: r.configData?.evaluationCriteria || "",
            quizQuestions: (r.configData?.quizQuestions || []).map((q) => ({
              questionText: q.questionText || "",
              options: q.options || [],
              correctAnswer: q.correctAnswer || "",
              points: Number(q.points ?? 0),
            })),
            codingProblemsId: r.configData?.codingProblemsId || [],
          },
        })),
      };

      let response;
      if (hasExistingRounds) {
        response = await roundManager.updateForJd(jobDescription.id, payload);
      } else {
        response = await roundManager.setUpForJd(jobDescription.id, payload);
      }

      if (response.success) {
        toast.success("Đã lưu thiết lập quy trình phỏng vấn thành công!");
        onSaved?.();
        onOpenChange(false);
      } else {
        toast.error(response.error || "Không thể lưu thiết lập quy trình.");
      }
    } catch (err) {
      console.error("Error saving rounds:", err);
      toast.error("Đã xảy ra lỗi khi lưu quy trình.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedRound = selectedRoundIndex !== null ? rounds[selectedRoundIndex] : null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[95vh] max-h-[95vh] w-[98vw] max-w-[98vw] flex-row overflow-hidden border-slate-800 bg-slate-950 p-0">
        {isLoading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-slate-400">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
            <span>Đang tải thông tin cấu hình...</span>
          </div>
        ) : (
          <>
            {/* 1. LEFT SIDEBAR: Available Rounds Toolbox (occupies full height) */}
            <div className="flex h-full w-[28%] max-w-[340px] min-w-[300px] shrink-0 flex-col border-r border-slate-800 bg-slate-900/30">
              <div className="shrink-0 border-b border-slate-800 bg-slate-900/20 p-4">
                <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                  Mẫu vòng tuyển dụng
                </h3>
                <p className="mt-1 text-[10px] text-slate-500">
                  Kéo các mẫu này thả vào quy trình ở giữa
                </p>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
                <div className="my-auto space-y-2.5 py-2">
                  {AVAILABLE_ROUNDS_TEMPLATES.filter((t) => availableTypes.includes(t.type)).map(
                    (template) => (
                      <div
                        key={template.type}
                        draggable
                        onDragStart={() => setActiveDragType(template.type)}
                        onDragEnd={() => setActiveDragType(null)}
                        className={cn(
                          "group border-slate-850 flex cursor-grab items-start gap-2.5 rounded-lg border bg-slate-900/50 p-2.5 transition-all hover:border-slate-700 hover:bg-slate-900 active:cursor-grabbing",
                          template.bgColor,
                          template.color
                        )}>
                        <div className="mt-0.5 shrink-0 rounded-lg bg-black/40 p-1.5">
                          {template.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs leading-tight font-bold text-slate-200 transition-colors group-hover:text-white">
                            {template.title}
                          </h4>
                          <p className="mt-0.5 truncate text-[10px] leading-normal text-slate-500 group-hover:text-slate-400">
                            {template.description}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* MAIN CONTENT AREA: Header, Center Canvas & Right Config Panel, and Footer */}
            <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
              {/* Header inside the center/main column */}
              <div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 py-3">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-white">
                    Thiết lập Quy trình Tuyển dụng
                  </h2>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    Kéo thả các vòng phỏng vấn từ danh sách bên trái để tạo pipeline cho JD:{" "}
                    <span className="font-semibold text-blue-400">{jobDescription?.title}</span>
                  </p>
                </div>
              </div>

              {/* Workspace: Canvas + Right Panel */}
              <div className="flex min-h-0 flex-1 overflow-hidden bg-slate-950">
                {/* 2. CENTER PANEL: Pipeline Workflow */}
                <div
                  className={cn(
                    "relative flex flex-1 flex-col overflow-hidden bg-slate-950 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]"
                  )}>
                  {/* Canvas controls */}
                  <div className="absolute top-4 left-6 z-10 flex items-center gap-2">
                    <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-300 uppercase shadow-lg">
                      Quy trình hiện tại ({rounds.length} vòng)
                    </span>
                  </div>

                  {/* Horizontal drag & drop lane */}
                  <div className="w-full flex-1 overflow-x-auto overflow-y-hidden select-none">
                    <div className="flex h-full min-w-max items-center gap-2 px-8 pt-6 pb-8">
                      {/* Initial Dropzone */}
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (activeDragType) handleDropFromToolbox(activeDragType, 0);
                          else if (activeDragIndex !== null) handleReorder(activeDragIndex, 0);
                        }}
                        className={cn(
                          "flex h-40 w-12 items-center justify-center rounded-2xl border-2 border-dashed border-slate-800 transition-all duration-300",
                          (activeDragType || activeDragIndex !== null) &&
                            "border-primary/50 bg-primary/5 w-24 scale-102"
                        )}>
                        <Plus className="h-5 w-5 animate-pulse text-slate-600" />
                      </div>

                      {/* Flow Nodes list */}
                      {rounds.map((round, index) => {
                        const template = AVAILABLE_ROUNDS_TEMPLATES.find(
                          (t) => t.type === round.roundType
                        );
                        const isSelected = selectedRoundIndex === index;

                        return (
                          <div key={index} className="flex items-center gap-2">
                            {/* Node Card wrapper */}
                            <div
                              draggable
                              onDragStart={() => setActiveDragIndex(index)}
                              onDragEnd={() => setActiveDragIndex(null)}
                              onClick={() => setSelectedRoundIndex(index)}
                              className={cn(
                                "group relative w-60 shrink-0 cursor-grab rounded-2xl border bg-slate-900/80 p-4 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:cursor-grabbing",
                                isSelected
                                  ? "border-primary ring-primary/20 scale-[1.03] bg-slate-900 ring-1"
                                  : "border-slate-800 hover:border-slate-700",
                                template?.bgColor
                              )}>
                              {/* Round Step bubble */}
                              <div className="absolute -top-3 -left-3 flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-bold text-white shadow-md">
                                {index + 1}
                              </div>

                              {/* Close/Delete button */}
                              <button
                                onClick={(e) => handleRemoveRound(index, e)}
                                className="absolute -top-2.5 -right-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-400 opacity-0 shadow-md transition-all group-hover:opacity-100 hover:border-red-800 hover:bg-red-950 hover:text-red-400"
                                title="Xóa vòng">
                                <Trash2 className="h-3 w-3" />
                              </button>

                              {/* Node Content */}
                              <div className="flex items-center gap-3">
                                <div className={cn("rounded-xl bg-black/40 p-2", template?.color)}>
                                  {template?.icon}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="truncate text-sm font-bold text-slate-200">
                                    {round.name}
                                  </h4>
                                  <p className="mt-0.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                                    {template?.title}
                                  </p>
                                </div>
                              </div>

                              {/* Quick Config preview */}
                              <div className="mt-4 flex items-center justify-between border-t border-slate-800/40 pt-3 text-[11px] text-slate-400">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 opacity-60" />
                                  <span>
                                    {round.configData?.timeLimitMinutes
                                      ? `${round.configData.timeLimitMinutes}p`
                                      : "Không giới hạn"}
                                  </span>
                                </div>
                                <span className="font-semibold text-slate-300">
                                  Đạt: {Math.round((round.passThreshold ?? 0.8) * 100)}%
                                </span>
                              </div>

                              {/* Setup state check */}
                              {round.roundType === "QUIZ" &&
                                (!round.configData?.quizQuestions ||
                                  round.configData.quizQuestions.length === 0) && (
                                  <div className="mt-2 flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 p-1.5 text-[10px] font-medium text-amber-500">
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                    <span>Chưa cấu hình câu hỏi</span>
                                  </div>
                                )}
                            </div>

                            {/* Dropzone between nodes */}
                            <div
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => {
                                if (activeDragType)
                                  handleDropFromToolbox(activeDragType, index + 1);
                                else if (activeDragIndex !== null)
                                  handleReorder(activeDragIndex, index + 1);
                              }}
                              className={cn(
                                "flex h-40 w-12 items-center justify-center rounded-2xl border-2 border-dashed border-slate-800 transition-all duration-300",
                                (activeDragType || activeDragIndex !== null) &&
                                  "border-primary/50 bg-primary/5 w-24 scale-102"
                              )}>
                              <Plus className="h-5 w-5 animate-pulse text-slate-600" />
                            </div>
                          </div>
                        );
                      })}

                      {rounds.length === 0 && (
                        <div className="flex h-40 w-80 flex-col items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/30 p-8 text-center">
                          <ArrowRight className="mb-2 h-8 w-8 animate-bounce text-slate-600" />
                          <h4 className="text-sm font-bold text-slate-400">Quy trình trống</h4>
                          <p className="mt-1 max-w-[200px] text-xs text-slate-500">
                            Hãy kéo các vòng từ bên trái thả vào đây
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. RIGHT PANEL: Configuration Sidebar (32% width) */}
                {selectedRoundIndex !== null && selectedRound && (
                  <div className="animate-in slide-in-from-right flex w-[32%] min-w-[340px] shrink-0 flex-col overflow-hidden border-l border-slate-800 bg-slate-900/40 duration-250">
                    <div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/30 p-4">
                      <div className="flex items-center gap-2">
                        <Settings className="text-primary h-4 w-4" />
                        <h3 className="text-sm font-bold text-slate-200">
                          Cấu hình: Vòng {selectedRoundIndex + 1}
                        </h3>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-slate-400 hover:text-white"
                        onClick={() => setSelectedRoundIndex(null)}>
                        Đóng
                      </Button>
                    </div>

                    <ScrollArea className="flex-1 p-5">
                      <div className="space-y-5 pb-6">
                        {/* General Settings */}
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-300">
                              Tên vòng tuyển dụng
                            </Label>
                            <Input
                              value={selectedRound.name || ""}
                              onChange={(e) =>
                                updateRoundField(selectedRoundIndex, "name", e.target.value)
                              }
                              placeholder="Nhập tên vòng..."
                              className="border-slate-800 bg-slate-950 text-sm text-white"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-300">
                              Ngưỡng điểm đạt (Pass Threshold)
                            </Label>
                            <div className="flex items-center gap-3">
                              <Input
                                type="number"
                                min={0}
                                max={1}
                                step={0.05}
                                value={selectedRound.passThreshold ?? 0.8}
                                onChange={(e) =>
                                  updateRoundField(
                                    selectedRoundIndex,
                                    "passThreshold",
                                    Number(e.target.value)
                                  )
                                }
                                className="w-24 border-slate-800 bg-slate-950 text-sm text-white"
                              />
                              <span className="text-xs text-slate-400">
                                (Tương đương:{" "}
                                {Math.round((selectedRound.passThreshold ?? 0.8) * 100)}% số điểm
                                tối đa)
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-300">
                              Thời gian làm bài (Phút)
                            </Label>
                            <div className="flex items-center gap-3">
                              <Input
                                type="number"
                                min={0}
                                value={selectedRound.configData?.timeLimitMinutes ?? 0}
                                onChange={(e) =>
                                  updateRoundConfigField(
                                    selectedRoundIndex,
                                    "timeLimitMinutes",
                                    Number(e.target.value)
                                  )
                                }
                                className="w-24 border-slate-800 bg-slate-950 text-sm text-white"
                              />
                              <span className="text-xs text-slate-400">
                                (0 = không giới hạn thời gian)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Specific features depending on Round Type */}
                        <div className="border-t border-slate-800/60 pt-4">
                          {/* 1. CV_SCREENING */}
                          {selectedRound.roundType === "CV_SCREENING" && (
                            <>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-300">
                                  Định dạng nộp hồ sơ
                                </Label>
                                <Select
                                  value={selectedRound.configData?.submissionFormat || "pdf"}
                                  onValueChange={(val) =>
                                    updateRoundConfigField(
                                      selectedRoundIndex,
                                      "submissionFormat",
                                      val
                                    )
                                  }>
                                  <SelectTrigger className="border-slate-800 bg-slate-950 text-sm text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                                    <SelectItem value="pdf">Tệp PDF (.pdf)</SelectItem>
                                    <SelectItem value="doc">Tệp Word (.doc, .docx)</SelectItem>
                                    <SelectItem value="any">Tất cả định dạng tài liệu</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </>
                          )}

                          {/* 2. QUIZ (quizQuestions Array builder) */}
                          {selectedRound.roundType === "QUIZ" && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold text-slate-300">
                                  Danh sách câu hỏi trắc nghiệm (
                                  {selectedRound.configData?.quizQuestions?.length || 0})
                                </Label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const currentQuestions = [
                                      ...(selectedRound.configData?.quizQuestions || []),
                                    ];
                                    currentQuestions.push({
                                      questionText: "Câu hỏi mới?",
                                      options: [
                                        "Lựa chọn A",
                                        "Lựa chọn B",
                                        "Lựa chọn C",
                                        "Lựa chọn D",
                                      ],
                                      correctAnswer: "Lựa chọn A",
                                      points: 10,
                                    });
                                    updateRoundConfigField(
                                      selectedRoundIndex,
                                      "quizQuestions",
                                      currentQuestions
                                    );
                                  }}
                                  className="text-primary hover:text-primary/80 h-7 text-xs font-bold">
                                  <PlusCircle className="mr-1 h-3.5 w-3.5" /> Thêm câu hỏi
                                </Button>
                              </div>

                              <div className="max-h-[40vh] space-y-4 overflow-y-auto pr-1">
                                {(selectedRound.configData?.quizQuestions || []).map((q, qIdx) => (
                                  <div
                                    key={qIdx}
                                    className="relative space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
                                    <button
                                      onClick={() => {
                                        const currentQuestions = (
                                          selectedRound.configData?.quizQuestions || []
                                        ).filter((_, idx) => idx !== qIdx);
                                        updateRoundConfigField(
                                          selectedRoundIndex,
                                          "quizQuestions",
                                          currentQuestions
                                        );
                                      }}
                                      className="absolute top-3 right-3 text-slate-500 hover:text-red-400">
                                      <Trash2 className="h-4 w-4" />
                                    </button>

                                    <div className="space-y-1">
                                      <span className="text-[10px] font-bold text-slate-500">
                                        CÂU HỎI {qIdx + 1}
                                      </span>
                                      <Input
                                        value={q.questionText}
                                        onChange={(e) => {
                                          const currentQuestions = [
                                            ...(selectedRound.configData?.quizQuestions || []),
                                          ];
                                          currentQuestions[qIdx] = {
                                            ...currentQuestions[qIdx],
                                            questionText: e.target.value,
                                          };
                                          updateRoundConfigField(
                                            selectedRoundIndex,
                                            "quizQuestions",
                                            currentQuestions
                                          );
                                        }}
                                        className="border-slate-850 bg-slate-950 text-xs text-white"
                                      />
                                    </div>

                                    <div className="space-y-2">
                                      <span className="text-[10px] font-bold text-slate-500">
                                        CÁC PHƯƠNG ÁN LỰA CHỌN
                                      </span>
                                      {(q.options || []).map((opt, oIdx) => (
                                        <div key={oIdx} className="flex items-center gap-1.5">
                                          <span className="w-4 font-mono text-[10px] font-bold text-slate-400">
                                            {String.fromCharCode(65 + oIdx)}.
                                          </span>
                                          <Input
                                            value={opt}
                                            onChange={(e) => {
                                              const currentQuestions = [
                                                ...(selectedRound.configData?.quizQuestions || []),
                                              ];
                                              const opts = [
                                                ...(currentQuestions[qIdx].options || []),
                                              ];
                                              opts[oIdx] = e.target.value;
                                              currentQuestions[qIdx] = {
                                                ...currentQuestions[qIdx],
                                                options: opts,
                                              };
                                              updateRoundConfigField(
                                                selectedRoundIndex,
                                                "quizQuestions",
                                                currentQuestions
                                              );
                                            }}
                                            className="border-slate-850 h-8 bg-slate-950 text-xs text-white"
                                          />
                                        </div>
                                      ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                      <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-slate-500">
                                          ĐÁP ÁN ĐÚNG
                                        </span>
                                        <Select
                                          value={q.correctAnswer}
                                          onValueChange={(val) => {
                                            const currentQuestions = [
                                              ...(selectedRound.configData?.quizQuestions || []),
                                            ];
                                            currentQuestions[qIdx] = {
                                              ...currentQuestions[qIdx],
                                              correctAnswer: val,
                                            };
                                            updateRoundConfigField(
                                              selectedRoundIndex,
                                              "quizQuestions",
                                              currentQuestions
                                            );
                                          }}>
                                          <SelectTrigger className="border-slate-850 h-8 bg-slate-950 text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="border-slate-800 bg-slate-900 text-xs">
                                            {(q.options || []).map((opt, oIdx) => (
                                              <SelectItem key={oIdx} value={opt}>
                                                {String.fromCharCode(65 + oIdx)}. {opt}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-slate-500">
                                          ĐIỂM CÂU HỎI
                                        </span>
                                        <Input
                                          type="number"
                                          min={1}
                                          value={q.points}
                                          onChange={(e) => {
                                            const currentQuestions = [
                                              ...(selectedRound.configData?.quizQuestions || []),
                                            ];
                                            currentQuestions[qIdx] = {
                                              ...currentQuestions[qIdx],
                                              points: Number(e.target.value),
                                            };
                                            updateRoundConfigField(
                                              selectedRoundIndex,
                                              "quizQuestions",
                                              currentQuestions
                                            );
                                          }}
                                          className="border-slate-850 h-8 bg-slate-950 text-xs text-white"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                {(!selectedRound.configData?.quizQuestions ||
                                  selectedRound.configData.quizQuestions.length === 0) && (
                                  <div className="border-slate-855 rounded-xl border border-dashed py-6 text-center text-xs text-slate-500">
                                    Chưa có câu hỏi trắc nghiệm nào.
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 3. CODING (codingProblemsId Array builder) */}
                          {selectedRound.roundType === "CODING" && (
                            <>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-300">
                                  Mã danh sách bài tập (Coding Problem IDs)
                                </Label>
                                <Input
                                  value={(selectedRound.configData?.codingProblemsId || []).join(
                                    ", "
                                  )}
                                  onChange={(e) => {
                                    const idsStr = e.target.value;
                                    const parsedIds = idsStr
                                      .split(",")
                                      .map((id) => id.trim())
                                      .filter((id) => id !== "" && !isNaN(Number(id)))
                                      .map(Number);
                                    updateRoundConfigField(
                                      selectedRoundIndex,
                                      "codingProblemsId",
                                      parsedIds
                                    );
                                  }}
                                  placeholder="Nhập danh sách ID, phân tách bằng dấu phẩy (,)"
                                  className="border-slate-800 bg-slate-950 text-sm text-white"
                                />
                                <p className="text-[10px] leading-normal text-slate-500">
                                  Ví dụ: 101, 102, 105 (các mã bài tập từ cơ sở dữ liệu hệ thống).
                                </p>
                              </div>
                            </>
                          )}

                          {/* 4. AI INTERVIEW */}
                          {selectedRound.roundType === "AI_INTERVIEW" && (
                            <>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-300">
                                  AI System Prompt
                                </Label>
                                <Textarea
                                  value={selectedRound.configData?.aiSystemPrompt || ""}
                                  onChange={(e) =>
                                    updateRoundConfigField(
                                      selectedRoundIndex,
                                      "aiSystemPrompt",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Cung cấp prompt cấu hình vai trò AI..."
                                  rows={5}
                                  className="border-slate-800 bg-slate-950 text-xs text-white"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-300">
                                  Tiêu chuẩn Đánh giá
                                </Label>
                                <Textarea
                                  value={selectedRound.configData?.evaluationCriteria || ""}
                                  onChange={(e) =>
                                    updateRoundConfigField(
                                      selectedRoundIndex,
                                      "evaluationCriteria",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Các tiêu chuẩn đánh giá kết quả của ứng viên..."
                                  rows={4}
                                  className="border-slate-800 bg-slate-950 text-xs text-white"
                                />
                              </div>
                            </>
                          )}

                          {/* Instruction (Common for all) */}
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-300">
                              Lời Hướng dẫn cho ứng viên
                            </Label>
                            <Textarea
                              value={selectedRound.configData?.instruction || ""}
                              onChange={(e) =>
                                updateRoundConfigField(
                                  selectedRoundIndex,
                                  "instruction",
                                  e.target.value
                                )
                              }
                              placeholder="Hướng dẫn ứng viên làm bài..."
                              rows={4}
                              className="border-slate-800 bg-slate-950 text-xs text-white"
                            />
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>

              {/* Footer inside the main column */}
              <div className="flex shrink-0 justify-end gap-3 border-t border-slate-800 bg-slate-900/50 px-6 py-4">
                <Button
                  variant="outline"
                  className="border-slate-800 bg-slate-900/30 text-slate-300 hover:text-white"
                  onClick={() => onOpenChange(false)}>
                  Hủy
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || isLoading}
                  className="bg-primary hover:bg-primary/80 gap-2 font-bold text-white">
                  <Save className="h-4 w-4" />
                  {isSaving ? "Đang lưu..." : "Lưu thiết lập"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
