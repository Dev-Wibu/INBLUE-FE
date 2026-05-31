import { useTranslation } from "react-i18next";
/**
 * Write Review Page
 * Form for users to write feedbacks for mentors after sessions
 */

import { MentorFeedbackForm } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateMentorFeedback,
  useMentorFeedbackBySession,
  useUpdateMentorFeedback,
} from "@/hooks/useMentorFeedback";
import { useSessionById } from "@/hooks/useSession";
import { useAuthStore } from "@/stores/authStore";
import { ArrowLeft, Star } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
export function WriteReviewPage() {
  const { t } = useTranslation();
  const { sessionId } = useParams<{
    sessionId: string;
  }>();
  const numericSessionId = Number(sessionId);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id;
  const { data: session, isLoading: sessionLoading } = useSessionById(numericSessionId);
  const { data: existingFeedback, isLoading: feedbackLoading } =
    useMentorFeedbackBySession(numericSessionId);
  const { mutate: createFeedback, isPending: isCreating } = useCreateMentorFeedback();
  const { mutate: updateFeedback, isPending: isUpdating } = useUpdateMentorFeedback();
  const isLoading = sessionLoading || feedbackLoading;
  const isSubmitting = isCreating || isUpdating;
  const isEdit = !!existingFeedback;
  const handleSubmit = (data: {
    rating?: number;
    comment?: string;
    sessionId: number;
    mentorId: number;
    userId: number;
  }) => {
    if (!session || !currentUserId || session.userId !== currentUserId) {
      toast.error(t("userMockinterview.youDoNotHavePermission"));
      return;
    }
    if (session.status !== "COMPLETED") {
      toast.error(t("userMockinterview.youCanOnlySubmitFeedback"));
      return;
    }
    if (!session.id || !session.userId2) {
      toast.error(t("userMockinterview.unableToIdentifyInterviewSession"));
      return;
    }
    const normalizedRating = data.rating && data.rating > 0 ? data.rating : undefined;
    const normalizedComment = data.comment?.trim() || undefined;
    if (!normalizedRating && !normalizedComment) {
      toast.error(t("userMockinterview.pleaseSelectTheNumberOf"));
      return;
    }
    const payload = {
      sessionId: session.id,
      mentorId: session.userId2,
      userId: currentUserId,
      rating: normalizedRating,
      comment: normalizedComment,
    };
    if (isEdit && existingFeedback?.id) {
      updateFeedback(
        {
          id: existingFeedback.id,
          data: {
            rating: payload.rating,
            comment: payload.comment,
          },
        },
        {
          onSuccess: () => {
            navigate(`/user/mock-interview/history/${numericSessionId}`);
          },
        }
      );
    } else {
      createFeedback(payload, {
        onSuccess: () => {
          navigate(`/user/mock-interview/history/${numericSessionId}`);
        },
      });
    }
  };
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }
  if (!session) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("general.back")}
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <Star className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 font-semibold">{t("common.noInterviewSessionsFound")}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {t("common.thisInterviewSessionDoesNotExistOr")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!currentUserId || session.userId !== currentUserId) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("general.back")}
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <Star className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 font-semibold">{t("common.noAccess")}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {t("userMockinterview.youCannotSubmitFeedbackFor")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (session.status !== "COMPLETED") {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("general.back")}
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <Star className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 font-semibold">{t("userMockinterview.canTWriteAComment")}</h3>
            <p className="mt-1 text-sm text-slate-500">{t("userMockinterview.youCanOnlyWriteA")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!session.userId2) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("general.back")}
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <Star className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 font-semibold">{t("userMockinterview.lackOfMentorInformation")}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {t("userMockinterview.couldNotFindAMentor")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(`/user/mock-interview/history/${numericSessionId}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t("userMockinterview.returnToSessionDetails")}
      </Button>

      {/* Review Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-[#FFD700]" />
            <CardTitle>
              {isEdit ? t("userMockinterview.editResponse1") : t("common.writeFeedback")}
            </CardTitle>
          </div>
          <CardDescription>
            {isEdit
              ? t("userMockinterview.updateYourFeedbackToThe")
              : t("userMockinterview.shareYourFeedbackAboutThe")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MentorFeedbackForm
            sessionId={numericSessionId}
            mentorId={session.userId2}
            userId={currentUserId}
            existingFeedback={existingFeedback}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/user/mock-interview/history/${numericSessionId}`)}
            isLoading={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
}
