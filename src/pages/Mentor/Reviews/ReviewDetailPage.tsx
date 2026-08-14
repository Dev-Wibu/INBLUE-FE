import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { useMentorReviewById } from "@/hooks/useMentorReview";
import { formatDateTime, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { normalizeFiveStarRating } from "@/lib/rating";
import {
  MentorDetailHeader,
  MentorDetailPage,
  MentorDetailPanel,
  MentorPanelHeading,
} from "@/pages/Mentor/components/MentorDetailLayout";
import { chatManager } from "@/services/chat.manager";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Mail,
  MessageSquare,
  Pencil,
  Star,
  User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";

type DetailItem = {
  label: string;
  value?: string;
};

export function ReviewDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedReturnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  const returnTo =
    typeof requestedReturnTo === "string" &&
    (requestedReturnTo.startsWith("/mentor/") || requestedReturnTo.startsWith("/mentor?"))
      ? requestedReturnTo
      : "/mentor?tab=reviews";
  const hasInternalReturn = Boolean(requestedReturnTo);
  const goBack = () => {
    if (hasInternalReturn) {
      navigate(-1);
      return;
    }
    navigate(returnTo, { replace: true });
  };
  const currentUser = useAuthStore((state) => state.user);
  const { data: review, isLoading } = useMentorReviewById(Number(id));
  const studentId = review?.user?.id || review?.session?.userId || 0;
  const { data: studentInfo } = useQuery({
    queryKey: ["mentor-review-student", studentId],
    queryFn: async () => {
      const response = await chatManager.getUserDetail(studentId);
      return response.success ? response.data : null;
    },
    enabled: !!review && studentId > 0,
    staleTime: 5 * 60 * 1000,
  });

  const studentName =
    review?.user?.name ||
    studentInfo?.name ||
    (studentId ? t("common.studentVar0", { var_0: studentId }) : t("common.students"));
  const studentEmail = review?.user?.email || studentInfo?.email;
  // @ts-expect-error: Backend Swagger schema mismatch - university not in User type
  const studentUniversity = review?.user?.university || studentInfo?.university;
  const studentAvatarUrl = review?.user?.avatarUrl || studentInfo?.avatarUrl;

  const pageShell =
    "-m-4 min-h-[calc(100%+32px)] bg-slate-50 md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)] dark:bg-slate-950";

  if (isLoading) {
    return (
      <div className={pageShell}>
        <div className="border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <Skeleton className="h-9 w-56" />
        </div>
        <div className="space-y-5 p-6 lg:p-8">
          <Skeleton className="h-32" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className={pageShell}>
        <div className="border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" />
            {t("common.backToTheList")}
          </Button>
        </div>
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
          <Star className="h-10 w-10 text-slate-400" />
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            {t("common.noReviewsFound")}
          </h1>
          <p className="text-sm text-slate-500">{t("common.thisReviewDoesNotExistOrHasBeenR")}</p>
        </div>
      </div>
    );
  }

  if (!currentUser?.id || review.session?.userId2 !== currentUser.id) {
    return (
      <div className={pageShell}>
        <div className="border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" />
            {t("common.backToTheList")}
          </Button>
        </div>
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
          <User className="h-10 w-10 text-slate-400" />
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            {t("common.noAccess")}
          </h1>
          <p className="text-sm text-slate-500">{t("common.youCantSeeReviewsThatDontBelong")}</p>
        </div>
      </div>
    );
  }

  const sessionId = review.session?.id;
  const rating = normalizeFiveStarRating(review.rating);
  const reviewedAt = review.session?.endTime1 || review.session?.startTime1;
  const starItems: DetailItem[] = [
    { label: t("mentorReviews.situation"), value: review.situationNote },
    { label: t("mentorReviews.tasks"), value: review.taskNote },
    { label: t("mentorReviews.action"), value: review.actionNote },
    { label: t("mentorReviews.result"), value: review.resultNote },
  ];
  const additionalItems: DetailItem[] = [
    { label: t("common.strengths"), value: review.strength },
    { label: t("common.pointsForImprovement"), value: review.weakness },
    { label: t("common.suggestedImprovements"), value: review.improve },
  ];

  return (
    <MentorDetailPage>
      <MentorDetailHeader
        onBack={goBack}
        backLabel={t("general.back")}
        parentLabel={t("common.reviewAndFeedback")}
        title={`${t("mentorReviews.reviewDetail")} #${review.id}`}
        actions={
          <>
            {sessionId && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-xl"
                onClick={() =>
                  navigate(`/mentor/sessions/${sessionId}`, {
                    state: { returnTo: `/mentor/reviews/${review.id}` },
                  })
                }>
                {t("common.viewSessionDetails")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              className="h-9 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
              disabled={!sessionId}
              onClick={() =>
                sessionId &&
                navigate(`/mentor/sessions/${sessionId}/review/view`, {
                  state: { returnTo: `/mentor/reviews/${review.id}` },
                })
              }>
              <Pencil className="h-4 w-4" />
              {t("common.editReview")}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="min-w-0 space-y-6 lg:col-span-8">
          <MentorDetailPanel>
            <MentorPanelHeading
              icon={<FileText className="h-4 w-4" />}
              title={t("mentorReviews.starMethod")}
              aside={<StarRating value={rating} readOnly size="sm" />}
            />
            <div className="relative space-y-5 p-5 pl-14 before:absolute before:top-8 before:bottom-8 before:left-[31px] before:w-px before:bg-slate-200 before:content-[''] dark:before:bg-slate-700">
              {starItems.map((item, index) => (
                <div
                  key={item.label}
                  className="relative rounded-xl border border-slate-200/90 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-950/40">
                  <span className="absolute top-5 -left-[43px] z-10 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-indigo-600 text-xs font-bold text-white dark:border-slate-900">
                    {"STAR"[index]}
                  </span>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm leading-7 whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                    {item.value || "—"}
                  </p>
                </div>
              ))}
            </div>
          </MentorDetailPanel>

          <MentorDetailPanel>
            <MentorPanelHeading
              icon={<MessageSquare className="h-4 w-4" />}
              title={t("mentorReviews.additionalComments")}
            />
            <dl className="divide-y divide-slate-100 px-5 dark:divide-slate-800">
              {additionalItems.map((item) => (
                <div
                  key={item.label}
                  className="grid gap-2 py-5 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6">
                  <dt className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {item.label}
                  </dt>
                  <dd className="text-sm leading-7 whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                    {item.value || "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </MentorDetailPanel>
        </div>

        <aside className="min-w-0 space-y-6 lg:col-span-4">
          <MentorDetailPanel className="p-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 shrink-0 border border-slate-200 dark:border-slate-700">
                <AvatarImage src={studentAvatarUrl} alt={studentName} />
                <AvatarFallback className="bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {studentName?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-slate-950 dark:text-white">
                  {studentName}
                </h2>
                {studentEmail && (
                  <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500 dark:text-slate-400">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {studentEmail}
                  </p>
                )}
                {studentUniversity && (
                  <p className="mt-1 truncate text-xs text-slate-500">{studentUniversity}</p>
                )}
              </div>
            </div>
          </MentorDetailPanel>

          <MentorDetailPanel className="p-5">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t("mentorReviews.overallAssessment")}
            </p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <p className="text-4xl font-bold text-slate-950 dark:text-white">
                {rating.toFixed(1)}
                <span className="text-base font-medium text-slate-400">/5</span>
              </p>
              <Star className="h-7 w-7 fill-amber-400 text-amber-400" />
            </div>
            <StarRating value={rating} readOnly size="sm" className="mt-4" />
          </MentorDetailPanel>

          <MentorDetailPanel>
            <MentorPanelHeading title={t("common.sessionInformation")} />
            <dl className="divide-y divide-slate-100 px-5 text-sm dark:divide-slate-800">
              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-slate-500">Session</dt>
                <dd className="font-mono font-semibold">#{sessionId || "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <dt className="text-slate-500">{t("common.time")}</dt>
                <dd className="text-right font-semibold">
                  {reviewedAt ? formatDateTime(treatZuluAsVietnamLocal(reviewedAt)) : "—"}
                </dd>
              </div>
            </dl>
          </MentorDetailPanel>
        </aside>
      </div>
    </MentorDetailPage>
  );
}
