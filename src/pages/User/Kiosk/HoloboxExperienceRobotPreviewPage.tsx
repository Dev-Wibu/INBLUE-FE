import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import {
  EXPERIENCE_DAY_PRESENTATION_DURATION,
  EXPERIENCE_DAY_ROBOT_FRAME,
  loadExperienceDayRobot,
} from "./ExperienceDayRobot";

const CAMERA_DISTANCE = 13.5;
const MIN_PRESENTATION_ASPECT = 0.66;
const FLOAT_TRAVEL = 0.52;
const FLOAT_SPEED = 1.4;
const SHADOW_LIFT_RANGE = 0.62;
const MIN_VERTICAL_OFFSET = -1.1;
const MAX_VERTICAL_OFFSET = 0.75;
const VERTICAL_DRAG_SENSITIVITY = 0.008;
const OUTRO_DURATION = 2.35;
export const EXPERIENCE_DAY_ROBOT_DANCE_EVENT = "holobox:robot-dance";
export type ExperienceDayRobotDanceMode = "bounce" | "wave" | "spin";

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

type HoloboxExperienceRobotPreviewPageProps = {
  ariaLabel?: string;
  audioUrl?: string;
  embedded?: boolean;
  enableNarration?: boolean;
  onNarrationChange?: (_isSpeaking: boolean) => void;
  onRobotActivate?: () => void;
  script?: string;
};

function getPresentationYaw(time: number) {
  const phase = THREE.MathUtils.euclideanModulo(time, EXPERIENCE_DAY_PRESENTATION_DURATION);
  const turnPulse = (start: number, end: number, amplitude: number) => {
    if (phase < start || phase > end) return 0;
    const progress = THREE.MathUtils.smoothstep(phase, start, end);
    return Math.sin(progress * Math.PI) * amplitude;
  };

  return (
    turnPulse(2.1, 4.5, -0.17) +
    turnPulse(5.6, 8, 0.17) +
    turnPulse(10.2, 12.5, -0.14) +
    turnPulse(13, 15.4, 0.14)
  );
}

const BLINKS = [
  { time: 1.2, halfDuration: 0.145 },
  { time: 3.65, halfDuration: 0.135 },
  { time: 6.15, halfDuration: 0.145 },
  { time: 8.55, halfDuration: 0.135 },
  { time: 8.88, halfDuration: 0.12 },
  { time: 11.15, halfDuration: 0.145 },
  { time: 13.65, halfDuration: 0.14 },
  { time: 15.35, halfDuration: 0.145 },
] as const;

const NARRATION_BLINKS = [
  { time: 1.35, halfDuration: 0.15 },
  { time: 3.85, halfDuration: 0.145 },
  { time: 4.18, halfDuration: 0.12 },
] as const;

function getBlinkPulse(phase: number, center: number, halfDuration: number) {
  const distance = Math.abs(phase - center);
  if (distance >= halfDuration) return 0;
  return Math.cos((distance / halfDuration) * (Math.PI / 2));
}

function getBlinkClosure(time: number) {
  const phase = THREE.MathUtils.euclideanModulo(time, EXPERIENCE_DAY_PRESENTATION_DURATION);
  return BLINKS.reduce((closure, blink) => {
    const blinkClosure = getBlinkPulse(phase, blink.time, blink.halfDuration);
    return Math.max(closure, blinkClosure);
  }, 0);
}

function getNarrationBlinkClosure(time: number) {
  const phase = THREE.MathUtils.euclideanModulo(time, 6.4);
  return NARRATION_BLINKS.reduce((closure, blink) => {
    const blinkClosure = getBlinkPulse(phase, blink.time, blink.halfDuration);
    return Math.max(closure, blinkClosure);
  }, 0);
}

function getElasticStepPulse(phase: number) {
  const wave = 0.5 + Math.sin(phase) * 0.5;
  const easedWave = wave * wave * (3 - 2 * wave);
  const rebound = Math.sin(phase * 2) * 0.07;
  return THREE.MathUtils.clamp(easedWave + rebound, 0, 1);
}

type PresenterArmPose = readonly [shoulderOut: number, shoulderDrop: number, elbowBend: number];

type PresenterGesture = {
  left: PresenterArmPose;
  right: PresenterArmPose;
};

type PresenterBodyPose = {
  turn: number;
  lean: number;
  weight: number;
  knee: number;
  nod: number;
};

type PresenterSequenceBeat = {
  gestureIndex: number;
  body: PresenterBodyPose;
};

type PresenterSequence = {
  beats: readonly PresenterSequenceBeat[];
};

type MascotGesture = {
  duration: number;
  pause: number;
  pulses: number;
  bounce: number;
  lateral: number;
  turn: number;
  headTurn: number;
  headTilt: number;
  knee: number;
  step: number;
  chest: number;
  armSway: number;
};

type MascotMotion = Omit<MascotGesture, "duration" | "pause" | "pulses">;

const PRESENTER_GESTURES: readonly PresenterGesture[] = [
  // Brief neutral pause with both arms relaxed beside the hips.
  { left: [0.24, 1.4, 0.34], right: [0.24, 1.4, 0.34] },
  // Both palms open at waist height.
  { left: [0.38, 0.94, -0.35], right: [0.38, 0.94, -0.35] },
  // Compact framing gesture in front of the abdomen.
  { left: [0.31, 1.08, 0.62], right: [0.31, 1.08, 0.62] },
  // Point toward a board on the presenter's left, with the other hand near the abdomen.
  { left: [0.46, 0.76, -0.92], right: [0.29, 1.2, 0.8] },
  // Mirror the board-pointing gesture on the right.
  { left: [0.29, 1.2, 0.8], right: [0.46, 0.76, -0.92] },
  // Current asymmetric presentation rhythm: right hand leads.
  { left: [0.28, 1.2, 0.78], right: [0.45, 0.86, -0.7] },
  // Offer an idea with the left hand while the right hand settles at the torso.
  { left: [0.46, 0.88, -0.58], right: [0.28, 1.2, 0.8] },
  // Offer the idea from the opposite side.
  { left: [0.28, 1.2, 0.8], right: [0.46, 0.88, -0.58] },
  // Emphasize a key point on the right, inspired by the raised-index reference.
  { left: [0.29, 1.18, 0.8], right: [0.48, 0.78, -1.04] },
  // Emphasize a key point on the left.
  { left: [0.48, 0.78, -1.04], right: [0.29, 1.18, 0.8] },
  // Mirror the current asymmetric gesture before returning to the open pose.
  { left: [0.45, 0.86, -0.7], right: [0.28, 1.2, 0.78] },
  // Wide welcome gesture.
  { left: [0.5, 0.86, -0.42], right: [0.5, 0.86, -0.42] },
  // Compare two ideas at different heights.
  { left: [0.46, 0.84, -0.62], right: [0.34, 1.08, 0.28] },
  { left: [0.34, 1.08, 0.28], right: [0.46, 0.84, -0.62] },
  // Point gently toward a nearby board while the other hand rests at the waist.
  { left: [0.43, 0.82, -0.82], right: [0.27, 1.24, 0.68] },
  { left: [0.27, 1.24, 0.68], right: [0.43, 0.82, -0.82] },
  // Explain a sequence with one palm hovering above the other.
  { left: [0.28, 1.03, 0.96], right: [0.34, 1.13, 0.42] },
  { left: [0.34, 1.13, 0.42], right: [0.28, 1.03, 0.96] },
  // Hold an imaginary microphone close while the free hand invites the audience in.
  { left: [0.44, 0.94, -0.54], right: [0.31, 0.86, 1.08] },
  { left: [0.31, 0.86, 1.08], right: [0.44, 0.94, -0.54] },
  // Address the room with two open hands at comfortably different heights.
  { left: [0.44, 0.84, -0.52], right: [0.4, 0.98, -0.32] },
  { left: [0.4, 0.98, -0.32], right: [0.44, 0.84, -0.52] },
  // Indicate a screen to one side while the supporting hand frames the explanation.
  { left: [0.5, 0.74, -0.98], right: [0.3, 1.12, 0.58] },
  { left: [0.3, 1.12, 0.58], right: [0.5, 0.74, -0.98] },
] as const;

