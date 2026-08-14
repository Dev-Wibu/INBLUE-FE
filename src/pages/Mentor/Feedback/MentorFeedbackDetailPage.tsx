import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { useUserById } from "@/hooks/useApplication";
import { useMentorById } from "@/hooks/useMentor";
import { useMentorFeedbackById } from "@/hooks/useMentorFeedback";
import { formatDateTime, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { normalizeFiveStarRating } from "@/lib/rating";
import {
  MentorDetailHeader,
  MentorDetailPage,
  MentorDetailPanel,
  MentorPanelHeading,
} from "@/pages/Mentor/components/MentorDetailLayout";
import { useAuthStore } from "@/stores/authStore";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  ChevronRight,
  FileText,
  Inbox,
  Mail,
  MessageSquare,
  User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";

export function MentorFeedbackDetailPage() {
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
          <Button variant="ghost" size="sm" onClick={goBack}>
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
          <p className="text-sm text-slate-500">{t("common.youCantSeeFeedbackThatDoesntBelong")}</p>
        </div>
      </div>
    );
  }

  const rating = normalizeFiveStarRating(feedback.rating);
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
    <MentorDetailPage>
      <MentorDetailHeader
        onBack={goBack}
        backLabel={t("general.back")}
        parentLabel={t("common.reviewAndFeedback")}
        title={`${t("common.feedbackDetails")} #${feedback.id}`}
        actions={
          sessionId ? (
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-xl"
              onClick={() =>
                navigate(`/mentor/sessions/${sessionId}`, {
                  state: { returnTo: `/mentor/feedback/${feedback.id}` },
                })
              }>
              {t("common.viewSessionDetails")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="min-w-0 space-y-6 lg:col-span-8">
          <MentorDetailPanel>
            <MentorPanelHeading
              icon={<MessageSquare className="h-4 w-4" />}
              title={t("mentorSessions.candidateFeedback")}
              aside={<StarRating value={rating} readOnly size="sm" color="sky" />}
            />
            <p className="min-h-40 p-6 text-sm leading-8 whitespace-pre-wrap text-slate-700 dark:text-slate-200">
              {feedback.comment || t("mentorFeedback.studentsHaveNotLeftDetailed")}
            </p>
          </MentorDetailPanel>

          <MentorDetailPanel>
            <MentorPanelHeading
              icon={<FileText className="h-4 w-4" />}
              title={t("common.sessionInformation")}
            />
            <dl className="grid divide-y divide-slate-100 px-5 md:grid-cols-2 md:divide-y-0 dark:divide-slate-800">
              {sessionDetails.map((item) => (
                <div
                  key={item.label}
                  className="border-b border-slate-100 py-5 md:odd:pr-6 md:even:pl-6 dark:border-slate-800">
                  <dt className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {item.label}
                  </dt>
                  <dd className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
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
                <AvatarFallback className="bg-sky-50 font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
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
                {receivedAt && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {formatDateTime(treatZuluAsVietnamLocal(receivedAt))}
                  </p>
                )}
              </div>
            </div>
          </MentorDetailPanel>

          <MentorDetailPanel className="p-5">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t("common.responseReceived")}
            </p>
            <p className="mt-3 text-4xl font-bold text-slate-950 dark:text-white">
              {rating.toFixed(1)}
              <span className="text-base font-medium text-slate-400">/5</span>
            </p>
            <StarRating value={rating} readOnly size="sm" color="sky" className="mt-4" />
          </MentorDetailPanel>

          <MentorDetailPanel>
            <MentorPanelHeading title={t("common.mentor")} />
            <div className="flex items-center gap-3 p-5">
              <Avatar className="h-11 w-11 border border-slate-200 dark:border-slate-700">
                <AvatarImage
                  src={feedback.mentor?.avatarUrl || mentorInfo?.avatarUrl}
                  alt={mentorName}
                />
                <AvatarFallback className="bg-emerald-50 font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  {mentorName.charAt(0).toUpperCase() || "M"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-950 dark:text-white">
                  {mentorName}
                </p>
                {mentorCompany && (
                  <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500 dark:text-slate-400">
                    <Building2 className="h-3.5 w-3.5" />
                    {mentorCompany}
                  </p>
                )}
              </div>
            </div>
          </MentorDetailPanel>
        </aside>
      </div>
    </MentorDetailPage>
  );
}
