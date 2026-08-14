import { PaginationControl, ReloadButton, SortButton } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SpinnerBlock } from "@/components/ui/spinner";
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
import { formatDate, toTimestamp, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { isSessionMentor } from "@/lib/session-mentor";
import { useAuthStore } from "@/stores/authStore";
import { Check, Search, Star, Users } from "lucide-react";
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

function getRatingBadgeClass(rating: number, hasReview: boolean): string {
  if (!hasReview) {
    return "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:border-slate-500/35 dark:bg-slate-500/15 dark:text-slate-300";
  }
  if (rating >= 4) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300";
  }
  if (rating >= 3) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-300";
  }
  return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-300";
}

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

  const studentsMap = useMemo(() => {
    const map = new Map<number, StudentInfo>();
    mentorSessions.forEach((session: Session) => {
      const studentId = session.userId;
      if (!studentId) return;
      if (!map.has(studentId)) {
        const userFeedback = feedbacks.find(
          (feedback: { user?: { id?: number } }) => feedback.user?.id === studentId
        );
        const userReview = reviews.find(
          (review: { user?: { id?: number } }) => review.user?.id === studentId
        );
        const userInfo = userFeedback?.user || userReview?.user || null;
        map.set(studentId, {
          id: studentId,
          name: userInfo?.name,
          email: userInfo?.email,
          avatarUrl: userInfo?.avatarUrl,
          university: (userInfo as { university?: string } | null)?.university,
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
        map.get(studentId)!.reviewCount += 1;
      }
    });
    map.forEach((student) => {
      const studentReviews = reviews.filter(
        (review: { user?: { id?: number } }) => review.user?.id === student.id
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
  const pageData = useMemo(
    () => sortedData.slice(pagination.startIndex, pagination.endIndex + 1),
    [sortedData, pagination.startIndex, pagination.endIndex]
  );

  const clearFilters = () => {
    setSearchQuery("");
    setStudentFilter("all");
    pagination.goToFirstPage();
  };

  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      <div className="flex flex-none flex-col gap-4 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("mentorStudents.student")}
          </h1>
          <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
            {t("mentorStudents.listOfStudentsWhoHave")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1 sm:w-64 sm:flex-none">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              placeholder={t("mentorStudents.searchByIdNameEmail")}
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                pagination.goToFirstPage();
              }}
              className="h-8 border-slate-200 pl-9 text-xs focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-700"
            />
          </div>

          <Select
            value={studentFilter}
            onValueChange={(value) => {
              setStudentFilter(value as StudentFilter);
              pagination.goToFirstPage();
            }}>
            <SelectTrigger className="h-8 w-40 border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 dark:border-slate-700">
              <SelectValue placeholder={t("mentorStudents.filterByInteraction")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("mentorStudents.allStudents")}</SelectItem>
              <SelectItem value="reviewed">{t("mentorStudents.reviewed")}</SelectItem>
              <SelectItem value="feedbacked">{t("mentorStudents.responseSent1")}</SelectItem>
              <SelectItem value="noReview">{t("common.thereAreNoReviewsYet")}</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || studentFilter !== "all") && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="h-8 px-2 text-xs text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30">
              {t("common.clearFilter")}
            </Button>
          )}

          <div className="hidden h-4 w-px bg-slate-200 sm:block dark:bg-slate-700" />
          <ReloadButton
            onReload={async () => {
              await Promise.all([refetchSessions(), refetchFeedbacks(), refetchReviews()]);
            }}
            isLoading={isReloading}
            tooltip={t("mentorStudents.reloadStudentList")}
            className="h-8 w-8"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <SpinnerBlock size="lg" label={t("common.loading")} />
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-auto border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              {pageData.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-4 border-y border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    {students.length === 0 ? (
                      <Users className="h-6 w-6 text-slate-400" />
                    ) : (
                      <Search className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {students.length === 0
                      ? t("mentorStudents.noStudentsYet")
                      : t("mentorStudents.noSuitableStudentsWereFound")}
                  </p>
                  {(searchQuery || studentFilter !== "all") && (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      {t("common.clearFilter")}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="min-w-[1080px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                        <TableHead className="w-[80px] pl-6 font-medium text-slate-500">
                          {t("common.id")}
                        </TableHead>
                        <TableHead className="min-w-[220px] font-medium text-slate-500">
                          <SortButton {...getSortProps("name")}>{t("common.name")}</SortButton>
                        </TableHead>
                        <TableHead className="min-w-[220px] font-medium text-slate-500">
                          {t("common.email")}
                        </TableHead>
                        <TableHead className="w-[110px] text-center font-medium text-slate-500">
                          <SortButton {...getSortProps("sessionCount")}>
                            {t("common.session")}
                          </SortButton>
                        </TableHead>
                        <TableHead className="w-[120px] text-center font-medium text-slate-500">
                          {t("common.feedback1")}
                        </TableHead>
                        <TableHead className="w-[150px] text-center font-medium text-slate-500">
                          <SortButton {...getSortProps("avgRating")}>
                            {t("common.evaluate")}
                          </SortButton>
                        </TableHead>
                        <TableHead className="w-[150px] font-medium text-slate-500">
                          {t("common.lastSession")}
                        </TableHead>
                        <TableHead className="w-[130px] pr-6 text-center font-medium text-slate-500">
                          {t("common.status")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageData.map((student) => (
                        <TableRow
                          key={student.id}
                          onClick={() => navigate(`/mentor/students/${student.id}`)}
                          className="group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80">
                          <TableCell className="pl-6 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                            #{student.id}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 shrink-0 rounded-lg border border-slate-100 dark:border-slate-800">
                                <AvatarImage src={student.avatarUrl} alt={student.name} />
                                <AvatarFallback className="rounded-lg bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                  {student.name?.charAt(0)?.toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="max-w-[240px] truncate font-semibold text-slate-900 dark:text-white">
                                  {student.name || t("common.studentVar0", { var_0: student.id })}
                                </p>
                                {student.university && (
                                  <p className="max-w-[240px] truncate text-xs text-slate-500 dark:text-slate-400">
                                    {student.university}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                            {student.email || "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="font-mono">
                              {student.sessionCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={
                                student.feedbackCount > 0
                                  ? "border-sky-500/30 bg-sky-500/10 font-mono text-sky-700 dark:text-sky-300"
                                  : "font-mono text-slate-500"
                              }>
                              {student.feedbackCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {student.reviewCount > 0 ? (
                              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-700 dark:text-amber-400">
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                {student.avgRating.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-300">
                            {student.lastSessionDate
                              ? formatDate(treatZuluAsVietnamLocal(student.lastSessionDate))
                              : "—"}
                          </TableCell>
                          <TableCell className="pr-6 text-center">
                            <Badge
                              variant="outline"
                              className={getRatingBadgeClass(
                                student.avgRating,
                                student.reviewCount > 0
                              )}>
                              {student.reviewCount > 0 && <Check className="h-3 w-3" />}
                              {student.reviewCount > 0
                                ? t("common.reviewed")
                                : t("common.noReview")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {sortedData.length > 0 && (
              <div className="flex flex-none items-center justify-end border-t border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
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
      </div>
    </div>
  );
}
