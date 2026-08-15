import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserById } from "@/hooks/useApplication";
import { useMentorFeedbackBySession } from "@/hooks/useMentorFeedback";
import { useMentorReviewById } from "@/hooks/useMentorReview";
import { isSessionMentor } from "@/lib/session-mentor";
import { MentorDetailHeader, MentorDetailPage } from "@/pages/Mentor/components/MentorDetailLayout";
import { MentorReviewReport } from "@/pages/Mentor/components/MentorReviewReport";
import { useAuthStore } from "@/stores/authStore";
import { Pencil, Star, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";

export function ReviewDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useAuthStore((state) => state.user);
  const requestedReturnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  const hasInternalReturn = Boolean(requestedReturnTo);
  const { data: review, isLoading } = useMentorReviewById(Number(id));
  const sessionId = review?.session?.id ?? 0;
  const studentId = review?.user?.id || review?.session?.userId || 0;
  const { data: studentProfile } = useUserById(studentId);
  const { data: candidateFeedback } = useMentorFeedbackBySession(sessionId);

  const goBack = () => {
    if (hasInternalReturn) {
      navigate(-1);
      return;
    }
    navigate("/mentor?tab=reviews", { replace: true });
  };

  if (isLoading) {
    return (
      <MentorDetailPage>
        <Skeleton className="h-20 rounded-[20px]" />
        <div className="grid gap-8 lg:grid-cols-12">
          <Skeleton className="h-[640px] lg:col-span-8" />
          <Skeleton className="h-[520px] lg:col-span-4" />
        </div>
      </MentorDetailPage>
    );
  }

  if (!review) {
    return (
      <MentorDetailPage className="flex min-h-[520px] items-center justify-center">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <Star className="h-10 w-10 text-slate-400" />
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            {t("common.noReviewsFound")}
          </h1>
          <Button variant="outline" size="sm" onClick={goBack}>
            {t("general.back")}
          </Button>
        </div>
      </MentorDetailPage>
    );
  }

  if (!currentUser?.id || !isSessionMentor(review.session, currentUser.id)) {
    return (
      <MentorDetailPage className="flex min-h-[520px] items-center justify-center">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <User className="h-10 w-10 text-slate-400" />
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            {t("common.noAccess")}
          </h1>
          <Button variant="outline" size="sm" onClick={goBack}>
            {t("general.back")}
          </Button>
        </div>
      </MentorDetailPage>
    );
  }

  const candidate = {
    id: studentId,
    name: review.user?.name || studentProfile?.name,
    email: review.user?.email || studentProfile?.email,
    avatarUrl: review.user?.avatarUrl || studentProfile?.avatarUrl,
  };

  return (
    <MentorDetailPage>
      <MentorDetailHeader
        onBack={goBack}
        backLabel={t("general.back")}
        parentLabel={t("common.reviewAndFeedback")}
        title={`${t("common.sessionDetail")} #${sessionId || review.id}`}
        actions={
          <>
            <Button
              size="sm"
              className="h-9 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
              disabled={!sessionId}
              onClick={() =>
                navigate(`/mentor/sessions/${sessionId}/review/view`, {
                  state: { returnTo: `/mentor/reviews/${review.id}`, edit: true },
                })
              }>
              <Pencil className="h-4 w-4" />
              {t("common.editReview")}
            </Button>
          </>
        }
      />

      <MentorReviewReport
        review={review}
        sessionId={sessionId || review.id || 0}
        roomName={review.session?.roomName}
        joinedAt={review.session?.joinTime || review.session?.startTime1}
        mentor={review.mentor || currentUser}
        candidate={candidate}
        candidateFeedback={candidateFeedback}
      />
    </MentorDetailPage>
  );
}
