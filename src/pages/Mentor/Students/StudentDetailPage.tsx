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
import { useUserById } from "@/hooks/useApplication";
import { useCurrentMentorProfile } from "@/hooks/useMentor";
import { useMentorFeedbacksByMentor } from "@/hooks/useMentorFeedback";
import { calculateAverageRating, useMentorReviewsByMentor } from "@/hooks/useMentorReview";
import { useSessions } from "@/hooks/useSession";
import type { Session } from "@/interfaces";
import type { CandidateProfile } from "@/interfaces/schema.types";
import { formatDateTime, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { isSessionMentor } from "@/lib/session-mentor";
import { cn } from "@/lib/utils";
import {
  MentorDetailHeader,
  MentorDetailPage,
  MentorDetailPanel,
} from "@/pages/Mentor/components/MentorDetailLayout";
import {
  getLatestCandidateProfile,
  useCandidateProfile,
} from "@/services/candidate-profile.manager";
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
  const { data: studentProfile, isLoading: studentProfileLoading } = useUserById(studentId);
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
    mentorLoading ||
    sessionsLoading ||
    feedbacksLoading ||
    reviewsLoading ||
    profileLoading ||
    studentProfileLoading;

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
  const relatedStudent = studentFeedbacks[0]?.user || studentReviews[0]?.user;
  const studentInfo = {
    id: studentId,
    name: relatedStudent?.name || studentProfile?.name,
    email: relatedStudent?.email || studentProfile?.email,
    avatarUrl: relatedStudent?.avatarUrl || studentProfile?.avatarUrl,
  };

  // ---- stats ----
  const totalSessions = studentSessions.length;
  const completedSessions = studentSessions.filter(
    (session: Session) => session.status === "COMPLETED"
  ).length;
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
    <MentorDetailPage>
      <MentorDetailHeader
        onBack={() => navigate("/mentor?tab=students")}
        backLabel={t("general.back")}
        parentLabel={t("mentorStudents.student")}
        title={studentInfo.name || t("common.studentVar0", { var_0: studentId })}
        badge={
          <Badge variant="outline" className="font-mono text-xs text-slate-500">
            #{studentId}
          </Badge>
        }
      />

      <MentorDetailPanel className="p-5 sm:p-6">
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
      </MentorDetailPanel>

      <section>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Calendar,
              value: totalSessions,
              label: t("mentorOverview.totalSessions"),
              detail: `${completedSessions} ${t("general.completed")}`,
              tone: "text-indigo-600 dark:text-indigo-300",
              surface: "bg-indigo-50 dark:bg-indigo-950/50",
            },
            {
              icon: MessageSquare,
              value: totalFeedbacks,
              label: t("common.responseReceived"),
              detail: t("common.feedback"),
              tone: "text-sky-600 dark:text-sky-300",
              surface: "bg-sky-50 dark:bg-sky-950/50",
            },
            {
              icon: Star,
              value: totalReviews,
              label: t("adminReviewmanagement.totalReviews"),
              detail: totalReviews > 0 ? `${avgRating.toFixed(1)}/5` : "—",
              tone: "text-amber-600 dark:text-amber-300",
              surface: "bg-amber-50 dark:bg-amber-950/50",
            },
          ].map(({ icon: Icon, value, label, detail, tone, surface }) => (
            <div
              key={label}
              className="flex min-h-[96px] items-center gap-4 rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${surface}`}>
                <Icon className={`h-5 w-5 ${tone}`} aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl leading-none font-bold text-slate-900 dark:text-white">
                    {value}
                  </span>
                  <span className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                    {detail}
                  </span>
                </div>
                <p className="mt-1.5 truncate text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <MentorDetailPanel>
        <div className="flex flex-col gap-4">
          {/* Tabs */}
          <div className="space-y-5 pb-5">
            <div
              role="tablist"
              aria-label="student-detail-tabs"
              className="flex w-full overflow-x-auto border-b border-slate-200 bg-slate-50/70 px-5 dark:border-slate-800 dark:bg-slate-950/40">
              {[
                {
                  id: "sessions",
                  icon: Calendar,
                  label: `${t("general.session8")} (${totalSessions})`,
                },
                {
                  id: "feedbacks",
                  icon: MessageSquare,
                  label: `${t("mentorStudents.responseReceived1")} (${totalFeedbacks})`,
                },
                {
                  id: "reviews",
                  icon: Star,
                  label: `${t("mentorStudents.submittedReview")} (${totalReviews})`,
                },
                {
                  id: "profile",
                  icon: User,
                  label: t("mentorStudents.profile"),
                },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative flex min-w-max items-center justify-center gap-2 border-b-2 px-5 py-4 text-xs font-semibold transition-colors",
                      isActive
                        ? "border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300"
                        : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-100"
                    )}>
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sessions Tab */}
            {activeTab === "sessions" && (
              <div key="sessions" className="overflow-x-auto px-5">
                {studentSessions.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title={t("mentorStudents.thereAreNoSessionsYet")}
                    description={t("mentorStudents.thereHasBeenNoInterview")}
                  />
                ) : (
                  <div className="min-w-[920px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-[90px_minmax(280px,1.7fr)_minmax(180px,1fr)_150px_56px] items-center border-b border-slate-200 bg-slate-100/80 px-5 py-3 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300">
                      <span>{t("common.id")}</span>
                      <span>{t("common.session")}</span>
                      <span>{t("common.time")}</span>
                      <span>{t("common.status")}</span>
                      <span className="text-right">{t("common.action")}</span>
                    </div>
                    {studentSessions.map((session: Session) => (
                      <SessionRow
                        key={session.id}
                        session={session}
                        onClick={() =>
                          navigate(`/mentor/sessions/${session.id}`, { state: studentReturnState })
                        }
                        t={t}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Feedbacks Tab */}
            {activeTab === "feedbacks" && (
              <div
                key="feedbacks"
                className="mx-5 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
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
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === "reviews" && (
              <div
                key="reviews"
                className="mx-5 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
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
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div key="profile" className="px-5">
                {!candidateProfile ? (
                  <EmptyState
                    icon={FileText}
                    title={t("common.thereAreNoCandidateProfilesYet")}
                    description={t("mentorStudents.thisStudentHasNotCreated")}
                  />
                ) : (
                  <CandidateProfileView profile={candidateProfile} t={t} />
                )}
              </div>
            )}
          </div>
        </div>
      </MentorDetailPanel>
    </MentorDetailPage>
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
      className="group grid min-h-[72px] w-full grid-cols-[90px_minmax(280px,1.7fr)_minmax(180px,1fr)_150px_56px] items-center border-b border-slate-100 bg-white px-5 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/70">
      <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
        #{session.id}
      </span>
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
          <Calendar className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {session.roomName || t("common.mentorInterview")}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
            {session.roomUrl || t("common.interviewSession")}
          </p>
        </div>
      </div>
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {session.startTime1 ? formatDateTime(treatZuluAsVietnamLocal(session.startTime1)) : "-"}
      </span>
      <Badge
        variant="outline"
        className={cn(
          "w-fit min-w-24 justify-center rounded-full px-3 py-1 text-[11px] font-bold",
          status === "COMPLETED" &&
            "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
          status === "ONGOING" && "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
          status === "CANCELED" &&
            "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300"
        )}>
        {statusLabel}
      </Badge>
      <span className="flex justify-end">
        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-500" />
      </span>
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
    <div>
      <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 py-6 dark:border-slate-800">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <FileText className="h-5 w-5" aria-hidden />
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t("mentorStudents.profile")}
          </p>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
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
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("common.skill")}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalSkills}</p>
          </div>
        )}
      </div>

      {/* Basic Info */}
      <div className="border-b border-slate-200 py-6 dark:border-slate-800">
        <SectionHeading icon={User} title={t("common.basicInformation")} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <InfoBlock label={t("mentorStudents.targetRole")} value={profile.targetRole || "—"} />
          <InfoBlock label={t("mentorStudents.level")} value={profile.targetLevel || "—"} />
        </div>
        {profile.introduction && (
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("common.introduction")}
            </p>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {profile.introduction}
            </p>
          </div>
        )}
      </div>

      {/* Skills */}
      <div className="border-b border-slate-200 py-6 dark:border-slate-800">
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
        <div className="border-b border-slate-200 py-6 dark:border-slate-800">
          <SectionHeading icon={Briefcase} title={t("common.project")} />
          <div className="mt-3 grid gap-2">
            {profile.projects!.map((p, i) => (
              <div key={i} className="border-t border-slate-100 py-4 text-sm dark:border-slate-800">
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
        <div className="border-b border-slate-200 py-6 dark:border-slate-800">
          <SectionHeading icon={Briefcase} title={t("common.workExperience")} />
          <div className="mt-3 grid gap-2">
            {profile.workExperiences!.map((w, i) => (
              <div key={i} className="border-t border-slate-100 py-4 text-sm dark:border-slate-800">
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
        <div className="border-b border-slate-200 py-6 dark:border-slate-800">
          <SectionHeading icon={GraduationCap} title={t("common.education")} />
          <div className="mt-3 grid gap-2">
            {profile.educations!.map((e, i) => (
              <div key={i} className="border-t border-slate-100 py-4 text-sm dark:border-slate-800">
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
        <div className="border-b border-slate-200 py-6 dark:border-slate-800">
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
        <div className="py-6">
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
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-slate-100 py-3 dark:border-slate-800">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
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
    <div
      className={cn(
        "group border-b border-slate-100 bg-white px-5 py-4 transition-colors last:border-b-0 hover:bg-slate-50/80",
        "dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}>
      <div
        aria-hidden
        className={cn(
          "hidden",
          tone === "emerald" && "bg-emerald-500",
          tone === "teal" && "bg-teal-500",
          tone === "sky" && "bg-sky-500",
          tone === "amber" && "bg-amber-500",
          tone === "rose" && "bg-rose-500"
        )}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
              #{review.id}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
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
        <div className="flex items-center gap-3">
          <StarRating value={rating} readOnly size="sm" />
          <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500" />
        </div>
      </div>

      {hasContent ? (
        <div className="mt-4 space-y-3 border-t border-slate-200 pt-3 dark:border-slate-700/80">
          {/* STAR notes */}
          {starNotes.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {starNotes.map((note) => {
                const Icon = note.icon;
                return (
                  <div
                    key={note.key}
                    className="border-t border-slate-100 py-3 dark:border-slate-800">
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
                <div className="border-t border-slate-100 py-3 dark:border-slate-800">
                  <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.06em] text-emerald-700 uppercase dark:text-emerald-300">
                    <ThumbsUp className="h-3 w-3" aria-hidden />
                    {t("common.strengths")}
                  </p>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                    {review.strength}
                  </p>
                </div>
              )}
              {review.weakness && (
                <div className="border-t border-slate-100 py-3 dark:border-slate-800">
                  <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.06em] text-amber-700 uppercase dark:text-amber-300">
                    <AlertCircle className="h-3 w-3" aria-hidden />
                    {t("common.pointsForImprovement")}
                  </p>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                    {review.weakness}
                  </p>
                </div>
              )}
              {review.improve && (
                <div className="border-t border-slate-100 py-3 dark:border-slate-800">
                  <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.06em] text-sky-700 uppercase dark:text-sky-300">
                    <Lightbulb className="h-3 w-3" aria-hidden />
                    {t("common.suggestedImprovements1")}
                  </p>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
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
    </div>
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
    <div
      className={cn(
        "group border-b border-slate-100 bg-white px-5 py-4 transition-colors last:border-b-0 hover:bg-slate-50/80",
        "dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}>
      <div aria-hidden className="hidden" />
      <div className="flex items-start gap-3">
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
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-0.5">
            <StarRating value={rating} readOnly size="sm" />
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
              {rating}/5
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500" />
        </div>
      </div>
      <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700/80">
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
    </div>
  );
}
