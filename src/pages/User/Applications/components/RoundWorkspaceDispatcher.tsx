import type { components } from "../../../../../schema-from-be";
import type { JdRound } from "./HorizontalPipeline";
import { AiInterviewModule } from "./round-modules/AiInterviewModule";
import { CodeReviewModule } from "./round-modules/CodeReviewModule";
import { CodingModule } from "./round-modules/CodingModule";
import { CvScreeningModule } from "./round-modules/CvScreeningModule";
import { EmailSimulatorModule } from "./round-modules/EmailSimulatorModule";
import { MentorReviewModule } from "./round-modules/MentorReviewModule";
import { QuizModule } from "./round-modules/QuizModule";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];

export interface JdInfoPayload {
  title?: string;
  companyName?: string;
  logoUrl?: string | null;
  level?: string;
  description?: string;
  requirements?: string;
  rounds?: JdRound[];
}

interface RoundWorkspaceDispatcherProps {
  round: JdRound;
  detail?: ApplicationDetail;
  applicationId: number;
  jdId?: number;
  jdInfo?: JdInfoPayload | null;
  currentRoundOrder: number;
  appStatus?: string;
  onRefresh?: () => void;
}

export function RoundWorkspaceDispatcher({
  round,
  detail,
  applicationId,
  jdId,
  jdInfo,
  currentRoundOrder,
  appStatus,
  onRefresh,
}: RoundWorkspaceDispatcherProps) {
  const roundOrder = round.roundOrder ?? 1;

  const isAppCompleted = appStatus === "PASSED" || appStatus === "FAILED";

  const detailStatus = detail?.status as string | undefined;
  const isCompleted =
    isAppCompleted ||
    detailStatus === "COMPLETED" ||
    detailStatus === "AI_EVALUATED" ||
    detailStatus === "PASSED" ||
    detailStatus === "FAILED" ||
    roundOrder < currentRoundOrder;

  const isCurrent = !isCompleted && roundOrder === currentRoundOrder;

  const type = (round.roundType || "QUIZ").toUpperCase().replace("MENTROR", "MENTOR");

  switch (type) {
    case "CV_SCREENING":
      return (
        <CvScreeningModule
          round={round}
          detail={detail}
          applicationId={applicationId}
          jdInfo={jdInfo}
          isCompleted={isCompleted}
          isCurrent={isCurrent}
          onSuccess={onRefresh}
        />
      );

    case "EMAIL_SIMULATOR":
      return (
        <EmailSimulatorModule
          round={round}
          detail={detail}
          applicationId={applicationId}
          jdInfo={jdInfo}
          isCompleted={isCompleted}
          isCurrent={isCurrent}
          onSuccess={onRefresh}
        />
      );

    case "QUIZ":
      return (
        <QuizModule
          round={round}
          detail={detail}
          applicationId={applicationId}
          jdId={jdId}
          isCompleted={isCompleted}
          isCurrent={isCurrent}
          onSuccess={onRefresh}
        />
      );

    case "CODING":
      return (
        <CodingModule
          round={round}
          detail={detail}
          applicationId={applicationId}
          isCompleted={isCompleted}
          isCurrent={isCurrent}
          onSuccess={onRefresh}
        />
      );

    case "CODE_REVIEW":
      return (
        <CodeReviewModule
          round={round}
          detail={detail}
          applicationId={applicationId}
          isCompleted={isCompleted}
          isCurrent={isCurrent}
          onSuccess={onRefresh}
        />
      );

    case "MENTOR_REVIEW":
      return (
        <MentorReviewModule
          round={round}
          detail={detail}
          applicationId={applicationId}
          isCompleted={isCompleted}
          isCurrent={isCurrent}
        />
      );

    case "AI_INTERVIEW":
      return (
        <AiInterviewModule
          round={round}
          detail={detail}
          applicationId={applicationId}
          jdInfo={jdInfo}
          isCompleted={isCompleted}
          isCurrent={isCurrent}
          onSuccess={onRefresh}
        />
      );

    default:
      return (
        <QuizModule
          round={round}
          detail={detail}
          applicationId={applicationId}
          jdId={jdId}
          isCompleted={isCompleted}
          isCurrent={isCurrent}
        />
      );
  }
}
