/**
 * Student detail for the mentor workspace.
 * Data ownership and filtering stay scoped to the current mentor.
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { TimeAgo } from "@/components/ui/time-ago";
import { useCurrentMentorProfile } from "@/hooks/useMentor";
import { useMentorFeedbacksByMentor } from "@/hooks/useMentorFeedback";
import { calculateAverageRating, useMentorReviewsByMentor } from "@/hooks/useMentorReview";
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

// ---------- shared surfaces ----------
const GLASS_SURFACE =
  "rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900";

export function StudentDetailPage() {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("sessions");
  const studentId = Number(userId);
  const studentReturnState = { returnTo: `/mentor/students/${studentId}` };

  const { data: mentorProfile, isLoading: mentorLoading } = useCurrentMentorProfile();
  const mentorId = (mentorProfile as { id?: number } | null)?.id ?? 0;
  const { data: allSessions = [], isLoading: sessionsLoading } = useSessions();
  const { data: allFeedbacks = [], isLoading: feedbacksLoading } =
    useMentorFeedbacksByMentor(mentorId);
  const { data: allReviews = [], isLoading: reviewsLoading } = useMentorReviewsByMentor(mentorId);
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

  const isLoading =
    mentorLoading || sessionsLoading || feedbacksLoading || reviewsLoading || profileLoading;

  // ---- DATA (logic preserved 1:1 from previous version) ----
  const studentSessions = allSessions.filter(
    (session: Session) => session.userId === studentId && isSessionMentor(session, mentorId)
  );
  const studentFeedbacks = allFeedbacks.filter(
    (feedback: { user?: { id?: number }; session?: { userId?: number } }) =>
      (feedback.user?.id ?? feedback.session?.userId) === studentId
  );
  const studentReviews = allReviews.filter(
    (review: { user?: { id?: number }; session?: { userId?: number } }) =>
      (review.user?.id ?? review.session?.userId) === studentId
  );
  const studentInfo = studentFeedbacks[0]?.user || studentReviews[0]?.user || { id: studentId };

  // ---- stats ----
  const totalSessions = studentSessions.length;
  const totalFeedbacks = studentFeedbacks.length;
  const totalReviews = studentReviews.length;
  const avgRating = calculateAverageRating(studentReviews);

  if (isLoading) {
    return (
      <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
        <div className="flex h-16 items-center border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900">
          <Skeleton className="h-8 w-72" />
        </div>
        <div className="space-y-5 p-4 sm:p-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-12" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!studentInfo || totalSessions === 0) {
    return (
      <div className="-m-4 flex h-[calc(100%+32px)] items-center justify-center bg-slate-50 p-6 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <User className="h-10 w-10 text-slate-400" />
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {t("mentorStudents.noStudentFound")}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("mentorStudents.thisStudentDoesNotExist")}
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/mentor?tab=students")}>
            <ArrowLeft className="h-4 w-4" />
            {t("general.back")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      <header className="flex flex-none items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => navigate("/mentor?tab=students")}
          aria-label={t("common.backToTheList")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none dark:border-slate-700 dark:text-slate-300 dark:hover:bg-indigo-950/40">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => navigate("/mentor?tab=students")}
          className="hidden text-xs font-medium text-slate-500 hover:text-indigo-600 sm:block dark:text-slate-400 dark:hover:text-indigo-400">
          {t("mentorStudents.student")}
        </button>
        <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-slate-400 sm:block" />
        <h1 className="truncate text-base font-bold text-slate-900 dark:text-white">
          {studentInfo.name || t("common.studentVar0", { var_0: studentId })}
        </h1>
        <Badge variant="outline" className="font-mono text-xs text-slate-500">
          #{studentId}
        </Badge>
      </header>

      <section className="flex-none border-b border-slate-200 bg-white p-4 sm:px-6 sm:py-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 rounded-xl border border-slate-100 dark:border-slate-800">
              <AvatarImage src={studentInfo.avatarUrl} alt={studentInfo.name} />
              <AvatarFallback className="rounded-xl bg-indigo-100 text-xl font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                {studentInfo.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {studentInfo.name || t("common.studentVar0", { var_0: studentId })}
              </h1>
              <div className="mt-1 flex flex-col gap-0.5 text-sm text-slate-500 dark:text-slate-400">
                {studentInfo.email && (
                  <p className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {studentInfo.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Rating display */}
          {totalReviews > 0 && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t("common.averageStarRating")}
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {avgRating.toFixed(1)}
                  <span className="ml-1 text-base font-medium text-slate-400">/5</span>
                </p>
                <StarRating value={avgRating} readOnly size="sm" />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {totalReviews} {t("mentorStudents.studentReviews")}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          {/* Tabs */}
          <div className="space-y-4">
            <div
              role="tablist"
              aria-label="student-detail-tabs"
              className="relative grid w-full grid-cols-4 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-800">
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
                      onClick={() =>
                        navigate(`/mentor/sessions/${session.id}`, { state: studentReturnState })
                      }
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
                          if (feedback.id) {
                            navigate(`/mentor/feedback/${feedback.id}`, {
                              state: studentReturnState,
                            });
                          }
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
                          if (review.id) {
                            navigate(`/mentor/reviews/${review.id}`, {
                              state: studentReturnState,
                            });
                          }
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
          </div>
        </div>
      </main>
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
    <button
      onClick={onClick}
      className="group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-indigo-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 ring-inset dark:bg-emerald-500/20 dark:text-emerald-300">
          <Calendar className="h-4 w-4" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {session.roomName || t("common.mentorInterview")}
          </p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {session.startTime1 && (
              <TimeAgo date={String(treatZuluAsVietnamLocal(session.startTime1))} prefix={false} />
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={statusVariant as never}>{statusLabel}</Badge>
        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 group-hover:text-indigo-500" />
      </div>
    </button>
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
              {feedback.user?.name || t("common.student")}
            </p>
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
