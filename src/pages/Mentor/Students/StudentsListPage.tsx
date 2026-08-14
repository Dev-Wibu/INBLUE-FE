/**
 * Mentor Students List Page — "Command Deck" v2.
 *
 * UI-only refresh. Replaces the old 4-up KPI strip + header gradient
 * with a compact dark hero, status filter track, asymmetric bento
 * layout (main list + side spotlight), and rich per-row cards.
 *
 * All data hooks, filtering, sorting, pagination, and navigation
 * logic is preserved 1:1 from the previous version.
 */

import { ReloadButton } from "@/components/shared";
import { PaginationControl } from "@/components/shared/PaginationControl";
import { SortButton } from "@/components/shared/SortButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { useCurrentMentorProfile } from "@/hooks/useMentor";
import { useMentorFeedbacksByMentor } from "@/hooks/useMentorFeedback";
import { calculateAverageRating, useMentorReviewsByMentor } from "@/hooks/useMentorReview";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSessions } from "@/hooks/useSession";
import { useSortable } from "@/hooks/useSortable";
import type { Session } from "@/interfaces";
import { toTimestamp, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { isSessionMentor } from "@/lib/session-mentor";
import { cn } from "@/lib/utils";
import {
  MentorEmptyState,
  MentorListRow,
  MentorQuickStat,
  MentorSortCluster,
} from "@/pages/Mentor/Common";
import { useAuthStore } from "@/stores/authStore";
import { motion } from "framer-motion";
import {
  Calendar,
  Inbox,
  MessageSquare,
  Search,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface StudentInfo {
  id: number;
  name?: string;
  email?: string;
  avatarUrl?: string;
  university?: string;
  sessionCount: number;
  feedbackCount: number;
  reviewCount: number;
  avgRating: number;
  lastSessionDate?: string;
}

type StudentFilter = "all" | "reviewed" | "feedbacked" | "noReview";

const rowMotion = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" as const } },
};

// ---------- helpers ----------
function fmtDateShort(value?: string): string | null {
  if (!value) return null;
  const ts = toTimestamp(treatZuluAsVietnamLocal(value));
  if (!ts) return null;
  return new Date(ts).toLocaleDateString();
}

// ---------- main ----------
export function StudentsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [searchQuery, setSearchQuery] = useState("");
  const [studentFilter, setStudentFilter] = useState<StudentFilter>("all");

  // 2026-08-02: kept `useSessions` (admin endpoint, GET /api/sessions)
  //   because SecurityConfig is permitAll and the mentor in this project
  //   can call it. Switching to `useUserSessions` returned `[]` for the
  //   test user (userId == userId2 case). Admin endpoint returns the full
  //   list; we narrow by Mentor.id / User.id in `isSessionMentor` below.
  const {
    data: allSessions = [],
    isLoading: sessionsLoading,
    isRefetching: sessionsRefetching,
    refetch: refetchSessions,
  } = useSessions();
  // 2026-08-02: BE endpoints filter by `Mentor.id` (PK bảng mentor), not
  //   `User.id` (JWT sub). The mentor record is resolved via
  //   `useCurrentMentorProfile` (email lookup) — see docs/BE_RESPONSE_MENTOR_BUG.md.
  const { data: mentorProfile } = useCurrentMentorProfile();
  const mentorId = (mentorProfile as { id?: number } | null)?.id ?? 0;
  const userIdForReviews = mentorId || user?.id || 0;
  const {
    data: feedbacks = [],
    isLoading: feedbacksLoading,
    isRefetching: feedbacksRefetching,
    refetch: refetchFeedbacks,
  } = useMentorFeedbacksByMentor(mentorId);
  const {
    data: reviews = [],
    isLoading: reviewsLoading,
    isRefetching: reviewsRefetching,
    refetch: refetchReviews,
  } = useMentorReviewsByMentor(userIdForReviews);
  const isLoading = sessionsLoading || feedbacksLoading || reviewsLoading;
  const isReloading = sessionsRefetching || feedbacksRefetching || reviewsRefetching;

  // 2026-08-02: filter sessions using `Mentor.id` (BE's `session.mentorId`
  //   field equals the Mentor PK, not the user PK) so test data where
  //   Mentor.id != User.id still matches.
  const mentorSessions = allSessions.filter((session: Session) =>
    isSessionMentor(session, mentorId || user?.id)
  );

  // Group sessions by student (userId)
  const studentsMap = useMemo(() => {
    const map = new Map<number, StudentInfo>();
    mentorSessions.forEach((session: Session) => {
      const studentId = session.userId;
      if (!studentId) return;
      if (!map.has(studentId)) {
        const userFeedback = feedbacks.find(
          (f: { user?: { id?: number } }) => f.user?.id === studentId
        );
        const userReview = reviews.find(
          (r: { user?: { id?: number } }) => r.user?.id === studentId
        );
        const userInfo = userFeedback?.user || userReview?.user || null;
        map.set(studentId, {
          id: studentId,
          name: userInfo?.name,
          email: userInfo?.email,
          avatarUrl: userInfo?.avatarUrl,
          // @ts-expect-error: Backend Swagger schema mismatch - university not in User type
          university: userInfo?.university,
          sessionCount: 0,
          feedbackCount: 0,
          reviewCount: 0,
          avgRating: 0,
          lastSessionDate: undefined,
        });
      }
      const student = map.get(studentId)!;
      student.sessionCount += 1;
      const sessionEndTimestamp = toTimestamp(treatZuluAsVietnamLocal(session.endTime1));
      const lastSessionTimestamp = toTimestamp(treatZuluAsVietnamLocal(student.lastSessionDate));
      if (
        sessionEndTimestamp &&
        (!lastSessionTimestamp || sessionEndTimestamp > lastSessionTimestamp)
      ) {
        student.lastSessionDate = session.endTime1;
      }
    });
    return map;
  }, [mentorSessions, feedbacks, reviews]);

  // Add feedback and review counts
  const students = useMemo(() => {
    const map = new Map(studentsMap);
    feedbacks.forEach((feedback: { user?: { id?: number } }) => {
      const studentId = feedback.user?.id;
      if (studentId && map.has(studentId)) {
        map.get(studentId)!.feedbackCount += 1;
      }
    });
    reviews.forEach((review: { user?: { id?: number }; rating?: number }) => {
      const studentId = review.user?.id;
      if (studentId && map.has(studentId)) {
        const student = map.get(studentId)!;
        student.reviewCount += 1;
      }
    });
    map.forEach((student) => {
      const studentReviews = reviews.filter(
        (r: { user?: { id?: number } }) => r.user?.id === student.id
      );
      // Mentor review ratings are a 1–5 value. Historical malformed values
      // (for example 35.8) must never be rendered as a star rating.
      student.avgRating = calculateAverageRating(studentReviews);
    });
    return Array.from(map.values()).sort((a, b) => {
      const aTimestamp = toTimestamp(treatZuluAsVietnamLocal(a.lastSessionDate)) ?? 0;
      const bTimestamp = toTimestamp(treatZuluAsVietnamLocal(b.lastSessionDate)) ?? 0;
      if (aTimestamp !== bTimestamp) return aTimestamp - bTimestamp;
      return a.id - b.id;
    });
  }, [studentsMap, feedbacks, reviews]);

  // Spotlight: most-recent student with the highest avg rating.
  const spotlightStudent = useMemo(() => {
    if (students.length === 0) return null;
    const scored = students
      .filter((s) => s.reviewCount > 0)
      .sort((a, b) => {
        if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
        const aTs = toTimestamp(treatZuluAsVietnamLocal(a.lastSessionDate)) ?? 0;
        const bTs = toTimestamp(treatZuluAsVietnamLocal(b.lastSessionDate)) ?? 0;
        return bTs - aTs;
      });
    if (scored.length > 0) return scored[0];
    // Fallback to most recent student.
    return students[0];
  }, [students]);

  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        const normalizedSearch = searchQuery.trim().toLowerCase();
        const matchesSearch =
          normalizedSearch.length === 0 ||
          student.id.toString().includes(normalizedSearch) ||
          student.name?.toLowerCase().includes(normalizedSearch) ||
          student.email?.toLowerCase().includes(normalizedSearch) ||
          student.university?.toLowerCase().includes(normalizedSearch);
        if (!matchesSearch) return false;
        if (studentFilter === "reviewed") return student.reviewCount > 0;
        if (studentFilter === "feedbacked") return student.feedbackCount > 0;
        if (studentFilter === "noReview") return student.reviewCount === 0;
        return true;
      }),
    [searchQuery, studentFilter, students]
  );

  const { sortedData, getSortProps } = useSortable(filteredStudents);

  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_mentor_students_studentslistpage_tsx_pagesize",
    defaultPageSize: 10,
  });
  const pagination = usePagination({ totalCount: sortedData.length, pageSize });

  const pageData = useMemo(() => {
    return sortedData.slice(pagination.startIndex, pagination.endIndex + 1);
  }, [sortedData, pagination.startIndex, pagination.endIndex]);

  // ---------- render ----------
  return (
    <div
      className={cn(
        "flex flex-col bg-slate-50 dark:bg-slate-950",
        "-m-4 min-h-[calc(100%+32px)] md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)]"
      )}>
      <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-auto bg-slate-50 p-5 duration-300 sm:p-6 md:px-8 dark:bg-slate-950">
        {/* Stat Summary & Control Card - Admin Pattern */}
        <div className="mb-6 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t("mentorStudents.student")}
              </h2>
              <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                {t("mentorStudents.listOfStudentsWhoHave")}
              </p>
            </div>
            <div className="flex items-center justify-center gap-5 sm:gap-6">
              {[
                [students.length, t("mentorStudents.totalStudents")],
                [mentorSessions.length, t("common.totalSession")],
                [reviews.length, t("mentorStudents.reviewsReceived")],
              ].map(([value, label], index) => (
                <div key={String(label)} className="flex items-center gap-5 sm:gap-6">
                  {index > 0 && <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />}
                  <div className="flex min-w-[78px] flex-col items-center justify-center text-center">
                    <span className="text-2xl leading-none font-bold text-indigo-600 dark:text-sky-400">
                      {value}
                    </span>
                    <span className="mt-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                      {label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Search row - Admin Pattern */}
          <form
            onSubmit={(event) => event.preventDefault()}
            className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <Input
                type="text"
                placeholder={t("mentorStudents.searchByIdNameEmail")}
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  pagination.goToFirstPage();
                }}
                className="h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 pl-11 text-[14.5px] shadow-2xs focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-indigo-500/80"
              />
            </div>
            <Select
              value={studentFilter}
              onValueChange={(value) => {
                setStudentFilter(value as StudentFilter);
                pagination.goToFirstPage();
              }}>
              <SelectTrigger className="h-[46px] w-[200px] rounded-xl border border-slate-200/90 bg-white text-[14.5px] shadow-2xs dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100">
                <SelectValue placeholder={t("mentorStudents.filterByInteraction")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("mentorStudents.allStudents")}</SelectItem>
                <SelectItem value="reviewed">{t("mentorStudents.reviewed")}</SelectItem>
                <SelectItem value="feedbacked">{t("mentorStudents.responseSent1")}</SelectItem>
                <SelectItem value="noReview">{t("common.thereAreNoReviewsYet")}</SelectItem>
              </SelectContent>
            </Select>
            <ReloadButton
              onReload={async () => {
                await Promise.all([refetchSessions(), refetchFeedbacks(), refetchReviews()]);
              }}
              isLoading={isReloading}
              tooltip={t("mentorStudents.reloadStudentList")}
              className="h-[46px] w-[46px] rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/70"
            />
          </form>

          {/* Filter pills - Admin Pattern */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-2 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
              {t("common.filter", "Lọc")}:
            </span>
            {[
              ["all", t("common.allStatus", "Tất cả")],
              ["reviewed", t("mentorStudents.reviewed", "Đã review")],
              ["feedbacked", t("mentorStudents.responseSent1", "Đã feedback")],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setStudentFilter(value as StudentFilter);
                  pagination.goToFirstPage();
                }}
                className={`rounded-full border px-4 py-1.5 text-[13.5px] font-medium transition-colors ${
                  studentFilter === value
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-xs shadow-indigo-500/30 dark:border-indigo-500 dark:bg-indigo-600/90 dark:text-white dark:shadow-indigo-500/20"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Main content - Table Layout like Admin */}
        <div className="flex flex-1 flex-col gap-5 xl:flex-row xl:gap-6">
          {/* LEFT - Table */}
          <div className="relative z-10 flex flex-1 flex-col gap-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : students.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
                <MentorEmptyState
                  icon={Inbox}
                  title={t("mentorStudents.noStudentsYet")}
                  description={t("common.youHaveNotHadAnyInterviewSessions")}
                  tone="violet"
                />
              </div>
            ) : (
              <>
                {/* Sort cluster */}
                {sortedData.length > 0 && (
                  <MentorSortCluster>
                    <SortButton {...getSortProps("sessionCount")}>
                      {t("mentorStudents.numberOfSessions")}
                    </SortButton>
                    <SortButton {...getSortProps("avgRating")}>{t("common.evaluate")}</SortButton>
                    <SortButton {...getSortProps("name")}>{t("common.name")}</SortButton>
                  </MentorSortCluster>
                )}

                {/* Table Card */}
                {pageData.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
                    <MentorEmptyState
                      icon={Search}
                      title={t("mentorStudents.noSuitableStudentsWereFound")}
                      description={t("mentorStudents.tryAnotherKeywordOrChange")}
                      tone="violet"
                    />
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-col gap-2 p-4">
                      {pageData.map((student) => (
                        <motion.div key={student.id} variants={rowMotion}>
                          <MentorListRow
                            tone={
                              student.reviewCount > 0
                                ? "violet"
                                : student.feedbackCount > 0
                                  ? "emerald"
                                  : "indigo"
                            }
                            onClick={() => navigate(`/mentor/students/${student.id}`)}
                            ariaLabel={
                              student.name || t("common.studentVar0", { var_0: student.id })
                            }
                            actionSlot={<StudentRowTrailing student={student} t={t} />}>
                            <Avatar className="h-10 w-10 shrink-0 ring-1 ring-white/10">
                              <AvatarImage src={student.avatarUrl} alt={student.name} />
                              <AvatarFallback className="bg-violet-100 text-xs font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                                {student.name?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {student.name ||
                                  t("common.studentVar0", {
                                    var_0: student.id,
                                  })}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                <span className="truncate">
                                  {student.email || student.university}
                                </span>
                                {student.lastSessionDate && (
                                  <>
                                    <span className="text-slate-300 dark:text-slate-600">·</span>
                                    <Calendar className="h-3 w-3 shrink-0" aria-hidden />
                                    <span className="shrink-0">
                                      {fmtDateShort(student.lastSessionDate)}
                                    </span>
                                  </>
                                )}
                              </p>
                            </div>
                          </MentorListRow>
                        </motion.div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {sortedData.length > 0 && (
                      <div className="flex flex-none items-center justify-end border-t border-slate-200/80 bg-white px-4 py-3 dark:border-t-slate-800 dark:bg-slate-900">
                        <PaginationControl
                          pagination={pagination}
                          onPageSizeChange={(size) => {
                            setPageSize(size);
                            pagination.goToFirstPage();
                          }}
                          pageSizeOptions={[5, 10, 20, 50]}
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* RIGHT - Side stats panel */}
          <SidePanel
            isLoading={isLoading}
            spotlightStudent={spotlightStudent}
            students={students}
            studentsCount={students.length}
            reviewsCount={reviews.length}
            feedbacksCount={feedbacks.length}
            mentorSessionsCount={mentorSessions.length}
            navigate={navigate}
            t={t}
          />
        </div>
      </div>
    </div>
  );
}

// ---------- side panel ----------
function SidePanel({
  isLoading,
  spotlightStudent,
  students,
  studentsCount,
  reviewsCount,
  feedbacksCount,
  mentorSessionsCount,
  navigate,
  t,
}: {
  isLoading: boolean;
  spotlightStudent: StudentInfo | null;
  students: StudentInfo[];
  studentsCount: number;
  reviewsCount: number;
  feedbacksCount: number;
  mentorSessionsCount: number;
  navigate: ReturnType<typeof useNavigate>;
  t: (_key: string, _options?: Record<string, unknown>) => string;
}) {
  const avgRating = useMemo(() => {
    if (reviewsCount === 0) return "—";
    if (!spotlightStudent) return "—";
    return spotlightStudent.avgRating.toFixed(1);
  }, [spotlightStudent, reviewsCount]);

  // Top-5 students sorted by (avg rating desc, review count desc)
  const topStudents = useMemo(() => {
    return [...students]
      .sort((a, b) => {
        if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
        if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
        return b.sessionCount - a.sessionCount;
      })
      .slice(0, 5);
  }, [students]);

  return (
    <aside className="flex w-full flex-col gap-4 xl:sticky xl:top-4 xl:w-[280px] xl:self-start">
      {/* Top performers card */}
      <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
              {t("mentorStudents.totalStudents")}
            </p>
            <p className="mt-0.5 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-[-0.04em] text-slate-900 dark:text-white">
                {isLoading ? "—" : studentsCount}
              </span>
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2 pt-3">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : topStudents.length === 0 ? (
          <p className="pt-3 text-xs text-slate-500 italic dark:text-slate-400">—</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1.5 border-t border-slate-200 pt-3 dark:border-slate-800">
            {topStudents.map((student, index) => (
              <li key={student.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/mentor/students/${student.id}`)}
                  className="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition-all hover:bg-slate-50 dark:hover:bg-slate-800">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                    #{index + 1}
                  </span>
                  <Avatar className="h-8 w-8 shrink-0 ring-1 ring-white/10">
                    {student.avatarUrl ? (
                      <AvatarImage src={student.avatarUrl} alt={student.name} />
                    ) : null}
                    <AvatarFallback className="bg-slate-100 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {student.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-300">
                      {student.name || t("common.studentVar0", { var_0: student.id })}
                    </p>
                    <p className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="font-medium">
                        {student.sessionCount} {t("common.session").toLowerCase()}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span className="font-medium">
                        {student.reviewCount} {t("common.evaluate").toLowerCase()}
                      </span>
                    </p>
                  </div>
                  {student.reviewCount > 0 && (
                    <span className="flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                      {student.avgRating.toFixed(1)}
                      <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Top performer highlight */}
      {spotlightStudent && (
        <div className="rounded-[20px] border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm dark:border-amber-900/30 dark:from-amber-950/20 dark:to-slate-950 dark:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300">
              <Trophy className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold tracking-[0.06em] text-amber-700 uppercase dark:text-amber-300">
                {t("mentorStudents.topPerformer")}
              </p>
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {spotlightStudent.name || t("common.studentVar0", { var_0: spotlightStudent.id })}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-amber-200 pt-3 dark:border-amber-900/30">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
                {t("common.averageStarRating")}
              </p>
              <p className="text-xl font-bold tracking-[-0.04em] text-slate-900 dark:text-slate-100">
                {avgRating}
                <span className="ml-0.5 text-xs font-medium text-slate-400">/5</span>
              </p>
            </div>
            <StarRating value={spotlightStudent.avgRating} readOnly size="sm" />
          </div>
        </div>
      )}

      {/* 3 quick stats */}
      <div className="grid grid-cols-3 gap-2.5">
        <MentorQuickStat
          index={1}
          icon={Calendar as LucideIcon}
          label={t("common.totalSession")}
          value={isLoading ? "—" : mentorSessionsCount}
          caption={t("mentorOverview.complete")}
          tone="indigo"
        />
        <MentorQuickStat
          index={2}
          icon={MessageSquare as LucideIcon}
          label={t("mentorStudents.responseSent")}
          value={isLoading ? "—" : feedbacksCount}
          caption={t("mentorStudents.responseSent1")}
          tone="emerald"
        />
        <MentorQuickStat
          index={3}
          icon={Star as LucideIcon}
          label={t("mentorStudents.reviewsReceived")}
          value={isLoading ? "—" : reviewsCount}
          caption={t("mentorStudents.reviewSubmitted")}
          tone="amber"
        />
      </div>
    </aside>
  );
}

// ---------- per-row trailing slot ----------
function StudentRowTrailing({ student, t }: { student: StudentInfo; t: (_key: string) => string }) {
  return (
    <div className="hidden items-center gap-4 sm:flex">
      <div className="text-center">
        <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
          {t("common.session")}
        </p>
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {student.sessionCount}
        </p>
      </div>
      <div className="text-center">
        <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
          {t("common.feedback1")}
        </p>
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {student.feedbackCount}
        </p>
      </div>
      <div className="text-center">
        <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
          {t("common.evaluate")}
        </p>
        {student.reviewCount > 0 ? (
          <div className="flex items-center justify-center gap-1">
            <StarRating value={student.avgRating} readOnly size="sm" />
          </div>
        ) : (
          <p className="text-sm font-bold text-slate-400">—</p>
        )}
      </div>
    </div>
  );
}