const bodyPose = (
  turn: number,
  lean: number,
  weight: number,
  knee: number,
  nod: number
): PresenterBodyPose => ({ turn, lean, weight, knee, nod });

const NEUTRAL_BODY_POSE = bodyPose(0, 0, 0, 0, 0);

// Each sequence tells a short presentation story instead of picking isolated arm poses.
const PRESENTER_SEQUENCES: readonly PresenterSequence[] = [
  {
    beats: [
      { gestureIndex: 0, body: bodyPose(0, 0, 0, 0.08, 0) },
      { gestureIndex: 1, body: bodyPose(0, 0.18, 0, 0.24, 0.15) },
      { gestureIndex: 2, body: bodyPose(0, 0.08, 0, 0.12, 0.08) },
    ],
  },
  {
    beats: [
      { gestureIndex: 2, body: bodyPose(0, 0.05, 0, 0.12, 0) },
      { gestureIndex: 3, body: bodyPose(-0.72, 0.12, -0.38, 0.2, 0.08) },
      { gestureIndex: 6, body: bodyPose(-0.3, 0.18, -0.2, 0.16, 0.18) },
    ],
  },
  {
    beats: [
      { gestureIndex: 2, body: bodyPose(0, 0.05, 0, 0.12, 0) },
      { gestureIndex: 4, body: bodyPose(0.72, 0.12, 0.38, 0.2, 0.08) },
      { gestureIndex: 7, body: bodyPose(0.3, 0.18, 0.2, 0.16, 0.18) },
    ],
  },
  {
    beats: [
      { gestureIndex: 12, body: bodyPose(-0.38, 0.04, -0.3, 0.12, 0) },
      { gestureIndex: 13, body: bodyPose(0.38, 0.04, 0.3, 0.12, 0) },
      { gestureIndex: 1, body: bodyPose(0, 0.12, 0, 0.18, 0.14) },
    ],
  },
  {
    beats: [
      { gestureIndex: 5, body: bodyPose(0.28, 0.12, 0.18, 0.12, 0.08) },
      { gestureIndex: 8, body: bodyPose(0.52, 0.2, 0.28, 0.24, 0.26) },
      { gestureIndex: 2, body: bodyPose(0.1, 0.06, 0, 0.1, 0) },
    ],
  },
  {
    beats: [
      { gestureIndex: 10, body: bodyPose(-0.28, 0.12, -0.18, 0.12, 0.08) },
      { gestureIndex: 9, body: bodyPose(-0.52, 0.2, -0.28, 0.24, 0.26) },
      { gestureIndex: 2, body: bodyPose(-0.1, 0.06, 0, 0.1, 0) },
    ],
  },
  {
    beats: [
      { gestureIndex: 16, body: bodyPose(-0.18, 0.08, -0.16, 0.14, 0.08) },
      { gestureIndex: 17, body: bodyPose(0.18, 0.08, 0.16, 0.14, 0.08) },
      { gestureIndex: 2, body: bodyPose(0, 0.16, 0, 0.2, 0.18) },
    ],
  },
  {
    beats: [
      { gestureIndex: 18, body: bodyPose(-0.24, 0.06, -0.18, 0.1, 0) },
      { gestureIndex: 20, body: bodyPose(0.18, 0.16, 0.14, 0.2, 0.16) },
      { gestureIndex: 1, body: bodyPose(0, 0.1, 0, 0.12, 0.08) },
    ],
  },
  {
    beats: [
      { gestureIndex: 19, body: bodyPose(0.24, 0.06, 0.18, 0.1, 0) },
      { gestureIndex: 21, body: bodyPose(-0.18, 0.16, -0.14, 0.2, 0.16) },
      { gestureIndex: 1, body: bodyPose(0, 0.1, 0, 0.12, 0.08) },
    ],
  },
  {
    beats: [
      { gestureIndex: 22, body: bodyPose(-0.78, 0.1, -0.34, 0.16, 0.06) },
      { gestureIndex: 6, body: bodyPose(-0.36, 0.18, -0.18, 0.2, 0.14) },
      { gestureIndex: 2, body: bodyPose(0, 0.08, 0, 0.12, 0) },
    ],
  },
  {
    beats: [
      { gestureIndex: 23, body: bodyPose(0.78, 0.1, 0.34, 0.16, 0.06) },
      { gestureIndex: 7, body: bodyPose(0.36, 0.18, 0.18, 0.2, 0.14) },
      { gestureIndex: 2, body: bodyPose(0, 0.08, 0, 0.12, 0) },
    ],
  },
  {
    beats: [
      { gestureIndex: 20, body: bodyPose(-0.16, 0.12, -0.12, 0.14, 0.08) },
      { gestureIndex: 1, body: bodyPose(0.16, 0.18, 0.12, 0.2, 0.2) },
      { gestureIndex: 0, body: bodyPose(0, 0, 0, 0.06, 0.1) },
    ],
  },
] as const;

const IDLE_MASCOT_GESTURES: readonly MascotGesture[] = [
  // Cheerful double knee bounce.
  {
    duration: 1.65,
    pause: 0.72,
    pulses: 2,
    bounce: 1,
    lateral: 0,
    turn: 0,
    headTurn: 0,
    headTilt: 0,
    knee: 1,
    step: 0.08,
    chest: 0.55,
    armSway: 0.65,
  },
  // Settle onto the left side and look into the room.
  {
    duration: 1.8,
    pause: 0.82,
    pulses: 1,
    bounce: 0.28,
    lateral: -0.8,
    turn: -0.55,
    headTurn: -0.82,
    headTilt: -0.65,
    knee: 0.48,
    step: -0.42,
    chest: 0.36,
    armSway: -0.5,
  },
  // Mirrored right-side weight shift.
  {
    duration: 1.8,
    pause: 0.82,
    pulses: 1,
    bounce: 0.28,
    lateral: 0.8,
    turn: 0.55,
    headTurn: 0.82,
    headTilt: 0.65,
    knee: 0.48,
    step: 0.42,
    chest: 0.36,
    armSway: 0.5,
  },
  // Curious look from one side to the other.
  {
    duration: 2.15,
    pause: 0.68,
    pulses: 1.5,
    bounce: 0.18,
    lateral: 0.15,
    turn: 0.7,
    headTurn: 1,
    headTilt: 0.24,
    knee: 0.24,
    step: 0.2,
    chest: 0.24,
    armSway: 0.32,
  },
  // Small ready-up stretch through the chest and knees.
  {
    duration: 1.55,
    pause: 0.9,
    pulses: 1,
    bounce: 0.5,
    lateral: 0,
    turn: 0,
    headTurn: 0,
    headTilt: 0,
    knee: 0.62,
    step: 0,
    chest: 1,
    armSway: 0.36,
  },
  // Alternating foot rhythm while both soles stay visually planted.
  {
    duration: 1.9,
    pause: 0.78,
    pulses: 2,
    bounce: 0.36,
    lateral: 0.22,
    turn: -0.18,
    headTurn: 0.3,
    headTilt: -0.2,
    knee: 0.58,
    step: 0.78,
    chest: 0.42,
    armSway: -0.3,
  },
] as const;

