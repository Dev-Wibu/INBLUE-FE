/**
 * Mentor Feedback Detail Page — full-page view, replaces the legacy modal.
 *
 * Visual language mirrors the Reviews "Assessment Dossier" v3: single
 * dark-glass surface, bold hero block, deep gradient bar, bento body.
 * No logic / API / auth changes — only the layout.
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { TimeAgo } from "@/components/ui/time-ago";
import { useUserById } from "@/hooks/useApplication";
import { useMentorById } from "@/hooks/useMentor";
import { useMentorFeedbackById } from "@/hooks/useMentorFeedback";
import { treatZuluAsVietnamLocal } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarClock,
  ChevronRight,
  Clock,
  Hash,
  Inbox,
  Mail,
  MessageSquare,
  Sparkles,
  Star,
  User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

export function MentorFeedbackDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const feedbackId = Number(id);
  const currentUser = useAuthStore((state) => state.user);

  const { data: feedback, isLoading } = useMentorFeedbackById(feedbackId);
  const studentId = feedback?.user?.id ?? feedback?.session?.userId;
  const mentorId = feedback?.mentor?.id ?? feedback?.session?.userId2;

  const { data: studentInfo } = useUserById(typeof studentId === "number" ? studentId : 0);
  const { data: mentorInfo } = useMentorById(typeof mentorId === "number" ? mentorId : 0);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-44" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/mentor?tab=feedback")}
          className="text-slate-600 dark:text-slate-300">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {t("common.backToTheList")}
        </Button>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-5 py-16 text-center shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
          <Inbox className="h-12 w-12 text-slate-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t("common.noResponseFound")}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("common.thisFeedbackDoesNotExistOrHasBeenR")}
          </p>
        </div>
      </div>
    );
  }

  // Access guard: feedback must belong to the current mentor.
  const isOwner =
    !currentUser?.id ||
    (mentorId && currentUser.id === mentorId) ||
    (feedback.mentor?.id != null && currentUser.id === feedback.mentor.id);
  if (!isOwner) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/mentor?tab=feedback")}
          className="text-slate-600 dark:text-slate-300">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {t("common.backToTheList")}
        </Button>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-5 py-16 text-center shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
          <User className="h-12 w-12 text-slate-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t("common.noAccess")}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("common.youCantSeeFeedbackThatDoesntBelong")}
          </p>
        </div>
      </div>
    );
  }

  const rating = feedback.rating || 0;
  const ratingTone =
    rating >= 5
      ? "emerald"
      : rating >= 4
        ? "teal"
        : rating >= 3
          ? "sky"
          : rating >= 2
            ? "amber"
            : "rose";

  const studentName =
    feedback.user?.name ||
    studentInfo?.name ||
    (studentId ? t("common.studentVar0", { var_0: studentId }) : t("common.students"));
  const studentEmail = feedback.user?.email || studentInfo?.email;
  const studentAvatarUrl = feedback.user?.avatarUrl || studentInfo?.avatarUrl;

  const sessionRoomName = feedback.session?.roomName;
  const sessionStartTime = feedback.session?.startTime1
    ? treatZuluAsVietnamLocal(feedback.session.startTime1)
    : null;
  const sessionEndTime = feedback.session?.endTime1
    ? treatZuluAsVietnamLocal(feedback.session.endTime1)
    : null;
  const sessionStatus = feedback.session?.status;

  const mentorName = feedback.mentor?.name || mentorInfo?.name || currentUser?.name || "—";
  const mentorCompany = feedback.mentor?.currentCompany || mentorInfo?.currentCompany || null;
  return (
    <div className="-m-4 min-h-[calc(100%+32px)] bg-slate-50 md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)] dark:bg-slate-950">
      <div className="flex flex-col gap-5 p-4 md:p-6 lg:p-8">
        {/* ── TOP SUBHEADER BAR (Admin Pattern) ── */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800/80 dark:bg-slate-900">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/mentor?tab=feedback")}
              className="h-9 gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
              <ArrowLeft className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span>{t("common.backToTheList")}</span>
            </Button>

            <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-800" />

            <h1 className="truncate text-base font-bold text-slate-900 dark:text-white">
              {t("common.feedbackDetails")} #{feedback.id}
            </h1>
          </div>
        </div>

        {/* ── MAIN CONTENT 2-COLUMN DASHBOARD ── */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Hero Card */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-br from-rose-500/15 via-pink-500/10 to-orange-500/15 dark:from-rose-500/25 dark:via-pink-500/15 dark:to-orange-500/15"
              />
              <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.06em] text-rose-600 uppercase ring-1 ring-rose-500/20 ring-inset dark:text-rose-300">
                      <Sparkles className="h-3 w-3" aria-hidden />
                      {t("mentorFeedback.responseContent")}
                    </span>
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      #{feedback.id}
                    </span>
                  </div>
                  <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-slate-900 dark:text-slate-100">
                    {t("common.feedbackDetails")}
                  </h1>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {t("mentorFeedback.feedbackFromStudentsSentTo")}
                  </p>
                </div>

                {/* Rating block */}
                <div className="flex items-center gap-3 self-start sm:self-end">
                  <div className="text-right">
                    <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
                      {t("common.evaluate")}
                    </p>
                    <p className="mt-0.5 flex items-baseline gap-1">
                      <span className="text-4xl font-bold tracking-[-0.04em] text-slate-900 dark:text-white">
                        {rating.toFixed(1)}
                      </span>
                      <span className="text-base font-medium text-slate-400">/5</span>
                    </p>
                    <StarRating value={rating} readOnly size="sm" />
                  </div>
                  <div
                    className={cn(
                      "rounded-2xl p-3 ring-1 backdrop-blur-md ring-inset",
                      ratingTone === "emerald" &&
                        "bg-emerald-500/15 ring-emerald-400/30 dark:bg-emerald-500/20",
                      ratingTone === "teal" &&
                        "bg-teal-500/15 ring-teal-400/30 dark:bg-teal-500/20",
                      ratingTone === "sky" && "bg-sky-500/15 ring-sky-400/30 dark:bg-sky-500/20",
                      ratingTone === "amber" &&
                        "bg-amber-500/15 ring-amber-400/30 dark:bg-amber-500/20",
                      ratingTone === "rose" && "bg-rose-500/15 ring-rose-400/30 dark:bg-rose-500/20"
                    )}>
                    <Star
                      className={cn(
                        "h-7 w-7",
                        ratingTone === "emerald" && "fill-emerald-400 text-emerald-400",
                        ratingTone === "teal" && "fill-teal-400 text-teal-400",
                        ratingTone === "sky" && "fill-sky-400 text-sky-400",
                        ratingTone === "amber" && "fill-amber-400 text-amber-400",
                        ratingTone === "rose" && "fill-rose-400 text-rose-400"
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Student identity */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
              <SectionHeading
                icon={User}
                title={t("common.studentInformation")}
                subtitle={t("mentorFeedback.feedbackFrom")}
              />
              <div className="mt-4 flex items-center gap-4">
                <Avatar className="h-12 w-12 ring-1 ring-slate-100 dark:ring-slate-800">
                  <AvatarImage src={studentAvatarUrl} alt={studentName} />
                  <AvatarFallback className="bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                    {studentName?.charAt(0) || "S"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {studentName}
                  </p>
                  {studentEmail && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Mail className="h-3 w-3" aria-hidden />
                      {studentEmail}
                    </p>
                  )}
                </div>
                {studentId && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[10px] text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                    #{studentId}
                  </span>
                )}
              </div>
            </div>

            {/* Comment */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
              <SectionHeading
                icon={MessageSquare}
                title={t("mentorFeedback.responseContent")}
                subtitle={t("common.description")}
              />
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                {feedback.comment ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-100">
                    {feedback.comment}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500 italic dark:text-slate-400">
                    {t("mentorFeedback.studentsHaveNotLeftDetailed")}
                  </p>
                )}
              </div>
            </div>

            {/* Session context */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
              <SectionHeading
                icon={CalendarClock}
                title={t("common.sessionInformation")}
                subtitle={t("common.sessionInformation")}
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoRow
                  icon={Hash}
                  label={t("common.sessionCode")}
                  value={feedback.session?.id ? `#${feedback.session.id}` : "—"}
                />
                <InfoRow
                  icon={Building2}
                  label={t("common.roomName")}
                  value={
                    sessionRoomName ||
                    (feedback.session?.id ? `Session ${feedback.session.id}` : "—")
                  }
                />
                <InfoRow
                  icon={Clock}
                  label={t("common.startTime")}
                  value={sessionStartTime ? <TimeAgo date={String(sessionStartTime)} /> : "—"}
                />
                <InfoRow
                  icon={Clock}
                  label={t("common.endTime")}
                  value={sessionEndTime ? <TimeAgo date={String(sessionEndTime)} /> : "—"}
                />
                {sessionStatus && (
                  <InfoRow
                    icon={AlertCircle}
                    label={t("common.status")}
                    value={
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                        {sessionStatus}
                      </span>
                    }
                  />
                )}
              </div>
              {feedback.session?.id && (
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/mentor/sessions/${feedback.session?.id}`)}
                    className="rounded-xl border border-slate-200/90 bg-white text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
                    {t("common.viewSessionDetails")}
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sticky Summary */}
          <aside className="flex flex-col gap-4 xl:sticky xl:top-4 xl:self-start">
            {/* Rating summary */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
              <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
                {t("common.evaluate")}
              </p>
              <p className="mt-1 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-[-0.04em] text-slate-900 dark:text-white">
                  {rating.toFixed(1)}
                </span>
                <span className="text-base font-medium text-slate-400">/5</span>
              </p>
              <div className="mt-2">
                <StarRating value={rating} readOnly size="md" />
              </div>
            </div>

            {/* Mentor info */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
              <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
                {t("common.mentorInformation")}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-1 ring-slate-100 dark:ring-slate-800">
                  <AvatarImage
                    src={feedback.mentor?.avatarUrl || mentorInfo?.avatarUrl}
                    alt={mentorName}
                  />
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                    {mentorName?.charAt(0) || "M"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {mentorName}
                  </p>
                  {mentorCompany && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Building2 className="h-3 w-3" aria-hidden />
                      {mentorCompany}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
              <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
                {t("common.timeline")}
              </p>
              <div className="mt-3 flex flex-col gap-2 text-xs text-slate-600 dark:text-slate-400">
                {sessionStartTime && (
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-500 dark:text-slate-400">
                      {t("common.startTime")}:
                    </span>
                    <TimeAgo date={String(sessionStartTime)} />
                  </div>
                )}
                {sessionEndTime && (
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    <span className="text-slate-500 dark:text-slate-400">
                      {t("common.endTime")}:
                    </span>
                    <TimeAgo date={String(sessionEndTime)} />
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ---------- inner helpers ----------
function SectionHeading({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Star;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20 ring-inset dark:bg-rose-500/15 dark:text-rose-300">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div>
        <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
          {title}
        </p>
        {subtitle && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Star;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Icon className="h-3 w-3" aria-hidden />
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}
