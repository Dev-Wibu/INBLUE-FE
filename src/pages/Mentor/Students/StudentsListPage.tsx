/**
 * Mentor Students List Page — Admin UI Pattern
 *
 * Redesigned to match Admin table layout pattern:
 * - Standard Table component (not card-based MentorListRow)
 * - Uniform spacing without negative margins
 * - Consistent button styles
 * - Clean background without gradients
 */

import { ReloadButton, SortButton } from "@/components/shared";
import { PaginationControl } from "@/components/shared/PaginationControl";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { MentorQuickStat } from "@/pages/Mentor/Common";
import { useAuthStore } from "@/stores/authStore";
import { Calendar, MessageSquare, Search, Star, Trophy, Users, Video } from "lucide-react";
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

// ---------- helpers ----------
function fmtDateShort(value?: string): string | null {
  if (!value) return null;
  const ts = toTimestamp(treatZuluAsVietnamLocal(value));
  if (!ts) return null;
  return new Date(ts).toLocaleDateString();
}

function getRatingBadgeClass(rating: number, hasReview: boolean): string {
  if (!hasReview)
    return "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:border-slate-500/35 dark:bg-slate-500/15 dark:text-slate-300";
  if (rating >= 4)
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300";
  if (rating >= 3)
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-300";
  return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-300";
}

