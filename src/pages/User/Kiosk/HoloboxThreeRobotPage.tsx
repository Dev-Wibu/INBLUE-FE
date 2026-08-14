import type { LucideIcon } from "lucide-react";
import { Activity, RotateCw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  EXPERIENCE_DAY_ROBOT_DANCE_EVENT,
  HoloboxExperienceRobotPreviewPage,
  type ExperienceDayRobotDanceMode,
} from "./HoloboxExperienceRobotPreviewPage";

const DANCE_CONTROLS: Array<{
  mode: ExperienceDayRobotDanceMode;
  labelKey: string;
  titleKey: string;
  Icon: LucideIcon;
}> = [
  {
    mode: "bounce",
    labelKey: "competencyKiosk.danceBounce",
    titleKey: "competencyKiosk.danceBounceHint",
    Icon: Activity,
  },
  {
    mode: "wave",
    labelKey: "competencyKiosk.danceWave",
    titleKey: "competencyKiosk.danceWaveHint",
    Icon: Sparkles,
  },
  {
    mode: "spin",
    labelKey: "competencyKiosk.danceSpin",
    titleKey: "competencyKiosk.danceSpinHint",
    Icon: RotateCw,
  },
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
  const { t } = useTranslation();
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
        ariaLabel={t("competencyKiosk.robotPreview")}
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
          aria-label={t("competencyKiosk.danceControls")}
          onPointerDown={(event) => event.stopPropagation()}>
          {DANCE_CONTROLS.map(({ mode, labelKey, titleKey, Icon }) => (
            <button
              key={mode}
              type="button"
              className={`holobox-dance-button ${activeDanceMode === mode ? "is-active" : ""}`}
              aria-pressed={activeDanceMode === mode}
              title={t(titleKey)}
              onClick={() => triggerDance(mode)}>
              <Icon aria-hidden="true" size={18} strokeWidth={2.4} />
              <span>{t(labelKey)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
