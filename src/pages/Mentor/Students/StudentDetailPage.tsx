/**
 * Student Detail Page (Mentor View) — v2 "Dossier Profile"
 *
 * UI-only refresh. Same data hooks (sessions / feedbacks / reviews /
 * candidate profile) and the same filtering / owner / completion logic.
 *
 * Visual language:
 * - Large hero profile with avatar halo + status badge + headline
 * - Bento KPI strip with mixed sizes (not 4 equal cards)
 * - Sticky summary panel on desktop
 * - Modern segmented control tabs (Sessions / Feedback / Reviews / Profile)
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { TimeAgo } from "@/components/ui/time-ago";
import { useMentorFeedbacks } from "@/hooks/useMentorFeedback";
import { useMentorReviews } from "@/hooks/useMentorReview";
import { useSessions } from "@/hooks/useSession";
import type { Session } from "@/interfaces";
import type { CandidateProfile } from "@/interfaces/schema.types";
import { treatZuluAsVietnamLocal } from "@/lib/formatting";
import { isSessionMentor } from "@/lib/session-mentor";
import { cn } from "@/lib/utils";
import {
  getLatestCandidateProfile,
  useCandidateProfile,
} from "@/services/candidate-profile.manager";
import { useAuthStore } from "@/stores/authStore";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  Lightbulb,
  Mail,
  MessageSquare,
  School,
  Sparkles,
  Star,
  Target,
  ThumbsUp,
  Trophy,
  User,
  Wrench,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

// ---------- shared surfaces (single dark-glass, no fruit salad) ----------
const HERO_SURFACE = cn(
  "relative overflow-hidden rounded-3xl ring-1 ring-slate-200/70 ring-inset",
  "dark:ring-white/5"
);

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

export function StudentDetailPage() {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState("sessions");
  const studentId = Number(userId);

  const { data: allSessions = [], isLoading: sessionsLoading } = useSessions();
  const { data: allFeedbacks = [], isLoading: feedbacksLoading } = useMentorFeedbacks();
  const { data: allReviews = [], isLoading: reviewsLoading } = useMentorReviews();
  // 2026-08-09: BE `GET /api/candidate-profiles/{userId}` returns
  //   `CandidateProfile[]` (1 student can have multiple profile versions
  //   — drafts / applications). Earlier versions casted the array as a
  //   single CandidateProfile which made every field `undefined` and
  //   triggered the "no candidate profile" empty state. We now unwrap
  //   the latest profile via `getLatestCandidateProfile`.
  const { data: candidateProfileRaw, isLoading: profileLoading } = useCandidateProfile(studentId);
  const candidateProfile = useMemo<CandidateProfile | null>(() => {
    const raw = candidateProfileRaw as unknown;
    if (Array.isArray(raw)) {
      return getLatestCandidateProfile(raw);
    }
    if (raw && typeof raw === "object" && "id" in (raw as Record<string, unknown>)) {
      return raw as CandidateProfile;
    }
    return null;
  }, [candidateProfileRaw]);

  const isLoading = sessionsLoading || feedbacksLoading || reviewsLoading || profileLoading;

  // ---- DATA (logic preserved 1:1 from previous version) ----
  const studentSessions = allSessions.filter(
    (session: Session) => session.userId === studentId && isSessionMentor(session, currentUser?.id)
  );
  const studentFeedbacks = allFeedbacks.filter(
    (feedback: { user?: { id?: number }; mentor?: { id?: number } }) =>
      feedback.user?.id === studentId && feedback.mentor?.id === currentUser?.id
  );
  const studentReviews = allReviews.filter(
    (review: { session?: { userId?: number } }) => review.session?.userId === studentId
  );
  const studentInfo = studentFeedbacks[0]?.user || studentReviews[0]?.user || { id: studentId };

  // ---- stats ----
  const totalSessions = studentSessions.length;
  const completedSessions = studentSessions.filter((s: Session) => s.status === "COMPLETED").length;
  const totalFeedbacks = studentFeedbacks.length;
  const totalReviews = studentReviews.length;
  const avgRating =
    totalReviews > 0
      ? studentReviews.reduce((sum: number, r: { rating?: number }) => sum + (r.rating || 0), 0) /
        totalReviews
      : 0;

  // Rating distribution (1-5 stars)
  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => {
    const count = studentReviews.filter(
      (r: { rating?: number }) => (r.rating || 0) === star
    ).length;
    return { star, count, pct: totalReviews ? (count / totalReviews) * 100 : 0 };
  });

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-44" />
        <Skeleton className="h-24" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!studentInfo || totalSessions === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/mentor?tab=students")}
          className="text-slate-600 dark:text-slate-300">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {t("general.back")}
        </Button>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="py-12 text-center">
            <User className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 font-semibold">{t("mentorStudents.noStudentFound")}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {t("mentorStudents.thisStudentDoesNotExist")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      {/* Header */}
      <motion.div {...fadeUp(0)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/mentor?tab=students")}
          className="text-slate-600 dark:text-slate-300">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {t("common.backToTheList")}
        </Button>
      </motion.div>

      {/* HERO */}
      <motion.div {...fadeUp(0.05)} className={HERO_SURFACE}>
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-sky-500/15 dark:from-emerald-500/25 dark:via-teal-500/15 dark:to-sky-500/15"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent dark:from-slate-950 dark:via-slate-950/40 dark:to-transparent"
        />
        <div
          aria-hidden
          className="absolute -top-24 -left-12 h-72 w-72 rounded-full bg-emerald-400/30 opacity-60 blur-3xl dark:bg-emerald-500/30"
        />
        <div
          aria-hidden
          className="absolute -right-12 -bottom-24 h-72 w-72 rounded-full bg-sky-300/20 opacity-50 blur-3xl dark:bg-sky-500/20"
        />

        <div className="relative flex flex-col gap-5 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            {/* avatar halo */}
            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-0 -m-2 rounded-full bg-gradient-to-br from-emerald-400/40 to-sky-400/40 opacity-60 blur-xl"
              />
              <Avatar className="relative h-24 w-24 ring-2 ring-white/10">
                <AvatarImage src={studentInfo.avatarUrl} alt={studentInfo.name} />
                <AvatarFallback className="bg-emerald-100 text-3xl text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                  {studentInfo.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.06em] text-emerald-600 uppercase ring-1 ring-emerald-500/20 ring-inset dark:text-emerald-300">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  {t("mentorStudents.candidateProfile")}
                </span>
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  #{studentId}
                </span>
              </div>
              <h1 className="mt-1.5 text-3xl font-bold tracking-[-0.04em] text-slate-900 dark:text-slate-100">
                {studentInfo.name || t("common.studentVar0", { var_0: studentId })}
              </h1>
              <div className="mt-2 flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
                {studentInfo.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" aria-hidden />
                    {studentInfo.email}
                  </p>
                )}
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(studentInfo as any).university && (
                  <p className="flex items-center gap-2">
                    <School className="h-3.5 w-3.5" aria-hidden />
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(studentInfo as any).university}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Rating display */}
          {totalReviews > 0 && (
            <div className="flex items-center gap-4 self-start lg:self-end">
              <div className="text-right">
                <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
                  {t("common.averageStarRating")}
                </p>
                <p className="text-[44px] leading-none font-bold tracking-[-0.04em] text-slate-900 dark:text-slate-100">
                  {avgRating.toFixed(1)}
                  <span className="ml-0.5 text-base font-medium text-slate-400">/5</span>
                </p>
                <StarRating value={avgRating} readOnly size="sm" />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {totalReviews} {t("mentorStudents.studentReviews")}
                </p>
              </div>
              <div className="rounded-2xl bg-amber-500/15 p-3 ring-1 ring-amber-400/30 ring-inset dark:bg-amber-500/20">
                <Trophy className="h-8 w-8 text-amber-500" />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Body */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
        <div className="flex flex-col gap-4">
          {/* Bento KPI strip */}
          <motion.div {...fadeUp(0.1)} className="grid gap-3 sm:grid-cols-3">
            {/* big card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 p-4 ring-1 ring-emerald-400/30 ring-inset sm:col-span-1 dark:from-emerald-500/20 dark:to-teal-500/15">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.06em] text-emerald-700 uppercase dark:text-emerald-300">
                    {t("common.totalSession")}
                  </p>
                  <p className="mt-1 text-3xl font-bold tracking-[-0.04em] text-slate-900 dark:text-slate-100">
                    {totalSessions}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {completedSessions} {t("general.completed")}
                  </p>
                </div>
                <Calendar className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              {totalSessions > 0 && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-emerald-200/40 ring-1 ring-emerald-300/30 ring-inset dark:bg-emerald-900/40">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${(completedSessions / totalSessions) * 100}%` }}
                  />
                </div>
              )}
            </div>

            {/* 3 small cards */}
            <div className={GLASS_SURFACE}>
              <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
                {t("common.responseReceived")}
              </p>
              <p className="mt-1 text-2xl font-bold tracking-[-0.04em] text-slate-900 dark:text-slate-100">
                {totalFeedbacks}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <MessageSquare className="h-3 w-3 text-sky-500" />
                {t("mentorStudents.responseReceived1")}
              </div>
            </div>

            <div className={GLASS_SURFACE}>
              <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
                {t("mentorMentordashboard.reviewSent")}
              </p>
              <p className="mt-1 text-2xl font-bold tracking-[-0.04em] text-slate-900 dark:text-slate-100">
                {totalReviews}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Star className="h-3 w-3 text-amber-500" />
                {t("mentorStudents.submittedReview")}
              </div>
            </div>
          </motion.div>

          {/* Sliding segmented control tabs (Framer Motion layoutId) */}
          <motion.div {...fadeUp(0.15)} className="space-y-4">
            <div
              role="tablist"
              aria-label="student-detail-tabs"
              className="relative grid w-full grid-cols-4 gap-1 rounded-xl border border-slate-200/70 bg-slate-100/70 p-1 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-800/60">
              {[
                {
                  id: "sessions",
                  icon: Calendar,
                  label: `${t("general.session8")} (${totalSessions})`,
                  tone: "emerald" as const,
                },
                {
                  id: "feedbacks",
                  icon: MessageSquare,
                  label: `${t("mentorStudents.responseReceived1")} (${totalFeedbacks})`,
                  tone: "rose" as const,
                },
                {
                  id: "reviews",
                  icon: Star,
                  label: `${t("mentorStudents.submittedReview")} (${totalReviews})`,
                  tone: "amber" as const,
                },
                {
                  id: "profile",
                  icon: User,
                  label: t("mentorStudents.profile"),
                  tone: "sky" as const,
                },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                const activeTextClass =
                  tab.tone === "emerald"
                    ? "text-emerald-700 dark:text-emerald-300"
                    : tab.tone === "rose"
                      ? "text-rose-700 dark:text-rose-300"
                      : tab.tone === "amber"
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-sky-700 dark:text-sky-300";
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                      isActive
                        ? activeTextClass
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    )}>
                    {isActive && (
                      <motion.span
                        layoutId="student-detail-tab-pill"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        className={cn(
                          "absolute inset-0 rounded-lg shadow-xs ring-1 ring-inset",
                          tab.tone === "emerald" && "bg-emerald-500/10 ring-emerald-400/30",
                          tab.tone === "rose" && "bg-rose-500/10 ring-rose-400/30",
                          tab.tone === "amber" && "bg-amber-500/10 ring-amber-400/30",
                          tab.tone === "sky" && "bg-sky-500/10 ring-sky-400/30",
                          "dark:bg-white/[0.05]"
                        )}
                      />
                    )}
                    <Icon className="relative h-3.5 w-3.5" aria-hidden />
                    <span className="relative truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sessions Tab */}
            {activeTab === "sessions" && (
              <motion.div
                key="sessions"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-2">
                {studentSessions.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title={t("mentorStudents.thereAreNoSessionsYet")}
                    description={t("mentorStudents.thereHasBeenNoInterview")}
                  />
                ) : (
                  studentSessions.map((session: Session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      onClick={() => navigate(`/mentor/sessions/${session.id}`)}
                      t={t}
                    />
                  ))
                )}
              </motion.div>
            )}

            {/* Feedbacks Tab */}
            {activeTab === "feedbacks" && (
              <motion.div
                key="feedbacks"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-3">
                {studentFeedbacks.length === 0 ? (
                  <EmptyState
                    icon={MessageSquare}
                    title={t("common.noResponseYet")}
                    description={t("mentorStudents.thisStudentHasNotSent")}
                  />
                ) : (
                  studentFeedbacks.map(
                    (feedback: {
                      id?: number;
                      rating?: number;
                      comment?: string;
                      user?: { name?: string; avatarUrl?: string };
                      session?: { roomName?: string; endTime1?: string };
                    }) => (
                      <MentorFeedbackListRow
                        key={feedback.id}
                        feedback={feedback}
                        onClick={() => {
                          if (feedback.id) navigate(`/mentor/feedback/${feedback.id}`);
                        }}
                        t={t}
                      />
                    )
                  )
                )}
              </motion.div>
            )}

            {/* Reviews Tab */}
            {activeTab === "reviews" && (
              <motion.div
                key="reviews"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-3">
                {studentReviews.length === 0 ? (
                  <EmptyState
                    icon={Star}
                    title={t("common.thereAreNoReviewsYet")}
                    description={t("mentorStudents.youHaveNotSubmittedAny")}
                  />
                ) : (
                  studentReviews.map(
                    (review: {
                      id?: number;
                      rating?: number;
                      session?: { roomName?: string; endTime1?: string };
                      situationNote?: string;
                      taskNote?: string;
                      actionNote?: string;
                      resultNote?: string;
                      strength?: string;
                      weakness?: string;
                      improve?: string;
                    }) => (
                      <MentorReviewListRow
                        key={review.id}
                        review={review}
                        onClick={() => {
                          if (review.id) navigate(`/mentor/reviews/${review.id}`);
                        }}
                        t={t}
                      />
                    )
                  )
                )}
              </motion.div>
            )}

            {/* Profile Tab */}
            {activeTab === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}>
                {!candidateProfile ? (
                  <EmptyState
                    icon={FileText}
                    title={t("common.thereAreNoCandidateProfilesYet")}
                    description={t("mentorStudents.thisStudentHasNotCreated")}
                  />
                ) : (
                  <CandidateProfileView profile={candidateProfile} t={t} />
                )}
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Side summary */}
        <motion.aside
          {...fadeUp(0.25)}
          className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          <div className={GLASS_SURFACE}>
            <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
              {t("mentorStudents.studentReviews")}
            </p>
            {totalReviews > 0 ? (
              <>
                <p className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-[-0.04em] text-slate-900 dark:text-slate-100">
                    {avgRating.toFixed(1)}
                  </span>
                  <span className="text-sm font-medium text-slate-400">/5</span>
                </p>
                <div className="mt-2">
                  <StarRating value={avgRating} readOnly size="md" />
                </div>
                <div className="mt-3 flex flex-col gap-1.5">
                  {ratingDistribution.map((row) => (
                    <div key={row.star} className="flex items-center gap-2 text-xs">
                      <span className="w-6 text-slate-600 dark:text-slate-300">{row.star}★</span>
                      <div
                        className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-800/60"
                        role="progressbar"
                        aria-valuenow={row.pct}
                        aria-valuemin={0}
                        aria-valuemax={100}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${row.pct}%` }}
                          transition={{ duration: 0.45, ease: "easeOut" }}
                          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400"
                        />
                      </div>
                      <span className="w-7 text-right text-slate-500 tabular-nums dark:text-slate-400">
                        {row.count}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {t("common.thereAreNoReviewsYet")}
              </p>
            )}
          </div>

          <div className={GLASS_SURFACE}>
            <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
              {t("common.timeline")}
            </p>
            <div className="mt-3 flex flex-col gap-3">
              <TimelineRow
                icon={Calendar}
                label={t("common.firstSession")}
                value={
                  studentSessions[0]?.startTime1 ? (
                    <TimeAgo
                      date={String(treatZuluAsVietnamLocal(studentSessions[0].startTime1!))}
                    />
                  ) : (
                    "—"
                  )
                }
                tone="emerald"
              />
              <TimelineRow
                icon={MessageSquare}
                label={t("common.firstFeedback")}
                value={
                  studentFeedbacks[0]?.createdAt ? (
                    <TimeAgo date={String(studentFeedbacks[0].createdAt)} />
                  ) : (
                    "—"
                  )
                }
                tone="rose"
              />
              <TimelineRow
                icon={Star}
                label={t("mentorStudents.firstReview")}
                value={
                  studentReviews[0]?.session?.endTime1 ? (
                    <TimeAgo
                      date={String(treatZuluAsVietnamLocal(studentReviews[0].session.endTime1))}
                    />
                  ) : (
                    "—"
                  )
                }
                tone="amber"
              />
            </div>
          </div>

          <div className={GLASS_SURFACE}>
            <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
              {t("common.quickActions")}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {studentInfo.email && (
                <a
                  href={`mailto:${studentInfo.email}`}
                  className="group flex items-center justify-between rounded-xl border border-slate-200/70 bg-white/60 p-3 text-sm text-slate-700 transition-all hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-emerald-500/10">
                  <span className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-emerald-500" />
                    {t("common.sendEmail")}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 group-hover:text-emerald-500" />
                </a>
              )}
              <button
                type="button"
                onClick={() => navigate("/mentor?tab=sessions")}
                className="group flex items-center justify-between rounded-xl border border-slate-200/70 bg-white/60 p-3 text-sm text-slate-700 transition-all hover:border-sky-300 hover:bg-sky-50/40 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-sky-500/10">
                <span className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-sky-500" />
                  {t("mentorStudents.bookANewInterview")}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 group-hover:text-sky-500" />
              </button>
            </div>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}

// ---------- session row ----------
function SessionRow({
  session,
  onClick,
  t,
}: {
  session: Session;
  onClick: () => void;
  t: (_key: string, _options?: Record<string, unknown>) => string;
}) {
  const status = session.status;
  const statusVariant =
    status === "COMPLETED"
      ? "default"
      : status === "CANCELED"
        ? "destructive"
        : status === "ONGOING"
          ? "secondary"
          : "outline";
  const statusLabel =
    status === "COMPLETED"
      ? t("general.completed")
      : status === "CANCELED"
        ? t("common.canceled")
        : status === "ONGOING"
          ? t("common.ongoing")
          : t("common.scheduled");

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.18 }}
      className="group flex w-full items-center justify-between rounded-xl border border-slate-200/70 bg-white/70 p-3 text-left ring-1 ring-transparent transition-all hover:border-emerald-300 hover:shadow-xs dark:border-slate-700/60 dark:bg-slate-900/40 dark:hover:border-emerald-700/60">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 ring-inset dark:bg-emerald-500/20 dark:text-emerald-300">
          <Calendar className="h-4 w-4" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {session.roomName || t("common.sessionVar0", { var_0: session.id })}
          </p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono">#{session.id}</span>
            {session.startTime1 && (
              <>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <TimeAgo
                  date={String(treatZuluAsVietnamLocal(session.startTime1))}
                  prefix={false}
                />
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={statusVariant as never}>{statusLabel}</Badge>
        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 group-hover:text-emerald-500" />
      </div>
    </motion.button>
  );
}

// ---------- timeline row ----------
function TimelineRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Calendar;
  label: string;
  value: React.ReactNode;
  tone: "emerald" | "rose" | "amber" | "sky";
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-xl ring-1 ring-inset",
          tone === "emerald" &&
            "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300",
          tone === "rose" &&
            "bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:bg-rose-500/20 dark:text-rose-300",
          tone === "amber" &&
            "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300",
          tone === "sky" &&
            "bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:bg-sky-500/20 dark:text-sky-300"
        )}>
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="flex-1">
        <p className="text-slate-500 dark:text-slate-400">{label}</p>
        <p className="font-medium text-slate-900 dark:text-slate-100">{value}</p>
      </div>
    </div>
  );
}

// ---------- candidate profile view ----------
function CandidateProfileView({
  profile,
  t,
}: {
  profile: CandidateProfile;
  t: (_key: string, _options?: Record<string, unknown>) => string;
}) {
  const totalSkills =
    (profile.technicalSkills?.length ?? 0) +
    (profile.softSkills?.length ?? 0) +
    (profile.tools?.length ?? 0);

  return (
    <div className="space-y-4">
      {/* Profile header banner */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl p-5 ring-1 ring-inset",
          "bg-gradient-to-br from-sky-500/12 via-indigo-500/8 to-violet-500/12 ring-sky-400/20",
          "dark:from-sky-500/20 dark:via-indigo-500/10 dark:to-violet-500/20"
        )}>
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-12 h-48 w-48 rounded-full bg-sky-400/25 opacity-60 blur-3xl dark:bg-sky-500/30"
        />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-600 ring-1 ring-sky-400/30 ring-inset dark:text-sky-300">
            <FileText className="h-5 w-5" aria-hidden />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-semibold tracking-[0.06em] text-sky-700 uppercase dark:text-sky-300">
              {t("mentorStudents.profile")}
            </p>
            <p className="mt-0.5 text-lg font-bold tracking-[-0.02em] text-slate-900 dark:text-slate-100">
              {profile.targetRole || t("mentorStudents.candidateProfile")}
            </p>
            {profile.targetLevel && (
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                {profile.targetLevel}
              </p>
            )}
          </div>
          {totalSkills > 0 && (
            <div className="text-right">
              <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
                {t("common.skill")}
              </p>
              <p className="text-2xl font-bold tracking-[-0.04em] text-slate-900 dark:text-slate-100">
                {totalSkills}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Basic Info */}
      <div className={GLASS_SURFACE}>
        <SectionHeading icon={User} title={t("common.basicInformation")} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <InfoBlock label={t("mentorStudents.targetRole")} value={profile.targetRole || "—"} />
          <InfoBlock label={t("mentorStudents.level")} value={profile.targetLevel || "—"} />
        </div>
        {profile.introduction && (
          <div className="mt-3 rounded-xl border border-slate-200/70 bg-white/60 p-3 dark:border-slate-700/60 dark:bg-slate-900/40">
            <p className="mb-1 text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
              {t("common.introduction")}
            </p>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {profile.introduction}
            </p>
          </div>
        )}
      </div>

      {/* Skills */}
      <div className={GLASS_SURFACE}>
        <SectionHeading icon={Award} title={t("common.skill")} />
        <div className="mt-3 space-y-3">
          <SkillRow
            icon={Wrench}
            label={t("mentorStudents.technicalSkills")}
            items={profile.technicalSkills ?? []}
            tone="emerald"
          />
          <SkillRow
            icon={Sparkles}
            label={t("mentorStudents.softSkills")}
            items={profile.softSkills ?? []}
            tone="sky"
          />
          <SkillRow
            icon={Wrench}
            label={t("mentorStudents.tools")}
            items={profile.tools ?? []}
            tone="rose"
          />
        </div>
      </div>

      {/* Projects */}
      {(profile.projects ?? []).length > 0 && (
        <div className={GLASS_SURFACE}>
          <SectionHeading icon={Briefcase} title={t("common.project")} />
          <div className="mt-3 grid gap-2">
            {profile.projects!.map((p, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200/70 bg-white/60 p-3 text-sm dark:border-slate-700/60 dark:bg-slate-900/40">
                <p className="font-medium text-slate-900 dark:text-slate-100">{p.name}</p>
                <p className="mt-0.5 text-slate-600 dark:text-slate-300">{p.description}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {p.role} · {p.teamSize} {t("mentorStudents.team")} · {p.outcome}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Work Experience */}
      {(profile.workExperiences ?? []).length > 0 && (
        <div className={GLASS_SURFACE}>
          <SectionHeading icon={Briefcase} title={t("common.workExperience")} />
          <div className="mt-3 grid gap-2">
            {profile.workExperiences!.map((w, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200/70 bg-white/60 p-3 text-sm dark:border-slate-700/60 dark:bg-slate-900/40">
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {w.position} — {w.company}
                </p>
                <p className="mt-0.5 text-slate-600 dark:text-slate-300">{w.description}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Clock className="h-3 w-3" />
                  {w.start_date} — {w.end_date || t("common.present")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {(profile.educations ?? []).length > 0 && (
        <div className={GLASS_SURFACE}>
          <SectionHeading icon={GraduationCap} title={t("common.education")} />
          <div className="mt-3 grid gap-2">
            {profile.educations!.map((e, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200/70 bg-white/60 p-3 text-sm dark:border-slate-700/60 dark:bg-slate-900/40">
                <p className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                  <School className="h-3.5 w-3.5 text-sky-500" />
                  {e.school}
                </p>
                <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                  {e.major} — {e.degree}
                </p>
                {e.gpa && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {t("common.gpa")}: {e.gpa}
                  </p>
                )}
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Clock className="h-3 w-3" />
                  {e.start_date} — {e.end_date || t("common.present")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {(profile.certifications ?? []).length > 0 && (
        <div className={GLASS_SURFACE}>
          <SectionHeading icon={Award} title={t("common.certificate")} />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {profile.certifications!.map((c) => (
              <Badge
                key={c}
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                {c}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {(profile.achievements ?? []).length > 0 && (
        <div className={GLASS_SURFACE}>
          <SectionHeading icon={Trophy} title={t("common.achievements")} />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {profile.achievements!.map((a) => (
              <Badge
                key={a}
                variant="outline"
                className="border-amber-500/30 text-amber-700 dark:text-amber-300">
                {a}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- helpers ----------
function SectionHeading({ icon: Icon, title }: { icon: typeof User; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 ring-inset dark:bg-emerald-500/15 dark:text-emerald-300">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
        {title}
      </p>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white/60 p-3 dark:border-slate-700/60 dark:bg-slate-900/40">
      <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function SkillRow({
  icon: Icon,
  label,
  items,
  tone,
}: {
  icon: typeof Wrench;
  label: string;
  items: string[];
  tone: "emerald" | "sky" | "rose";
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {items.length === 0 ? (
          <span className="text-xs text-slate-400">—</span>
        ) : (
          items.map((s) => (
            <Badge
              key={s}
              variant="secondary"
              className={cn(
                "text-xs",
                tone === "emerald" &&
                  "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
                tone === "sky" && "bg-sky-500/10 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
                tone === "rose" &&
                  "bg-rose-500/10 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
              )}>
              {s}
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}

// ---------- Mentor review list row (UI-only, replaces legacy ReviewCard) ----------
function MentorReviewListRow({
  review,
  onClick,
  t,
}: {
  review: {
    id?: number;
    rating?: number;
    session?: { roomName?: string; endTime1?: string };
    situationNote?: string;
    taskNote?: string;
    actionNote?: string;
    resultNote?: string;
    strength?: string;
    weakness?: string;
    improve?: string;
  };
  onClick?: () => void;
  t: (_key: string, _options?: Record<string, unknown>) => string;
}) {
  const rating = review.rating || 0;
  const tone =
    rating >= 5
      ? "emerald"
      : rating >= 4
        ? "teal"
        : rating >= 3
          ? "sky"
          : rating >= 2
            ? "amber"
            : "rose";
  const accentClass = {
    emerald:
      "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300",
    teal: "bg-teal-500/10 text-teal-600 ring-teal-500/20 dark:bg-teal-500/20 dark:text-teal-300",
    sky: "bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:bg-sky-500/20 dark:text-sky-300",
    amber:
      "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300",
    rose: "bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:bg-rose-500/20 dark:text-rose-300",
  }[tone];
  const starNotes: Array<{ key: string; label: string; value?: string; icon: typeof Target }> = [
    { key: "s", label: t("compReview.situationS"), value: review.situationNote, icon: Target },
    { key: "t", label: t("compReview.missionT"), value: review.taskNote, icon: ClipboardList },
    { key: "a", label: t("compReview.actionA"), value: review.actionNote, icon: Zap },
    { key: "r", label: t("compReview.resultsR"), value: review.resultNote, icon: CheckCircle2 },
  ].filter((n) => n.value);
  const hasContent = starNotes.length > 0 || review.strength || review.weakness || review.improve;

  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl p-5 ring-1 transition-all ring-inset hover:shadow-md",
        "bg-slate-500/[0.04] ring-slate-200/70",
        "dark:bg-white/[0.03] dark:ring-white/5",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-1.5",
          tone === "emerald" && "bg-gradient-to-b from-emerald-500 to-emerald-300",
          tone === "teal" && "bg-gradient-to-b from-teal-500 to-teal-300",
          tone === "sky" && "bg-gradient-to-b from-sky-500 to-sky-300",
          tone === "amber" && "bg-gradient-to-b from-amber-500 to-amber-300",
          tone === "rose" && "bg-gradient-to-b from-rose-500 to-rose-300"
        )}
      />
      <div className="flex flex-col gap-3 pl-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.06em] uppercase ring-1 ring-inset",
                accentClass
              )}>
              <Star className="h-3 w-3 fill-current" aria-hidden />
              {rating}/5 · {t("mentorMentordashboard.reviewSent")}
            </span>
            <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
              #{review.id}
            </span>
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            {review.session?.roomName || "—"}
          </p>
          {review.session?.endTime1 && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              <TimeAgo date={String(treatZuluAsVietnamLocal(review.session.endTime1))} />
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <StarRating value={rating} readOnly size="sm" />
        </div>
      </div>

      {hasContent ? (
        <div className="mt-4 space-y-3 border-t border-slate-200/60 pt-3 dark:border-white/5">
          {/* STAR notes */}
          {starNotes.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {starNotes.map((note) => {
                const Icon = note.icon;
                return (
                  <div
                    key={note.key}
                    className="rounded-xl border border-slate-200/70 bg-white/60 p-3 dark:border-slate-700/60 dark:bg-slate-900/40">
                    <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
                      <Icon className="h-3 w-3 text-slate-400" aria-hidden />
                      {note.label}
                    </p>
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                      {note.value}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Strength / Weakness / Improve */}
          {(review.strength || review.weakness || review.improve) && (
            <div className="grid gap-2 sm:grid-cols-3">
              {review.strength && (
                <div className="rounded-xl bg-emerald-500/[0.06] p-3 ring-1 ring-emerald-500/15 ring-inset">
                  <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.06em] text-emerald-700 uppercase dark:text-emerald-300">
                    <ThumbsUp className="h-3 w-3" aria-hidden />
                    {t("common.strengths")}
                  </p>
                  <p className="text-sm leading-relaxed text-emerald-900 dark:text-emerald-100">
                    {review.strength}
                  </p>
                </div>
              )}
              {review.weakness && (
                <div className="rounded-xl bg-amber-500/[0.06] p-3 ring-1 ring-amber-500/15 ring-inset">
                  <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.06em] text-amber-700 uppercase dark:text-amber-300">
                    <AlertCircle className="h-3 w-3" aria-hidden />
                    {t("common.pointsForImprovement")}
                  </p>
                  <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-100">
                    {review.weakness}
                  </p>
                </div>
              )}
              {review.improve && (
                <div className="rounded-xl bg-sky-500/[0.06] p-3 ring-1 ring-sky-500/15 ring-inset">
                  <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.06em] text-sky-700 uppercase dark:text-sky-300">
                    <Lightbulb className="h-3 w-3" aria-hidden />
                    {t("common.suggestedImprovements1")}
                  </p>
                  <p className="text-sm leading-relaxed text-sky-900 dark:text-sky-100">
                    {review.improve}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500 italic dark:text-slate-400">
          {t("compReview.thereIsNoDetailedReview")}
        </p>
      )}
    </motion.div>
  );
}

// ---------- Mentor feedback list row (UI-only, replaces legacy FeedbackCard) ----------
function MentorFeedbackListRow({
  feedback,
  onClick,
  t,
}: {
  feedback: {
    id?: number;
    rating?: number;
    comment?: string;
    user?: { name?: string; avatarUrl?: string };
    session?: { roomName?: string; endTime1?: string };
  };
  onClick?: () => void;
  t: (_key: string, _options?: Record<string, unknown>) => string;
}) {
  const rating = feedback.rating || 0;
  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl p-5 ring-1 transition-all ring-inset hover:shadow-md",
        "bg-slate-500/[0.04] ring-slate-200/70",
        "dark:bg-white/[0.03] dark:ring-white/5",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-rose-500 to-rose-300"
      />
      <div className="flex items-start gap-3 pl-2">
        <Avatar className="h-10 w-10 shrink-0 ring-1 ring-white/10">
          {feedback.user?.avatarUrl ? (
            <AvatarImage src={feedback.user.avatarUrl} alt={feedback.user.name} />
          ) : null}
          <AvatarFallback className="bg-rose-100 text-xs font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
            {feedback.user?.name?.charAt(0) || "S"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {feedback.user?.name || t("common.studentVar0", { var_0: feedback.id ?? "—" })}
            </p>
            <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
              #{feedback.id}
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Calendar className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{feedback.session?.roomName || "—"}</span>
            {feedback.session?.endTime1 && (
              <>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <TimeAgo
                  date={String(treatZuluAsVietnamLocal(feedback.session.endTime1))}
                  prefix={false}
                />
              </>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <StarRating value={rating} readOnly size="sm" />
          <span className="text-[10px] font-bold tracking-[0.06em] text-rose-700 uppercase dark:text-rose-300">
            {rating}/5
          </span>
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-slate-200/70 bg-white/60 p-3 dark:border-slate-700/60 dark:bg-slate-900/40">
        {feedback.comment ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200">
            {feedback.comment}
          </p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-slate-500 italic dark:text-slate-400">
            <MessageSquare className="h-3.5 w-3.5" />
            {t("common.noComments")}
          </p>
        )}
      </div>
    </motion.div>
  );
}
