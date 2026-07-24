/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApplicationDetailDrawer, DateTimePicker } from "@/components/shared";
import type { RoundType, UIRound } from "@/components/shared/RoundCanvasEditor";
import {
  getAvailableRoundsTemplates,
  RoundCanvasEditorWorkspace,
} from "@/components/shared/RoundCanvasEditor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  adminApplicationManager,
  type ApplicationListItemDto,
} from "@/services/admin-application.manager";
import { jobDescriptionManager } from "@/services/job-description.manager";
import { roundManager } from "@/services/round.manager";
import {
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  Eye,
  FileCheck,
  FileText,
  Gift,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { JobDescription, JobDescriptionLevel, JobDescriptionStatus } from "../types";

const COMMON_TECH_KEYWORDS = [
  "Java",
  "Spring Boot",
  "Spring",
  "Microservices",
  "Docker",
  "Kubernetes",
  "RESTful",
  "Kafka",
  "RabbitMQ",
  "SQL",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "React",
  "TypeScript",
  "JavaScript",
  "Python",
  "AWS",
  "GCP",
  "CI/CD",
  "Git",
  "JSON",
  "Swagger",
  "XML",
];

const LEVEL_OPTIONS: JobDescriptionLevel[] = ["INTERN", "FRESHER", "JUNIOR", "MIDDLE"];
const STATUS_OPTIONS: JobDescriptionStatus[] = ["OPEN", "CLOSED", "DRAFT"];

function extractTechStack(text?: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  COMMON_TECH_KEYWORDS.forEach((keyword) => {
    const escaped = keyword.replace(/[/.#]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(text)) {
      found.add(keyword);
    }
  });
  return Array.from(found);
}

function FormattedTextList({
  text,
  icon: Icon = CheckCircle2,
  iconColor = "text-indigo-500",
}: {
  text?: string;
  icon?: React.ElementType;
  iconColor?: string;
}) {
  if (!text || !text.trim()) return null;

  const lines = text
    .split(/\n+/)
    .map((line) => line.trim().replace(/^[-*•\d+.]\s*/, ""))
    .filter(Boolean);

  if (lines.length <= 1) {
    return (
      <div className="text-sm leading-relaxed font-medium text-slate-700 dark:text-slate-100">
        {text}
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {lines.map((line, idx) => (
        <li
          key={idx}
          className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-100">
          <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconColor)} />
          <span className="flex-1 font-medium">{line}</span>
        </li>
      ))}
    </ul>
  );
}

function EditableTextList({
  value = "",
  onChange,
  icon: Icon = CheckCircle2,
  iconColor = "text-indigo-500",
  placeholder = "Nhập nội dung...",
}: {
  value?: string;
  onChange: (newValue: string) => void;
  icon?: React.ElementType;
  iconColor?: string;
  placeholder?: string;
}) {
  const lines = value ? value.split("\n") : [""];

  const handleLineChange = (index: number, newContent: string) => {
    const updated = [...lines];
    updated[index] = newContent;
    onChange(updated.join("\n"));
  };

  const handleAddLine = () => {
    const updated = [...lines, ""];
    onChange(updated.join("\n"));
  };

  const handleDeleteLine = (index: number) => {
    const updated = lines.filter((_, i) => i !== index);
    onChange(updated.length > 0 ? updated.join("\n") : "");
  };

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => (
        <div key={idx} className="group flex items-center gap-2.5">
          <Icon className={cn("h-4 w-4 shrink-0", iconColor)} />
          <Input
            value={line}
            onChange={(e) => handleLineChange(idx, e.target.value)}
            placeholder={`${placeholder} (Dòng ${idx + 1})`}
            className="h-8.5 flex-1 border-slate-200/80 bg-slate-100/60 text-sm font-medium text-slate-800 focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-100"
          />
          {lines.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteLine(idx)}
              className="h-8 w-8 p-0 text-slate-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleAddLine}
        className="mt-1 h-7 gap-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/60">
        <Plus className="h-3.5 w-3.5" />
        <span>Thêm dòng mới</span>
      </Button>
    </div>
  );
}

interface JobDescriptionDetailViewProps {
  jobDescription: JobDescription;
  companyName?: string;
  onBack: () => void;
  onEdit?: (job: JobDescription) => void;
  activeTab?: string;
  onApplicationsCountChange?: (count: number) => void;
}

export function JobDescriptionDetailView({
  jobDescription,
  onEdit,
  onApplicationsCountChange,
}: JobDescriptionDetailViewProps) {
  const { t } = useTranslation();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentJd, setCurrentJd] = useState<JobDescription>(jobDescription);
  const [detailTab, setDetailTab] = useState<"description" | "requirements" | "benefits">(
    "description"
  );

  // Inline Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingJd, setIsSavingJd] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<JobDescription>>(jobDescription);

  // Application list state
  const [applications, setApplications] = useState<ApplicationListItemDto[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    setCurrentJd(jobDescription);
    setEditFormData(jobDescription);
  }, [jobDescription]);

  const loadApplications = useCallback(
    async (jdId: number) => {
      setIsLoadingApps(true);
      const res = await adminApplicationManager.getApplicationsByJdId(jdId);
      if (res.success && res.data) {
        const apps = (res.data.applications || (res.data as any)) as ApplicationListItemDto[];
        setApplications(apps);
        onApplicationsCountChange?.(apps.length);
      } else {
        setApplications([]);
        onApplicationsCountChange?.(0);
      }
      setIsLoadingApps(false);
    },
    [onApplicationsCountChange]
  );

  useEffect(() => {
    if (currentJd.id) {
      loadApplications(currentJd.id);
    }
  }, [currentJd.id, loadApplications]);

  const handleStartEdit = () => {
    setEditFormData({ ...currentJd });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditFormData({ ...currentJd });
    setIsEditing(false);
  };

  const handleSaveJdInline = async () => {
    if (!currentJd.id) return;
    setIsSavingJd(true);
    try {
      const res = await jobDescriptionManager.update({
        id: currentJd.id,
        title: editFormData.title,
        description: editFormData.description,
        requirements: editFormData.requirements,
        benefits: editFormData.benefits,
        salaryMin: editFormData.salaryMin,
        salaryMax: editFormData.salaryMax,
        currency: editFormData.currency,
        level: editFormData.level as any,
        status: editFormData.status as any,
        deadlineAt: editFormData.deadlineAt,
        price: editFormData.price,
      });

      if (res.success && res.data) {
        toast.success(t("general.updateSuccess", "Cập nhật thông tin công việc thành công!"));
        const updated = res.data as unknown as JobDescription;
        setCurrentJd(updated);
        setEditFormData(updated);
        setIsEditing(false);
        onEdit?.(updated);
      } else {
        toast.error(res.error || t("errors.cannotUpdateJobDescription", "Cập nhật thất bại"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("errors.cannotUpdateJobDescription", "Cập nhật thất bại"));
    } finally {
      setIsSavingJd(false);
    }
  };

  const initialRounds = useMemo(() => {
    const sortedRounds = [...(currentJd.rounds || [])].sort(
      (a, b) => (a.roundOrder ?? 0) - (b.roundOrder ?? 0)
    );

    return sortedRounds.map((r) => ({
      name: r.name,
      roundType: r.roundType as RoundType,
      passThreshold: r.passThreshold ?? 0.8,
      configData: {
        ...r.configData,
        codingProblemsId:
          r.configData?.codingProblems
            ?.map((cp: any) => cp.problemId)
            .filter((id: any): id is number => id !== undefined) ?? [],
        codingProblems: r.configData?.codingProblems ?? [],
        codeReviewProblemsId:
          r.configData?.codeReviewProblems
            ?.map((cp: any) => cp.problemId)
            .filter((id: any): id is number => id !== undefined) ?? [],
        codeReviewProblems: r.configData?.codeReviewProblems ?? [],
      },
    }));
  }, [currentJd.rounds]);

  const handleSaveRounds = async (rounds: UIRound[]) => {
    setIsSaving(true);
    try {
      const payloadRounds = rounds.map((r, idx) => ({
        name: r.name || `Vòng ${idx + 1}`,
        roundOrder: idx + 1,
        roundType: r.roundType as any,
        passThreshold: Number(r.passThreshold ?? 0.8),
        configData: {
          instruction: r.configData?.instruction || "",
          submissionFormat: r.configData?.submissionFormat || "",
          timeLimitMinutes: Number(r.configData?.timeLimitMinutes ?? 0),
          maxScore: Number(r.configData?.maxScore ?? 100),
          aiSystemPrompt: r.configData?.aiSystemPrompt || "",
          evaluationCriteria: r.configData?.evaluationCriteria || "",
          quizQuestions: (r.configData?.quizQuestions || []).map((q: any) => ({
            questionText: q.questionText || "",
            options: q.options || [],
            correctAnswer: q.correctAnswer || "",
            points: Number(q.points ?? 0),
          })),
          codingProblemsId: r.configData?.codingProblemsId ?? [],
          codeReviewIds: r.configData?.codeReviewProblemsId ?? [],
        },
      }));

      const jdId = currentJd.id!;
      const hasExistingRounds = (currentJd.rounds?.length ?? 0) > 0;
      const endpointResult = hasExistingRounds
        ? await roundManager.updateForJd(jdId, { rounds: payloadRounds })
        : await roundManager.setUpForJd(jdId, { rounds: payloadRounds });

      const res = endpointResult;

      if (res.success && res.data) {
        toast.success(t("general.updateSuccess"));
        setCurrentJd((prev) =>
          prev ? { ...prev, rounds: res.data as unknown as typeof prev.rounds } : prev
        );
      } else {
        toast.error(
          res.error ||
            t(
              hasExistingRounds
                ? "errors.cannotUpdateInterviewRounds"
                : "errors.cannotSetUpInterviewRounds"
            )
        );
        throw new Error();
      }
    } catch (err) {
      console.error(err);
      toast.error(t("errors.cannotUpdateInterviewRounds"));
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const templates = getAvailableRoundsTemplates(t);

  const detectedTechStack = useMemo(() => {
    return extractTechStack(currentJd.requirements);
  }, [currentJd.requirements]);

  const formatSalary = (min?: number, max?: number, currency?: string) => {
    if (!min && !max) return t("enterpriseJobdescriptiondetailpage.salaryAgreement");
    const curr = currency || "USD";
    if (min && max) return `${min.toLocaleString()} - ${max.toLocaleString()} ${curr}`;
    if (min) return `Từ ${min.toLocaleString()} ${curr}`;
    return `Đến ${max?.toLocaleString()} ${curr}`;
  };

  const formatDeadline = (dateStr?: string) => {
    if (!dateStr) return t("common.unlimited");
    try {
      return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "PASSED":
      case "ACCEPTED":
        return (
          <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            ĐẠT
          </Badge>
        );
      case "REJECTED":
      case "FAILED":
        return <Badge variant="destructive">TỪ CHỐI</Badge>;
      case "IN_PROGRESS":
      case "PENDING":
      default:
        return (
          <Badge
            variant="secondary"
            className="border-amber-500/30 bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            ĐANG XỬ LÝ
          </Badge>
        );
    }
  };

  if (isEditorOpen) {
    return (
      <div className="flex h-full w-full flex-col bg-slate-50 dark:bg-slate-950">
        <RoundCanvasEditorWorkspace
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          initialRounds={initialRounds}
          initialMetadata={{ name: currentJd.title || "", category: "", description: "" }}
          title="Quy trình tuyển dụng JD"
          showMetadataInputs={false}
          isSaving={isSaving}
          onSave={handleSaveRounds}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-slate-50 p-4 lg:p-5 dark:bg-slate-950">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
        {/* ── LEFT COLUMN (2/3): RECRUITMENT PIPELINE & COMBINED SPEC TABS CARD ─ */}
        <main className="min-w-0 space-y-4">
          {/* SECTION 1: RECRUITMENT PIPELINE STEPPER */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3.5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                Quy trình tuyển dụng
              </h3>
              <Button
                onClick={() => setIsEditorOpen(true)}
                className="h-8 gap-1.5 bg-indigo-600 px-3 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700">
                <Sparkles className="h-3.5 w-3.5" />
                Studio Workspace sơ đồ
              </Button>
            </div>

            {!initialRounds || initialRounds.length === 0 ? (
              <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 dark:bg-indigo-950 dark:text-indigo-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Chưa cấu hình vòng phỏng vấn nào
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Thiết lập các vòng phỏng vấn để hệ thống tự động chấm bài.
                  </p>
                </div>
                <Button
                  onClick={() => setIsEditorOpen(true)}
                  className="h-7 bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700">
                  + Cấu hình quy trình tuyển dụng
                </Button>
              </div>
            ) : (
              <div className="scrollbar-thin flex items-center gap-2.5 overflow-x-auto pb-2">
                {initialRounds.map((round, index) => {
                  const meta = templates.find((template) => template.type === round.roundType);
                  const isLast = index === initialRounds.length - 1;

                  return (
                    <div key={index} className="flex shrink-0 items-center gap-2.5">
                      <div
                        onClick={() => setIsEditorOpen(true)}
                        className="group flex max-w-[210px] min-w-[170px] flex-1 cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 transition-all hover:border-indigo-300 hover:bg-white hover:shadow-xs dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-indigo-700 dark:hover:bg-slate-900">
                        {/* Round Header */}
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant="outline"
                            className={cn("gap-1 text-[11px] font-bold shadow-2xs", meta?.color)}>
                            Vòng {index + 1}
                          </Badge>
                          {round.passThreshold !== undefined && (
                            <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              {Math.round(round.passThreshold * 100)}%
                            </span>
                          )}
                        </div>

                        {/* Round Name */}
                        <h4 className="mt-2.5 truncate text-xs font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                          {round.name}
                        </h4>
                      </div>

                      {!isLast && (
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-700" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* SECTION 2: COMBINED SPECIFICATION TAB CARD (Mô tả / Yêu cầu / Phúc lợi in 1 card) */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5 dark:border-slate-800 dark:bg-slate-900">
            {/* Sub-Tab Navigation Header */}
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDetailTab("description")}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                    detailTab === "description"
                      ? "bg-indigo-50 text-indigo-700 shadow-2xs dark:bg-indigo-950 dark:text-indigo-300"
                      : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  )}>
                  <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Mô tả công việc</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDetailTab("requirements")}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                    detailTab === "requirements"
                      ? "bg-emerald-50 text-emerald-700 shadow-2xs dark:bg-emerald-950 dark:text-emerald-300"
                      : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  )}>
                  <FileCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Yêu cầu ứng viên</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDetailTab("benefits")}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                    detailTab === "benefits"
                      ? "bg-purple-50 text-purple-700 shadow-2xs dark:bg-purple-950 dark:text-purple-300"
                      : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  )}>
                  <Gift className="h-3.5 w-3.5 text-purple-500" />
                  <span>Phúc lợi & Đãi ngộ</span>
                </button>
              </div>

              {isEditing && (
                <Badge className="border-indigo-500/30 bg-indigo-500/15 text-[11px] font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  Đang chỉnh sửa dòng
                </Badge>
              )}
            </div>

            {/* Sub-Tab Content Body (Line-by-Line Editable) */}
            {detailTab === "description" && (
              <div>
                {isEditing ? (
                  <EditableTextList
                    value={editFormData.description}
                    onChange={(newText) =>
                      setEditFormData({ ...editFormData, description: newText })
                    }
                    icon={Sparkles}
                    iconColor="text-indigo-500"
                    placeholder="Mô tả nhiệm vụ công việc"
                  />
                ) : currentJd.description ? (
                  <FormattedTextList
                    text={currentJd.description}
                    icon={Sparkles}
                    iconColor="text-indigo-500"
                  />
                ) : (
                  <p className="text-sm text-slate-400 italic dark:text-slate-500">
                    Chưa cập nhật mô tả công việc.
                  </p>
                )}
              </div>
            )}

            {detailTab === "requirements" && (
              <div>
                {isEditing ? (
                  <EditableTextList
                    value={editFormData.requirements}
                    onChange={(newText) =>
                      setEditFormData({ ...editFormData, requirements: newText })
                    }
                    icon={CheckCircle2}
                    iconColor="text-emerald-500"
                    placeholder="Yêu cầu kỹ năng / kinh nghiệm"
                  />
                ) : (
                  <>
                    {detectedTechStack.length > 0 && (
                      <div className="mb-4 flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800/60 dark:bg-slate-950/50">
                        <span className="mr-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                          Công nghệ & Kỹ năng:
                        </span>
                        {detectedTechStack.map((tech) => (
                          <Badge
                            key={tech}
                            className="border-indigo-200/60 bg-indigo-50 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800/60 dark:bg-indigo-950/80 dark:text-indigo-300">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {currentJd.requirements ? (
                      <FormattedTextList
                        text={currentJd.requirements}
                        icon={CheckCircle2}
                        iconColor="text-emerald-500"
                      />
                    ) : (
                      <p className="text-sm text-slate-400 italic dark:text-slate-500">
                        Chưa cập nhật yêu cầu ứng viên.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {detailTab === "benefits" && (
              <div>
                {isEditing ? (
                  <EditableTextList
                    value={editFormData.benefits}
                    onChange={(newText) => setEditFormData({ ...editFormData, benefits: newText })}
                    icon={Gift}
                    iconColor="text-purple-500"
                    placeholder="Quyền lợi & Phúc lợi"
                  />
                ) : currentJd.benefits &&
                  currentJd.benefits.trim() &&
                  currentJd.benefits !== "Không lương" ? (
                  <FormattedTextList
                    text={currentJd.benefits}
                    icon={Gift}
                    iconColor="text-purple-500"
                  />
                ) : (
                  <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm font-medium text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
                    <Gift className="h-4 w-4 shrink-0 text-purple-400" />
                    <span>{currentJd.benefits || "Thỏa thuận theo chính sách công ty"}</span>
                  </div>
                )}
              </div>
            )}
          </section>
        </main>

        {/* ── RIGHT COLUMN (1/3): JOB OVERVIEW METADATA & APPLICATIONS LIST ───────── */}
        <aside className="space-y-4">
          {/* Card 1: Job Metadata Summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5 dark:border-slate-800 dark:bg-slate-900">
            {/* Metadata Header with Pencil Button */}
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Thông số tuyển dụng
              </h3>
              {!isEditing ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStartEdit}
                  title="Chỉnh sửa trực tiếp"
                  className="h-8 gap-1.5 rounded-lg px-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950">
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Sửa</span>
                </Button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={isSavingJd}
                    className="h-7 px-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                    <X className="mr-1 h-3.5 w-3.5" />
                    Hủy
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveJdInline}
                    disabled={isSavingJd}
                    className="h-7 bg-indigo-600 px-3 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700">
                    {isSavingJd ? (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <Check className="mr-1 h-3.5 w-3.5" />
                        Lưu
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Structured Rows (Seamless Inline Styling) */}
            <div className="space-y-3.5 text-sm">
              {/* Row 1: Title */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                <span className="flex shrink-0 items-center gap-2 font-medium text-slate-500 dark:text-slate-400">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  Vị trí
                </span>
                {!isEditing ? (
                  <span className="max-w-[180px] truncate font-bold text-slate-900 dark:text-white">
                    {currentJd.title || "—"}
                  </span>
                ) : (
                  <Input
                    value={editFormData.title || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    placeholder="VD: Senior Java Engineer"
                    className="h-7.5 w-48 border-slate-200/80 bg-slate-100/60 text-right text-xs font-bold text-slate-900 focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-white"
                  />
                )}
              </div>

              {/* Row 2: Salary */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                <span className="flex shrink-0 items-center gap-2 font-medium text-slate-500 dark:text-slate-400">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  Mức lương
                </span>
                {!isEditing ? (
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatSalary(currentJd.salaryMin, currentJd.salaryMax, currentJd.currency)}
                  </span>
                ) : (
                  <div className="flex items-center justify-end gap-1">
                    <Input
                      type="number"
                      value={editFormData.salaryMin ?? ""}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          salaryMin: e.target.value === "" ? undefined : Number(e.target.value),
                        })
                      }
                      placeholder="Min"
                      className="h-7.5 w-16 border-slate-200/80 bg-slate-100/60 px-1.5 text-right font-mono text-xs dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-white"
                    />
                    <span className="text-xs text-slate-400">-</span>
                    <Input
                      type="number"
                      value={editFormData.salaryMax ?? ""}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          salaryMax: e.target.value === "" ? undefined : Number(e.target.value),
                        })
                      }
                      placeholder="Max"
                      className="h-7.5 w-16 border-slate-200/80 bg-slate-100/60 px-1.5 text-right font-mono text-xs dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-white"
                    />
                    <Input
                      value={editFormData.currency || ""}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, currency: e.target.value })
                      }
                      placeholder="USD"
                      className="h-7.5 w-12 border-slate-200/80 bg-slate-100/60 px-1 text-center font-mono text-xs uppercase dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-white"
                    />
                  </div>
                )}
              </div>

              {/* Row 3: Level */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                <span className="flex shrink-0 items-center gap-2 font-medium text-slate-500 dark:text-slate-400">
                  <Briefcase className="h-4 w-4 text-indigo-500" />
                  Cấp bậc
                </span>
                {!isEditing ? (
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {currentJd.level || "—"}
                  </span>
                ) : (
                  <Select
                    value={editFormData.level}
                    onValueChange={(val) =>
                      setEditFormData({ ...editFormData, level: val as JobDescriptionLevel })
                    }>
                    <SelectTrigger className="h-7.5 w-32 border-slate-200/80 bg-slate-100/60 text-xs font-bold text-slate-900 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-white">
                      <SelectValue placeholder="Cấp bậc" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVEL_OPTIONS.map((lvl) => (
                        <SelectItem key={lvl} value={lvl} className="text-xs font-semibold">
                          {lvl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Row 4: Deadline */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                <span className="flex shrink-0 items-center gap-2 font-medium text-slate-500 dark:text-slate-400">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  Hạn ứng tuyển
                </span>
                {!isEditing ? (
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatDeadline(currentJd.deadlineAt)}
                  </span>
                ) : (
                  <div className="w-40">
                    <DateTimePicker
                      value={editFormData.deadlineAt ? new Date(editFormData.deadlineAt) : null}
                      onChange={(date) =>
                        setEditFormData({
                          ...editFormData,
                          deadlineAt: date ? date.toISOString() : undefined,
                        })
                      }
                      themeVariant="admin"
                    />
                  </div>
                )}
              </div>

              {/* Row 5: Applications count (Read-only) */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                <span className="flex shrink-0 items-center gap-2 font-medium text-slate-500 dark:text-slate-400">
                  <Users className="h-4 w-4 text-purple-500" />
                  Tổng ứng tuyển
                </span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {applications.length} ứng viên
                </span>
              </div>

              {/* Row 6: Status */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="flex shrink-0 items-center gap-2 font-medium text-slate-500 dark:text-slate-400">
                  <Clock className="h-4 w-4 text-slate-400" />
                  Trạng thái
                </span>
                {!isEditing ? (
                  <Badge
                    className={
                      currentJd.status === "OPEN"
                        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }>
                    {currentJd.status || "OPEN"}
                  </Badge>
                ) : (
                  <Select
                    value={editFormData.status}
                    onValueChange={(val) =>
                      setEditFormData({ ...editFormData, status: val as JobDescriptionStatus })
                    }>
                    <SelectTrigger className="h-7.5 w-28 border-slate-200/80 bg-slate-100/60 text-xs font-semibold text-slate-900 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-white">
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((st) => (
                        <SelectItem key={st} value={st} className="text-xs">
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Applications List (In Sidebar) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3.5 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <Users className="h-4 w-4 text-purple-500" />
                Đơn ứng tuyển ({applications.length})
              </h3>
            </div>

            {isLoadingApps ? (
              <div className="flex h-32 items-center justify-center gap-2 text-xs text-slate-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                <span>Đang tải danh sách...</span>
              </div>
            ) : applications.length === 0 ? (
              <div className="flex h-28 items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                Chưa có ứng viên nào nộp đơn.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {applications.map((app, index) => {
                  const name =
                    app.candidateName || (app as any).applicantName || "Ứng viên ẩn danh";
                  const email = app.candidateEmail || (app as any).email || "Chưa có email";
                  const avatarUrl = (app as any).avatarUrl || (app as any).applicantAvatar;

                  return (
                    <div
                      key={app.applicationId ?? index}
                      onClick={() => {
                        setSelectedAppId(app.applicationId || (app as any).id);
                        setIsDrawerOpen(true);
                      }}
                      className="group flex cursor-pointer items-center justify-between gap-3 rounded-lg px-1 py-3 transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar className="h-8 w-8 shrink-0 border border-slate-200 dark:border-slate-800">
                          <AvatarImage src={avatarUrl} alt={name} />
                          <AvatarFallback className="bg-indigo-50 text-xs font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                            {name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                            {name}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span className="truncate">{email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {getStatusBadge(app.status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAppId(app.applicationId || (app as any).id);
                            setIsDrawerOpen(true);
                          }}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Slide-over Application Detail Drawer */}
      <ApplicationDetailDrawer
        applicationId={selectedAppId}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedAppId(null);
        }}
        onStatusChange={() => {
          if (currentJd.id) loadApplications(currentJd.id);
        }}
      />
    </div>
  );
}