const ZERO_MASCOT_MOTION: MascotMotion = {
  bounce: 0,
  lateral: 0,
  turn: 0,
  headTurn: 0,
  headTilt: 0,
  knee: 0,
  step: 0,
  chest: 0,
  armSway: 0,
};

function interpolateArmPose(from: PresenterArmPose, to: PresenterArmPose, progress: number) {
  return [
    THREE.MathUtils.lerp(from[0], to[0], progress),
    THREE.MathUtils.lerp(from[1], to[1], progress),
    THREE.MathUtils.lerp(from[2], to[2], progress),
  ] as const;
}

function interpolatePresenterGesture(
  current: PresenterGesture,
  next: PresenterGesture,
  transition: number
) {
  return {
    left: interpolateArmPose(current.left, next.left, transition),
    right: interpolateArmPose(current.right, next.right, transition),
  };
}

function interpolateBodyPose(
  current: PresenterBodyPose,
  next: PresenterBodyPose,
  transition: number
) {
  return {
    turn: THREE.MathUtils.lerp(current.turn, next.turn, transition),
    lean: THREE.MathUtils.lerp(current.lean, next.lean, transition),
    weight: THREE.MathUtils.lerp(current.weight, next.weight, transition),
    knee: THREE.MathUtils.lerp(current.knee, next.knee, transition),
    nod: THREE.MathUtils.lerp(current.nod, next.nod, transition),
  };
}

function interpolatePresenterBeat(
  current: PresenterSequenceBeat,
  next: PresenterSequenceBeat,
  transition: number
) {
  return {
    gesture: interpolatePresenterGesture(
      PRESENTER_GESTURES[current.gestureIndex],
      PRESENTER_GESTURES[next.gestureIndex],
      transition
    ),
    body: interpolateBodyPose(current.body, next.body, transition),
  };
}

function createShuffledIndexBag(length: number, previousIndex: number) {
  const indexes = Array.from({ length }, (_, index) => index);
  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [indexes[index], indexes[randomIndex]] = [indexes[randomIndex], indexes[index]];
  }

  if (indexes[0] === previousIndex) {
    const swapIndex = indexes.findIndex((index) => index !== previousIndex);
    [indexes[0], indexes[swapIndex]] = [indexes[swapIndex], indexes[0]];
  }
  return indexes;
}

function getMascotMotion(gesture: MascotGesture, elapsed: number): MascotMotion {
  if (elapsed >= gesture.duration) return ZERO_MASCOT_MOTION;

  const progress = THREE.MathUtils.clamp(elapsed / gesture.duration, 0, 1);
  const envelope = Math.sin(progress * Math.PI);
  const wave = Math.sin(progress * Math.PI * 2 * gesture.pulses);
  const positivePulse = Math.abs(wave) * envelope;
  const sweep = Math.sin(progress * Math.PI) * envelope;

  return {
    bounce: gesture.bounce * positivePulse,
    lateral: gesture.lateral * sweep,
    turn: gesture.turn * sweep,
    headTurn: gesture.headTurn * sweep,
    headTilt: gesture.headTilt * sweep,
    knee: gesture.knee * positivePulse,
    step: gesture.step * wave * envelope,
    chest: gesture.chest * positivePulse,
    armSway: gesture.armSway * wave * envelope,
  };
}

const OUTRO_WAVE_GESTURE: PresenterGesture = {
  left: [0.29, 1.2, 0.76],
  right: [0.43, 0.88, -0.72],
};

function getOutroGesture(start: PresenterGesture, progress: number) {
  if (progress < 0.32) {
    return interpolatePresenterGesture(
      start,
      OUTRO_WAVE_GESTURE,
      THREE.MathUtils.smoothstep(progress, 0, 0.32)
    );
  }
  if (progress < 0.68) {
    const wave = Math.sin(((progress - 0.32) / 0.36) * Math.PI * 2) * 0.13;
    return {
      left: OUTRO_WAVE_GESTURE.left,
      right: [
        OUTRO_WAVE_GESTURE.right[0],
        OUTRO_WAVE_GESTURE.right[1] + wave,
        OUTRO_WAVE_GESTURE.right[2] - wave * 0.55,
      ] as const,
    };
  }
  return interpolatePresenterGesture(
    OUTRO_WAVE_GESTURE,
    PRESENTER_GESTURES[0],
    THREE.MathUtils.smoothstep(progress, 0.68, 1)
  );
}

function applyPresenterArmPose(
  upperArm: THREE.Bone | null,
  forearm: THREE.Bone | null,
  pose: PresenterArmPose,
  direction: -1 | 1,
  time: number
) {
  if (!upperArm || !forearm) return;

  const breathing = Math.sin(time * 2.2 + direction * 0.7);
  const handAccent = Math.sin(time * 3.05 + direction * 0.9);
  upperArm.rotation.set(
    -0.16 + breathing * 0.018,
    direction * (pose[0] + breathing * 0.024),
    direction * (pose[1] + breathing * 0.028)
  );
  forearm.rotation.set(0, 0, direction * (pose[2] + handAccent * 0.05));
}

function applyIdleArmPose(
  upperArm: THREE.Bone | null,
  forearm: THREE.Bone | null,
  direction: -1 | 1,
  time: number,
  sway: number
) {
  if (!upperArm || !forearm) return;

  const breathing = Math.sin(time * 1.45 + direction * 0.6);
  upperArm.rotation.set(
    -0.16 + breathing * 0.006,
    direction * (0.24 + sway * 0.018),
    direction * (1.4 + breathing * 0.012 + sway * 0.026)
  );
  forearm.rotation.set(0, 0, direction * (0.34 - sway * 0.022));
}

function keepPresenterArmInFront(
  upperArm: THREE.Bone | null,
  forearm: THREE.Bone | null,
  direction: -1 | 1
) {
  if (!upperArm || !forearm) return;

  const shoulderBend = Math.max(0.68, Math.abs(upperArm.rotation.z));
  const signedElbowBend = forearm.rotation.z * direction;
  const maxCombinedBend = 2.05;
  const clampedElbowBend =
    signedElbowBend >= 0
      ? Math.min(signedElbowBend, Math.max(0.25, maxCombinedBend - shoulderBend))
      : Math.max(signedElbowBend, -1.08);
  const combinedBend = shoulderBend + Math.max(0, clampedElbowBend);
  const frontCorrection = THREE.MathUtils.smoothstep(combinedBend, 1.3, maxCombinedBend);

  upperArm.rotation.z = direction * shoulderBend;
  forearm.rotation.z = direction * clampedElbowBend;
  upperArm.rotation.x = THREE.MathUtils.lerp(-0.22, -0.44, frontCorrection);
  upperArm.rotation.y = direction * Math.max(0.22, Math.abs(upperArm.rotation.y));
}

