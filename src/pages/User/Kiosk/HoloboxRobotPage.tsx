import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function createGradientTexture(
  direction: "horizontal" | "vertical" = "horizontal",
  reverse = false
) {
  const canvas = document.createElement("canvas");
  canvas.width = direction === "horizontal" ? 256 : 16;
  canvas.height = direction === "horizontal" ? 16 : 256;
  const context = canvas.getContext("2d");

  if (!context) return new THREE.Texture();

  const gradient =
    direction === "horizontal"
      ? context.createLinearGradient(0, 0, canvas.width, 0)
      : context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, reverse ? "rgba(124, 45, 18, 0)" : "rgba(124, 45, 18, 0.14)");
  gradient.addColorStop(1, reverse ? "rgba(124, 45, 18, 0.14)" : "rgba(124, 45, 18, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createContactShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");

  if (!context) return new THREE.Texture();

  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(124, 45, 18, 0.48)");
  gradient.addColorStop(0.48, "rgba(154, 52, 18, 0.18)");
  gradient.addColorStop(1, "rgba(124, 45, 18, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);

  return new THREE.CanvasTexture(canvas);
}

export function HoloboxRobotPage() {
  const { t, i18n } = useTranslation();
  const viewportRef = useRef<HTMLDivElement>(null);
  const speechLanguage = i18n.resolvedLanguage || i18n.language || "en";

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(38, 9 / 16, 0.1, 100);
    camera.position.set(0, 0.25, 17);
    camera.lookAt(0, 0.15, -0.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute("role", "button");
    renderer.domElement.setAttribute("aria-label", t("competencyKiosk.robotAudioControl"));
    viewport.appendChild(renderer.domElement);

    // =====================================================================
    // PHẦN 1 — PHÒNG 3D HOLOBOX: 3 TƯỜNG, SÀN, AO GÓC VÀ SHADOW MAP
    // =====================================================================
    const roomMaterial = new THREE.MeshStandardMaterial({
      color: 0xfffbf7,
      roughness: 0.86,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const sideWallMaterial = new THREE.MeshStandardMaterial({
      color: 0xffefe3,
      roughness: 0.9,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff4ea,
      roughness: 0.92,
      metalness: 0,
      side: THREE.DoubleSide,
    });

    const addRoomSurface = (
      geometry: THREE.BufferGeometry,
      position: THREE.Vector3,
      rotation: THREE.Euler,
      receiveShadow = false,
      material: THREE.Material = roomMaterial
    ) => {
      const surface = new THREE.Mesh(geometry, material);
      surface.position.copy(position);
      surface.rotation.copy(rotation);
      surface.receiveShadow = receiveShadow;
      scene.add(surface);
      return surface;
    };

    addRoomSurface(
      new THREE.PlaneGeometry(5.4, 9.8),
      new THREE.Vector3(0, 0.45, -3.4),
      new THREE.Euler(0, 0, 0)
    );
    addRoomSurface(
      new THREE.PlaneGeometry(5.2, 9.8),
      new THREE.Vector3(-2.7, 0.45, -0.8),
      new THREE.Euler(0, Math.PI / 2, 0),
      false,
      sideWallMaterial
    );
    addRoomSurface(
      new THREE.PlaneGeometry(5.2, 9.8),
      new THREE.Vector3(2.7, 0.45, -0.8),
      new THREE.Euler(0, -Math.PI / 2, 0),
      false,
      sideWallMaterial
    );
    addRoomSurface(
      new THREE.PlaneGeometry(5.4, 5.2),
      new THREE.Vector3(0, -4.45, -0.8),
      new THREE.Euler(-Math.PI / 2, 0, 0),
      true,
      floorMaterial
    );
    addRoomSurface(
      new THREE.PlaneGeometry(5.4, 5.2),
      new THREE.Vector3(0, 5.35, -0.8),
      new THREE.Euler(Math.PI / 2, 0, 0),
      false,
      roomMaterial
    );

    // Khung tối phía trước làm căn phòng đọc như một chiếc Holobox vật lý có chiều sâu.
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x101419,
      roughness: 0.42,
      metalness: 0.62,
    });
    const innerTrimMaterial = new THREE.MeshStandardMaterial({
      color: 0x51636b,
      roughness: 0.34,
      metalness: 0.72,
    });
    const addFrameBar = (
      size: [number, number, number],
      position: [number, number, number],
      material: THREE.Material = frameMaterial
    ) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      bar.position.set(...position);
      bar.castShadow = true;
      bar.receiveShadow = true;
      scene.add(bar);
    };

    addFrameBar([0.48, 10.7, 0.52], [-2.96, 0.45, 1.95]);
    addFrameBar([0.48, 10.7, 0.52], [2.96, 0.45, 1.95]);
    addFrameBar([6.4, 0.5, 0.52], [0, 5.55, 1.95]);
    addFrameBar([6.4, 0.5, 0.72], [0, -4.65, 1.85]);
    addFrameBar([0.08, 9.8, 0.1], [-2.73, 0.45, 1.7], innerTrimMaterial);
    addFrameBar([0.08, 9.8, 0.1], [2.73, 0.45, 1.7], innerTrimMaterial);
    addFrameBar([5.48, 0.08, 0.1], [0, 5.31, 1.7], innerTrimMaterial);
    addFrameBar([5.48, 0.08, 0.1], [0, -4.41, 1.7], innerTrimMaterial);

    const addCornerShade = (
      width: number,
      height: number,
      position: THREE.Vector3,
      texture: THREE.Texture
    ) => {
      const shade = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
          toneMapped: false,
        })
      );
      shade.position.copy(position);
      scene.add(shade);
    };

    addCornerShade(0.72, 9.7, new THREE.Vector3(-2.34, 0.45, -3.37), createGradientTexture());
    addCornerShade(
      0.72,
      9.7,
      new THREE.Vector3(2.34, 0.45, -3.37),
      createGradientTexture("horizontal", true)
    );
    addCornerShade(
      5.3,
      0.8,
      new THREE.Vector3(0, -4.04, -3.36),
      createGradientTexture("vertical", true)
    );

    scene.add(new THREE.AmbientLight(0xffffff, 0.82));
    scene.add(new THREE.HemisphereLight(0xfff4e6, 0x5b2b12, 0.72));

    const keyLight = new THREE.DirectionalLight(0xffffff, 4.8);
    keyLight.position.set(1.4, 8.8, 5.5);
    keyLight.target.position.set(0, -0.8, -0.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 35;
    keyLight.shadow.camera.left = -7;
    keyLight.shadow.camera.right = 7;
    keyLight.shadow.camera.top = 9;
    keyLight.shadow.camera.bottom = -7;
    keyLight.shadow.bias = -0.00045;
    keyLight.shadow.normalBias = 0.025;
    keyLight.shadow.radius = 7;
    keyLight.shadow.blurSamples = 16;
    scene.add(keyLight, keyLight.target);

    const orangeRim = new THREE.PointLight(0xfb923c, 22, 22, 2);
    orangeRim.position.set(-3.8, 2.8, 3.8);
    scene.add(orangeRim);

    const warmFill = new THREE.PointLight(0xf97316, 10, 18, 2);
    warmFill.position.set(3.4, -1.2, 3.2);
    scene.add(warmFill);

    const ceilingLight = new THREE.PointLight(0xffffff, 28, 13, 2);
    ceilingLight.position.set(0, 4.7, 0.8);
    scene.add(ceilingLight);

    // =====================================================================
    // PHẦN 2 — ROBOT 3D TOÀN THÂN ĐỨNG TRONG HOLOBOX
    // =====================================================================
    const robotGroup = new THREE.Group();
    const robotBaseY = -0.25;
    const robotBaseScale = 0.96;
    robotGroup.position.set(0, robotBaseY, 0);
    robotGroup.scale.setScalar(robotBaseScale);
    scene.add(robotGroup);

    const shellMaterial = new THREE.MeshStandardMaterial({
      color: 0xfffbf2,
      roughness: 0.3,
      metalness: 0.36,
      emissive: 0x5f2306,
      emissiveIntensity: 0.08,
    });
    const darkMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.22,
      metalness: 0.25,
      emissive: 0x2a0f03,
      emissiveIntensity: 0.28,
    });
    const orangeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffb86b,
      emissive: 0xf97316,
      emissiveIntensity: 2.6,
      roughness: 0.12,
      metalness: 0.05,
    });

    const addMesh = (
      geometry: THREE.BufferGeometry,
      material: THREE.Material,
      parent: THREE.Object3D,
      position: THREE.Vector3,
      rotation = new THREE.Euler()
    ) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.rotation.copy(rotation);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    const head = addMesh(
      new RoundedBoxGeometry(2.65, 1.85, 1.05, 8, 0.24),
      shellMaterial,
      robotGroup,
      new THREE.Vector3(0, 2.05, 0)
    );
    const face = addMesh(
      new RoundedBoxGeometry(2.12, 1.2, 0.16, 6, 0.2),
      darkMaterial,
      head,
      new THREE.Vector3(0, 0, 0.58)
    );
    const leftEye = addMesh(
      new THREE.SphereGeometry(0.18, 20, 12),
      orangeMaterial,
      face,
      new THREE.Vector3(-0.48, 0.1, 0.12)
    );
    leftEye.scale.set(1.5, 0.65, 0.45);
    const rightEye = leftEye.clone();
    rightEye.position.x = 0.48;
    face.add(rightEye);

    const mouth = addMesh(
      new RoundedBoxGeometry(0.66, 0.1, 0.08, 3, 0.035),
      orangeMaterial,
      face,
      new THREE.Vector3(0, -0.3, 0.13)
    );
    addMesh(
      new THREE.CylinderGeometry(0.16, 0.2, 0.42, 18),
      shellMaterial,
      robotGroup,
      new THREE.Vector3(0, 0.92, 0)
    );

    const body = addMesh(
      new RoundedBoxGeometry(2.55, 2.35, 1.2, 8, 0.28),
      shellMaterial,
      robotGroup,
      new THREE.Vector3(0, -0.35, 0)
    );
    const chest = addMesh(
      new RoundedBoxGeometry(1.55, 1.48, 0.18, 6, 0.18),
      darkMaterial,
      body,
      new THREE.Vector3(0, 0.05, 0.68)
    );
    const core = addMesh(
      new THREE.SphereGeometry(0.26, 24, 18),
      orangeMaterial,
      chest,
      new THREE.Vector3(0, -0.28, 0.16)
    );
    const coreHalo = addMesh(
      new THREE.TorusGeometry(0.43, 0.03, 10, 60),
      orangeMaterial,
      chest,
      new THREE.Vector3(0, -0.28, 0.17)
    );

    const leftShoulder = addMesh(
      new THREE.SphereGeometry(0.48, 22, 16),
      shellMaterial,
      robotGroup,
      new THREE.Vector3(-1.48, 0.32, 0)
    );
    leftShoulder.scale.set(0.72, 1.15, 0.88);
    const rightShoulder = leftShoulder.clone();
    rightShoulder.position.x = 1.48;
    robotGroup.add(rightShoulder);

    const leftArm = addMesh(
      new THREE.CapsuleGeometry(0.3, 1.15, 8, 16),
      darkMaterial,
      robotGroup,
      new THREE.Vector3(-1.62, -0.65, 0),
      new THREE.Euler(0, 0, -0.12)
    );
    const rightArm = addMesh(
      new THREE.CapsuleGeometry(0.3, 1.15, 8, 16),
      darkMaterial,
      robotGroup,
      new THREE.Vector3(1.62, -0.65, 0),
      new THREE.Euler(0, 0, 0.12)
    );

    addMesh(
      new RoundedBoxGeometry(1.72, 0.55, 1, 6, 0.18),
      shellMaterial,
      robotGroup,
      new THREE.Vector3(0, -1.72, 0)
    );
    const leftLeg = addMesh(
      new THREE.CapsuleGeometry(0.34, 1.65, 8, 16),
      darkMaterial,
      robotGroup,
      new THREE.Vector3(-0.55, -2.85, 0)
    );
    const rightLeg = addMesh(
      new THREE.CapsuleGeometry(0.34, 1.65, 8, 16),
      darkMaterial,
      robotGroup,
      new THREE.Vector3(0.55, -2.85, 0)
    );
    const leftFoot = addMesh(
      new RoundedBoxGeometry(0.82, 0.42, 1.18, 5, 0.14),
      shellMaterial,
      robotGroup,
      new THREE.Vector3(-0.55, -4.12, 0.25)
    );
    const rightFoot = addMesh(
      new RoundedBoxGeometry(0.82, 0.42, 1.18, 5, 0.14),
      shellMaterial,
      robotGroup,
      new THREE.Vector3(0.55, -4.12, 0.25)
    );
    leftLeg.rotation.z = -0.015;
    rightLeg.rotation.z = 0.015;
    leftFoot.rotation.y = -0.035;
    rightFoot.rotation.y = 0.035;

    const antenna = addMesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.7, 10),
      orangeMaterial,
      robotGroup,
      new THREE.Vector3(0, 3.3, 0)
    );
    addMesh(
      new THREE.SphereGeometry(0.11, 16, 12),
      orangeMaterial,
      antenna,
      new THREE.Vector3(0, 0.4, 0)
    );

    const contactShadowMaterial = new THREE.MeshBasicMaterial({
      map: createContactShadowTexture(),
      transparent: true,
      depthTest: false,
      depthWrite: false,
      opacity: 0.55,
      toneMapped: false,
    });
    const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 3.2), contactShadowMaterial);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, -4.42, 0.35);
    contactShadow.renderOrder = 3;
    scene.add(contactShadow);

    // =====================================================================
    // PHẦN 3 — AUDIO/TTS ẨN: CHẠM ROBOT ĐỂ PHÁT, CHẠM LẠI ĐỂ DỪNG
    // URL tùy chỉnh: ?audio=/audio/robot.mp3 hoặc ?text=Xin%20chào
    // =====================================================================
    const query = new URLSearchParams(window.location.search);
    const audioUrl = query.get("audio");
    const speechText = query.get("text")?.trim() || t("competencyKiosk.defaultRobotSpeech");
    const audio = new Audio();
    audio.preload = "metadata";
    if (audioUrl) audio.src = audioUrl;

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let analyserData: Uint8Array<ArrayBuffer> | null = null;
    let speechMode: "audio" | "tts" | null = null;
    let robotTapPulse = 0;

    const unlockAudio = async () => {
      if (!audioContext) {
        const AudioContextConstructor =
          window.AudioContext || (window as AudioWindow).webkitAudioContext;
        if (!AudioContextConstructor) return;

        audioContext = new AudioContextConstructor();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.78;
        analyserData = new Uint8Array(analyser.frequencyBinCount);
        const source = audioContext.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
      }

      if (audioContext.state !== "running") await audioContext.resume();
    };

    const stopAudio = () => {
      audio.pause();
      window.speechSynthesis?.cancel();
      speechMode = null;
    };

    const speak = () => {
      if (!("speechSynthesis" in window)) return;
      const voices = window.speechSynthesis.getVoices();
      const languageCode = speechLanguage.split("-")[0].toLowerCase();
      const voice =
        voices.find((item) => item.lang.toLowerCase().startsWith(languageCode)) ?? voices[0];
      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.lang = voice?.lang || speechLanguage;
      utterance.voice = voice ?? null;
      utterance.rate = 0.96;
      utterance.pitch = 1;
      utterance.onstart = () => {
        speechMode = "tts";
      };
      utterance.onend = () => {
        speechMode = null;
      };
      utterance.onerror = () => {
        speechMode = null;
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    };

    const toggleAudio = async () => {
      robotTapPulse = 1;
      const isSpeaking =
        speechMode ||
        !audio.paused ||
        window.speechSynthesis?.speaking ||
        window.speechSynthesis?.pending;

      if (isSpeaking) {
        stopAudio();
        return;
      }

      if (audioUrl) {
        try {
          await unlockAudio();
          await audio.play();
        } catch {
          // Intentionally ignored.
        }
        return;
      }

      speak();
    };

    audio.addEventListener("play", () => {
      speechMode = "audio";
    });
    audio.addEventListener("pause", () => {
      if (!audio.ended) speechMode = null;
    });
    audio.addEventListener("ended", () => {
      speechMode = null;
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const isPointerOnRobot = (event: PointerEvent | MouseEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObject(robotGroup, true).length > 0;
    };

    const handlePointerMove = (event: PointerEvent) => {
      renderer.domElement.style.cursor = isPointerOnRobot(event) ? "pointer" : "default";
    };
    const handleClick = (event: MouseEvent) => {
      if (isPointerOnRobot(event)) void toggleAudio();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      void toggleAudio();
    };
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("click", handleClick);
    renderer.domElement.addEventListener("keydown", handleKeyDown);

    const clock = new THREE.Clock();
    const readAudioLevel = (time: number) => {
      if (speechMode === "audio" && analyser && analyserData && !audio.paused) {
        analyser.getByteFrequencyData(analyserData);
        const usefulBins = Math.min(48, analyserData.length);
        let total = 0;
        for (let index = 0; index < usefulBins; index += 1) total += analyserData[index] ?? 0;
        return Math.min(1, total / usefulBins / 128);
      }

      if (speechMode === "tts") {
        return 0.28 + Math.abs(Math.sin(time * 12.4) * Math.sin(time * 7.1)) * 0.72;
      }

      return 0;
    };

    const animate = () => {
      const time = clock.getElapsedTime();
      const motionScale = prefersReducedMotion ? 0 : 1;
      const audioLevel = readAudioLevel(time);
      const standingMotion = Math.sin(time * 0.72) * 0.025 * motionScale;

      robotTapPulse *= 0.86;
      robotGroup.position.y = robotBaseY + standingMotion + audioLevel * 0.012;
      robotGroup.scale.setScalar(robotBaseScale * (1 + robotTapPulse * 0.035));
      robotGroup.rotation.y = Math.sin(time * 0.34) * 0.075 * motionScale;
      robotGroup.rotation.x = Math.sin(time * 0.22) * 0.01 * motionScale;
      head.rotation.y = Math.sin(time * 0.52) * 0.08 * motionScale;
      head.rotation.x = speechMode ? Math.sin(time * 4.8) * 0.025 * motionScale : 0;
      mouth.scale.y = 1 + audioLevel * 5.5;
      mouth.scale.x = 1 + audioLevel * 0.34;
      core.scale.setScalar(1 + audioLevel * 0.22 + Math.sin(time * 2.2) * 0.04 * motionScale);
      coreHalo.rotation.z = time * 0.55 * motionScale;
      leftArm.rotation.z = -0.12 - audioLevel * 0.12 + Math.sin(time * 0.8) * 0.035 * motionScale;
      rightArm.rotation.z = 0.12 + audioLevel * 0.12 - Math.sin(time * 0.8) * 0.035 * motionScale;
      leftLeg.rotation.x = Math.sin(time * 0.55) * 0.012 * motionScale;
      rightLeg.rotation.x = -Math.sin(time * 0.55) * 0.012 * motionScale;
      contactShadow.scale.setScalar(1 + Math.sin(time * 0.72) * 0.018 * motionScale);
      contactShadowMaterial.opacity = 0.42 - standingMotion * 0.8;
      renderer.render(scene, camera);
    };

    const resize = () => {
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height, false);
    };

    window.addEventListener("resize", resize);
    resize();
    renderer.setAnimationLoop(animate);

    return () => {
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("click", handleClick);
      renderer.domElement.removeEventListener("keydown", handleKeyDown);
      stopAudio();
      void audioContext?.close();
      renderer.setAnimationLoop(null);
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Points)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          Object.values(material).forEach((value) => {
            if (value instanceof THREE.Texture) value.dispose();
          });
          material.dispose();
        });
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [speechLanguage, t]);

  return (
    <main className="holobox-robot-only-page">
      <div ref={viewportRef} className="holobox-three-viewport" />
    </main>
  );
}
