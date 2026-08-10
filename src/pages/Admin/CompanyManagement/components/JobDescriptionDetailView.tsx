/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApplicationDetailDrawer, DateTimePicker } from "@/components/shared";
import type { RoundType, UIRound } from "@/components/shared/RoundCanvasEditor";
import {
  getAvailableRoundsTemplates,
  RoundCanvasEditorWorkspace,
  type StaffUserOption,
} from "@/components/shared/RoundCanvasEditor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

import { formatCurrency } from "@/lib/formatting";

import { useUsers } from "@/hooks/useApplication";

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
  Tag,
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
  placeholder,
}: {
  value?: string;
  onChange: (newValue: string) => void;
  icon?: React.ElementType;
  iconColor?: string;
  placeholder?: string;
}) {
  const { t } = useTranslation();
  const defaultPlaceholder = placeholder || t("common.enterContent", "Nhập nội dung...");
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
            placeholder={`${defaultPlaceholder} (${t("adminCompanymanagement.linePrefix", "Dòng")} ${idx + 1})`}
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
        <span>{t("adminCompanymanagement.addNewLine", "Thêm dòng mới")}</span>
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

  // Per-round "Change Reviewer" dialog state. Holds the round id currently
  // being re-assigned so the dialog can render the right initial value.
  const [changingReviewerRoundId, setChangingReviewerRoundId] = useState<number | null>(null);

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
      id: r.id,
      name: r.name,
      roundOrder: r.roundOrder,
      roundType: r.roundType as RoundType,
      passThreshold: r.passThreshold ?? 0.8,
      reviewerId: r.reviewerId ?? null,
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

  // Load all users and filter to active STAFF only — used by the round editor
  // dropdown so admins can pick who reviews each round.
  const { data: allUsersData } = useUsers();
  const staffUsers = useMemo<StaffUserOption[]>(() => {
    const list = Array.isArray(allUsersData) ? allUsersData : [];
    return (
      list as Array<{
        id?: number;
        name?: string;
        email?: string;
        avatarUrl?: string | null;
        role?: string;
        isActive?: boolean | null;
      }>
    )
      .filter((u) => u.role === "STAFF")
      .filter((u) => u.isActive !== false)
      .map((u) => ({
        id: u.id as number,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl,
      }))
      .filter((u) => u.id != null)
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [allUsersData]);

  const handleSaveRounds = async (
    rounds: UIRound[],
    _metadata?: { name: string; category: string; description: string },
    options?: { closeEditorAfter?: boolean }
  ) => {
    setIsSaving(true);
    try {
      const payloadRounds = rounds.map((r, idx) => ({
        id: r.id,
        name: r.name || `${t("adminApplicationManagement.roundPrefix", "Vòng ")}${idx + 1}`,
        roundOrder: idx + 1,
        roundType: r.roundType as any,
        passThreshold: Number(r.passThreshold ?? 0.8),
        ...(r.reviewerId != null ? { reviewerId: r.reviewerId } : {}),
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
        // Only close the editor on a full save; per-round saves keep the user in the workspace.
        if (options?.closeEditorAfter !== false) {
          setIsEditorOpen(false);
        }
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

  /**
   * Change the reviewer of a single round without re-saving the whole round
   * list. Strategy:
   *   1. Read current `currentJd.rounds` from state (already synced with BE).
   *   2. Mutate only the target round's `reviewerId`.
   *   3. Send the full list via `roundManager.updateForJd` (BE merges by id).
   *   4. Reload JD into state.
   *
   * `closeEditorAfter` is `true` so the dialog closes on success.
   */
  const handleChangeReviewer = async (
    roundId: number,
    newReviewerId: number | null
  ): Promise<void> => {
    const jdId = currentJd.id;
    if (!jdId) return;
    setIsSaving(true);
    try {
      const currentRounds = currentJd.rounds ?? [];
      const nextRounds = currentRounds.map((r) =>
        r.id === roundId ? { ...r, reviewerId: newReviewerId } : r
      );
      const res = await roundManager.updateForJd(jdId, {
        rounds: nextRounds.map((r) => ({
          id: r.id,
          name: r.name ?? "",
          roundOrder: r.roundOrder ?? 0,
          roundType: r.roundType as any,
          passThreshold: r.passThreshold ?? 0,
          ...(r.reviewerId != null ? { reviewerId: r.reviewerId } : {}),
          configData: {
            instruction: r.configData?.instruction ?? "",
            submissionFormat: r.configData?.submissionFormat ?? "",
            timeLimitMinutes: r.configData?.timeLimitMinutes ?? 0,
            maxScore: r.configData?.maxScore ?? 100,
            aiSystemPrompt: r.configData?.aiSystemPrompt ?? "",
            evaluationCriteria: r.configData?.evaluationCriteria ?? "",
            quizQuestions: (r.configData?.quizQuestions ?? []).map((q: any) => ({
              questionText: q.questionText ?? "",
              options: q.options ?? [],
              correctAnswer: q.correctAnswer ?? "",
              points: Number(q.points ?? 0),
            })),
            codingProblemsId: r.configData?.codingProblems?.map((c: any) => c.problemId) ?? [],
            codeReviewIds: r.configData?.codeReviewProblems?.map((c: any) => c.problemId) ?? [],
          },
        })),
      });
      if (res.success && res.data) {
        toast.success(t("adminCompanymanagement.changeReviewerSuccess", "Đã đổi người chấm"));
        setCurrentJd((prev) =>
          prev ? { ...prev, rounds: res.data as unknown as typeof prev.rounds } : prev
        );
        setChangingReviewerRoundId(null);
      } else {
        toast.error(res.error || t("errors.cannotUpdateInterviewRounds"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("errors.cannotUpdateInterviewRounds"));
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
    if (min)
      return `${t("adminCompanymanagement.fromSalary", "Từ")} ${min.toLocaleString()} ${curr}`;
    return `${t("adminCompanymanagement.toSalary", "Đến")} ${max?.toLocaleString()} ${curr}`;
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

  const formatPrice = (price?: number, currency?: string) => {
    if (price == null) return "—";
    const curr = currency || "VND";
    return `${price.toLocaleString()} ${curr}`;
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "PASSED":
      case "ACCEPTED":
        return (
          <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            {t("adminApplicationManagement.statusPassed", "ĐẠT")}
          </Badge>
        );
      case "REJECTED":
      case "FAILED":
        return (
          <Badge variant="destructive">
            {t("adminApplicationManagement.statusRejected", "TỪ CHỐI")}
          </Badge>
        );
      case "IN_PROGRESS":
      case "PENDING":
      default:
        return (
          <Badge
            variant="secondary"
            className="border-amber-500/30 bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            {t("adminApplicationManagement.statusInProgress", "ĐANG XỬ LÝ")}
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
          title={t("adminCompanymanagement.recruitmentPipelineJd", "Quy trình tuyển dụng JD")}
          showMetadataInputs={false}
          mode="edit"
          isSaving={isSaving}
          onSave={handleSaveRounds}
          staffUsers={staffUsers}
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
                {t("adminCompanymanagement.recruitmentPipeline", "Quy trình tuyển dụng")}
              </h3>
              <Button
                onClick={() => setIsEditorOpen(true)}
                className="h-8 gap-1.5 bg-indigo-600 px-3 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700">
                <Sparkles className="h-3.5 w-3.5" />
                {t("adminCompanymanagement.studioWorkspace", "Studio Workspace sơ đồ")}
              </Button>
            </div>

            {!initialRounds || initialRounds.length === 0 ? (
              <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 dark:bg-indigo-950 dark:text-indigo-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {t(
                      "adminCompanymanagement.noRoundsConfigured",
                      "Chưa cấu hình vòng phỏng vấn nào"
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {t(
                      "adminCompanymanagement.setupRoundsDesc",
                      "Thiết lập các vòng phỏng vấn để hệ thống tự động chấm bài."
                    )}
                  </p>
                </div>
                <Button
                  onClick={() => setIsEditorOpen(true)}
                  className="h-7 bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700">
                  + {t("adminCompanymanagement.setupPipeline", "Cấu hình quy trình tuyển dụng")}
                </Button>
              </div>
            ) : (
              <div className="scrollbar-thin flex items-stretch gap-2.5 overflow-x-auto pb-2">
                {initialRounds.map((round, index) => {
                  const meta = templates.find((template) => template.type === round.roundType);
                  const isLast = index === initialRounds.length - 1;
                  const reviewer = staffUsers.find((s) => s.id === round.reviewerId);

                  return (
                    <div key={index} className="flex shrink-0 items-stretch gap-2.5">
                      <div
                        onClick={() => setIsEditorOpen(true)}
                        className="group flex h-full w-full max-w-[210px] min-w-[170px] flex-1 cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 transition-all hover:border-indigo-300 hover:bg-white hover:shadow-xs dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-indigo-700 dark:hover:bg-slate-900">
                        {/* Round Header */}
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant="outline"
                            className={cn("gap-1 text-[11px] font-bold shadow-2xs", meta?.color)}>
                            {t("adminApplicationManagement.roundPrefix", "Vòng ")}
                            {index + 1}
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

                        {/* Reviewer row — visible when staffUsers have loaded.
                            Hidden for QUIZ (auto-graded), CODING (system-graded),
                            and MENTOR_REVIEW (handled by the mentor system). */}
                        {staffUsers.length > 0 &&
                          round.roundType !== "QUIZ" &&
                          round.roundType !== "CODING" &&
                          round.roundType !== "MENTOR_REVIEW" &&
                          round.roundType !== "MENTROR_REVIEW" && (
                            <div className="mt-2 flex items-center justify-between gap-1.5 border-t border-slate-100 pt-2 dark:border-slate-800/60">
                              <div className="flex min-w-0 items-center gap-1.5">
                                <Users className="h-3 w-3 shrink-0 text-slate-400" />
                                <span
                                  className={cn(
                                    "truncate text-[11px] font-medium",
                                    reviewer
                                      ? "text-slate-700 dark:text-slate-300"
                                      : "text-amber-600 italic dark:text-amber-400"
                                  )}
                                  title={reviewer?.email ?? undefined}>
                                  {reviewer
                                    ? `${t("adminCompanymanagement.reviewerLabel", "Reviewer")}: ${reviewer.name ?? `#${round.reviewerId}`}`
                                    : t(
                                        "adminCompanymanagement.reviewerStaffCardWarning",
                                        "Chưa gán người chấm"
                                      )}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (round.id != null) setChangingReviewerRoundId(round.id);
                                }}
                                disabled={round.id == null}
                                className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-indigo-400 dark:hover:bg-indigo-950/40">
                                {t("adminCompanymanagement.changeReviewer", "Đổi")}
                              </button>
                            </div>
                          )}
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

          {/* SECTION 2: COMBINED SPECIFICATION TAB CARD */}
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
                  <span>{t("common.describe", "Mô tả công việc")}</span>
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
                  <span>{t("adminCompanymanagement.requirements", "Yêu cầu ứng viên")}</span>
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
                  <span>{t("common.welfare", "Phúc lợi & Đãi ngộ")}</span>
                </button>
              </div>

              {isEditing && (
                <Badge className="border-indigo-500/30 bg-indigo-500/15 text-[11px] font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  {t("adminCompanymanagement.editingInline", "Đang chỉnh sửa dòng")}
                </Badge>
              )}
            </div>

            {/* Sub-Tab Content Body */}
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
                    placeholder={t(
                      "adminCompanymanagement.jobDescriptionPlaceholder",
                      "Mô tả nhiệm vụ công việc"
                    )}
                  />
                ) : currentJd.description ? (
                  <FormattedTextList
                    text={currentJd.description}
                    icon={Sparkles}
                    iconColor="text-indigo-500"
                  />
                ) : (
                  <p className="text-sm text-slate-400 italic dark:text-slate-500">
                    {t("adminCompanymanagement.noDescriptionYet", "Chưa cập nhật mô tả công việc.")}
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
                    placeholder={t(
                      "adminCompanymanagement.requirementsPlaceholder",
                      "Yêu cầu kỹ năng / kinh nghiệm"
                    )}
                  />
                ) : (
                  <>
                    {detectedTechStack.length > 0 && (
                      <div className="mb-4 flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800/60 dark:bg-slate-950/50">
                        <span className="mr-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                          {t("adminCompanymanagement.techAndSkills", "Công nghệ & Kỹ năng:")}
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
                        {t(
                          "adminCompanymanagement.noRequirementsYet",
                          "Chưa cập nhật yêu cầu ứng viên."
                        )}
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
                    placeholder={t(
                      "adminCompanymanagement.benefitsPlaceholder",
                      "Quyền lợi & Phúc lợi"
                    )}
                  />
                ) : currentJd.benefits &&
                  currentJd.benefits.trim() &&
                  currentJd.benefits !== t("adminCompanymanagement.unpaidText", "Không lương") &&
                  currentJd.benefits !== "Unpaid" ? (
                  <FormattedTextList
                    text={currentJd.benefits}
                    icon={Gift}
                    iconColor="text-purple-500"
                  />
                ) : (
                  <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm font-medium text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
                    <Gift className="h-4 w-4 shrink-0 text-purple-400" />
                    <span>
                      {currentJd.benefits ||
                        t(
                          "adminCompanymanagement.defaultBenefitsPolicy",
                          "Thỏa thuận theo chính sách công ty"
                        )}
                    </span>
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
                {t("adminCompanymanagement.jobMetadata", "Thông số tuyển dụng")}
              </h3>
              {!isEditing ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStartEdit}
                  title={t("common.editDirectly", "Chỉnh sửa trực tiếp")}
                  className="h-8 gap-1.5 rounded-lg px-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950">
                  <Pencil className="h-3.5 w-3.5" />
                  <span>{t("common.edit", "Sửa")}</span>
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
                    {t("general.cancel", "Hủy")}
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
                        {t("general.save", "Lưu")}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Structured Rows */}
            <div className="space-y-3.5 text-sm">
              {/* Row 1: Title */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                <span className="flex shrink-0 items-center gap-2 font-medium text-slate-500 dark:text-slate-400">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  {t("adminCompanymanagement.position", "Vị trí")}
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
                  {t("adminCompanymanagement.salaryRate", "Mức lương")}
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

              {/* Row 3: Package Price / Giá gói mua */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                <span className="flex shrink-0 items-center gap-2 font-medium text-slate-500 dark:text-slate-400">
                  <Tag className="h-4 w-4 text-purple-500" />
                  Giá gói mua
                </span>
                {!isEditing ? (
                  <span
                    className={cn(
                      "text-xs font-bold",
                      currentJd.price && currentJd.price > 0
                        ? "text-slate-800 dark:text-slate-100"
                        : "text-emerald-600 dark:text-emerald-400"
                    )}>
                    {currentJd.price && currentJd.price > 0
                      ? formatCurrency(currentJd.price)
                      : "Miễn phí"}
                  </span>
                ) : (
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      value={editFormData.price ?? ""}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          price: e.target.value === "" ? undefined : Number(e.target.value),
                        })
                      }
                      placeholder="0 = Miễn phí"
                      className="h-7.5 w-32 border-slate-200/80 bg-slate-100/60 text-right font-mono text-xs text-slate-900 focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-white"
                    />
                  </div>
                )}
              </div>

              {/* Row 4: Level */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                <span className="flex shrink-0 items-center gap-2 font-medium text-slate-500 dark:text-slate-400">
                  <Briefcase className="h-4 w-4 text-indigo-500" />
                  {t("general.level", "Cấp bậc")}
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
                      <SelectValue placeholder={t("common.chooseLevel", "Cấp bậc")} />
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
                  {t("adminCompanymanagement.applicationDeadline", "Hạn ứng tuyển")}
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

              {/* Row 5: Applications count */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                <span className="flex shrink-0 items-center gap-2 font-medium text-slate-500 dark:text-slate-400">
                  <Users className="h-4 w-4 text-purple-500" />
                  {t("adminCompanymanagement.totalApplications", "Tổng ứng tuyển")}
                </span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {applications.length}{" "}
                  {t("adminApplicationManagement.applicationsUnit", "ứng viên")}
                </span>
              </div>

              {/* Row 6: Price */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                <span className="flex shrink-0 items-center gap-2 font-medium text-slate-500 dark:text-slate-400">
                  <DollarSign className="h-4 w-4 text-cyan-500" />
                  {t("adminCompanymanagement.price", "Giá JD")}
                </span>
                {!isEditing ? (
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">
                    {formatPrice(currentJd.price, currentJd.currency)}
                  </span>
                ) : (
                  <div className="flex items-center justify-end gap-1">
                    <Input
                      type="number"
                      value={editFormData.price ?? ""}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          price: e.target.value === "" ? undefined : Number(e.target.value),
                        })
                      }
                      placeholder="0"
                      className="h-7.5 w-24 border-slate-200/80 bg-slate-100/60 px-2 text-right font-mono text-xs dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-white"
                    />
                    <Input
                      value={editFormData.currency || "VND"}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, currency: e.target.value.toUpperCase() })
                      }
                      placeholder="VND"
                      maxLength={5}
                      className="h-7.5 w-14 border-slate-200/80 bg-slate-100/60 px-1 text-center font-mono text-xs uppercase dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-white"
                    />
                  </div>
                )}
              </div>

              {/* Row 7: Status */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="flex shrink-0 items-center gap-2 font-medium text-slate-500 dark:text-slate-400">
                  <Clock className="h-4 w-4 text-slate-400" />
                  {t("common.status", "Trạng thái")}
                </span>
                {!isEditing ? (
                  <Badge
                    className={
                      currentJd.status === "OPEN"
                        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }>
                    {t(
                      `adminCompanymanagement.status_${currentJd.status}`,
                      currentJd.status || "OPEN"
                    )}
                  </Badge>
                ) : (
                  <Select
                    value={editFormData.status}
                    onValueChange={(val) =>
                      setEditFormData({ ...editFormData, status: val as JobDescriptionStatus })
                    }>
                    <SelectTrigger className="h-7.5 w-28 border-slate-200/80 bg-slate-100/60 text-xs font-semibold text-slate-900 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-white">
                      <SelectValue placeholder={t("common.status", "Trạng thái")} />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((st) => (
                        <SelectItem key={st} value={st} className="text-xs">
                          {t(`adminCompanymanagement.status_${st}`, st)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Applications List */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3.5 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <Users className="h-4 w-4 text-purple-500" />
                {t("adminApplicationManagement.title", "Đơn ứng tuyển")} ({applications.length})
              </h3>
            </div>

            {isLoadingApps ? (
              <div className="flex h-32 items-center justify-center gap-2 text-xs text-slate-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                <span>{t("common.loadingData", "Đang tải danh sách...")}</span>
              </div>
            ) : applications.length === 0 ? (
              <div className="flex h-28 items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                {t("adminCompanymanagement.noApplicantsYet", "Chưa có ứng viên nào nộp đơn.")}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {applications.map((app, index) => {
                  const name =
                    app.candidateName ||
                    (app as any).applicantName ||
                    t("adminApplicationManagement.anonymousCandidate", "Ứng viên ẩn danh");
                  const email =
                    app.candidateEmail ||
                    (app as any).email ||
                    t("adminApplicationManagement.noEmail", "Chưa có email");
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

      {/* Dialog: change reviewer for a single round */}
      <Dialog
        open={changingReviewerRoundId !== null}
        onOpenChange={(open) => {
          if (!open) setChangingReviewerRoundId(null);
        }}>
        <DialogContent className="max-w-md border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="text-base">
              {t("adminCompanymanagement.changeReviewerTitle", "Đổi người chấm cho vòng")}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {t(
                "adminCompanymanagement.changeReviewerDescription",
                "Chọn STAFF sẽ chấm các bài ứng viên nộp cho vòng này."
              )}
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const round = (currentJd.rounds ?? []).find((r) => r.id === changingReviewerRoundId);
            if (!round) return null;
            return (
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900/50">
                  <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                    {t("userApplicationhistory.round")} #{round.roundOrder}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
                    {round.name}
                  </p>
                  {round.reviewerId != null && (
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {t("adminCompanymanagement.currentReviewer", "Hiện tại")}:{" "}
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {staffUsers.find((s) => s.id === round.reviewerId)?.name ??
                          `#${round.reviewerId}`}
                      </span>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                    {t("adminCompanymanagement.reviewerStaff", "Reviewer (Staff)")}
                  </Label>
                  <Select
                    value={round.reviewerId != null ? String(round.reviewerId) : "__none__"}
                    onValueChange={(val) => {
                      // Update local state immediately so the Select reflects the change
                      // before the BE round-trip. The actual save is triggered by
                      // clicking the Save button below.
                      const newId = val === "__none__" ? null : Number(val);
                      setCurrentJd((prev) => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          rounds: (prev.rounds ?? []).map((r) =>
                            r.id === round.id
                              ? { ...r, reviewerId: newId as number | undefined }
                              : r
                          ),
                        };
                      });
                    }}>
                    <SelectTrigger className="border-slate-200 bg-white text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                      <SelectValue
                        placeholder={t(
                          "adminCompanymanagement.reviewerStaffPlaceholder",
                          "— Chưa gán người chấm —"
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent className="border-slate-200 bg-white text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                      <SelectItem value="__none__">
                        {t("adminCompanymanagement.reviewerStaffUnassigned", "Chưa gán người chấm")}
                      </SelectItem>
                      {staffUsers.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name ?? `User #${s.id}`}
                          {s.email ? ` (${s.email})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })()}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChangingReviewerRoundId(null)}
              disabled={isSaving}>
              {t("common.cancel")}
            </Button>
            <Button
              size="sm"
              disabled={isSaving || changingReviewerRoundId == null}
              onClick={() => {
                if (changingReviewerRoundId == null) return;
                const round = (currentJd.rounds ?? []).find(
                  (r) => r.id === changingReviewerRoundId
                );
                if (!round) return;
                void handleChangeReviewer(round.id!, round.reviewerId ?? null);
              }}
              className="bg-indigo-600 hover:bg-indigo-700">
              {isSaving ? t("common.saving") : t("common.save", "Lưu")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
