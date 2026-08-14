import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { useMentorReviewById } from "@/hooks/useMentorReview";
import { formatDateTime, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { chatManager } from "@/services/chat.manager";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, ChevronRight, Mail, Pencil, Star, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";

type DetailItem = {
  label: string;
  value?: string;
};

function DetailSection({ title, items }: { title: string; items: DetailItem[] }) {
  return (
    <section className="border-b border-slate-200 py-6 last:border-b-0 dark:border-slate-800">
      <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
      <dl className="grid gap-x-8 gap-y-0 md:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="grid gap-2 border-t border-slate-100 py-4 sm:grid-cols-[150px_minmax(0,1fr)] dark:border-slate-800/80">
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</dt>
            <dd className="text-sm leading-6 whitespace-pre-wrap text-slate-700 dark:text-slate-200">
              {item.value || "—"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

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
  const rating = review.rating || 0;
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
    <div className={pageShell}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={goBack}
            title={t("common.backToTheList")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("common.reviewAndFeedback")} · #{review.id}
            </p>
            <h1 className="truncate text-lg font-bold text-slate-900 dark:text-white">
              {t("mentorReviews.reviewDetail")}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {sessionId && (
            <Button
              variant="outline"
              size="sm"
              className="h-9"
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
            className="h-9 bg-indigo-600 text-white hover:bg-indigo-700"
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
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 dark:border-slate-700">
              <AvatarImage src={studentAvatarUrl} alt={studentName} />
              <AvatarFallback className="rounded-lg bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {studentName?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-slate-900 dark:text-white">
                {studentName}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                {studentEmail && (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {studentEmail}
                  </span>
                )}
                {studentUniversity && <span>{studentUniversity}</span>}
                {sessionId && <span>Session #{sessionId}</span>}
                {reviewedAt && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {formatDateTime(treatZuluAsVietnamLocal(reviewedAt))}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4 border-t border-slate-200 pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6 dark:border-slate-700">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t("common.overallAssessment")}
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {rating.toFixed(1)}
                <span className="text-sm font-medium text-slate-400">/5</span>
              </p>
            </div>
            <StarRating value={rating} readOnly size="sm" />
          </div>
        </div>
      </section>

      <main className="px-4 sm:px-6 lg:px-8">
        <DetailSection title={t("mentorReviews.starMethod")} items={starItems} />
        <DetailSection title={t("mentorReviews.additionalComments")} items={additionalItems} />
      </main>
    </div>
  );
}
