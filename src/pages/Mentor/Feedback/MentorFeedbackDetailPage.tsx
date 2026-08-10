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
import { motion } from "framer-motion";
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

// Re-used single dark-glass surface, no "fruit salad" colors.
const GLASS_SURFACE = cn(
  "rounded-2xl p-5 ring-1 ring-inset transition-all",
  "bg-slate-500/[0.04] ring-slate-200/70 backdrop-blur-sm",
  "dark:bg-white/[0.03] dark:ring-white/5"
);

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" as const, delay },
});

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
        <div className={GLASS_SURFACE + " flex flex-col items-center gap-3 py-16 text-center"}>
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
        <div className={GLASS_SURFACE + " flex flex-col items-center gap-3 py-16 text-center"}>
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

  const glass = GLASS_SURFACE;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      {/* Header */}
      <motion.div {...fadeUp(0)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/mentor?tab=feedback")}
          className="text-slate-600 dark:text-slate-300">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {t("common.backToTheList")}
        </Button>
      </motion.div>

      {/* Hero */}
      <motion.div
        {...fadeUp(0.05)}
        className="relative overflow-hidden rounded-2xl ring-1 ring-slate-200/70 ring-inset dark:ring-white/5">
        {/* Deep gradient bar background */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-rose-500/15 via-pink-500/10 to-orange-500/15 dark:from-rose-500/25 dark:via-pink-500/15 dark:to-orange-500/15"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent dark:from-slate-950 dark:via-slate-950/40 dark:to-transparent"
        />
        <div
          aria-hidden
          className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-rose-400/30 opacity-60 blur-3xl dark:bg-rose-500/30"
        />
        <div
          aria-hidden
          className="absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-orange-300/20 opacity-50 blur-3xl dark:bg-orange-500/20"
        />

        <div className="relative grid gap-4 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
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
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-slate-900 dark:text-slate-100">
              {t("common.feedbackDetails")} #{feedback.id}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t("mentorFeedback.feedbackFromStudentsSentTo")}
            </p>
          </div>

          {/* Rating block */}
          <div className="flex items-center gap-4 self-start lg:self-end">
            <div className="text-right">
              <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
                {t("common.overallRating")}
              </p>
              <p className="text-[44px] leading-none font-bold tracking-[-0.04em] text-slate-900 dark:text-slate-100">
                {rating}
                <span className="ml-0.5 text-base font-medium text-slate-400">/5</span>
              </p>
              <StarRating value={rating} readOnly size="sm" />
            </div>
            <div
              className={cn(
                "rounded-2xl p-3 ring-1 backdrop-blur-md ring-inset",
                ratingTone === "emerald" &&
                  "bg-emerald-500/15 ring-emerald-400/30 dark:bg-emerald-500/20",
                ratingTone === "teal" && "bg-teal-500/15 ring-teal-400/30 dark:bg-teal-500/20",
                ratingTone === "sky" && "bg-sky-500/15 ring-sky-400/30 dark:bg-sky-500/20",
                ratingTone === "amber" && "bg-amber-500/15 ring-amber-400/30 dark:bg-amber-500/20",
                ratingTone === "rose" && "bg-rose-500/15 ring-rose-400/30 dark:bg-rose-500/20"
              )}>
              <Star
                className={cn(
                  "h-8 w-8",
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
      </motion.div>

      {/* Body */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
        <div className="flex flex-col gap-4">
          {/* Student identity */}
          <motion.section {...fadeUp(0.1)} className={glass}>
            <SectionHeading
              icon={User}
              title={t("common.studentInformation")}
              subtitle={t("mentorFeedback.feedbackFrom")}
            />
            <div className="mt-4 flex items-center gap-4">
              <Avatar className="h-12 w-12 ring-1 ring-white/10">
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
                <span className="rounded-full bg-slate-200/70 px-2.5 py-1 font-mono text-[10px] text-slate-700 ring-1 ring-slate-300/40 ring-inset dark:bg-slate-800/60 dark:text-slate-300 dark:ring-white/5">
                  #{studentId}
                </span>
              )}
            </div>
          </motion.section>

          {/* Comment */}
          <motion.section {...fadeUp(0.15)} className={glass}>
            <SectionHeading
              icon={MessageSquare}
              title={t("mentorFeedback.responseContent")}
              subtitle={t("common.description")}
            />
            <div className="mt-4 rounded-xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-4 dark:border-slate-700/60 dark:from-slate-900/60 dark:to-slate-950/40">
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
          </motion.section>

          {/* Session context */}
          <motion.section {...fadeUp(0.2)} className={glass}>
            <SectionHeading
              icon={CalendarClock}
              title={t("common.sessionInformation1")}
              subtitle={t("common.sessionInformation1")}
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoRow
                icon={Hash}
                label={t("common.sessionCode1")}
                value={feedback.session?.id ? `#${feedback.session.id}` : "—"}
              />
              <InfoRow
                icon={Building2}
                label={t("common.roomName1")}
                value={
                  sessionRoomName || (feedback.session?.id ? `Session ${feedback.session.id}` : "—")
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/70 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-300/40 ring-inset dark:bg-slate-800/60 dark:text-slate-300 dark:ring-white/5">
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
                  className="text-xs">
                  {t("common.viewSessionDetails")}
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </motion.section>
        </div>

        {/* Side summary */}
        <motion.aside
          {...fadeUp(0.25)}
          className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          <div className={glass}>
            <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
              {t("common.overallRating")}
            </p>
            <p className="mt-1 text-3xl font-bold tracking-[-0.04em] text-slate-900 dark:text-slate-100">
              {rating}
              <span className="ml-0.5 text-sm font-medium text-slate-400">/5</span>
            </p>
            <div className="mt-2">
              <StarRating value={rating} readOnly size="md" />
            </div>
            {[1, 2, 3, 4, 5].map((star) => (
              <div key={star} className="mt-1.5 flex items-center gap-2 text-xs" aria-hidden>
                <span className="w-5 text-slate-500 dark:text-slate-400">{star}★</span>
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-800/60">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-rose-500 to-pink-400"
                    style={{ width: `${rating === star ? 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className={glass}>
            <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
              {t("common.mentorInformation")}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-1 ring-white/10">
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

          <div className={glass}>
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
                  <span className="text-slate-500 dark:text-slate-400">{t("common.endTime")}:</span>
                  <TimeAgo date={String(sessionEndTime)} />
                </div>
              )}
            </div>
          </div>
        </motion.aside>
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
    <div className="rounded-xl border border-slate-200/70 bg-white/60 p-3 dark:border-slate-700/60 dark:bg-slate-900/40">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Icon className="h-3 w-3" aria-hidden />
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}
