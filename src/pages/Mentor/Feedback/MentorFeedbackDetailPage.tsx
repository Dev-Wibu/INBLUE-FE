import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { useUserById } from "@/hooks/useApplication";
import { useMentorById } from "@/hooks/useMentor";
import { useMentorFeedbackById } from "@/hooks/useMentorFeedback";
import { formatDateTime, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { useAuthStore } from "@/stores/authStore";
import { ArrowLeft, Building2, CalendarClock, ChevronRight, Inbox, Mail, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";

export function MentorFeedbackDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedReturnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  const returnTo =
    typeof requestedReturnTo === "string" && requestedReturnTo.startsWith("/mentor/")
      ? requestedReturnTo
      : "/mentor?tab=reviews";
  const currentUser = useAuthStore((state) => state.user);

  const { data: feedback, isLoading } = useMentorFeedbackById(Number(id));
  const studentId = feedback?.user?.id ?? feedback?.session?.userId;
  const mentorId = feedback?.mentor?.id ?? feedback?.session?.userId2;
  const { data: studentInfo } = useUserById(typeof studentId === "number" ? studentId : 0);
  const { data: mentorInfo } = useMentorById(typeof mentorId === "number" ? mentorId : 0);
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
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className={pageShell}>
        <div className="border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <Button variant="ghost" size="sm" onClick={() => navigate(returnTo)}>
            <ArrowLeft className="h-4 w-4" />
            {t("common.backToTheList")}
          </Button>
        </div>
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
          <Inbox className="h-10 w-10 text-slate-400" />
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            {t("common.noResponseFound")}
          </h1>
          <p className="text-sm text-slate-500">{t("common.thisFeedbackDoesNotExistOrHasBeenR")}</p>
        </div>
      </div>
    );
  }

  const isOwner =
    !currentUser?.id ||
    (mentorId && currentUser.id === mentorId) ||
    (feedback.mentor?.id != null && currentUser.id === feedback.mentor.id);
  if (!isOwner) {
    return (
      <div className={pageShell}>
        <div className="border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <Button variant="ghost" size="sm" onClick={() => navigate(returnTo)}>
            <ArrowLeft className="h-4 w-4" />
            {t("common.backToTheList")}
          </Button>
        </div>
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
          <User className="h-10 w-10 text-slate-400" />
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            {t("common.noAccess")}
          </h1>
          <p className="text-sm text-slate-500">{t("common.youCantSeeFeedbackThatDoesntBelong")}</p>
        </div>
      </div>
    );
  }

  const rating = feedback.rating || 0;
  const studentName =
    feedback.user?.name ||
    studentInfo?.name ||
    (studentId ? t("common.studentVar0", { var_0: studentId }) : t("common.students"));
  const studentEmail = feedback.user?.email || studentInfo?.email;
  const studentAvatarUrl = feedback.user?.avatarUrl || studentInfo?.avatarUrl;
  const mentorName = feedback.mentor?.name || mentorInfo?.name || currentUser?.name || "—";
  const mentorCompany = feedback.mentor?.currentCompany || mentorInfo?.currentCompany;
  const sessionId = feedback.session?.id;
  const receivedAt = feedback.updatedAt || feedback.createdAt || feedback.session?.endTime1;

  const sessionDetails = [
    { label: t("common.roomName"), value: feedback.session?.roomName },
    {
      label: t("common.startTime"),
      value: feedback.session?.startTime1
        ? formatDateTime(treatZuluAsVietnamLocal(feedback.session.startTime1))
        : undefined,
    },
    {
      label: t("common.endTime"),
      value: feedback.session?.endTime1
        ? formatDateTime(treatZuluAsVietnamLocal(feedback.session.endTime1))
        : undefined,
    },
    { label: t("common.status"), value: feedback.session?.status },
  ];

  return (
    <div className={pageShell}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => navigate(returnTo)}
            title={t("common.backToTheList")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("common.reviewAndFeedback")} · #{feedback.id}
            </p>
            <h1 className="truncate text-lg font-bold text-slate-900 dark:text-white">
              {t("common.feedbackDetails")}
            </h1>
          </div>
        </div>

        {sessionId && (
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => navigate(`/mentor/sessions/${sessionId}`, { state: { returnTo } })}>
            {t("common.viewSessionDetails")}
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </header>

      <section className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 dark:border-slate-700">
              <AvatarImage src={studentAvatarUrl} alt={studentName} />
              <AvatarFallback className="rounded-lg bg-sky-50 font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
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
                {sessionId && <span>Session #{sessionId}</span>}
                {receivedAt && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {formatDateTime(treatZuluAsVietnamLocal(receivedAt))}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4 border-t border-slate-200 pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6 dark:border-slate-700">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t("common.responseReceived")}
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {rating.toFixed(1)}
                <span className="text-sm font-medium text-slate-400">/5</span>
              </p>
            </div>
            <StarRating value={rating} readOnly size="sm" color="sky" />
          </div>
        </div>
      </section>

      <main className="px-4 sm:px-6 lg:px-8">
        <section className="border-b border-slate-200 py-6 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("common.feedback")}
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 whitespace-pre-wrap text-slate-700 dark:text-slate-200">
            {feedback.comment || t("mentorFeedback.studentsHaveNotLeftDetailed")}
          </p>
        </section>

        <section className="border-b border-slate-200 py-6 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("common.sessionInformation")}
          </h2>
          <dl className="mt-4 grid gap-x-8 md:grid-cols-2">
            {sessionDetails.map((item) => (
              <div
                key={item.label}
                className="grid gap-2 border-t border-slate-100 py-4 sm:grid-cols-[140px_minmax(0,1fr)] dark:border-slate-800/80">
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {item.label}
                </dt>
                <dd className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {item.value || "—"}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="py-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("common.mentor")}
          </h2>
          <div className="mt-4 flex items-center gap-3">
            <Avatar className="h-10 w-10 rounded-lg border border-slate-200 dark:border-slate-700">
              <AvatarImage
                src={feedback.mentor?.avatarUrl || mentorInfo?.avatarUrl}
                alt={mentorName}
              />
              <AvatarFallback className="rounded-lg bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {mentorName.charAt(0).toUpperCase() || "M"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{mentorName}</p>
              {mentorCompany && (
                <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Building2 className="h-3.5 w-3.5" />
                  {mentorCompany}
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
