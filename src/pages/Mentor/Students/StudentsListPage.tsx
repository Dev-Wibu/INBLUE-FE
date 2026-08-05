import { useTranslation } from "react-i18next";
/**
 * Mentor Students List Page
 * Displays list of students who had sessions with this mentor
 */

import { PaginationControl } from "@/components/shared/PaginationControl";
import { ReloadButton } from "@/components/shared/ReloadButton";
import { SortButton } from "@/components/shared/SortButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
import { useMentorReviewsByMentor } from "@/hooks/useMentorReview";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSessions } from "@/hooks/useSession";
import { useSortable } from "@/hooks/useSortable";
import type { Session } from "@/interfaces";
import { toTimestamp, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { isSessionMentor } from "@/lib/session-mentor";
import { useAuthStore } from "@/stores/authStore";
import { Calendar, Filter, MessageSquare, Search, Star, Users } from "lucide-react";
import { useMemo, useState } from "react";
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

  // 2026-08-02: filter sessions using `Mentor.id` (BE's `session.mentorId`
  //   field equals the Mentor PK, not the user PK) so test data where
  //   Mentor.id != User.id still matches.
  const mentorSessions = allSessions.filter((session: Session) =>
    isSessionMentor(session, mentorId || user?.id)
  );

  // Group sessions by student (userId)
  const studentsMap = new Map<number, StudentInfo>();
  mentorSessions.forEach((session: Session) => {
    const studentId = session.userId;
    if (!studentId) return;
    if (!studentsMap.has(studentId)) {
      // Find user info from feedbacks or reviews
      const userFeedback = feedbacks.find(
        (f: {
          user?: {
            id?: number;
          };
        }) => f.user?.id === studentId
      );
      const userReview = reviews.find(
        (r: {
          user?: {
            id?: number;
          };
        }) => r.user?.id === studentId
      );
      const userInfo = userFeedback?.user || userReview?.user || null;
      studentsMap.set(studentId, {
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
    const student = studentsMap.get(studentId)!;
    student.sessionCount += 1;

    // Track last session
    const sessionEndTimestamp = toTimestamp(treatZuluAsVietnamLocal(session.endTime1));
    const lastSessionTimestamp = toTimestamp(treatZuluAsVietnamLocal(student.lastSessionDate));
    if (
      sessionEndTimestamp &&
      (!lastSessionTimestamp || sessionEndTimestamp > lastSessionTimestamp)
    ) {
      student.lastSessionDate = session.endTime1;
    }
  });

  // Add feedback and review counts
  feedbacks.forEach(
    (feedback: {
      user?: {
        id?: number;
      };
    }) => {
      const studentId = feedback.user?.id;
      if (studentId && studentsMap.has(studentId)) {
        studentsMap.get(studentId)!.feedbackCount += 1;
      }
    }
  );
  reviews.forEach(
    (review: {
      user?: {
        id?: number;
      };
      rating?: number;
    }) => {
      const studentId = review.user?.id;
      if (studentId && studentsMap.has(studentId)) {
        const student = studentsMap.get(studentId)!;
        student.reviewCount += 1;
      }
    }
  );

  // Calculate average rating from reviews
  studentsMap.forEach((student) => {
    const studentReviews = reviews.filter(
      (r: {
        user?: {
          id?: number;
        };
      }) => r.user?.id === student.id
    );
    if (studentReviews.length > 0) {
      const total = studentReviews.reduce(
        (
          sum: number,
          r: {
            rating?: number;
          }
        ) => sum + (r.rating || 0),
        0
      );
      student.avgRating = total / studentReviews.length;
    }
  });
  const students = Array.from(studentsMap.values()).sort((a, b) => {
    const aTimestamp = toTimestamp(treatZuluAsVietnamLocal(a.lastSessionDate)) ?? 0;
    const bTimestamp = toTimestamp(treatZuluAsVietnamLocal(b.lastSessionDate)) ?? 0;
    if (aTimestamp !== bTimestamp) {
      return aTimestamp - bTimestamp;
    }
    return a.id - b.id;
  });
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
        if (!matchesSearch) {
          return false;
        }
        if (studentFilter === "reviewed") {
          return student.reviewCount > 0;
        }
        if (studentFilter === "feedbacked") {
          return student.feedbackCount > 0;
        }
        if (studentFilter === "noReview") {
          return student.reviewCount === 0;
        }
        return true;
      }),
    [searchQuery, studentFilter, students]
  );

  // Apply sorting
  const { sortedData, getSortProps } = useSortable(filteredStudents);

  // Apply pagination
  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_mentor_students_studentslistpage_tsx_pagesize",
    defaultPageSize: 10,
  });
  const pagination = usePagination({
    totalCount: sortedData.length,
    pageSize,
  });

  // Get current page data
  const pageData = useMemo(() => {
    return sortedData.slice(pagination.startIndex, pagination.endIndex + 1);
  }, [sortedData, pagination.startIndex, pagination.endIndex]);
  return (
    <div className="flex flex-col gap-6">
      {/* Header — elevated gradient hero */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-100/80 bg-gradient-to-br from-violet-50/80 via-white to-fuchsia-50/80 p-5 shadow-sm dark:border-violet-900/40 dark:from-violet-950/40 dark:via-slate-900 dark:to-fuchsia-950/40">
        <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-to-br from-violet-300/40 to-fuchsia-300/40 blur-3xl dark:from-violet-700/30 dark:to-fuchsia-700/30" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/30">
              <Users className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t("mentorStudents.student")}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("mentorStudents.listOfStudentsWhoHave")}
              </p>
            </div>
          </div>
          <ReloadButton
            onReload={async () => {
              await Promise.all([refetchSessions(), refetchFeedbacks(), refetchReviews()]);
            }}
            isLoading={sessionsRefetching || feedbacksRefetching || reviewsRefetching}
            tooltip={t("mentorStudents.reloadStudentList")}
          />
        </div>
      </div>

      {/* Stats — elevated with gradients + icon badges + hover lift */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="group relative overflow-hidden rounded-xl border border-violet-100/80 bg-gradient-to-br from-white via-violet-50/40 to-white p-4 transition-all hover:border-violet-200 hover:shadow-md hover:shadow-violet-500/5 dark:border-violet-900/40 dark:from-slate-950/40 dark:via-violet-950/20 dark:to-slate-950/40 dark:hover:border-violet-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              {t("mentorStudents.totalStudents")}
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-sm shadow-violet-500/30 transition-transform group-hover:scale-110">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {students.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("mentorStudents.listOfStudents")}
          </p>
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-violet-500/5 blur-2xl dark:bg-violet-500/10" />
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-sky-100/80 bg-gradient-to-br from-white via-sky-50/40 to-white p-4 transition-all hover:border-sky-200 hover:shadow-md hover:shadow-sky-500/5 dark:border-sky-900/40 dark:from-slate-950/40 dark:via-sky-950/20 dark:to-slate-950/40 dark:hover:border-sky-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              {t("common.totalSession")}
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-sm shadow-sky-500/30 transition-transform group-hover:scale-110">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {mentorSessions.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("mentorOverview.complete")}
          </p>
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-sky-500/5 blur-2xl dark:bg-sky-500/10" />
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/40 to-white p-4 transition-all hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-500/5 dark:border-emerald-900/40 dark:from-slate-950/40 dark:via-emerald-950/20 dark:to-slate-950/40 dark:hover:border-emerald-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              {t("mentorStudents.responseSent")}
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/30 transition-transform group-hover:scale-110">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {feedbacks.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("mentorStudents.responseSent1")}
          </p>
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-emerald-500/5 blur-2xl dark:bg-emerald-500/10" />
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-amber-100/80 bg-gradient-to-br from-white via-amber-50/40 to-white p-4 transition-all hover:border-amber-200 hover:shadow-md hover:shadow-amber-500/5 dark:border-amber-900/40 dark:from-slate-950/40 dark:via-amber-950/20 dark:to-slate-950/40 dark:hover:border-amber-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              {t("mentorStudents.reviewsReceived")}
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/30 transition-transform group-hover:scale-110">
              <Star className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {reviews.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("mentorStudents.reviewSubmitted")}
          </p>
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-amber-500/5 blur-2xl dark:bg-amber-500/10" />
        </div>
      </div>

      {/* Student List */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : students.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t("mentorStudents.noStudentsYet")}
          description={t("common.youHaveNotHadAnyInterviewSessions")}
        />
      ) : (
        <div className="space-y-4 rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/60 p-4 shadow-xs dark:border-slate-800 dark:from-slate-950/40 dark:to-slate-900/30">
          {/* Filters */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  pagination.goToFirstPage();
                }}
                className="border-slate-200 bg-white pl-9 dark:border-slate-700 dark:bg-slate-900"
                placeholder={t("mentorStudents.searchByIdNameEmail")}
              />
            </div>
            <Select
              value={studentFilter}
              onValueChange={(value) => {
                setStudentFilter(value as StudentFilter);
                pagination.goToFirstPage();
              }}>
              <SelectTrigger className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <SelectValue placeholder={t("mentorStudents.filterByInteraction")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("mentorStudents.allStudents")}</SelectItem>
                <SelectItem value="reviewed">{t("mentorStudents.reviewed")}</SelectItem>
                <SelectItem value="feedbacked">{t("mentorStudents.responseSent1")}</SelectItem>
                <SelectItem value="noReview">{t("common.thereAreNoReviewsYet")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-200/80 pt-3 dark:border-slate-700/80">
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
              <Filter className="h-3.5 w-3.5" />
              {t("common.sortBy")}
            </span>
            <SortButton {...getSortProps("sessionCount")}>
              {t("mentorStudents.numberOfSessions")}
            </SortButton>
            <SortButton {...getSortProps("avgRating")}>{t("common.evaluate")}</SortButton>
            <SortButton {...getSortProps("name")}>{t("common.name")}</SortButton>
            {(searchQuery || studentFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStudentFilter("all");
                  pagination.goToFirstPage();
                }}
                className="ml-auto h-7 text-xs">
                {t("common.clearFilter")}
              </Button>
            )}
          </div>

          {pageData.length === 0 ? (
            <EmptyState
              icon={Search}
              title={t("mentorStudents.noSuitableStudentsWereFound")}
              description={t("mentorStudents.tryAnotherKeywordOrChange")}
            />
          ) : (
            <>
              <div className="space-y-2">
                {pageData.map((student) => (
                  <button
                    key={student.id}
                    className="group flex w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200/80 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md hover:shadow-violet-500/5 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-violet-800 dark:hover:shadow-violet-500/10"
                    onClick={() => navigate(`/mentor/students/${student.id}`)}>
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={student.avatarUrl} alt={student.name} />
                        <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {student.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {student.name ||
                            t("common.studentVar0", {
                              var_0: student.id,
                            })}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {student.email || student.university}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-5 text-xs">
                      <div className="text-center">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {t("common.session")}
                        </p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {student.sessionCount}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {t("common.feedback1")}
                        </p>
                        <Badge
                          variant={student.feedbackCount > 0 ? "default" : "secondary"}
                          className="px-1.5 py-0 text-[11px]">
                          {student.feedbackCount}
                        </Badge>
                      </div>
                      <div className="text-center">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {t("common.evaluate")}
                        </p>
                        {student.reviewCount > 0 ? (
                          <div className="flex items-center gap-1">
                            <StarRating value={student.avgRating} readOnly size="sm" />
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              ({student.reviewCount})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Pagination */}
              <PaginationControl
                pagination={pagination}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  pagination.goToFirstPage();
                }}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