function createSoftShadowTexture(coreOpacity = 0.52, midOpacity = 0.2) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Texture();

  const gradient = context.createRadialGradient(256, 128, 0, 256, 128, 232);
  gradient.addColorStop(0, `rgba(28, 30, 34, ${coreOpacity})`);
  gradient.addColorStop(0.38, `rgba(68, 72, 78, ${midOpacity})`);
  gradient.addColorStop(0.72, "rgba(42, 46, 52, 0.06)");
  gradient.addColorStop(1, "rgba(42, 46, 52, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  return new THREE.CanvasTexture(canvas);
}

function disposeObjectResources(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    objectMaterials.forEach((material) => materials.add(material));
  });

  materials.forEach((material) => {
    Object.values(material).forEach((value) => {
      if (value instanceof THREE.Texture) textures.add(value);
    });
    material.dispose();
  });
  geometries.forEach((geometry) => geometry.dispose());
  textures.forEach((texture) => texture.dispose());
}

export function HoloboxExperienceRobotPreviewPage({
  ariaLabel,
  audioUrl: audioUrlProp,
  embedded = false,
  enableNarration = false,
  onNarrationChange,
  onRobotActivate,
  script,
}: HoloboxExperienceRobotPreviewPageProps = {}) {
  const { t, i18n } = useTranslation();
  const viewportRef = useRef<HTMLDivElement>(null);
  const resolvedAriaLabel = ariaLabel || t("competencyKiosk.robotPreview");
  const defaultScript = t("competencyKiosk.defaultExperienceSpeech");
  const speechLanguage = i18n.resolvedLanguage || i18n.language || "en";

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    // Holobox is an animated presentation surface, so motion must survive production builds.
    // Deployments can still freeze it explicitly for constrained devices.
    const motionEnabled = import.meta.env.VITE_HOLOBOX_FORCE_MOTION !== "false";
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // These values intentionally match the current production Holobox scene.
    const camera = new THREE.PerspectiveCamera(37, 9 / 16, 0.1, 60);
    camera.position.set(0, 0.35, CAMERA_DISTANCE);
    camera.lookAt(0, 0.25, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    const getRenderPixelRatio = (width: number, height: number) => {
      const ratioByPixelBudget = Math.sqrt(720_000 / Math.max(1, width * height));
      return THREE.MathUtils.clamp(
        Math.min(window.devicePixelRatio, ratioByPixelBudget),
        0.65,
        1.35
      );
    };
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.68;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(getRenderPixelRatio(viewport.clientWidth, viewport.clientHeight));
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute("role", "button");
    renderer.domElement.setAttribute(
      "aria-label",
      enableNarration
        ? "Drag to rotate or reposition the robot, or tap it to play and pause the presentation"
        : "Drag or use the arrow keys to rotate and reposition the Three.js robot preview"
    );
    viewport.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnvironment = new RoomEnvironment();
    const environmentTexture = pmremGenerator.fromScene(roomEnvironment, 0.04).texture;
    scene.environment = environmentTexture;
    roomEnvironment.dispose();

    const wallMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.94,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const addSurface = (
      size: [number, number],
      position: [number, number, number],
      rotation: [number, number, number],
      material: THREE.Material
    ) => {
      const surface = new THREE.Mesh(new THREE.PlaneGeometry(...size), material);
      surface.position.set(...position);
      surface.rotation.set(...rotation);
      surface.receiveShadow = true;
      scene.add(surface);
    };
    addSurface([9, 15], [0, 0.3, -4.2], [0, 0, 0], wallMaterial);
    addSurface([8, 15], [-4.5, 0.3, -0.2], [0, Math.PI / 2, 0], wallMaterial);
    addSurface([8, 15], [4.5, 0.3, -0.2], [0, -Math.PI / 2, 0], wallMaterial);
    addSurface([9, 8], [0, -4.45, -0.2], [-Math.PI / 2, 0, 0], floorMaterial);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xffd8bb, 0.55));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.55);
    keyLight.position.set(-3.8, 6.2, 7.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -5;
    keyLight.shadow.camera.right = 5;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -6;
    keyLight.shadow.bias = -0.00025;
    keyLight.shadow.normalBias = 0.012;
    scene.add(keyLight);

    const warmFill = new THREE.DirectionalLight(0xffb56f, 0.3);
    warmFill.position.set(4.2, 1.6, 4.2);
    scene.add(warmFill);
    const cyanRim = new THREE.PointLight(0x70efff, 1.7, 10, 2);
    cyanRim.position.set(-1.8, 2.2, -1.7);
    scene.add(cyanRim);
    const orangeRim = new THREE.PointLight(0xff8c2a, 1.7, 9, 2);
    orangeRim.position.set(2.4, 0.2, -1.3);
    scene.add(orangeRim);

    let robotRoot: THREE.Group | null = null;
    let robotMixer: THREE.AnimationMixer | null = null;
    let eyeBlinkMeshes: THREE.Mesh[] = [];
    let leftUpperArm: THREE.Bone | null = null;
    let leftForearm: THREE.Bone | null = null;
    let rightUpperArm: THREE.Bone | null = null;
    let rightForearm: THREE.Bone | null = null;
    let leftUpperLeg: THREE.Bone | null = null;
    let leftLowerLeg: THREE.Bone | null = null;
    let rightUpperLeg: THREE.Bone | null = null;
    let rightLowerLeg: THREE.Bone | null = null;
    let head: THREE.Bone | null = null;
    let chest: THREE.Bone | null = null;
    let hip: THREE.Bone | null = null;
    let leftFoot: THREE.Bone | null = null;
    let rightFoot: THREE.Bone | null = null;
    let fixedAnimationTime: number | null = null;
    let presentationTime = 0;
    let disposed = false;
    viewport.dataset.modelState = "loading";
    viewport.setAttribute("aria-busy", "true");

    void loadExperienceDayRobot(renderer.capabilities.getMaxAnisotropy())
      .then(({ root, mixer, blinkMeshes }) => {
        if (disposed) return;

        robotRoot = root;
        robotMixer = mixer;
        eyeBlinkMeshes = blinkMeshes;
        leftUpperArm = root.getObjectByName("Presentation_L_UpperArm") as THREE.Bone | null;
        leftForearm = root.getObjectByName("Presentation_L_Forearm") as THREE.Bone | null;
        rightUpperArm = root.getObjectByName("Presentation_R_UpperArm") as THREE.Bone | null;
        rightForearm = root.getObjectByName("Presentation_R_Forearm") as THREE.Bone | null;
        leftUpperLeg = root.getObjectByName("Presentation_L_UpperLeg") as THREE.Bone | null;
        leftLowerLeg = root.getObjectByName("Presentation_L_LowerLeg") as THREE.Bone | null;
        rightUpperLeg = root.getObjectByName("Presentation_R_UpperLeg") as THREE.Bone | null;
        rightLowerLeg = root.getObjectByName("Presentation_R_LowerLeg") as THREE.Bone | null;
        head = root.getObjectByName("Presentation_Head") as THREE.Bone | null;
        chest = root.getObjectByName("Presentation_Chest") as THREE.Bone | null;
        hip = root.getObjectByName("Presentation_Hip") as THREE.Bone | null;
        leftFoot = root.getObjectByName("Presentation_L_Foot") as THREE.Bone | null;
        rightFoot = root.getObjectByName("Presentation_R_Foot") as THREE.Bone | null;
        const requestedAnimationTime = new URLSearchParams(window.location.search).get(
          "animationTime"
        );
        if (requestedAnimationTime !== null) {
          const animationTime = Number(requestedAnimationTime);
          if (Number.isFinite(animationTime)) {
            fixedAnimationTime = animationTime;
            robotMixer.setTime(animationTime);
            robotMixer.timeScale = 0;
          }
        }
        robotRoot.position.copy(EXPERIENCE_DAY_ROBOT_FRAME.position);
        robotRoot.scale.setScalar(EXPERIENCE_DAY_ROBOT_FRAME.scale);
        scene.add(robotRoot);
        viewport.dataset.modelState = "ready";
        viewport.setAttribute("aria-busy", "false");
      })
      .catch(() => {
        if (disposed) return;
        viewport.dataset.modelState = "error";
        viewport.setAttribute("aria-busy", "false");
      });

    const shadowTexture = createSoftShadowTexture(0.76, 0.34);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      toneMapped: false,
    });
    const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(4.45, 2.2), shadowMaterial);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.rotation.z = -0.12;
    contactShadow.position.set(0, -4.365, -0.08);
    scene.add(contactShadow);

    const footShadowTexture = createSoftShadowTexture(0.94, 0.44);
    const footShadowMaterial = new THREE.MeshBasicMaterial({
      map: footShadowTexture,
      transparent: true,
      opacity: 0.74,
      depthWrite: false,
      toneMapped: false,
    });
    const footShadow = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.82), footShadowMaterial);
    footShadow.rotation.x = -Math.PI / 2;
    footShadow.position.set(0, -4.34, 0.02);
    scene.add(footShadow);

    const query = new URLSearchParams(window.location.search);
    const speechScript =
      script?.trim() || query.get("script")?.trim() || query.get("text")?.trim() || defaultScript;
    const audioUrl = enableNarration ? audioUrlProp?.trim() || query.get("audio")?.trim() : null;
    const audio = new Audio();
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    if (audioUrl) audio.src = audioUrl;
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let analyserData: Uint8Array<ArrayBuffer> | null = null;
    let sourceNode: MediaElementAudioSourceNode | null = null;
    let speaking = false;
    let narrationActivatedByRobot = false;
    let motionState: "idle" | "narrating" | "outro" = "idle";
    let outroElapsed = 0;
    let outroStartGesture = PRESENTER_GESTURES[0];
    let lastRenderedPresenterGesture = PRESENTER_GESTURES[0];
    let speechPulse = 0;
    const setSpeaking = (value: boolean) => {
      speaking = value;
      onNarrationChange?.(value);
    };

    const unlockAudio = async () => {
      if (!audioContext) {
        const AudioContextConstructor =
          window.AudioContext || (window as AudioWindow).webkitAudioContext;
        if (AudioContextConstructor) audioContext = new AudioContextConstructor();
      }
      if (audioContext?.state === "suspended") await audioContext.resume();
    };
    const connectAnalyser = () => {
      if (!audioContext || sourceNode) return;
      sourceNode = audioContext.createMediaElementSource(audio);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.84;
      analyserData = new Uint8Array(analyser.frequencyBinCount);
      sourceNode.connect(analyser);
      analyser.connect(audioContext.destination);
    };
    const stopNarration = () => {
      audio.pause();
      window.speechSynthesis?.cancel();
      narrationActivatedByRobot = false;
      motionState = "idle";
      outroElapsed = 0;
      setSpeaking(false);
    };
    const finishNarrationNaturally = () => {
      if (!narrationActivatedByRobot) return;
      narrationActivatedByRobot = false;
      outroStartGesture = lastRenderedPresenterGesture;
      outroElapsed = 0;
      motionState = motionEnabled ? "outro" : "idle";
      setSpeaking(false);
    };
    const speakScript = () => {
      if (!("speechSynthesis" in window)) {
        narrationActivatedByRobot = false;
        motionState = "idle";
        return;
      }
      const utterance = new SpeechSynthesisUtterance(speechScript);
      utterance.lang = speechLanguage;
      utterance.rate = 0.94;
      utterance.pitch = 1.03;
      const voice = window.speechSynthesis
        .getVoices()
        .find((item) =>
          item.lang.toLowerCase().startsWith(speechLanguage.split("-")[0].toLowerCase())
        );
      if (voice) utterance.voice = voice;
      utterance.onstart = () => {
        motionState = "narrating";
        setSpeaking(true);
      };
      utterance.onboundary = () => {
        speechPulse = Math.min(1, speechPulse + 0.4);
      };
      utterance.onend = () => {
        finishNarrationNaturally();
      };
      utterance.onerror = () => {
        narrationActivatedByRobot = false;
        motionState = "idle";
        setSpeaking(false);
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    };
    const toggleNarration = async () => {
      if (!enableNarration) return;
      await unlockAudio();
      if (
        narrationActivatedByRobot &&
        (speaking || !audio.paused || window.speechSynthesis?.speaking)
      ) {
        stopNarration();
        return;
      }
      narrationActivatedByRobot = true;
      motionState = "narrating";
      outroElapsed = 0;
      speechPulse = 1;
      if (!audioUrl) {
        speakScript();
        return;
      }
      try {
        audio.currentTime = 0;
        // Audio playback must stay usable even if the visual analyser is unavailable.
        try {
          connectAnalyser();
        } catch {
          analyser = null;
          analyserData = null;
          sourceNode = null;
        }
        await audio.play();
        setSpeaking(true);
      } catch {
        narrationActivatedByRobot = false;
        motionState = "idle";
      }
    };
    audio.addEventListener("ended", () => {
      finishNarrationNaturally();
    });

    const raycaster = new THREE.Raycaster();
    const normalizedPointer = new THREE.Vector2();
    let dragging = false;
    let pointerId = -1;
    let pointerX = 0;
    let pointerY = 0;
    let startX = 0;
    let startY = 0;
    let dragDistance = 0;
    let targetYaw = 0;
    let currentYaw = 0;
    let targetVerticalOffset = 0;
    let currentVerticalOffset = 0;

    const activateRobot = (clientX: number, clientY: number) => {
      if (!enableNarration || !robotRoot) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      normalizedPointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1;
      normalizedPointer.y = -((clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(normalizedPointer, camera);
      if (raycaster.intersectObject(robotRoot, true).length === 0) return;
      onRobotActivate?.();
      void toggleNarration();
    };

    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      pointerX = event.clientX;
      pointerY = event.clientY;
      dragDistance = 0;
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.focus();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== pointerId) return;
      const deltaX = event.clientX - pointerX;
      const deltaY = event.clientY - pointerY;
      pointerX = event.clientX;
      pointerY = event.clientY;
      dragDistance += Math.hypot(deltaX, deltaY);
      targetYaw = THREE.MathUtils.clamp(targetYaw + deltaX * 0.006, -1.05, 1.05);
      targetVerticalOffset = THREE.MathUtils.clamp(
        targetVerticalOffset - deltaY * VERTICAL_DRAG_SENSITIVITY,
        MIN_VERTICAL_OFFSET,
        MAX_VERTICAL_OFFSET
      );
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== pointerId) return;
      dragging = false;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      if (dragDistance < 7 && Math.hypot(event.clientX - startX, event.clientY - startY) < 7) {
        activateRobot(event.clientX, event.clientY);
      }
    };
    const onDoubleClick = () => {
      targetYaw = 0;
      targetVerticalOffset = 0;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (enableNarration && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        onRobotActivate?.();
        void toggleNarration();
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        targetYaw = THREE.MathUtils.clamp(
          targetYaw + (event.key === "ArrowLeft" ? -0.16 : 0.16),
          -1.05,
          1.05
        );
      }
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        targetVerticalOffset = THREE.MathUtils.clamp(
          targetVerticalOffset + (event.key === "ArrowUp" ? 0.16 : -0.16),
          MIN_VERTICAL_OFFSET,
          MAX_VERTICAL_OFFSET
        );
      }
      if (event.key === "Home") {
        event.preventDefault();
        targetYaw = 0;
        targetVerticalOffset = 0;
      }
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);
    renderer.domElement.addEventListener("dblclick", onDoubleClick);
    renderer.domElement.addEventListener("keydown", onKeyDown);

    const clock = new THREE.Clock();
    let smoothedAudio = 0;
    let danceMode: ExperienceDayRobotDanceMode | null = null;
    let danceUntil = 0;
    let dancePhase = 0;
    let wasNarrating = false;
    let presenterSequenceBag: number[] = [];
    let currentPresenterSequenceIndex = 0;
    let nextPresenterSequenceIndex = 1;
    let presenterBeatIndex = 0;
    let presenterBeatElapsed = 0;
    let presenterBeatHold = 1.55;
    let presenterBeatTransition = 0.72;
    let mascotGestureBag: number[] = [];
    let currentMascotGestureIndex = 0;
    let mascotGestureElapsed = 0;
    let renderedMotionState: "idle" | "narrating" | "outro" = motionState;
    const drawPresenterSequence = (previousIndex: number) => {
      if (presenterSequenceBag.length === 0) {
        presenterSequenceBag = createShuffledIndexBag(PRESENTER_SEQUENCES.length, previousIndex);
      }
      return presenterSequenceBag.shift() ?? 0;
    };
    const randomizePresenterTiming = () => {
      presenterBeatHold = THREE.MathUtils.lerp(1.25, 1.95, Math.random());
      presenterBeatTransition = THREE.MathUtils.lerp(0.58, 0.88, Math.random());
    };
    const resetPresenterGestures = () => {
      presenterSequenceBag = createShuffledIndexBag(PRESENTER_SEQUENCES.length, -1);
      currentPresenterSequenceIndex = presenterSequenceBag.shift() ?? 0;
      nextPresenterSequenceIndex = drawPresenterSequence(currentPresenterSequenceIndex);
      presenterBeatIndex = 0;
      presenterBeatElapsed = 0;
      randomizePresenterTiming();
    };
    const updatePresenterGesture = (delta: number) => {
      presenterBeatElapsed += delta;
      const sequence = PRESENTER_SEQUENCES[currentPresenterSequenceIndex];
      const currentBeat = sequence.beats[presenterBeatIndex];
      const nextBeat =
        sequence.beats[presenterBeatIndex + 1] ??
        PRESENTER_SEQUENCES[nextPresenterSequenceIndex].beats[0];
      const transition = THREE.MathUtils.smoothstep(
        presenterBeatElapsed,
        presenterBeatHold,
        presenterBeatHold + presenterBeatTransition
      );
      const pose = interpolatePresenterBeat(currentBeat, nextBeat, transition);

      if (presenterBeatElapsed >= presenterBeatHold + presenterBeatTransition) {
        if (presenterBeatIndex < sequence.beats.length - 1) {
          presenterBeatIndex += 1;
        } else {
          currentPresenterSequenceIndex = nextPresenterSequenceIndex;
          nextPresenterSequenceIndex = drawPresenterSequence(currentPresenterSequenceIndex);
          presenterBeatIndex = 0;
        }
        presenterBeatElapsed = 0;
        randomizePresenterTiming();
      }
      return pose;
    };
    const drawMascotGesture = (previousIndex: number) => {
      if (mascotGestureBag.length === 0) {
        mascotGestureBag = createShuffledIndexBag(IDLE_MASCOT_GESTURES.length, previousIndex);
      }
      return mascotGestureBag.shift() ?? 0;
    };
    const resetMascotGestures = () => {
      mascotGestureBag = createShuffledIndexBag(IDLE_MASCOT_GESTURES.length, -1);
      currentMascotGestureIndex = mascotGestureBag.shift() ?? 0;
      mascotGestureElapsed = 0;
    };
    const updateMascotGesture = (delta: number) => {
      mascotGestureElapsed += delta;
      const gesture = IDLE_MASCOT_GESTURES[currentMascotGestureIndex];
      if (mascotGestureElapsed >= gesture.duration + gesture.pause) {
        currentMascotGestureIndex = drawMascotGesture(currentMascotGestureIndex);
        mascotGestureElapsed = 0;
        return ZERO_MASCOT_MOTION;
      }
      return getMascotMotion(gesture, mascotGestureElapsed);
    };
    resetMascotGestures();
    const onDanceCommand = (event: Event) => {
      const nextMode = (event as CustomEvent<ExperienceDayRobotDanceMode>).detail;
      if (!nextMode) return;
      danceMode = nextMode;
      danceUntil = clock.elapsedTime + (nextMode === "spin" ? 5.4 : 7);
      dancePhase = 0;
    };
    const readAudioLevel = (time: number) => {
      if (audioUrl && analyser && analyserData && !audio.paused) {
        analyser.getByteFrequencyData(analyserData);
        let energy = 0;
        const count = Math.min(48, analyserData.length);
        for (let index = 2; index < count; index += 1) energy += analyserData[index];
        return Math.min(1, energy / ((count - 2) * 150));
      }
      if (speaking || window.speechSynthesis?.speaking) {
        return THREE.MathUtils.clamp(
          0.35 + Math.sin(time * 12.4) * 0.2 + Math.sin(time * 7.1) * 0.14 + speechPulse * 0.3,
          0.08,
          1
        );
      }
      return 0;
    };
    window.addEventListener(EXPERIENCE_DAY_ROBOT_DANCE_EVENT, onDanceCommand);

    renderer.setAnimationLoop(() => {
      const delta = Math.min(clock.getDelta(), 0.05);
      const time = clock.elapsedTime;
      const motion = motionEnabled ? 1 : 0;
      smoothedAudio = THREE.MathUtils.damp(smoothedAudio, readAudioLevel(time), 8, delta);
      speechPulse *= Math.exp(-delta * 6.3);
      const danceActive = danceMode !== null && time < danceUntil;
      if (!danceActive) danceMode = null;
      dancePhase += delta * (danceMode === "spin" ? 2.25 : 4.1) * motion;
      if (robotMixer && fixedAnimationTime === null) {
        presentationTime += delta * motion;
      }
      const choreographyTime = fixedAnimationTime ?? presentationTime;
      const sideBeat = Math.sin(choreographyTime * Math.PI) * motion;
      const bounceBeat = Math.abs(sideBeat);
      const presentationYaw = getPresentationYaw(choreographyTime) * motion;
      const isNarrating =
        narrationActivatedByRobot &&
        (speaking ||
          Boolean(window.speechSynthesis?.speaking) ||
          (Boolean(audioUrl) && !audio.paused));
      if (isNarrating && !wasNarrating) {
        motionState = "narrating";
        resetPresenterGestures();
      }
      wasNarrating = isNarrating;
      if (motionState === "outro") {
        outroElapsed += delta * motion;
        if (outroElapsed >= OUTRO_DURATION) motionState = "idle";
      }
      if (motionState !== renderedMotionState) {
        if (motionState === "idle") resetMascotGestures();
        renderedMotionState = motionState;
      }
      const mascotMotion =
        motionState === "idle" ? updateMascotGesture(delta * motion) : ZERO_MASCOT_MOTION;
      const blinkClosure =
        Math.max(
          getBlinkClosure(choreographyTime),
          isNarrating ? getNarrationBlinkClosure(time) : 0
        ) * motion;
      const speechBeat = isNarrating ? 0.5 + Math.abs(Math.sin(time * 2.25)) * 0.5 : 0;
      const narrationTurn = isNarrating ? Math.sin(time * 0.78) * 0.115 * motion : 0;
      const narrationSway = isNarrating ? Math.sin(time * 1.35) * 0.018 * motion : 0;
      const narrationKneeDip = isNarrating
        ? -Math.pow(Math.abs(Math.sin(time * 2.8)), 1.55) * 0.045 * motion
        : 0;
      const mascotLift = mascotMotion.bounce * 0.085 * motion;
      const verticalPhase = (1 - Math.cos(time * FLOAT_SPEED)) * 0.5;
      const verticalBob = verticalPhase * FLOAT_TRAVEL * motion;
      const robotLift =
        verticalBob + (bounceBeat * 0.03 + speechBeat * 0.035 + smoothedAudio * 0.025) * motion;
      const danceBounce =
        danceMode === "bounce"
          ? Math.abs(Math.sin(dancePhase * 1.15)) * 0.22
          : danceMode === "wave"
            ? Math.sin(dancePhase * 0.9) * 0.035
            : 0;
      const danceSpin = danceMode === "spin" ? dancePhase * 0.58 : 0;
      currentYaw = THREE.MathUtils.damp(currentYaw, targetYaw, 8, delta);
      currentVerticalOffset = THREE.MathUtils.damp(
        currentVerticalOffset,
        targetVerticalOffset,
        10,
        delta
      );
      robotMixer?.update(delta * motion);

      let activePresenterGesture = PRESENTER_GESTURES[0];
      let activePresenterBody = NEUTRAL_BODY_POSE;
      if (isNarrating && danceMode !== "wave") {
        const pose = updatePresenterGesture(delta * motion);
        activePresenterGesture = pose.gesture;
        activePresenterBody = pose.body;
        lastRenderedPresenterGesture = pose.gesture;
      } else if (motionState === "outro" && danceMode !== "wave") {
        activePresenterGesture = getOutroGesture(
          outroStartGesture,
          THREE.MathUtils.clamp(outroElapsed / OUTRO_DURATION, 0, 1)
        );
        activePresenterBody = bodyPose(
          0.2,
          0.12,
          0.12,
          0.12,
          Math.sin((outroElapsed / OUTRO_DURATION) * Math.PI) * 0.32
        );
      }

      const jointEnergy = isNarrating || motionState === "outro" ? 1 : 0.38;
      const chestPulse = Math.sin(time * (isNarrating ? 2.15 : 1.2));
      const weightShift = Math.sin(time * (isNarrating ? 1.45 : 0.82));
      chest?.rotation.set(
        (chestPulse * 0.018 * jointEnergy +
          activePresenterBody.lean * 0.045 +
          mascotMotion.chest * 0.024) *
          motion,
        (weightShift * 0.026 * jointEnergy +
          activePresenterBody.turn * 0.055 +
          mascotMotion.turn * 0.025) *
          motion,
        (Math.sin(time * 1.75) * 0.014 * jointEnergy +
          activePresenterBody.weight * 0.038 +
          mascotMotion.lateral * 0.03) *
          motion
      );
      hip?.rotation.set(
        (-chestPulse * 0.009 * jointEnergy -
          activePresenterBody.lean * 0.018 -
          mascotMotion.chest * 0.01) *
          motion,
        (-weightShift * 0.018 * jointEnergy + activePresenterBody.turn * 0.026) * motion,
        (Math.sin(time * 2.25 + 0.7) * 0.016 * jointEnergy -
          activePresenterBody.weight * 0.03 -
          mascotMotion.lateral * 0.024) *
          motion
      );
      head?.rotation.set(
        (-activePresenterBody.nod * 0.075 + Math.sin(time * 1.1) * 0.006) * motion,
        (activePresenterBody.turn * 0.04 + mascotMotion.headTurn * 0.085) * motion,
        (activePresenterBody.weight * -0.025 + mascotMotion.headTilt * 0.052) * motion
      );

      if (danceMode === "wave") {
        const leftEmphasis = 0.5 + Math.sin(dancePhase * 1.15) * 0.5;
        const rightEmphasis = 1 - leftEmphasis;
        leftUpperArm?.rotation.set(
          0.02 + leftEmphasis * 0.025,
          0.22 + leftEmphasis * 0.08,
          THREE.MathUtils.lerp(1.4, 0.36, leftEmphasis)
        );
        leftForearm?.rotation.set(0, 0, THREE.MathUtils.lerp(0.4, 2.48, leftEmphasis));
        rightUpperArm?.rotation.set(
          0.02 - rightEmphasis * 0.025,
          -0.22 - rightEmphasis * 0.08,
          THREE.MathUtils.lerp(-1.4, -0.36, rightEmphasis)
        );
        rightForearm?.rotation.set(0, 0, THREE.MathUtils.lerp(-0.4, -2.48, rightEmphasis));
      }

      if ((isNarrating || motionState === "outro") && danceMode !== "wave") {
        applyPresenterArmPose(leftUpperArm, leftForearm, activePresenterGesture.left, 1, time);
        applyPresenterArmPose(rightUpperArm, rightForearm, activePresenterGesture.right, -1, time);
      } else if (danceMode !== "wave") {
        applyIdleArmPose(leftUpperArm, leftForearm, 1, time, mascotMotion.armSway);
        applyIdleArmPose(rightUpperArm, rightForearm, -1, time, mascotMotion.armSway);
      }

      if (isNarrating && motion > 0) {
        const stepPhase = time * 2.8;
        const leftStep = getElasticStepPulse(stepPhase);
        const rightStep = getElasticStepPulse(stepPhase + Math.PI);
        const sideRhythm = Math.sin(stepPhase) * 0.016;

        const sequenceKnee = activePresenterBody.knee * 0.035;
        const sequenceWeight = activePresenterBody.weight * 0.012;
        leftUpperLeg?.rotation.set(
          -0.025 - leftStep * 0.095 - sequenceKnee,
          0,
          0.014 + sideRhythm + sequenceWeight
        );
        leftLowerLeg?.rotation.set(
          0.025 + leftStep * 0.235 + sequenceKnee * 1.8,
          0,
          -0.01 - sideRhythm * 0.5
        );
        rightUpperLeg?.rotation.set(
          -0.025 - rightStep * 0.095 - sequenceKnee,
          0,
          -0.014 + sideRhythm + sequenceWeight
        );
        rightLowerLeg?.rotation.set(
          0.025 + rightStep * 0.235 + sequenceKnee * 1.8,
          0,
          0.01 - sideRhythm * 0.5
        );
        leftFoot?.rotation.set(-0.025 + leftStep * 0.075, 0, -sideRhythm * 0.75);
        rightFoot?.rotation.set(-0.025 + rightStep * 0.075, 0, -sideRhythm * 0.75);
      } else if (motionState === "idle") {
        const idleLeftStep = Math.max(0, mascotMotion.step);
        const idleRightStep = Math.max(0, -mascotMotion.step);
        const idleKnee = mascotMotion.knee;
        leftUpperLeg?.rotation.set(
          -0.012 - idleKnee * 0.042 - idleLeftStep * 0.022,
          0,
          0.008 + mascotMotion.lateral * 0.012
        );
        leftLowerLeg?.rotation.set(
          0.018 + idleKnee * 0.105 + idleLeftStep * 0.045,
          0,
          -mascotMotion.lateral * 0.006
        );
        rightUpperLeg?.rotation.set(
          -0.012 - idleKnee * 0.042 - idleRightStep * 0.022,
          0,
          -0.008 + mascotMotion.lateral * 0.012
        );
        rightLowerLeg?.rotation.set(
          0.018 + idleKnee * 0.105 + idleRightStep * 0.045,
          0,
          mascotMotion.lateral * 0.006
        );
        const idleAnkle = Math.sin(time * 1.35) * 0.01 * motion;
        leftFoot?.rotation.set(idleAnkle + idleLeftStep * 0.012, 0, 0);
        rightFoot?.rotation.set(-idleAnkle + idleRightStep * 0.012, 0, 0);
      } else {
        const outroSettle = 1 - THREE.MathUtils.clamp(outroElapsed / OUTRO_DURATION, 0, 1);
        leftUpperLeg?.rotation.set(-outroSettle * 0.018, 0, 0.006 * outroSettle);
        leftLowerLeg?.rotation.set(outroSettle * 0.045, 0, 0);
        rightUpperLeg?.rotation.set(-outroSettle * 0.018, 0, -0.006 * outroSettle);
        rightLowerLeg?.rotation.set(outroSettle * 0.045, 0, 0);
        leftFoot?.rotation.set(0, 0, 0);
        rightFoot?.rotation.set(0, 0, 0);
      }

      keepPresenterArmInFront(leftUpperArm, leftForearm, 1);
      keepPresenterArmInFront(rightUpperArm, rightForearm, -1);

      eyeBlinkMeshes.forEach((blinkMesh) => {
        blinkMesh.visible = blinkClosure > 0.01;
        blinkMesh.scale.y = Math.max(0.04, blinkClosure);
        if (blinkMesh.material instanceof THREE.MeshBasicMaterial) {
          blinkMesh.material.opacity = Math.min(1, blinkClosure * 1.5);
        }
      });

      if (robotRoot) {
        const gentleYaw = Math.sin(time * 0.55) * 0.065 * motion;
        robotRoot.rotation.y =
          currentYaw +
          presentationYaw +
          gentleYaw +
          narrationTurn +
          activePresenterBody.turn * 0.075 * motion +
          mascotMotion.turn * 0.075 * motion +
          Math.sin(time * 0.42) * 0.025 * motion +
          danceSpin;
        robotRoot.rotation.z =
          -sideBeat * 0.012 +
          activePresenterBody.weight * 0.018 * motion +
          mascotMotion.lateral * 0.022 * motion;
        robotRoot.position.x =
          EXPERIENCE_DAY_ROBOT_FRAME.position.x +
          sideBeat * 0.065 +
          narrationSway +
          mascotMotion.lateral * 0.075 * motion;
        robotRoot.position.y =
          EXPERIENCE_DAY_ROBOT_FRAME.position.y +
          currentVerticalOffset +
          robotLift +
          mascotLift +
          danceBounce +
          narrationKneeDip;
      }
      const shadowX = robotRoot?.position.x ?? EXPERIENCE_DAY_ROBOT_FRAME.position.x;
      const normalizedLift = THREE.MathUtils.clamp(
        (robotLift + mascotLift + danceBounce + narrationKneeDip + currentVerticalOffset) /
          SHADOW_LIFT_RANGE,
        0,
        1
      );
      contactShadow.position.x = shadowX + THREE.MathUtils.lerp(0.24, 0.42, normalizedLift);
      footShadow.position.x = shadowX;
      contactShadow.scale.set(
        THREE.MathUtils.lerp(1.06, 0.76, normalizedLift),
        THREE.MathUtils.lerp(1, 0.68, normalizedLift),
        1
      );
      footShadow.scale.set(
        THREE.MathUtils.lerp(1.04, 0.62, normalizedLift),
        THREE.MathUtils.lerp(1, 0.58, normalizedLift),
        1
      );
      shadowMaterial.opacity = THREE.MathUtils.lerp(0.82, 0.34, normalizedLift);
      footShadowMaterial.opacity = THREE.MathUtils.lerp(0.76, 0.25, normalizedLift);
      renderer.render(scene, camera);
    });

    const resize = () => {
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      const aspect = width / height;
      camera.aspect = aspect;
      camera.position.z =
        CAMERA_DISTANCE * Math.max(1, MIN_PRESENTATION_ASPECT / Math.max(aspect, 0.01));
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(getRenderPixelRatio(width, height));
      renderer.setSize(width, height, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(viewport);
    resize();

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      renderer.domElement.removeEventListener("dblclick", onDoubleClick);
      renderer.domElement.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(EXPERIENCE_DAY_ROBOT_DANCE_EVENT, onDanceCommand);
      stopNarration();
      void audioContext?.close();
      disposeObjectResources(scene);
      environmentTexture.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      delete viewport.dataset.modelState;
      viewport.removeAttribute("aria-busy");
    };
  }, [
    audioUrlProp,
    defaultScript,
    embedded,
    enableNarration,
    onNarrationChange,
    onRobotActivate,
    script,
    speechLanguage,
  ]);

  return (
    <main
      className={embedded ? "holobox-experience-robot-embedded" : "holobox-ai-only-page"}
      aria-label={resolvedAriaLabel}>
      <div
        ref={viewportRef}
        className={`holobox-three-viewport ${embedded ? "holobox-three-viewport--embedded" : ""}`}
      />
    </main>
  );
}
