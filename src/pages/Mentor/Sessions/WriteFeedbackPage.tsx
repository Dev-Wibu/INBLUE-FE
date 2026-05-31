import { useTranslation } from "react-i18next";
/**
 * Write Feedback Page (Mentor)
 * Form for mentors to write reviews for students after sessions
 */

import { MentorReviewForm } from "@/components/review";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateMentorReview,
  useMentorReviewBySession,
  useUpdateMentorReview,
} from "@/hooks/useMentorReview";
import { useSessionById } from "@/hooks/useSession";
import { useAuthStore } from "@/stores/authStore";
import { ArrowLeft, Star, User } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
export function WriteFeedbackPage() {
  const { t } = useTranslation();
  const { sessionId } = useParams<{
    sessionId: string;
  }>();
  const numericSessionId = Number(sessionId);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { data: session, isLoading: sessionLoading } = useSessionById(numericSessionId);
  const { data: existingReview, isLoading: reviewLoading } =
    useMentorReviewBySession(numericSessionId);
  const { mutate: createReview, isPending: isCreating } = useCreateMentorReview();
  const { mutate: updateReview, isPending: isUpdating } = useUpdateMentorReview();
  const isLoading = sessionLoading || reviewLoading;
  const isSubmitting = isCreating || isUpdating;
  const isEdit = !!existingReview;
  const handleSubmit = (data: {
    rating?: number;
    situationNote?: string;
    taskNote?: string;
    actionNote?: string;
    resultNote?: string;
    strength?: string;
    weakness?: string;
    improve?: string;
    sessionId: number;
    mentorId: number;
    userId: number;
  }) => {
    if (!session || !user?.id || session.userId2 !== user.id) {
      toast.error(t("mentorSessions.youDoNotHavePermission"));
      return;
    }
    if (session.status !== "COMPLETED") {
      toast.error(t("mentorSessions.youCanOnlySubmitA"));
      return;
    }
    if (!session.id || !session.userId) {
      toast.error(t("mentorSessions.missingStudentInformationInThe"));
      return;
    }
    const normalizeOptionalText = (value?: string) => {
      const normalized = value?.trim();
      return normalized ? normalized : undefined;
    };
    const normalizedRating = data.rating && data.rating > 0 ? data.rating : undefined;
    const normalizedSituationNote = normalizeOptionalText(data.situationNote);
    const normalizedTaskNote = normalizeOptionalText(data.taskNote);
    const normalizedActionNote = normalizeOptionalText(data.actionNote);
    const normalizedResultNote = normalizeOptionalText(data.resultNote);
    const normalizedStrength = normalizeOptionalText(data.strength);
    const normalizedWeakness = normalizeOptionalText(data.weakness);
    const normalizedImprove = normalizeOptionalText(data.improve);
    const hasAnyReviewContent = Boolean(
      normalizedRating ||
      normalizedSituationNote ||
      normalizedTaskNote ||
      normalizedActionNote ||
      normalizedResultNote ||
      normalizedStrength ||
      normalizedWeakness ||
      normalizedImprove
    );
    if (!hasAnyReviewContent) {
      toast.error(t("mentorSessions.pleaseEnterAtLeastOne"));
      return;
    }
    const payload = {
      sessionId: session.id,
      mentorId: user.id,
      userId: session.userId,
      rating: normalizedRating,
      situationNote: normalizedSituationNote,
      taskNote: normalizedTaskNote,
      actionNote: normalizedActionNote,
      resultNote: normalizedResultNote,
      strength: normalizedStrength,
      weakness: normalizedWeakness,
      improve: normalizedImprove,
    };
    if (isEdit && existingReview?.id) {
      updateReview(
        {
          id: existingReview.id,
          data: {
            rating: payload.rating,
            situationNote: payload.situationNote,
            taskNote: payload.taskNote,
            actionNote: payload.actionNote,
            resultNote: payload.resultNote,
            strength: payload.strength,
            weakness: payload.weakness,
            improve: payload.improve,
          },
        },
        {
          onSuccess: () => {
            navigate("/mentor?tab=sessions");
          },
        }
      );
    } else {
      createReview(payload, {
        onSuccess: () => {
          navigate("/mentor?tab=sessions");
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
        <Card className="border-emerald-100 dark:border-slate-800">
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
  if (session.status !== "COMPLETED") {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("general.back")}
        </Button>
        <Card className="border-emerald-100 dark:border-slate-800">
          <CardContent className="py-12 text-center">
            <Star className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 font-semibold">{t("mentorSessions.canTWriteAReview")}</h3>
            <p className="mt-1 text-sm text-slate-500">{t("mentorSessions.youCanOnlyWriteA")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if current user is the mentor for this session
  if (session.userId2 !== user?.id) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("general.back")}
        </Button>
        <Card className="border-emerald-100 dark:border-slate-800">
          <CardContent className="py-12 text-center">
            <User className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 font-semibold">{t("common.noAccess")}</h3>
            <p className="mt-1 text-sm text-slate-500">{t("mentorSessions.youAreNotTheMentor")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate("/mentor?tab=sessions")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t("common.returnToTheSessionList")}
      </Button>

      {/* Session Info */}
      <Card className="border-emerald-100 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">
                {t("common.student")}
                {session.userId}
              </CardTitle>
              <CardDescription>
                {session.roomName ||
                  t("common.sessionVar0", {
                    var_0: session.id,
                  })}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Feedback Form */}
      <Card className="border-emerald-100 dark:border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-[#FFD700]" />
            <CardTitle>
              {isEdit ? t("mentorSessions.editReview1") : t("mentorSessions.writeReviews")}
            </CardTitle>
          </div>
          <CardDescription>
            {isEdit
              ? t("mentorSessions.updateYourReviewOfThe")
              : t("mentorSessions.evaluateStudentsAfterTheInterview")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MentorReviewForm
            sessionId={numericSessionId}
            mentorId={user?.id || 0}
            userId={session.userId || 0}
            existingReview={existingReview}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/mentor?tab=sessions")}
            isLoading={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
}