// ---------- main ----------
export function StudentsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [searchQuery, setSearchQuery] = useState("");
  const [studentFilter, setStudentFilter] = useState<StudentFilter>("all");

  const {
    data: allSessions = [],
    isLoading: sessionsLoading,
    isRefetching: sessionsRefetching,
    refetch: refetchSessions,
  } = useSessions();
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
      student.avgRating = calculateAverageRating(studentReviews);
    });
    return Array.from(map.values()).sort((a, b) => {
      const aTimestamp = toTimestamp(treatZuluAsVietnamLocal(a.lastSessionDate)) ?? 0;
      const bTimestamp = toTimestamp(treatZuluAsVietnamLocal(b.lastSessionDate)) ?? 0;
      if (aTimestamp !== bTimestamp) return aTimestamp - bTimestamp;
      return a.id - b.id;
    });
  }, [studentsMap, feedbacks, reviews]);

  // Find top performing student
  const topPerformingStudent = useMemo(() => {
    if (students.length === 0) return null;
    return students.reduce(
      (top, student) => {
        if (!top || student.avgRating > top.avgRating) return student;
        return top;
      },
      null as StudentInfo | null
    );
  }, [students]);

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
    <div className="flex flex-col bg-slate-50 p-4 md:p-6 lg:p-8 dark:bg-slate-950">
      {/* Header Card - Admin Pattern */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/15">
              <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-[-0.02em] text-slate-900 dark:text-white">
                {t("mentorStudents.student")}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("mentorStudents.listOfStudentsWhoHave")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {/* Quick stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {mentorSessions.length}
                </span>
                <span className="text-xs text-slate-500">{t("common.totalSession")}</span>
              </div>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {reviews.length}
                </span>
                <span className="text-xs text-slate-500">
                  {t("mentorStudents.reviewsReceived")}
                </span>
              </div>
            </div>
            <ReloadButton
              onReload={async () => {
                await Promise.all([refetchSessions(), refetchFeedbacks(), refetchReviews()]);
              }}
              isLoading={isReloading}
              tooltip={t("mentorStudents.reloadStudentList")}
              className="h-9 w-9"
            />
          </div>
        </div>

        {/* Search and Filter Row */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder={t("mentorStudents.searchByIdNameEmail")}
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                pagination.goToFirstPage();
              }}
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-11 text-sm focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <Select
            value={studentFilter}
            onValueChange={(value) => {
              setStudentFilter(value as StudentFilter);
              pagination.goToFirstPage();
            }}>
            <SelectTrigger className="h-10 w-[180px] rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
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

        {/* Filter Pills */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
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
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                studentFilter === value
                  ? "border-indigo-500 bg-indigo-500 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              )}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-start">
        {/* Left - Table */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {isLoading ? (
            <div className="p-4">
              <Skeleton className="h-12" />
              <Skeleton className="mt-2 h-12" />
              <Skeleton className="mt-2 h-12" />
            </div>
          ) : students.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <Search className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-500">
                {t("mentorStudents.noStudentsYet")}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900">
                      <TableHead className="min-w-[200px] pl-5 font-semibold text-slate-700 dark:text-slate-200">
                        <SortButton {...getSortProps("name")}>{t("common.name")}</SortButton>
                      </TableHead>
                      <TableHead className="min-w-[200px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                        {t("common.email")}
                      </TableHead>
                      <TableHead className="w-[120px] min-w-[120px] px-5 text-center font-semibold text-slate-700 dark:text-slate-200">
                        <SortButton {...getSortProps("sessionCount")}>
                          {t("common.session")}
                        </SortButton>
                      </TableHead>
                      <TableHead className="w-[100px] min-w-[100px] px-5 text-center font-semibold text-slate-700 dark:text-slate-200">
                        {t("common.feedback1")}
                      </TableHead>
                      <TableHead className="w-[140px] min-w-[140px] px-5 text-center font-semibold text-slate-700 dark:text-slate-200">
                        <SortButton {...getSortProps("avgRating")}>
                          {t("common.evaluate")}
                        </SortButton>
                      </TableHead>
                      <TableHead className="w-[150px] min-w-[150px] px-5 font-semibold text-slate-700 dark:text-slate-200">
                        {t("common.lastSession")}
                      </TableHead>
                      <TableHead className="w-[100px] min-w-[100px] pr-5 text-center font-semibold text-slate-700 dark:text-slate-200">
                        {t("common.status")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-48 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Search className="h-6 w-6 text-slate-400" />
                            <p className="text-sm text-slate-500">
                              {t("mentorStudents.noSuitableStudentsWereFound")}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      pageData.map((student) => (
                        <TableRow
                          key={student.id}
                          onClick={() => navigate(`/mentor/students/${student.id}`)}
                          className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-900 dark:hover:bg-slate-800/80">
                          <TableCell className="py-3.5 pl-5">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 shrink-0 rounded-lg border border-slate-100 dark:border-slate-800">
                                <AvatarImage src={student.avatarUrl} alt={student.name} />
                                <AvatarFallback className="rounded-lg bg-indigo-50 text-xs font-semibold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                                  {student.name?.charAt(0)?.toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                  {student.name || t("common.studentVar0", { var_0: student.id })}
                                </p>
                                {student.university && (
                                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                    {student.university}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                            {student.email || "—"}
                          </TableCell>
                          <TableCell className="px-5 py-3.5 text-center">
                            <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {student.sessionCount}
                            </span>
                          </TableCell>
                          <TableCell className="px-5 py-3.5 text-center">
                            <span
                              className={cn(
                                "inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold",
                                student.feedbackCount > 0
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                              )}>
                              {student.feedbackCount}
                            </span>
                          </TableCell>
                          <TableCell className="px-5 py-3.5 text-center">
                            {student.reviewCount > 0 ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1">
                                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                    {student.avgRating.toFixed(1)}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                            {student.lastSessionDate ? (
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                {fmtDateShort(student.lastSessionDate)}
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="px-5 py-3.5 text-center">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                                getRatingBadgeClass(student.avgRating, student.reviewCount > 0)
                              )}>
                              {student.reviewCount > 0 ? (
                                <>
                                  <span className="relative flex h-1.5 w-1.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  </span>
                                  {t("common.reviewed")}
                                </>
                              ) : (
                                <>
                                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                  {t("common.noReview")}
                                </>
                              )}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {sortedData.length > 0 && (
                <div className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-3 dark:border-t-slate-800 dark:bg-slate-900">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t("common.showing", {
                      start: pagination.startIndex + 1,
                      end: Math.min(pagination.endIndex + 1, sortedData.length),
                      total: sortedData.length,
                    })}
                  </p>
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
            </>
          )}
        </div>

        {/* Right side cards - Stats */}
        <aside className="hidden lg:flex lg:flex-col lg:gap-4 xl:sticky xl:top-4 xl:self-start">
          {/* Total Students card with top 5 list */}
          <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
                  {t("mentorStudents.totalStudents")}
                </p>
                <p className="mt-0.5 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-[-0.04em] text-slate-900 dark:text-white">
                    {isLoading ? "—" : students.length}
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
                        <AvatarImage src={student.avatarUrl} alt={student.name} />
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
          {topPerformingStudent && (
            <div className="rounded-[20px] border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm dark:border-amber-900/30 dark:from-amber-950/20 dark:to-slate-950 dark:shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300">
                  <Trophy className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold tracking-[0.06em] text-amber-700 uppercase dark:text-amber-300">
                    {t("mentorOverview.topPerformer")}
                  </p>
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {topPerformingStudent.name ||
                      t("common.studentVar0", { var_0: topPerformingStudent.id })}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-amber-200 pt-3 dark:border-amber-900/30">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
                    {t("common.averageStarRating")}
                  </p>
                  <p className="text-xl font-bold tracking-[-0.04em] text-slate-900 dark:text-slate-100">
                    {topPerformingStudent.avgRating.toFixed(1)}
                    <span className="ml-0.5 text-xs font-medium text-slate-400">/5</span>
                  </p>
                </div>
                <StarRating value={topPerformingStudent.avgRating} readOnly size="sm" />
              </div>
            </div>
          )}

          {/* 3 quick stats grid */}
          <div className="grid grid-cols-3 gap-2.5">
            <MentorQuickStat
              index={1}
              icon={Calendar}
              label={t("common.totalSession")}
              value={isLoading ? "—" : mentorSessions.length}
              caption={t("mentorOverview.complete")}
              tone="indigo"
            />
            <MentorQuickStat
              index={2}
              icon={MessageSquare}
              label={t("mentorStudents.responseSent")}
              value={isLoading ? "—" : feedbacks.length}
              caption={t("mentorStudents.responseSent1")}
              tone="emerald"
            />
            <MentorQuickStat
              index={3}
              icon={Star}
              label={t("mentorStudents.reviewsReceived")}
              value={isLoading ? "—" : reviews.length}
              caption={t("mentorStudents.reviewSubmitted")}
              tone="amber"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
