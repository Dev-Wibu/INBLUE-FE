import { useEffect, useRef } from "react";
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
const DEFAULT_SCRIPT =
  "Xin ch\u00e0o. T\u00f4i l\u00e0 tr\u1ee3 l\u00fd AI c\u1ee7a Inblue. T\u00f4i \u0111ang tr\u00ecnh b\u00e0y k\u1ebft qu\u1ea3 \u0111\u00e1nh gi\u00e1 trong kh\u00f4ng gian Holobox.";

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

function keepPresenterArmInFront(
  upperArm: THREE.Bone | null,
  forearm: THREE.Bone | null,
  direction: -1 | 1
) {
  if (!upperArm || !forearm) return;

  const shoulderBend = Math.max(0.68, Math.abs(upperArm.rotation.z));
  const elbowBend = Math.abs(forearm.rotation.z);
  const maxCombinedBend = 2.05;
  const clampedElbowBend = Math.min(elbowBend, Math.max(0.35, maxCombinedBend - shoulderBend));
  const combinedBend = shoulderBend + clampedElbowBend;
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
  ariaLabel = "Experience Day robot Three.js preview",
  audioUrl: audioUrlProp,
  embedded = false,
  enableNarration = false,
  onNarrationChange,
  onRobotActivate,
  script,
}: HoloboxExperienceRobotPreviewPageProps = {}) {
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const forceHoloboxMotion = import.meta.env.VITE_HOLOBOX_FORCE_MOTION === "true";
    const reducedMotion =
      !forceHoloboxMotion && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
      .catch((error: unknown) => {
        if (disposed) return;
        viewport.dataset.modelState = "error";
        viewport.setAttribute("aria-busy", "false");
        console.error("Unable to load the Experience Day robot model.", error);
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
      script?.trim() || query.get("script")?.trim() || query.get("text")?.trim() || DEFAULT_SCRIPT;
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
      setSpeaking(false);
    };
    const speakScript = () => {
      if (!("speechSynthesis" in window)) return;
      const utterance = new SpeechSynthesisUtterance(speechScript);
      utterance.lang = "vi-VN";
      utterance.rate = 0.94;
      utterance.pitch = 1.03;
      const voice = window.speechSynthesis
        .getVoices()
        .find((item) => item.lang.toLowerCase().startsWith("vi"));
      if (voice) utterance.voice = voice;
      utterance.onstart = () => {
        setSpeaking(true);
      };
      utterance.onboundary = () => {
        speechPulse = Math.min(1, speechPulse + 0.4);
      };
      utterance.onend = () => {
        setSpeaking(false);
      };
      utterance.onerror = () => {
        setSpeaking(false);
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    };
    const toggleNarration = async () => {
      if (!enableNarration) return;
      await unlockAudio();
      if (speaking || !audio.paused || window.speechSynthesis?.speaking) {
        stopNarration();
        return;
      }
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
      } catch (error) {
        console.error("Unable to play the Holobox narration audio.", error);
      }
    };
    audio.addEventListener("ended", () => {
      setSpeaking(false);
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
      const motion = reducedMotion ? 0 : 1;
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
        speaking ||
        Boolean(window.speechSynthesis?.speaking) ||
        (Boolean(audioUrl) && !audio.paused);
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

      if (isNarrating && danceMode !== "wave") {
        // Keep a visible presenter pose even when the audio analyser reports very little energy.
        const leftEmphasis = 0.5 + Math.sin(time * 1.65) * 0.5;
        const rightEmphasis = 1 - leftEmphasis;
        const openClose = 0.5 + Math.sin(time * 1.85 + 0.4) * 0.5;
        const sharedOpening = (openClose - 0.5) * 0.18;
        const handWave = Math.sin(time * 3.1) * 0.14;
        leftUpperArm?.rotation.set(
          -0.16,
          THREE.MathUtils.lerp(0.25, 0.48, openClose) + leftEmphasis * 0.04,
          THREE.MathUtils.lerp(1.38, 0.78, leftEmphasis) - sharedOpening
        );
        leftForearm?.rotation.set(
          0,
          0,
          THREE.MathUtils.lerp(0.38, 1.72, leftEmphasis) +
            (1 - openClose) * 0.3 +
            handWave * (0.25 + leftEmphasis * 0.65)
        );
        rightUpperArm?.rotation.set(
          -0.16,
          -(THREE.MathUtils.lerp(0.25, 0.48, openClose) + rightEmphasis * 0.04),
          THREE.MathUtils.lerp(-1.38, -0.78, rightEmphasis) + sharedOpening
        );
        rightForearm?.rotation.set(
          0,
          0,
          THREE.MathUtils.lerp(-0.38, -1.72, rightEmphasis) -
            (1 - openClose) * 0.3 -
            handWave * (0.25 + rightEmphasis * 0.65)
        );
      }

      if (isNarrating && motion > 0) {
        const stepPhase = time * 2.8;
        const leftStep = getElasticStepPulse(stepPhase);
        const rightStep = getElasticStepPulse(stepPhase + Math.PI);
        const sideRhythm = Math.sin(stepPhase) * 0.016;

        leftUpperLeg?.rotation.set(-0.025 - leftStep * 0.095, 0, 0.014 + sideRhythm);
        leftLowerLeg?.rotation.set(0.025 + leftStep * 0.235, 0, -0.01 - sideRhythm * 0.5);
        rightUpperLeg?.rotation.set(-0.025 - rightStep * 0.095, 0, -0.014 + sideRhythm);
        rightLowerLeg?.rotation.set(0.025 + rightStep * 0.235, 0, 0.01 - sideRhythm * 0.5);
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
          Math.sin(time * 0.42) * 0.025 * motion +
          danceSpin;
        robotRoot.rotation.z = -sideBeat * 0.012;
        robotRoot.position.x =
          EXPERIENCE_DAY_ROBOT_FRAME.position.x + sideBeat * 0.065 + narrationSway;
        robotRoot.position.y =
          EXPERIENCE_DAY_ROBOT_FRAME.position.y +
          currentVerticalOffset +
          robotLift +
          danceBounce +
          narrationKneeDip;
      }
      const shadowX = robotRoot?.position.x ?? EXPERIENCE_DAY_ROBOT_FRAME.position.x;
      const normalizedLift = THREE.MathUtils.clamp(
        (robotLift + danceBounce + narrationKneeDip + currentVerticalOffset) / SHADOW_LIFT_RANGE,
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
  }, [audioUrlProp, embedded, enableNarration, onNarrationChange, onRobotActivate, script]);

  return (
    <main
      className={embedded ? "holobox-experience-robot-embedded" : "holobox-ai-only-page"}
      aria-label={ariaLabel}>
      <div
        ref={viewportRef}
        className={`holobox-three-viewport ${embedded ? "holobox-three-viewport--embedded" : ""}`}
      />
    </main>
  );
}
