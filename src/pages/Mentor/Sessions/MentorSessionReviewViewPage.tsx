import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserById } from "@/hooks/useApplication";
import { useCurrentMentorProfile } from "@/hooks/useMentor";
import { useMentorFeedbackBySession } from "@/hooks/useMentorFeedback";
import {
  useCreateMentorReview,
  useMentorReviewBySession,
  useUpdateMentorReview,
  type MentorReview,
} from "@/hooks/useMentorReview";
import { useSessionById } from "@/hooks/useSession";
import { isSessionMentor } from "@/lib/session-mentor";
import { MentorDetailHeader, MentorDetailPage } from "@/pages/Mentor/components/MentorDetailLayout";
import {
  MentorReviewReport,
  type MentorReviewReportDraft,
  type MentorReviewTextField,
} from "@/pages/Mentor/components/MentorReviewReport";
import { useAuthStore } from "@/stores/authStore";
import { CheckCircle2, Pencil, Save, Star, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

interface MentorRouteState {
  returnTo?: string;
  edit?: boolean;
}

const createDraft = (review?: MentorReview): MentorReviewReportDraft => ({
  rating: typeof review?.rating === "number" ? review.rating : 0,
  situationNote: review?.situationNote || "",
  taskNote: review?.taskNote || "",
  actionNote: review?.actionNote || "",
  resultNote: review?.resultNote || "",
  strength: review?.strength || "",
  weakness: review?.weakness || "",
  improve: review?.improve || "",
});

const normalizeOptionalText = (value: string): string | undefined => {
  const normalized = value.trim();
  return normalized || undefined;
};

export function MentorSessionReviewViewPage() {
  const { t } = useTranslation();
  const { sessionId: sessionIdParam } = useParams<{ sessionId: string }>();
  const sessionId = Number(sessionIdParam);
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = useAuthStore((state) => state.user);
  const { data: session, isLoading: sessionLoading } = useSessionById(sessionId);
  const {
    data: review,
    isLoading: reviewLoading,
    refetch: refetchReview,
  } = useMentorReviewBySession(sessionId);
  const { data: mentorProfile, isLoading: mentorLoading } = useCurrentMentorProfile();
  const { data: candidateFeedback } = useMentorFeedbackBySession(sessionId);
  const createReviewMutation = useCreateMentorReview();
  const updateReviewMutation = useUpdateMentorReview();
  const studentUserId = session?.userId ?? review?.user?.id ?? 0;
  const { data: studentInfo } = useUserById(studentUserId);
  const [editing, setEditing] = useState(
    Boolean((location.state as MentorRouteState | null)?.edit)
  );
  const [createModeInitialized, setCreateModeInitialized] = useState(false);
  const [activeField, setActiveField] = useState<MentorReviewTextField | null>(null);
  const [draft, setDraft] = useState<MentorReviewReportDraft>(() => createDraft(review));
  const hasInternalReturn = Boolean((location.state as MentorRouteState | null)?.returnTo);
  const mentorId = Number(mentorProfile?.id || 0);
  const isSaving = createReviewMutation.isPending || updateReviewMutation.isPending;

  useEffect(() => {
    if (!editing && review) {
      setDraft(createDraft(review));
    }
  }, [editing, review]);

  useEffect(() => {
    if (!reviewLoading && !review && !createModeInitialized) {
      setDraft(createDraft());
      setEditing(true);
      setCreateModeInitialized(true);
    }
  }, [createModeInitialized, review, reviewLoading]);

  const goBack = () => {
    if (hasInternalReturn) {
      navigate(-1);
      return;
    }
    navigate(`/mentor/sessions/${sessionId}`, { replace: true });
  };

  const startEditing = (field?: MentorReviewTextField) => {
    setActiveField(field || null);
    setEditing(true);
  };

  const cancelEditing = () => {
    if (!review) {
      goBack();
      return;
    }
    setDraft(createDraft(review));
    setActiveField(null);
    setEditing(false);
  };

  const updateTextField = (field: MentorReviewTextField, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const saveReview = async () => {
    if (!session || !mentorId || !isSessionMentor(session, mentorId)) {
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
    if (!Number.isFinite(draft.rating) || draft.rating < 1 || draft.rating > 5) {
      toast.error(t("mentorSessions.ratingRequired"));
      return;
    }

    const data = {
      rating: draft.rating > 0 ? draft.rating : undefined,
      situationNote: normalizeOptionalText(draft.situationNote),
      taskNote: normalizeOptionalText(draft.taskNote),
      actionNote: normalizeOptionalText(draft.actionNote),
      resultNote: normalizeOptionalText(draft.resultNote),
      strength: normalizeOptionalText(draft.strength),
      weakness: normalizeOptionalText(draft.weakness),
      improve: normalizeOptionalText(draft.improve),
    };
    if (!Object.values(data).some(Boolean)) {
      toast.error(t("mentorSessions.pleaseEnterAtLeastOne"));
      return;
    }

    try {
      if (review?.id) {
        await updateReviewMutation.mutateAsync({ id: review.id, data });
      } else {
        await createReviewMutation.mutateAsync({
          sessionId: session.id,
          mentorId,
          userId: session.userId,
          ...data,
        });
        await refetchReview();
      }
    } catch {
      return;
    }
    setActiveField(null);
    setEditing(false);
  };

  if (sessionLoading || reviewLoading || mentorLoading) {
    return (
      <MentorDetailPage>
        <Skeleton className="h-20 rounded-[20px]" />
        <div className="grid gap-8 lg:grid-cols-12">
          <Skeleton className="h-[680px] lg:col-span-8" />
          <Skeleton className="h-[540px] lg:col-span-4" />
        </div>
      </MentorDetailPage>
    );
  }

  if (!session) {
    return (
      <MentorDetailPage className="flex min-h-[520px] items-center justify-center">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <Star className="h-10 w-10 text-slate-400" />
          <p className="font-semibold text-slate-900 dark:text-white">
            {t("common.noInterviewSessionsFound")}
          </p>
          <Button variant="outline" size="sm" onClick={goBack}>
            {t("general.back")}
          </Button>
        </div>
      </MentorDetailPage>
    );
  }

  if (!isSessionMentor(session, mentorId)) {
    return (
      <MentorDetailPage className="flex min-h-[520px] items-center justify-center">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <User className="h-10 w-10 text-slate-400" />
          <p className="font-semibold text-slate-900 dark:text-white">{t("common.noAccess")}</p>
          <Button variant="outline" size="sm" onClick={goBack}>
            {t("general.back")}
          </Button>
        </div>
      </MentorDetailPage>
    );
  }

  const candidate = {
    id: studentUserId,
    name: review?.user?.name || studentInfo?.name,
    email: review?.user?.email || studentInfo?.email,
    avatarUrl: review?.user?.avatarUrl || studentInfo?.avatarUrl,
  };
  const mentor = {
    id: mentorId,
    name: mentorProfile?.name || authUser?.name,
    email: mentorProfile?.email || authUser?.email,
    avatarUrl: mentorProfile?.avatarUrl || authUser?.avatarUrl,
  };

  return (
    <MentorDetailPage>
      <MentorDetailHeader
        onBack={goBack}
        backLabel={t("general.back")}
        parentLabel={`${t("common.interviewSession")} #${sessionId}`}
        title={
          review?.id
            ? `${t("mentorReviews.mentorReviewReport")} #${review.id}`
            : t("mentorSessions.writeReviews")
        }
        badge={
          review && !editing ? (
            <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              {t("general.completed")}
            </Badge>
          ) : undefined
        }
        actions={
          editing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={cancelEditing}
                disabled={isSaving}
                className="h-9 rounded-xl px-3">
                <X className="h-4 w-4" />
                {t("general.cancel")}
              </Button>
              <Button
                size="sm"
                onClick={saveReview}
                disabled={isSaving}
                className="h-9 rounded-xl bg-indigo-600 px-3 font-semibold text-white hover:bg-indigo-700">
                <Save className="h-4 w-4" />
                {review ? t("common.save") : t("common.submit")}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => startEditing()}
              className="h-9 rounded-xl bg-indigo-600 px-3 font-semibold text-white hover:bg-indigo-700">
              <Pencil className="h-4 w-4" />
              {t("common.editReview")}
            </Button>
          )
        }
      />

      <MentorReviewReport
        review={editing || !review ? draft : review}
        sessionId={sessionId}
        roomName={session.roomName}
        joinedAt={session.joinTime || session.startTime1}
        mentor={mentor}
        candidate={candidate}
        candidateFeedback={candidateFeedback}
        editing={editing}
        activeField={activeField}
        onActivateField={startEditing}
        onTextChange={updateTextField}
        onRatingChange={(rating) => setDraft((current) => ({ ...current, rating }))}
      />
    </MentorDetailPage>
  );
}
