import { MentorScoreDisplay } from "@/components/review/MentorScoreDisplay";
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
import { calculateAverageMentorScore, useMentorReviewsByMentor } from "@/hooks/useMentorReview";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSessions } from "@/hooks/useSession";
import { useSortable } from "@/hooks/useSortable";
import { useUserProfilesByIds } from "@/hooks/useUserProfilesByIds";
import type { Session } from "@/interfaces";
import { formatDate, toTimestamp, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { filterSessionsForMentor } from "@/lib/session-mentor";
import { Check, Search, Users } from "lucide-react";
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
  avgScore: number;
  lastSessionDate?: string;
}

type StudentFilter = "all" | "reviewed" | "feedbacked" | "noReview";

function getScoreBadgeClass(score: number, hasReview: boolean): string {
  if (!hasReview) {
    return "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:border-slate-500/35 dark:bg-slate-500/15 dark:text-slate-300";
  }
  if (score >= 75) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300";
  }
  if (score >= 60) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-300";
  }
  return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-300";
}

export function StudentsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
  } = useMentorReviewsByMentor(mentorId);
  const mentorSessions = useMemo(
    () => filterSessionsForMentor(allSessions, mentorId),
    [allSessions, mentorId]
  );
  const {
    profilesById,
    isRefetching: profilesRefetching,
    refetch: refetchProfiles,
  } = useUserProfilesByIds(mentorSessions.map((session) => session.userId));
  const isLoading = sessionsLoading || feedbacksLoading || reviewsLoading;
  const isReloading =
    sessionsRefetching || feedbacksRefetching || reviewsRefetching || profilesRefetching;

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
        const userProfile = profilesById.get(studentId);
        map.set(studentId, {
          id: studentId,
          name: userInfo?.name || userProfile?.name,
          email: userInfo?.email || userProfile?.email,
          avatarUrl: userInfo?.avatarUrl || userProfile?.avatarUrl,
          university:
            (userInfo as { university?: string } | null)?.university ||
            (userProfile as { university?: string } | undefined)?.university,
          sessionCount: 0,
          feedbackCount: 0,
          reviewCount: 0,
          avgScore: 0,
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
  }, [mentorSessions, feedbacks, reviews, profilesById]);

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
      student.avgScore = calculateAverageMentorScore(studentReviews);
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

  const reviewedStudentCount = students.filter((student) => student.reviewCount > 0).length;
  const totalSessionCount = students.reduce((total, student) => total + student.sessionCount, 0);

  return (
    <div className="-m-4 flex min-h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)] dark:bg-slate-950">
      <div className="flex flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <SpinnerBlock size="lg" label={t("common.loading")} />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-auto p-5 duration-300 sm:p-6 md:px-8">
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
                    [students.length, t("mentorStudents.allStudents")],
                    [totalSessionCount, t("common.session")],
                    [reviewedStudentCount, t("common.reviewed")],
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
                    className="h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 pl-11 text-[14.5px] shadow-2xs focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-[46px] shrink-0 rounded-xl border border-slate-200/90 bg-white px-6 font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                  <Search className="mr-2 h-[18px] w-[18px]" />
                  {t("common.search")}
                </Button>
                <Select
                  value={studentFilter}
                  onValueChange={(value) => {
                    setStudentFilter(value as StudentFilter);
                    pagination.goToFirstPage();
                  }}>
                  <SelectTrigger className="h-[46px] w-full rounded-xl border-slate-200/90 bg-white px-4 text-sm font-semibold shadow-2xs sm:w-48 dark:border-slate-800 dark:bg-slate-900">
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
                    await Promise.all([
                      refetchSessions(),
                      refetchFeedbacks(),
                      refetchReviews(),
                      refetchProfiles(),
                    ]);
                  }}
                  isLoading={isReloading}
                  tooltip={t("mentorStudents.reloadStudentList")}
                  className="h-[46px] w-[46px] rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                />
              </form>

              {(searchQuery || studentFilter !== "all") && (
                <div className="mt-3 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    {t("common.clearFilter")}
                  </Button>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {pageData.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
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
                <div className="min-w-[1240px] overflow-x-auto">
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900">
                        <TableHead className="w-[6%] pl-6 font-semibold text-slate-700 dark:text-slate-200">
                          {t("common.id")}
                        </TableHead>
                        <TableHead className="w-[27%] px-5 font-semibold text-slate-700 dark:text-slate-200">
                          <SortButton {...getSortProps("name")}>{t("common.candidate")}</SortButton>
                        </TableHead>
                        <TableHead className="w-[9%] px-5 text-center font-semibold text-slate-700 dark:text-slate-200">
                          <SortButton {...getSortProps("sessionCount")}>
                            {t("common.session")}
                          </SortButton>
                        </TableHead>
                        <TableHead className="w-[9%] px-5 text-center font-semibold text-slate-700 dark:text-slate-200">
                          {t("common.feedback1")}
                        </TableHead>
                        <TableHead className="w-[9%] px-5 text-center font-semibold text-slate-700 dark:text-slate-200">
                          {t("common.review")}
                        </TableHead>
                        <TableHead className="w-[11%] px-5 font-semibold text-slate-700 dark:text-slate-200">
                          <SortButton {...getSortProps("avgScore")}>
                            {t("common.evaluate")}
                          </SortButton>
                        </TableHead>
                        <TableHead className="w-[15%] px-5 font-semibold text-slate-700 dark:text-slate-200">
                          {t("common.lastSession")}
                        </TableHead>
                        <TableHead className="w-[14%] pr-6 text-center font-semibold text-slate-700 dark:text-slate-200">
                          {t("common.status")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageData.map((student) => (
                        <TableRow
                          key={student.id}
                          onClick={() =>
                            navigate(`/mentor/students/${student.id}`, {
                              state: { returnTo: "/mentor?tab=students" },
                            })
                          }
                          className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-900 dark:hover:bg-slate-800/80">
                          <TableCell className="py-4 pl-6 font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">
                            #{student.id}
                          </TableCell>
                          <TableCell className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 shrink-0 rounded-[14px] border border-slate-200/90 shadow-2xs dark:border-slate-800/80">
                                <AvatarImage
                                  src={student.avatarUrl}
                                  alt={student.name}
                                  className="object-cover"
                                />
                                <AvatarFallback className="rounded-[14px] bg-sky-50 font-semibold text-sky-700 dark:bg-sky-950/80 dark:text-sky-300">
                                  {student.name?.charAt(0)?.toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="max-w-[260px] truncate font-semibold text-slate-900 dark:text-white">
                                  {student.name || t("common.studentVar0", { var_0: student.id })}
                                </p>
                                <p className="max-w-[260px] truncate text-xs text-slate-500 dark:text-slate-400">
                                  {student.email || student.university || "—"}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-center">
                            <Badge
                              variant="outline"
                              className="min-w-9 justify-center font-mono text-xs font-semibold">
                              {student.sessionCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-center">
                            <Badge
                              variant="outline"
                              className="min-w-9 justify-center font-mono text-xs font-semibold">
                              {student.feedbackCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-center">
                            <Badge
                              variant="outline"
                              className="min-w-9 justify-center font-mono text-xs font-semibold">
                              {student.reviewCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-5 py-4">
                            {student.reviewCount > 0 ? (
                              <MentorScoreDisplay value={student.avgScore} />
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="px-5 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                            {student.lastSessionDate
                              ? formatDate(treatZuluAsVietnamLocal(student.lastSessionDate))
                              : "—"}
                          </TableCell>
                          <TableCell className="py-4 pr-6 text-center">
                            <Badge
                              variant="outline"
                              className={`min-w-[96px] justify-center px-2.5 ${getScoreBadgeClass(
                                student.avgScore,
                                student.reviewCount > 0
                              )}`}>
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
              {sortedData.length > 0 && (
                <div className="flex flex-none items-center justify-end border-t border-slate-200/80 bg-white px-4 py-3 sm:px-6 dark:border-t-slate-800 dark:bg-slate-900">
                  <PaginationControl
                    pagination={pagination}
                    showBoundaryButtons={false}
                    showPageJump={false}
                    onPageSizeChange={(size) => {
                      setPageSize(size);
                      pagination.goToFirstPage();
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
