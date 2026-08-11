import type { LucideIcon } from "lucide-react";
import { Activity, RotateCw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  EXPERIENCE_DAY_ROBOT_DANCE_EVENT,
  HoloboxExperienceRobotPreviewPage,
  type ExperienceDayRobotDanceMode,
} from "./HoloboxExperienceRobotPreviewPage";

const DANCE_CONTROLS: Array<{
  mode: ExperienceDayRobotDanceMode;
  label: string;
  title: string;
  Icon: LucideIcon;
}> = [
  { mode: "bounce", label: "Nh\u00fan", title: "Cho robot nh\u00fan nh\u1ea3y", Icon: Activity },
  {
    mode: "wave",
    label: "Qu\u01a1 tay",
    title: "Cho robot qu\u01a1 tay thuy\u1ebft tr\u00ecnh",
    Icon: Sparkles,
  },
  { mode: "spin", label: "Xoay", title: "Cho robot xoay ngang", Icon: RotateCw },
];

type HoloboxThreeRobotPageProps = {
  audioUrl?: string;
  embedded?: boolean;
  onNarrationStateChange?: (_isSpeaking: boolean) => void;
  script?: string;
};

export function HoloboxThreeRobotPage({
  audioUrl,
  embedded = false,
  onNarrationStateChange,
  script,
}: HoloboxThreeRobotPageProps) {
  const danceResetTimerRef = useRef<number | null>(null);
  const [showDanceControls, setShowDanceControls] = useState(false);
  const [activeDanceMode, setActiveDanceMode] = useState<ExperienceDayRobotDanceMode | null>(null);

  const revealDanceControls = useCallback(() => {
    if (!embedded) setShowDanceControls(true);
  }, [embedded]);

  const triggerDance = (mode: ExperienceDayRobotDanceMode) => {
    setShowDanceControls(true);
    setActiveDanceMode(mode);
    window.dispatchEvent(
      new CustomEvent<ExperienceDayRobotDanceMode>(EXPERIENCE_DAY_ROBOT_DANCE_EVENT, {
        detail: mode,
      })
    );
    if (danceResetTimerRef.current !== null) window.clearTimeout(danceResetTimerRef.current);
    danceResetTimerRef.current = window.setTimeout(
      () => setActiveDanceMode((currentMode) => (currentMode === mode ? null : currentMode)),
      mode === "spin" ? 5600 : 7200
    );
  };

  useEffect(
    () => () => {
      if (danceResetTimerRef.current !== null) window.clearTimeout(danceResetTimerRef.current);
    },
    []
  );

  return (
    <>
      <HoloboxExperienceRobotPreviewPage
        ariaLabel="AI Holobox 3D"
        audioUrl={audioUrl}
        embedded={embedded}
        enableNarration
        onNarrationChange={onNarrationStateChange}
        onRobotActivate={revealDanceControls}
        script={script}
      />
      {showDanceControls && !embedded ? (
        <div
          className="holobox-dance-controls"
          aria-label="Robot dance controls"
          onPointerDown={(event) => event.stopPropagation()}>
          {DANCE_CONTROLS.map(({ mode, label, title, Icon }) => (
            <button
              key={mode}
              type="button"
              className={`holobox-dance-button ${activeDanceMode === mode ? "is-active" : ""}`}
              aria-pressed={activeDanceMode === mode}
              title={title}
              onClick={() => triggerDance(mode)}>
              <Icon aria-hidden="true" size={18} strokeWidth={2.4} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
