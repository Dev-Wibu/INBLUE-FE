import { DateTimePicker } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { SpinnerBlock } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import type { User } from "@/interfaces";
import { formatCurrency, formatDateTime, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { openUrlInNewTab } from "@/lib/media-file-utils";
import { getSessionStatusBadge } from "@/lib/status-utils";
import { sessionManager, usersAdminManager } from "@/services";
import {
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Edit3,
  ExternalLink,
  Save,
  Users,
  Video,
  XCircle,
  XSquare,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { CancelSessionDialog } from "./components/CancelSessionDialog";
import type { Session, SessionFormData, SessionStatus } from "./types";

const SESSION_STATUSES: SessionStatus[] = [
  "DRAFT",
  "SCHEDULED",
  "PAID",
  "REJECTED",
  "ONGOING",
  "COMPLETED",
  "CANCELED",
];

interface CollapsibleCardProps {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  id?: string;
  className?: string;
}

function CollapsibleCard({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  id,
  className = "",
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div
      id={id}
      className={`scroll-mt-24 rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all md:p-6 dark:border-slate-800/60 dark:bg-slate-900/40 ${className}`}>
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-slate-500" />}
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      {isOpen && <div className="mt-6">{children}</div>}
    </div>
  );
}

const getYouTubeEmbedUrl = (url?: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : url;
};

const formatDuration = (seconds?: number) => {
  if (!seconds) return "-";
  const hours = Math.floor(seconds / 3600);
  const minutesFromSeconds = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}g ${minutesFromSeconds}p ${secs}s`;
  }
  return `${minutesFromSeconds}p ${secs}s`;
};

export function SessionFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(!isEditMode); // Default to editing if creating
  const [formData, setFormData] = useState<Partial<SessionFormData>>({
    status: "SCHEDULED",
    start_video_off: true,
    start_audio_off: true,
  });
  const [originalSession, setOriginalSession] = useState<Session | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [participant1Info, setParticipant1Info] = useState<User | null>(null);
  const [participant2Info, setParticipant2Info] = useState<User | null>(null);

  const handleApprove = async () => {
    if (!id) return;
    try {
      const response = await sessionManager.updateStatus(parseInt(id, 10), true);
      if (response.success) {
        toast.success(t("adminSessionmanagement.interviewSessionApproved"));
        window.location.reload();
      } else {
        toast.error(response.error || t("adminSessionmanagement.unableToBrowseSession"));
      }
    } catch (error) {
      console.error("Error approving session:", error);
      toast.error(t("adminSessionmanagement.unableToBrowseSession"));
    }
  };

  const handleReject = async () => {
    if (!id) return;
    try {
      const response = await sessionManager.updateStatus(parseInt(id, 10), false);
      if (response.success) {
        toast.success(t("common.refusedTheInterviewSession"));
        window.location.reload();
      } else {
        toast.error(response.error || t("adminSessionmanagement.sessionCannotBeRejected"));
      }
    } catch (error) {
      console.error("Error rejecting session:", error);
      toast.error(t("adminSessionmanagement.sessionCannotBeRejected"));
    }
  };

  const handleConfirmCancel = async () => {
    if (!originalSession || !id) return;
    try {
      const response = await sessionManager.update(id, {
        ...originalSession,
        status: "CANCELED",
      });
      if (response.success) {
        toast.success(t("adminSessionmanagement.lessonCanceledSuccessfully"));
        setIsCancelDialogOpen(false);
        window.location.reload();
      } else {
        toast.error(response.error || t("adminSessionmanagement.lessonsCannotBeCanceled"));
      }
    } catch (error) {
      console.error("Error canceling session:", error);
      toast.error(t("adminSessionmanagement.lessonsCannotBeCanceled"));
    }
  };

  useEffect(() => {
    if (isEditMode && id) {
      const fetchSession = async () => {
        try {
          const response = await sessionManager.getById(parseInt(id, 10));
          if (response.success && response.data) {
            const session = Array.isArray(response.data) ? response.data[0] : response.data;
            if (!session) throw new Error("Session not found");
            setOriginalSession(session as Session);

            if (session.userId) {
              usersAdminManager.getById(session.userId).then((res) => {
                if (res.success && res.data) setParticipant1Info(res.data);
              });
            }
            if (session.userId2) {
              usersAdminManager.getById(session.userId2).then((res) => {
                if (res.success && res.data) setParticipant2Info(res.data);
              });
            }

            setFormData({
              userId: session.userId,
              userId2: session.userId2,
              status: session.status,
              joinTime: session.joinTime,
              duration: session.duration,
              totalPrice: session.totalPrice,
              transactionCode: session.transactionCode,
              start_video_off: true,
              start_audio_off: true,
            });
          } else {
            toast.error(response.error || t("adminSessionmanagement.unableToLoadLessonList"));
            navigate("/admin/sessions");
          }
        } catch (error) {
          console.error("Error loading session:", error);
          toast.error(t("adminSessionmanagement.unableToLoadLessonList"));
          navigate("/admin/sessions");
        } finally {
          setIsLoading(false);
        }
      };
      void fetchSession();
    }
  }, [id, isEditMode, navigate, t]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (isEditMode && id) {
        if (!originalSession) return;
        const mergedData: Partial<Session> = {
          ...originalSession,
          userId: formData.userId,
          userId2: formData.userId2,
          status: formData.status,
          joinTime: formData.joinTime,
          duration: formData.duration,
          totalPrice: formData.totalPrice,
          transactionCode: formData.transactionCode,
        };
        const response = await sessionManager.update(parseInt(id, 10), mergedData);
        if (response.success) {
          toast.success(t("adminSessionmanagement.lessonUpdatedSuccessfully"));
          setIsEditing(false);
          window.location.reload();
        } else {
          toast.error(response.error || t("adminSessionmanagement.unableToUpdateLesson"));
        }
      } else {
        const response = await sessionManager.create(formData);
        if (response.success) {
          toast.success(t("adminSessionmanagement.lessonCreatedSuccessfully"));
          navigate("/admin/sessions");
        } else {
          toast.error(response.error || t("adminSessionmanagement.unableToCreateLesson"));
        }
      }
    } catch (error) {
      console.error("Error submitting session:", error);
      toast.error(
        isEditMode
          ? t("adminSessionmanagement.unableToUpdateLesson")
          : t("adminSessionmanagement.unableToCreateLesson")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <SpinnerBlock size="lg" label={t("common.loading")} />
      </div>
    );
  }

  const renderFormFields = () => (
    <div className="animate-in fade-in space-y-8">
      <div className="space-y-4">
        <h4 className="border-b pb-2 text-base font-semibold text-slate-900 dark:text-white">
          {t("adminSessionmanagement.userInformation")}
        </h4>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="userId">{t("general.userId1")}</Label>
            <Input
              id="userId"
              type="number"
              value={formData.userId || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  userId: parseInt(e.target.value) || undefined,
                })
              }
              placeholder={t("adminSessionmanagement.enterUserId")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="userId2">{t("common.idMentor")}</Label>
            <Input
              id="userId2"
              type="number"
              value={formData.userId2 || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  userId2: parseInt(e.target.value) || undefined,
                })
              }
              placeholder={t("adminSessionmanagement.enterMentorId")}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="border-b pb-2 text-base font-semibold text-slate-900 dark:text-white">
          {t("adminSessionmanagement.startTime")} & {t("common.duration")}
        </h4>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="joinTime">{t("adminSessionmanagement.meetingStartTime")}</Label>
            <DateTimePicker
              value={formData.joinTime ? new Date(formData.joinTime) : null}
              onChange={(date) =>
                setFormData({
                  ...formData,
                  joinTime: date ? date.toISOString() : undefined,
                })
              }
              themeVariant="admin"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="duration">{t("adminSessionmanagement.estimatedTimeMinutes")}</Label>
            <Input
              id="duration"
              type="number"
              min={0}
              value={formData.duration ?? ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  duration: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
              placeholder={t("adminSessionmanagement.enterDuration")}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="border-b pb-2 text-base font-semibold text-slate-900 dark:text-white">
          {t("adminSessionmanagement.paymentInformation")}
        </h4>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="totalPrice">{t("adminSessionmanagement.totalPriceVnd")}</Label>
            <Input
              id="totalPrice"
              type="number"
              min={0}
              value={formData.totalPrice ?? ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  totalPrice: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
              placeholder={t("adminSessionmanagement.enterTotalPrice")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="transactionCode">{t("common.transactionCode")}</Label>
            <Input
              id="transactionCode"
              value={formData.transactionCode || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  transactionCode: e.target.value,
                })
              }
              placeholder={t("adminSessionmanagement.enterTransactionCode")}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="border-b pb-2 text-base font-semibold text-slate-900 dark:text-white">
          {t("adminSessionmanagement.setup")} & {t("common.status")}
        </h4>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="enable_recording">{t("common.videoRecording")}</Label>
            <Select
              value={formData.enable_recording || "cloud"}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  enable_recording: value,
                })
              }>
              <SelectTrigger>
                <SelectValue placeholder={t("common.selectRecordingMode")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cloud">{t("common.cloudCloud")}</SelectItem>
                <SelectItem value="local">{t("common.localComputer")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">{t("common.status")}</Label>
            <Select
              value={formData.status || "SCHEDULED"}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  status: value as SessionStatus,
                })
              }>
              <SelectTrigger>
                <SelectValue placeholder={t("common.selectStatus")} />
              </SelectTrigger>
              <SelectContent>
                {SESSION_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row">
          <div className="flex flex-1 items-center justify-between rounded-lg border bg-slate-50 p-4 dark:bg-slate-900/50">
            <div className="space-y-0.5">
              <Label htmlFor="start_video_off">
                {t("adminSessionmanagement.turnOffVideoWhenStarting")}
              </Label>
            </div>
            <Switch
              id="start_video_off"
              checked={formData.start_video_off ?? true}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  start_video_off: checked,
                })
              }
            />
          </div>
          <div className="flex flex-1 items-center justify-between rounded-lg border bg-slate-50 p-4 dark:bg-slate-900/50">
            <div className="space-y-0.5">
              <Label htmlFor="start_audio_off">
                {t("adminSessionmanagement.turnOffAudioWhenStarting")}
              </Label>
            </div>
            <Switch
              id="start_audio_off"
              checked={formData.start_audio_off ?? true}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  start_audio_off: checked,
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <Button
          variant="outline"
          onClick={() => (isEditMode ? setIsEditing(false) : navigate("/admin/sessions"))}>
          {t("general.cancel")}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="min-w-[140px] bg-indigo-600 text-white hover:bg-indigo-700">
          {isSubmitting ? (
            <SpinnerBlock size="sm" />
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {isEditMode
                ? t("common.saveChanges")
                : t("adminSessionmanagement.createAStudySession")}
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50/50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      {/* Header Toolbar */}
      <div className="flex flex-none items-center gap-4 border-b border-slate-200/60 bg-white/50 px-6 py-4 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-900/50">
        <button
          onClick={() => {
            if (isEditing && isEditMode) setIsEditing(false);
            else navigate("/admin/sessions");
          }}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {isEditMode && isEditing
              ? t("adminSessionmanagement.editingLessons")
              : !isEditMode
                ? t("adminSessionmanagement.createANewLesson")
                : "Chi tiết phiên phỏng vấn"}
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        {!isEditMode ? (
          <div className="mx-auto max-w-4xl">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 dark:border-slate-800 dark:bg-slate-900/40">
              {renderFormFields()}
            </div>
          </div>
        ) : (
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
            {/* Left Column: Summary Card */}
            <div className="space-y-6 lg:sticky lg:top-0 lg:col-span-4">
              <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                <div className="relative px-6 py-6 text-left">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      <Video className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="line-clamp-1 text-lg font-bold text-slate-900 dark:text-white">
                        {originalSession?.roomName || `Room #${originalSession?.id}`}
                      </h3>
                      <div className="mt-1.5">
                        {originalSession?.status && (
                          <Badge
                            variant={getSessionStatusBadge(originalSession.status).variant}
                            className={
                              getSessionStatusBadge(originalSession.status).className +
                              " px-2.5 py-0.5 text-[11px]"
                            }>
                            {getSessionStatusBadge(originalSession.status).label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-2">
                    <Button
                      className="w-full bg-slate-100 text-slate-900 shadow-none hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                      onClick={() => setIsEditing(true)}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Chỉnh sửa thông tin
                    </Button>
                  </div>

                  <Separator className="my-4" />

                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div>
                      <p className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
                        Thời lượng
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-200">
                        {originalSession?.duration ? `${originalSession.duration} phút` : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
                        Lịch hẹn
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-200">
                        {originalSession?.joinTime
                          ? formatDateTime(treatZuluAsVietnamLocal(originalSession.joinTime))
                          : "-"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="mb-0.5 text-[10px] font-medium tracking-wider text-slate-500 uppercase">
                        {t("adminSessionmanagement.roomUrl")}
                      </p>
                      {originalSession?.roomUrl ? (
                        <a
                          href={originalSession.roomUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="line-clamp-1 text-sm font-medium break-all text-blue-600 hover:underline">
                          {originalSession.roomUrl}
                        </a>
                      ) : (
                        <p className="text-sm text-slate-400 italic">Chưa có liên kết phòng</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <p className="mb-0.5 text-[10px] font-medium tracking-wider text-slate-500 uppercase">
                        {t("adminSessionmanagement.totalPriceVnd")}
                      </p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {originalSession?.totalPrice
                          ? formatCurrency(originalSession.totalPrice)
                          : "0 ₫"}
                      </p>
                    </div>
                  </div>

                  {(originalSession?.status === "DRAFT" ||
                    !["CANCELED", "COMPLETED", "REJECTED"].includes(
                      originalSession?.status as string
                    )) && (
                    <>
                      <Separator className="my-4" />
                      <div className="flex flex-col gap-2">
                        {originalSession?.status === "DRAFT" && (
                          <>
                            <Button
                              variant="outline"
                              className="w-full border-slate-200/60 text-slate-700 shadow-none hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700/60 dark:text-slate-300 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
                              onClick={handleApprove}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Duyệt phiên
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full border-slate-200/60 text-slate-700 shadow-none hover:bg-amber-50 hover:text-amber-700 dark:border-slate-700/60 dark:text-slate-300 dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
                              onClick={handleReject}>
                              <XSquare className="mr-2 h-4 w-4" />
                              Từ chối
                            </Button>
                          </>
                        )}
                        {!["CANCELED", "COMPLETED", "REJECTED"].includes(
                          originalSession?.status as string
                        ) && (
                          <Button
                            variant="outline"
                            className="w-full border-slate-200/60 text-slate-700 shadow-none hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700/60 dark:text-slate-300 dark:hover:bg-rose-900/20 dark:hover:text-rose-400"
                            onClick={() => setIsCancelDialogOpen(true)}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Hủy phiên này
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {!isEditing && (
                <div className="lg:sticky lg:top-0">
                  <CollapsibleCard id="media" title="Bản ghi hình" icon={Video} className="p-4">
                    <div className="space-y-4">
                      {originalSession?.recordUrl ? (
                        <div className="space-y-4">
                          {(() => {
                            const embedUrl = getYouTubeEmbedUrl(originalSession.recordUrl);
                            const isYouTube = embedUrl && embedUrl.includes("youtube.com/embed");
                            return (
                              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-inner">
                                {isYouTube ? (
                                  <iframe
                                    className="absolute top-0 left-0 h-full w-full object-cover"
                                    src={embedUrl}
                                    title="YouTube video player"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen></iframe>
                                ) : (
                                  <video
                                    controls
                                    className="absolute top-0 left-0 h-full w-full object-contain"
                                    src={originalSession.recordUrl}>
                                    Trình duyệt của bạn không hỗ trợ thẻ video.
                                  </video>
                                )}
                              </div>
                            );
                          })()}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => openUrlInNewTab(originalSession.recordUrl!)}>
                            Mở video tab mới <ExternalLink className="ml-2 h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 py-12 dark:border-slate-800 dark:bg-slate-900/50">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                            <Video className="h-6 w-6" />
                          </div>
                          <p className="mt-4 text-sm font-medium text-slate-900 dark:text-white">
                            Chưa có bản ghi hình
                          </p>
                          <p className="mt-1 max-w-[200px] text-center text-xs text-slate-500">
                            Bản ghi sẽ được upload tự động sau khi phiên kết thúc.
                          </p>
                        </div>
                      )}
                    </div>
                  </CollapsibleCard>
                </div>
              )}
            </div>

            {/* Right Column */}
            {isEditing ? (
              <div className="lg:col-span-8">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 dark:border-slate-800 dark:bg-slate-900/40">
                  {renderFormFields()}
                </div>
              </div>
            ) : (
              <div className="space-y-6 lg:col-span-8">
                <CollapsibleCard id="participants" title="Người tham gia" icon={Users}>
                  <div className="flex flex-col gap-6">
                    {/* Participant 1 */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
                      <h4 className="mb-4 flex items-center gap-2 font-semibold text-indigo-600 dark:text-indigo-400">
                        <div className="h-2 w-2 rounded-full bg-indigo-500" />
                        Ứng viên (Participant 1)
                      </h4>
                      <div className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <span className="mb-1 block text-xs font-medium tracking-wide text-slate-500 uppercase">
                            Tài khoản hệ thống
                          </span>
                          {participant1Info ? (
                            <div className="mt-2 flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={participant1Info.avatarUrl || ""} />
                                <AvatarFallback className="bg-indigo-100 text-xs text-indigo-700">
                                  {participant1Info.name?.substring(0, 2).toUpperCase() || "U1"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-900 dark:text-white">
                                  {participant1Info.name || `#${originalSession?.userId}`}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {participant1Info.email || ""}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="mt-2 block text-sm font-medium text-slate-900 dark:text-white">
                              #{originalSession?.userId || "-"}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="mb-1 block text-xs font-medium tracking-wide text-slate-500 uppercase">
                            Vai trò
                          </span>
                          <span className="mt-2 block text-sm font-medium text-slate-900 dark:text-white">
                            {participant1Info?.role || "USER"}
                          </span>
                        </div>
                        <div>
                          <span className="mb-1 block text-xs font-medium tracking-wide text-slate-500 uppercase">
                            Ngành học
                          </span>
                          <span className="mt-2 block text-sm font-medium text-slate-900 dark:text-white">
                            {participant1Info?.major || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="mb-1 block text-xs font-medium tracking-wide text-slate-500 uppercase">
                            Mã kết nối (LiveKit)
                          </span>
                          <span className="mt-2 block truncate text-sm font-medium text-slate-900 dark:text-white">
                            {originalSession?.participantId1 || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="mb-1 block text-xs font-medium tracking-wide text-slate-500 uppercase">
                            Vào lúc
                          </span>
                          <span className="mt-2 block text-sm font-medium text-slate-900 dark:text-white">
                            {originalSession?.startTime1
                              ? formatDateTime(treatZuluAsVietnamLocal(originalSession.startTime1))
                              : "-"}
                          </span>
                        </div>
                        <div>
                          <span className="mb-1 block text-xs font-medium tracking-wide text-slate-500 uppercase">
                            Thoát lúc
                          </span>
                          <span className="mt-2 block text-sm font-medium text-slate-900 dark:text-white">
                            {originalSession?.endTime1
                              ? formatDateTime(treatZuluAsVietnamLocal(originalSession.endTime1))
                              : "-"}
                          </span>
                        </div>
                        <div>
                          <span className="mb-1 block text-xs font-medium tracking-wide text-slate-500 uppercase">
                            Tổng trực tuyến
                          </span>
                          <span className="mt-1 block text-lg font-bold text-indigo-600 dark:text-indigo-400">
                            {formatDuration(originalSession?.durationSeconds1)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Participant 2 */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
                      <h4 className="mb-4 flex items-center gap-2 font-semibold text-teal-600 dark:text-teal-400">
                        <div className="h-2 w-2 rounded-full bg-teal-500" />
                        Mentor (Participant 2)
                      </h4>
                      <div className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <span className="mb-1 block text-xs font-medium tracking-wide text-slate-500 uppercase">
                            Tài khoản hệ thống
                          </span>
                          {participant2Info ? (
                            <div className="mt-2 flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={participant2Info.avatarUrl || ""} />
                                <AvatarFallback className="bg-teal-100 text-xs text-teal-700">
                                  {participant2Info.name?.substring(0, 2).toUpperCase() || "U2"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-900 dark:text-white">
                                  {participant2Info.name || `#${originalSession?.userId2}`}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {participant2Info.email || ""}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="mt-2 block text-sm font-medium text-slate-900 dark:text-white">
                              #{originalSession?.userId2 || "-"}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="mb-1 block text-xs font-medium tracking-wide text-slate-500 uppercase">
                            Vai trò
                          </span>
                          <span className="mt-2 block text-sm font-medium text-slate-900 dark:text-white">
                            {participant2Info?.role || "MENTOR"}
                          </span>
                        </div>
                        <div>
                          <span className="mb-1 block text-xs font-medium tracking-wide text-slate-500 uppercase">
                            Ngành học
                          </span>
                          <span className="mt-2 block text-sm font-medium text-slate-900 dark:text-white">
                            {participant2Info?.major || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="mb-1 block text-xs font-medium tracking-wide text-slate-500 uppercase">
                            Mã kết nối (LiveKit)
                          </span>
                          <span className="mt-2 block truncate text-sm font-medium text-slate-900 dark:text-white">
                            {originalSession?.participantId2 || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="mb-1 block text-xs font-medium tracking-wide text-slate-500 uppercase">
                            Vào lúc
                          </span>
                          <span className="mt-2 block text-sm font-medium text-slate-900 dark:text-white">
                            {originalSession?.startTime2
                              ? formatDateTime(treatZuluAsVietnamLocal(originalSession.startTime2))
                              : "-"}
                          </span>
                        </div>
                        <div>
                          <span className="mb-1 block text-xs font-medium tracking-wide text-slate-500 uppercase">
                            Thoát lúc
                          </span>
                          <span className="mt-2 block text-sm font-medium text-slate-900 dark:text-white">
                            {originalSession?.endTime2
                              ? formatDateTime(treatZuluAsVietnamLocal(originalSession.endTime2))
                              : "-"}
                          </span>
                        </div>
                        <div>
                          <span className="mb-1 block text-xs font-medium tracking-wide text-slate-500 uppercase">
                            Tổng trực tuyến
                          </span>
                          <span className="mt-1 block text-lg font-bold text-teal-600 dark:text-teal-400">
                            {formatDuration(originalSession?.durationSeconds2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleCard>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <CancelSessionDialog
        isOpen={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        session={originalSession}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}
