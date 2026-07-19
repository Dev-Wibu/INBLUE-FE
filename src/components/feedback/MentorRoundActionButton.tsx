/**
 * MentorRoundActionButton
 *
 * Single button that toggles between "Vào phòng" / "Tiếp tục phỏng vấn"
 * / "Chờ mentor đánh giá" / "⭐ Đánh giá mentor" / "Đã hoàn thành" based
 * on the live state of a Mentor Interview session.
 *
 * Used inside `ApplicationHistoryPage` RoundTimelineItem so the student
 * sees the right CTA on the same row, exactly like the "Vào phòng" button
 * they had before.
 *
 * Implementation references `docs/frontend_student_rate_mentor.md` §2.2 and
 * delegates the underlying state machine to `useMentorRoundButtonState`.
 */

import { useState } from "react";

import { RateMentorModal } from "@/components/feedback/RateMentorModal";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatCountdownUntil, useMentorRoundButtonState } from "@/hooks/useMentorRoundButtonState";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Hourglass, LogIn, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface MentorRoundActionButtonProps {
  sessionId?: number | string | null;
  mentorId?: number | null;
  /** Optional mentor display name to surface in the rating modal. */
  mentorName?: string;
  /**
   * Application id used to deep-link the user to the Mentor Review page when
   * they haven't picked a slot yet. The Mentor Review page itself owns the
   * DateTimePicker + ONLINE/OFFLINE form. The button is rendered whenever a
   * session id is missing so the user always has an entry point.
   */
  applicationId?: number | string | null;
  /**
   * When true the button renders a compact variant sized for inline use
   * inside `RoundTimelineItem` (default: true).
   */
  compact?: boolean;
}

export function MentorRoundActionButton({
  sessionId,
  mentorId,
  mentorName,
  applicationId,
  compact = true,
}: MentorRoundActionButtonProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Parse sessionId - handle both number and string types
  const numericSessionId =
    sessionId !== null && sessionId !== undefined && sessionId !== "" ? Number(sessionId) : null;
  const hasSessionId =
    typeof numericSessionId === "number" &&
    Number.isFinite(numericSessionId) &&
    numericSessionId > 0;

  const { state, session, loading, refetch } = useMentorRoundButtonState(
    hasSessionId ? numericSessionId : null
  );
  // We use a render counter instead of a boolean so each open cycle mounts
  // a fresh RateMentorModal — the modal owns its own open/close state and
  // we don't have to forward props.
  const [modalRenderKey, setModalRenderKey] = useState<number | null>(null);

  const handleJoinRoom = () => {
    if (!session?.id) return;
    navigate(`/user/sessions/room/${session.id}`);
  };

  // No session yet: route the candidate to the Mentor Review page where
  // the DateTimePicker + ONLINE/OFFLINE form lives. Previously we rendered
  // nothing here, which left the student staring at a "Chờ xử lý" chip
  // with no entry point.
  const handlePickSchedule = () => {
    if (!applicationId) return;
    navigate(`/user/application/${applicationId}/mentor-review`);
  };

  const handleRated = () => {
    // Per spec §10.2: re-fetch so DONE state appears immediately.
    queryClient.invalidateQueries({ queryKey: ["mentor-round-session", session?.id] });
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
    refetch();
  };

  const sizeClass = compact ? "size-sm" : "size-default";

  const renderButton = () => {
    if (!hasSessionId) {
      // Two sub-states:
      //  - applicationId present: let the candidate pick a slot right away.
      //  - no applicationId (defensive): show a disabled "Chờ phân công mentor"
      //    pill so the timeline row stays stable.
      if (!applicationId) {
        return (
          <Button variant="outline" size="sm" disabled className="gap-2">
            <Hourglass className="h-4 w-4" />
            {t("userRateMentor.awaitingMentor")}
          </Button>
        );
      }
      return (
        <Button
          size="sm"
          onClick={handlePickSchedule}
          className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700">
          <LogIn className="h-4 w-4" />
          {t("userRateMentor.pickSchedule")}
        </Button>
      );
    }

    if (loading) {
      return (
        <Button variant="outline" size="sm" disabled className="gap-2">
          <Spinner size="sm" tone="primary" />
          {t("userRateMentor.loading")}
        </Button>
      );
    }

    switch (state) {
      case "NOT_YET":
        return (
          <Button variant="outline" size="sm" disabled className="gap-2">
            <Hourglass className="h-4 w-4" />
            {t("userRateMentor.notYet", {
              countdown:
                formatCountdownUntil(session?.joinTime ?? null) ?? t("userRateMentor.soon"),
            })}
          </Button>
        );
      case "CAN_JOIN":
        return (
          <Button
            size="sm"
            onClick={handleJoinRoom}
            className="gap-2 bg-[#0047AB] text-white hover:bg-[#003d91]">
            <LogIn className="h-4 w-4" />
            {t("userRateMentor.joinRoom")}
          </Button>
        );
      case "IN_SESSION":
        return (
          <Button
            size="sm"
            onClick={handleJoinRoom}
            className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
            <LogIn className="h-4 w-4" />
            {t("userRateMentor.continueInterview")}
          </Button>
        );
      case "WAIT_REVIEW":
        return (
          <Button variant="outline" size="sm" disabled className="gap-2">
            <Clock className="h-4 w-4" />
            {t("userRateMentor.waitForMentorReview")}
          </Button>
        );
      case "RATE_MENTOR":
        return (
          <Button
            size="sm"
            onClick={() => setModalRenderKey(Date.now())}
            className="gap-2 bg-[#FFD700] text-slate-900 hover:bg-[#e6c200]">
            <Star className="h-4 w-4 fill-slate-900" />
            {t("userRateMentor.rateMentor")}
          </Button>
        );
      case "DONE":
        return (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="gap-2 border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" />
            {t("userRateMentor.done")}
          </Button>
        );
      default:
        return null;
    }
  };

  const resolvedMentorId = mentorId ?? session?.mentorId ?? undefined;
  const shouldRenderModal = modalRenderKey !== null && !!session?.id && !!resolvedMentorId;

  return (
    <>
      <div className={sizeClass}>{renderButton()}</div>
      {shouldRenderModal ? (
        <RateMentorModal
          key={modalRenderKey}
          sessionId={session!.id}
          mentorId={resolvedMentorId!}
          mentorName={mentorName}
          onSuccess={handleRated}
        />
      ) : null}
    </>
  );
}
