import type { components } from "../../../../../schema-from-be";
import type { JdRound } from "./HorizontalPipeline";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];

const isTerminalRoundDetail = (detail?: ApplicationDetail) =>
  detail?.status === "COMPLETED" ||
  detail?.status === "AI_EVALUATED" ||
  detail?.finalResult === "PASSED" ||
  detail?.finalResult === "FAILED";

export function areAllRoundsCompleted(
  rounds: JdRound[],
  details: ApplicationDetail[],
  currentRoundOrder: number
) {
  return (
    rounds.length > 0 &&
    rounds.every((round) => {
      const detail = details.find((item) => item.roundId === round.id);
      const roundOrder = round.roundOrder ?? 0;
      return isTerminalRoundDetail(detail) || roundOrder < currentRoundOrder;
    })
  );
}
