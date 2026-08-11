import type { LucideIcon } from "lucide-react";
import { Activity, RotateCw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const DEFAULT_SCRIPT =
  "Xin chào. Tôi là trợ lý AI của Inblue. Tôi đang trình bày kết quả đánh giá trong không gian Holobox.";

const DANCE_EVENT = "holobox:robot-dance";

type HoloboxDanceMode = "bounce" | "wave" | "spin";

const DANCE_CONTROLS: Array<{
  mode: HoloboxDanceMode;
  label: string;
  title: string;
  Icon: LucideIcon;
}> = [
  { mode: "bounce", label: "Nhún", title: "Cho robot nhún nhảy", Icon: Activity },
  { mode: "wave", label: "Quơ tay", title: "Cho robot quơ tay thuyết trình", Icon: Sparkles },
  { mode: "spin", label: "Xoay", title: "Cho robot xoay ngang", Icon: RotateCw },
];

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

type HoloboxThreeRobotPageProps = {
  script?: string;
};

function createSoftShadowTexture(coreOpacity = 0.5, midOpacity = 0.22) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Texture();

  const gradient = context.createRadialGradient(256, 128, 0, 256, 128, 230);
  gradient.addColorStop(0, `rgba(124, 45, 18, ${coreOpacity})`);
  gradient.addColorStop(0.34, `rgba(194, 65, 12, ${midOpacity})`);
  gradient.addColorStop(0.66, "rgba(249, 115, 22, 0.08)");
  gradient.addColorStop(1, "rgba(249, 115, 22, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  return new THREE.CanvasTexture(canvas);
}

export function HoloboxThreeRobotPage({ script }: HoloboxThreeRobotPageProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const danceResetTimerRef = useRef<number | null>(null);
  const [showDanceControls, setShowDanceControls] = useState(false);
  const [activeDanceMode, setActiveDanceMode] = useState<HoloboxDanceMode | null>(null);

  const triggerDance = (mode: HoloboxDanceMode) => {
    setShowDanceControls(true);
    setActiveDanceMode(mode);
    window.dispatchEvent(new CustomEvent<HoloboxDanceMode>(DANCE_EVENT, { detail: mode }));
    if (danceResetTimerRef.current !== null) window.clearTimeout(danceResetTimerRef.current);
    danceResetTimerRef.current = window.setTimeout(
      () => setActiveDanceMode((currentMode) => (currentMode === mode ? null : currentMode)),
      mode === "spin" ? 5600 : 7200
    );
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const query = new URLSearchParams(window.location.search);
    const speechScript =
      script?.trim() || query.get("script")?.trim() || query.get("text")?.trim() || DEFAULT_SCRIPT;
    const audioUrl = query.get("audio")?.trim();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(37, 9 / 16, 0.1, 60);
    camera.position.set(0, 0.35, 13.5);
    camera.lookAt(0, 0.25, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    const getRenderPixelRatio = (width: number, height: number) => {
      // Giữ drawing buffer quanh 720K pixel: đủ nét cho Holobox 9:16 và nhẹ trên GPU laptop.
      const ratioByPixelBudget = Math.sqrt(720_000 / Math.max(1, width * height));
      return THREE.MathUtils.clamp(
        Math.min(window.devicePixelRatio, ratioByPixelBudget),
        0.65,
        1.35
      );
    };
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(getRenderPixelRatio(viewport.clientWidth, viewport.clientHeight));
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute("role", "button");
    renderer.domElement.setAttribute(
      "aria-label",
      "Kéo để xoay robot 3D, chạm để phát hoặc dừng phần thuyết minh"
    );
    viewport.appendChild(renderer.domElement);

    // Phòng trắng thuần, chỉ dùng hình học để tạo chiều sâu và mặt sàn nhận bóng.
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

    scene.add(new THREE.HemisphereLight(0xffffff, 0xffdfc2, 2.2));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(-3.8, 6.2, 7.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(512, 512);
    keyLight.shadow.camera.left = -5;
    keyLight.shadow.camera.right = 5;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -6;
    keyLight.shadow.bias = -0.00025;
    keyLight.shadow.normalBias = 0.012;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffc08a, 1.1);
    fillLight.position.set(4, 1.5, 4);
    scene.add(fillLight);
    const orangeRim = new THREE.PointLight(0xfb923c, 13, 9, 2);
    orangeRim.position.set(0, 1, -1.8);
    scene.add(orangeRim);

    // -------------------------------------------------------------------
    // ROBOT 3D: mỗi bộ phận là mesh thật, không còn dùng PNG billboard.
    // -------------------------------------------------------------------
    const shellMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf9fcff,
      roughness: 0.13,
      metalness: 0.16,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    });
    const shellShadowMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf1ebe4,
      roughness: 0.2,
      metalness: 0.3,
      clearcoat: 0.82,
      clearcoatRoughness: 0.12,
    });
    const graphiteMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x10171d,
      roughness: 0.16,
      metalness: 0.82,
      clearcoat: 0.7,
      clearcoatRoughness: 0.1,
    });
    const steelMaterial = new THREE.MeshStandardMaterial({
      color: 0x667681,
      roughness: 0.19,
      metalness: 0.92,
    });
    const faceMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x010407,
      roughness: 0.025,
      metalness: 0.74,
      clearcoat: 1,
      clearcoatRoughness: 0.025,
    });
    const orangeMaterial = new THREE.MeshStandardMaterial({
      color: 0xff9f3f,
      emissive: 0xf97316,
      emissiveIntensity: 1.55,
      roughness: 0.11,
      metalness: 0.24,
    });
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffc27a,
      emissive: 0xfb923c,
      emissiveIntensity: 2.45,
      roughness: 0.045,
      metalness: 0.04,
    });
    const visorGlintMaterial = new THREE.MeshBasicMaterial({
      color: 0xe9fbff,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      toneMapped: false,
    });

    const robotRoot = new THREE.Group();
    robotRoot.position.set(0, 0.45, 0.1);
    // Đầu lớn đúng tỷ lệ mẫu nhưng vẫn giữ trọn hai tay trong khung Holobox 9:16.
    robotRoot.scale.setScalar(0.9);
    scene.add(robotRoot);

    const robotMeshes: THREE.Mesh[] = [];
    const addRobotMesh = (
      geometry: THREE.BufferGeometry,
      material: THREE.Material,
      parent: THREE.Object3D,
      position = new THREE.Vector3(),
      rotation = new THREE.Euler()
    ) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.rotation.copy(rotation);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      robotMeshes.push(mesh);
      return mesh;
    };

    const createRoundedPanelGeometry = (
      width: number,
      height: number,
      radius: number,
      depth: number
    ) => {
      const left = -width / 2;
      const right = width / 2;
      const bottom = -height / 2;
      const top = height / 2;
      const shape = new THREE.Shape();
      shape.moveTo(left + radius, bottom);
      shape.lineTo(right - radius, bottom);
      shape.quadraticCurveTo(right, bottom, right, bottom + radius);
      shape.lineTo(right, top - radius);
      shape.quadraticCurveTo(right, top, right - radius, top);
      shape.lineTo(left + radius, top);
      shape.quadraticCurveTo(left, top, left, top - radius);
      shape.lineTo(left, bottom + radius);
      shape.quadraticCurveTo(left, bottom, left + radius, bottom);
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        steps: 1,
        bevelEnabled: true,
        bevelSegments: 4,
        bevelSize: 0.035,
        bevelThickness: 0.025,
        curveSegments: 20,
      });
      geometry.center();
      return geometry;
    };

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 2.08, 0);
    robotRoot.add(headGroup);

    // Đầu bầu lớn, mặt kính đen bo sâu và viền trắng mảnh như robot tham chiếu.
    const headShell = addRobotMesh(
      new THREE.SphereGeometry(1.66, 64, 48),
      shellMaterial,
      headGroup
    );
    headShell.scale.set(1.09, 0.84, 0.84);
    const faceBezel = addRobotMesh(
      createRoundedPanelGeometry(2.92, 1.82, 0.5, 0.16),
      shellShadowMaterial,
      headGroup,
      new THREE.Vector3(0, -0.08, 1.34)
    );
    faceBezel.scale.x = 1.015;
    const face = addRobotMesh(
      createRoundedPanelGeometry(2.72, 1.62, 0.45, 0.12),
      faceMaterial,
      headGroup,
      new THREE.Vector3(0, -0.08, 1.48)
    );
    addRobotMesh(
      new RoundedBoxGeometry(1.72, 0.075, 0.018, 3, 0.025),
      visorGlintMaterial,
      face,
      new THREE.Vector3(-0.18, 0.56, 0.1),
      new THREE.Euler(0, 0, -0.025)
    );

    // Các chấm LED tạo vòng mắt điện tử thay cho một vòng torus phẳng.
    const ledDotGeometry = new THREE.SphereGeometry(0.022, 8, 6);
    const addLedEye = (parent: THREE.Object3D) => {
      const ledRows = [
        { radius: 0.235, count: 24 },
        { radius: 0.285, count: 30 },
        { radius: 0.335, count: 36 },
      ];
      const ledCount = ledRows.reduce((total, row) => total + row.count, 0);
      const ledDots = new THREE.InstancedMesh(ledDotGeometry, eyeMaterial, ledCount);
      const transform = new THREE.Object3D();
      let ledIndex = 0;
      ledRows.forEach((row, rowIndex) => {
        for (let index = 0; index < row.count; index += 1) {
          const angle = (index / row.count) * Math.PI * 2 + rowIndex * 0.06;
          transform.position.set(Math.cos(angle) * row.radius, Math.sin(angle) * row.radius, 0.155);
          transform.scale.setScalar(rowIndex === 2 ? 0.86 : 1);
          transform.updateMatrix();
          ledDots.setMatrixAt(ledIndex, transform.matrix);
          ledIndex += 1;
        }
      });
      ledDots.instanceMatrix.needsUpdate = true;
      ledDots.castShadow = false;
      parent.add(ledDots);
      robotMeshes.push(ledDots);
    };

    const eyeGroups: THREE.Group[] = [];
    [-0.61, 0.61].forEach((x) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(x, 0.05, 0.12);
      face.add(eyeGroup);
      addLedEye(eyeGroup);
      addRobotMesh(
        new THREE.TorusGeometry(0.355, 0.018, 10, 64),
        eyeMaterial,
        eyeGroup,
        new THREE.Vector3(0, 0, 0.145)
      );
      addRobotMesh(
        new THREE.SphereGeometry(0.205, 32, 24),
        graphiteMaterial,
        eyeGroup,
        new THREE.Vector3(0, 0, 0.12)
      );
      addRobotMesh(
        new THREE.TorusGeometry(0.16, 0.025, 10, 42),
        orangeMaterial,
        eyeGroup,
        new THREE.Vector3(0, 0, 0.29)
      );
      const catchLight = addRobotMesh(
        new THREE.SphereGeometry(0.057, 14, 10),
        shellMaterial,
        eyeGroup,
        new THREE.Vector3(-0.07, 0.085, 0.32)
      );
      catchLight.castShadow = false;
      eyeGroups.push(eyeGroup);
    });
    // Miệng waveform: khi nghỉ các đoạn ghép thành một nét mảnh, khi nói sẽ mở theo âm lượng.
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.52, 0.12);
    face.add(mouthGroup);
    const mouthBars = [-2, -1, 0, 1, 2].map((offset) => {
      const bar = addRobotMesh(
        new RoundedBoxGeometry(0.075, 0.12, 0.045, 3, 0.02),
        orangeMaterial,
        mouthGroup,
        new THREE.Vector3(offset * 0.075, 0, 0)
      );
      bar.scale.y = 0.26;
      return bar;
    });

    const createEar = (x: number) => {
      const ear = new THREE.Group();
      ear.position.set(x, 0, 0);
      headGroup.add(ear);
      addRobotMesh(
        new THREE.CylinderGeometry(0.47, 0.47, 0.28, 40),
        graphiteMaterial,
        ear,
        new THREE.Vector3(),
        new THREE.Euler(0, 0, Math.PI / 2)
      );
      addRobotMesh(
        new THREE.CylinderGeometry(0.37, 0.37, 0.34, 40),
        orangeMaterial,
        ear,
        new THREE.Vector3(),
        new THREE.Euler(0, 0, Math.PI / 2)
      );
      addRobotMesh(
        new THREE.CylinderGeometry(0.26, 0.26, 0.38, 40),
        graphiteMaterial,
        ear,
        new THREE.Vector3(),
        new THREE.Euler(0, 0, Math.PI / 2)
      );
      addRobotMesh(
        new THREE.TorusGeometry(0.19, 0.048, 12, 48),
        eyeMaterial,
        ear,
        new THREE.Vector3(Math.sign(x) * 0.2, 0, 0),
        new THREE.Euler(0, Math.PI / 2, 0)
      );
    };
    createEar(-1.78);
    createEar(1.78);
    addRobotMesh(
      new RoundedBoxGeometry(0.94, 0.14, 0.72, 6, 0.065),
      orangeMaterial,
      headGroup,
      new THREE.Vector3(0, 1.38, 0.02)
    );
    addRobotMesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.055, 24),
      orangeMaterial,
      headGroup,
      new THREE.Vector3(0, -1.08, 1.15),
      new THREE.Euler(Math.PI / 2, 0, 0)
    );
    addRobotMesh(
      new RoundedBoxGeometry(0.28, 0.075, 0.045, 3, 0.025),
      graphiteMaterial,
      headGroup,
      new THREE.Vector3(0.94, -1.01, 1.03),
      new THREE.Euler(0, 0, -0.42)
    );

    const neckGroup = new THREE.Group();
    neckGroup.position.set(0, 0.73, 0);
    robotRoot.add(neckGroup);
    addRobotMesh(
      new THREE.CylinderGeometry(0.32, 0.38, 0.46, 32),
      graphiteMaterial,
      neckGroup,
      new THREE.Vector3(0, 0.1, 0)
    );
    [-0.07, 0.06, 0.19].forEach((y, index) => {
      addRobotMesh(
        new THREE.TorusGeometry(0.31 - index * 0.018, 0.045, 10, 42),
        index === 1 ? orangeMaterial : steelMaterial,
        neckGroup,
        new THREE.Vector3(0, y, 0),
        new THREE.Euler(Math.PI / 2, 0, 0)
      );
    });

    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, -0.3, 0);
    robotRoot.add(bodyGroup);

    // Torso thu eo bằng LatheGeometry để gần dáng robot cơ khí trong ảnh hơn thân hình cầu.
    const torsoProfile = [
      new THREE.Vector2(0.63, -0.96),
      new THREE.Vector2(0.8, -0.8),
      new THREE.Vector2(0.99, -0.4),
      new THREE.Vector2(1.14, 0.2),
      new THREE.Vector2(1.08, 0.57),
      new THREE.Vector2(0.88, 0.87),
      new THREE.Vector2(0.68, 0.98),
    ];
    const bodyShell = addRobotMesh(
      new THREE.LatheGeometry(torsoProfile, 64),
      shellMaterial,
      bodyGroup
    );
    bodyShell.scale.z = 0.75;
    addRobotMesh(
      new RoundedBoxGeometry(1.15, 0.42, 0.12, 5, 0.14),
      graphiteMaterial,
      bodyGroup,
      new THREE.Vector3(0, -0.67, 0.68)
    );

    // Cụm eo nhiều vòng, khung hông và hai chân ngắn đúng silhouette của mẫu.
    addRobotMesh(
      new THREE.CylinderGeometry(0.46, 0.57, 0.4, 36),
      graphiteMaterial,
      robotRoot,
      new THREE.Vector3(0, -1.33, 0)
    );
    [-1.19, -1.33, -1.46].forEach((y, index) => {
      addRobotMesh(
        new THREE.TorusGeometry(0.49 - index * 0.025, 0.055, 10, 44),
        index === 1 ? steelMaterial : graphiteMaterial,
        robotRoot,
        new THREE.Vector3(0, y, 0),
        new THREE.Euler(Math.PI / 2, 0, 0)
      );
    });
    const pelvis = addRobotMesh(
      new THREE.SphereGeometry(0.82, 42, 30),
      shellMaterial,
      robotRoot,
      new THREE.Vector3(0, -1.79, 0)
    );
    pelvis.scale.set(1, 0.58, 0.72);
    [-0.68, 0.68].forEach((x) => {
      addRobotMesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.22, 32),
        graphiteMaterial,
        robotRoot,
        new THREE.Vector3(x, -1.78, 0),
        new THREE.Euler(0, 0, Math.PI / 2)
      );
      addRobotMesh(
        new THREE.TorusGeometry(0.22, 0.045, 10, 36),
        orangeMaterial,
        robotRoot,
        new THREE.Vector3(x, -1.78, 0.18)
      );
    });
    const legBaseY = -2.02;
    const createLeg = (side: -1 | 1) => {
      const addLegJointMesh = (
        geometry: THREE.BufferGeometry,
        material: THREE.Material,
        parent: THREE.Object3D,
        position = new THREE.Vector3(),
        rotation = new THREE.Euler()
      ) => {
        const mesh = addRobotMesh(geometry, material, parent, position, rotation);
        // Chi tiết khớp nhỏ không cần đổ bóng riêng; giảm đáng kể số draw call của shadow pass.
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        return mesh;
      };

      const hipRig = new THREE.Group();
      hipRig.position.set(side * 0.43, legBaseY, 0);
      robotRoot.add(hipRig);

      // Khớp hông và phần đùi trên.
      addRobotMesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.25, 30),
        graphiteMaterial,
        hipRig,
        new THREE.Vector3(),
        new THREE.Euler(0, 0, Math.PI / 2)
      );
      // Bearing mặt ngoài: đĩa cam lớn + lõi đen + tâm thép, giống khớp robot mẫu.
      addLegJointMesh(
        new THREE.CylinderGeometry(0.29, 0.29, 0.075, 32),
        orangeMaterial,
        hipRig,
        new THREE.Vector3(side * 0.17, 0, 0),
        new THREE.Euler(0, 0, Math.PI / 2)
      );
      addLegJointMesh(
        new THREE.CylinderGeometry(0.205, 0.205, 0.085, 30),
        graphiteMaterial,
        hipRig,
        new THREE.Vector3(side * 0.22, 0, 0),
        new THREE.Euler(0, 0, Math.PI / 2)
      );
      addLegJointMesh(
        new THREE.CylinderGeometry(0.078, 0.078, 0.095, 24),
        steelMaterial,
        hipRig,
        new THREE.Vector3(side * 0.27, 0, 0),
        new THREE.Euler(0, 0, Math.PI / 2)
      );
      addRobotMesh(
        new THREE.CylinderGeometry(0.18, 0.16, 0.43, 28),
        graphiteMaterial,
        hipRig,
        new THREE.Vector3(0, -0.27, 0.01)
      );
      addRobotMesh(
        new RoundedBoxGeometry(0.43, 0.48, 0.44, 5, 0.13),
        shellMaterial,
        hipRig,
        new THREE.Vector3(0, -0.28, 0.025)
      );

      // Khớp gối tách riêng để cẳng chân có thể gập độc lập.
      const knee = new THREE.Vector3(0, -0.57, 0.035);
      addRobotMesh(new THREE.SphereGeometry(0.22, 28, 20), graphiteMaterial, hipRig, knee);
      addLegJointMesh(
        new THREE.TorusGeometry(0.18, 0.04, 10, 32),
        orangeMaterial,
        hipRig,
        knee.clone().add(new THREE.Vector3(side * 0.19, 0, 0)),
        new THREE.Euler(0, Math.PI / 2, 0)
      );
      // Viền cam phía trước giúp khớp gối vẫn đọc rõ khi robot nhìn thẳng vào màn Holobox.
      addLegJointMesh(
        new THREE.TorusGeometry(0.205, 0.033, 9, 32),
        orangeMaterial,
        hipRig,
        knee.clone().add(new THREE.Vector3(0, 0, 0.205))
      );
      addLegJointMesh(
        new THREE.CylinderGeometry(0.085, 0.085, 0.08, 24),
        steelMaterial,
        hipRig,
        knee.clone().add(new THREE.Vector3(side * 0.22, 0, 0)),
        new THREE.Euler(0, 0, Math.PI / 2)
      );

      const shinRig = new THREE.Group();
      shinRig.position.copy(knee);
      hipRig.add(shinRig);
      addRobotMesh(
        new THREE.CylinderGeometry(0.14, 0.17, 0.52, 28),
        graphiteMaterial,
        shinRig,
        new THREE.Vector3(0, -0.31, 0.025)
      );
      addRobotMesh(
        new RoundedBoxGeometry(0.4, 0.58, 0.43, 5, 0.12),
        shellMaterial,
        shinRig,
        new THREE.Vector3(0, -0.32, 0.045)
      );
      addRobotMesh(
        new RoundedBoxGeometry(0.25, 0.08, 0.055, 3, 0.025),
        orangeMaterial,
        shinRig,
        new THREE.Vector3(0, -0.33, 0.27)
      );

      // Cổ chân và bàn chân nhô ra trước để đọc rõ chiều sâu trên Holobox.
      const ankle = new THREE.Vector3(0, -0.67, 0.06);
      addLegJointMesh(
        new THREE.CylinderGeometry(0.16, 0.18, 0.19, 26),
        graphiteMaterial,
        shinRig,
        ankle
      );
      addLegJointMesh(
        new THREE.TorusGeometry(0.155, 0.032, 9, 30),
        orangeMaterial,
        shinRig,
        ankle.clone().add(new THREE.Vector3(0, 0.065, 0)),
        new THREE.Euler(Math.PI / 2, 0, 0)
      );
      addLegJointMesh(
        new THREE.TorusGeometry(0.145, 0.026, 9, 28),
        steelMaterial,
        shinRig,
        ankle.clone().add(new THREE.Vector3(0, -0.06, 0)),
        new THREE.Euler(Math.PI / 2, 0, 0)
      );
      // Mặt vòng phía trước tách rõ cổ chân khỏi cẳng chân và bàn chân.
      addLegJointMesh(
        new THREE.TorusGeometry(0.14, 0.025, 9, 28),
        orangeMaterial,
        shinRig,
        ankle.clone().add(new THREE.Vector3(0, 0, 0.17))
      );
      const footRig = new THREE.Group();
      footRig.position.copy(ankle).add(new THREE.Vector3(0, -0.045, 0));
      shinRig.add(footRig);
      addRobotMesh(
        new RoundedBoxGeometry(0.5, 0.28, 0.75, 6, 0.12),
        shellMaterial,
        footRig,
        new THREE.Vector3(0, -0.15, 0.21)
      );
      addRobotMesh(
        new RoundedBoxGeometry(0.52, 0.09, 0.78, 4, 0.035),
        graphiteMaterial,
        footRig,
        new THREE.Vector3(0, -0.29, 0.22)
      );
      addRobotMesh(
        new RoundedBoxGeometry(0.38, 0.09, 0.2, 4, 0.035),
        orangeMaterial,
        footRig,
        new THREE.Vector3(0, -0.23, 0.53)
      );

      return { hipRig, shinRig, footRig };
    };

    const { hipRig: leftHipRig, shinRig: leftShinRig, footRig: leftFootRig } = createLeg(-1);
    const { hipRig: rightHipRig, shinRig: rightShinRig, footRig: rightFootRig } = createLeg(1);

    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 0.13, 0.83);
    bodyGroup.add(coreGroup);
    addRobotMesh(
      new THREE.CylinderGeometry(0.57, 0.57, 0.1, 48),
      graphiteMaterial,
      coreGroup,
      new THREE.Vector3(),
      new THREE.Euler(Math.PI / 2, 0, 0)
    );
    const core = addRobotMesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.14, 48),
      eyeMaterial,
      coreGroup,
      new THREE.Vector3(0, 0, 0.08),
      new THREE.Euler(Math.PI / 2, 0, 0)
    );
    const coreRing = addRobotMesh(
      new THREE.TorusGeometry(0.48, 0.075, 14, 64),
      orangeMaterial,
      coreGroup,
      new THREE.Vector3(0, 0, 0.12)
    );
    addRobotMesh(
      new THREE.TorusGeometry(0.39, 0.026, 10, 56),
      visorGlintMaterial,
      coreGroup,
      new THREE.Vector3(0, 0, 0.19)
    );

    const addJoint = (
      parent: THREE.Object3D,
      position: THREE.Vector3,
      radius: number,
      orangeShell: boolean
    ) => {
      const jointBase = addRobotMesh(
        new THREE.SphereGeometry(radius, 28, 20),
        graphiteMaterial,
        parent,
        position
      );
      const jointShell = addRobotMesh(
        new THREE.SphereGeometry(radius * 0.88, 28, 20),
        orangeShell ? orangeMaterial : shellShadowMaterial,
        jointBase
      );
      jointShell.scale.set(1, 0.82, 0.88);
      addRobotMesh(
        new THREE.TorusGeometry(radius * 0.66, radius * 0.085, 10, 40),
        orangeMaterial,
        jointBase,
        new THREE.Vector3(0, 0, radius * 0.84)
      );
      return jointBase;
    };

    const addLimbBetween = (
      parent: THREE.Object3D,
      start: THREE.Vector3,
      end: THREE.Vector3,
      radius: number,
      material: THREE.Material
    ) => {
      const direction = end.clone().sub(start);
      const distance = direction.length();
      const mesh = addRobotMesh(
        new THREE.CapsuleGeometry(radius, Math.max(0.08, distance - radius * 2), 10, 20),
        material,
        parent,
        start.clone().add(end).multiplyScalar(0.5)
      );
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      return mesh;
    };

    const addTaperedLimbBetween = (
      parent: THREE.Object3D,
      start: THREE.Vector3,
      end: THREE.Vector3,
      startRadius: number,
      endRadius: number
    ) => {
      const direction = end.clone().sub(start);
      const mesh = addRobotMesh(
        new THREE.CylinderGeometry(endRadius, startRadius, direction.length(), 32, 1),
        shellMaterial,
        parent,
        start.clone().add(end).multiplyScalar(0.5)
      );
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      return mesh;
    };

    const createHand = (
      parent: THREE.Object3D,
      position: THREE.Vector3,
      side: number,
      armDirection: THREE.Vector3
    ) => {
      const handMount = new THREE.Group();
      handMount.position.copy(position);
      handMount.quaternion.setFromUnitVectors(
        new THREE.Vector3(side, 0, 0),
        armDirection.clone().normalize()
      );
      parent.add(handMount);
      const hand = new THREE.Group();
      handMount.add(hand);
      addRobotMesh(
        new THREE.CylinderGeometry(0.22, 0.27, 0.3, 28),
        shellMaterial,
        hand,
        new THREE.Vector3(-side * 0.12, 0, 0),
        new THREE.Euler(0, 0, Math.PI / 2)
      );
      addRobotMesh(
        new THREE.TorusGeometry(0.23, 0.04, 10, 36),
        orangeMaterial,
        hand,
        new THREE.Vector3(-side * 0.25, 0, 0),
        new THREE.Euler(0, Math.PI / 2, 0)
      );
      const palm = addRobotMesh(
        new THREE.SphereGeometry(0.27, 30, 22),
        graphiteMaterial,
        hand,
        new THREE.Vector3(side * 0.14, 0, 0.035)
      );
      palm.scale.set(0.76, 0.92, 0.56);
      [-0.12, -0.04, 0.04, 0.12].forEach((y) => {
        addRobotMesh(
          new THREE.CapsuleGeometry(0.038, 0.13, 5, 10),
          steelMaterial,
          hand,
          new THREE.Vector3(side * 0.31, y, 0.08),
          new THREE.Euler(0, 0, Math.PI / 2)
        );
      });
      addRobotMesh(
        new THREE.CapsuleGeometry(0.045, 0.12, 5, 10),
        steelMaterial,
        hand,
        new THREE.Vector3(side * 0.16, -0.2, 0.07),
        new THREE.Euler(0, 0, side * 0.68)
      );
      return hand;
    };

    const createArm = (side: -1 | 1) => {
      const armRig = new THREE.Group();
      armRig.position.set(side * 1.03, 0.25, 0);
      robotRoot.add(armRig);
      const shoulder = new THREE.Vector3();
      const elbow = new THREE.Vector3(side * 0.44, -0.72, 0.16);
      addJoint(armRig, shoulder, 0.39, true);
      addLimbBetween(armRig, shoulder, elbow, 0.18, graphiteMaterial);
      addTaperedLimbBetween(
        armRig,
        shoulder.clone().lerp(elbow, 0.17),
        shoulder.clone().lerp(elbow, 0.82),
        0.29,
        0.25
      );
      addJoint(armRig, elbow, 0.27, false);

      // Cẳng tay là một rig riêng đặt tại khuỷu để có thể gập/xoay độc lập.
      const forearmRig = new THREE.Group();
      forearmRig.position.copy(elbow);
      armRig.add(forearmRig);
      const wrist = new THREE.Vector3(side * 0.17, -0.87, 0.2);
      addLimbBetween(forearmRig, new THREE.Vector3(), wrist, 0.17, graphiteMaterial);
      addTaperedLimbBetween(
        forearmRig,
        new THREE.Vector3().lerp(wrist, 0.14),
        new THREE.Vector3().lerp(wrist, 0.84),
        0.26,
        0.33
      );
      addJoint(forearmRig, wrist, 0.2, true);
      const hand = createHand(forearmRig, wrist, side, wrist);
      return { armRig, forearmRig, hand };
    };

    const { armRig: leftArmRig, forearmRig: leftForearmRig, hand: leftHand } = createArm(-1);
    const { armRig: rightArmRig, forearmRig: rightForearmRig, hand: rightHand } = createArm(1);

    const orbitMaterial = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      toneMapped: false,
    });
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.014, 8, 160), orbitMaterial);
    orbit.position.set(0, -1.05, 0);
    orbit.rotation.x = 1.36;
    robotRoot.add(orbit);

    const beamMaterial = new THREE.MeshBasicMaterial({
      color: 0xffb86b,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const hoverBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 1.35, 2.5, 40, 1, true),
      beamMaterial
    );
    hoverBeam.position.set(0, -2.65, 0);
    robotRoot.add(hoverBeam);

    const particleCount = 150;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      particlePositions[index * 3] = THREE.MathUtils.randFloatSpread(8.6);
      particlePositions[index * 3 + 1] = THREE.MathUtils.randFloat(-5.2, 7.4);
      particlePositions[index * 3 + 2] = THREE.MathUtils.randFloat(-2.8, 1.4);
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xfb923c,
      size: 0.045,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: createSoftShadowTexture(0.62, 0.28),
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      toneMapped: false,
    });
    const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(5.65, 3.2), shadowMaterial);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, -4.365, -0.12);
    scene.add(contactShadow);

    const footShadowMaterial = new THREE.MeshBasicMaterial({
      map: createSoftShadowTexture(0.86, 0.36),
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      toneMapped: false,
    });
    const footContactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.75, 1.18),
      footShadowMaterial
    );
    footContactShadow.rotation.x = -Math.PI / 2;
    footContactShadow.position.set(0, -4.34, -0.02);
    scene.add(footContactShadow);

    const soleShadowMaterial = new THREE.MeshBasicMaterial({
      map: createSoftShadowTexture(0.92, 0.34),
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
      toneMapped: false,
    });
    const soleShadows = [-0.38, 0.38].map((x) => {
      const soleShadow = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.52), soleShadowMaterial);
      soleShadow.rotation.x = -Math.PI / 2;
      soleShadow.position.set(x, -4.315, 0.05);
      scene.add(soleShadow);
      return { mesh: soleShadow, baseX: x };
    });

    // Audio/TTS chỉ nằm trong bộ nhớ; không có script hoặc nút hiển thị trên canvas.
    const audio = new Audio();
    audio.preload = "metadata";
    if (audioUrl) audio.src = audioUrl;
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let analyserData: Uint8Array<ArrayBuffer> | null = null;
    let sourceNode: MediaElementAudioSourceNode | null = null;
    let speaking = false;
    let speechPulse = 0;

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
      speaking = false;
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
        speaking = true;
      };
      utterance.onboundary = () => {
        speechPulse = Math.min(1, speechPulse + 0.4);
      };
      utterance.onend = () => {
        speaking = false;
      };
      utterance.onerror = () => {
        speaking = false;
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    };
    const toggleNarration = async () => {
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
      connectAnalyser();
      audio.currentTime = 0;
      try {
        await audio.play();
        speaking = true;
      } catch (error) {
        console.error("Không thể phát file âm thanh Holobox:", error);
      }
    };
    audio.addEventListener("ended", () => {
      speaking = false;
    });

    // Kéo ngang: xoay robot. Kéo dọc: nâng/hạ. Chạm nhẹ: phát narration.
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown = false;
    let pointerId = -1;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let dragDistance = 0;
    // Góc 3/4 nhẹ mặc định giúp thấy rõ độ dày của đầu, thân và các khớp tay.
    let targetYaw = -0.24;
    let currentYaw = -0.24;
    let targetLift = 0;
    let currentLift = 0;

    const activateRobot = (clientX: number, clientY: number) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.intersectObjects(robotMeshes, false).length > 0) {
        setShowDanceControls(true);
        toggleNarration();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      pointerDown = true;
      pointerId = event.pointerId;
      startX = lastX = event.clientX;
      startY = lastY = event.clientY;
      dragDistance = 0;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!pointerDown || event.pointerId !== pointerId) return;
      const deltaX = event.clientX - lastX;
      const deltaY = event.clientY - lastY;
      dragDistance += Math.hypot(deltaX, deltaY);
      targetYaw += deltaX * 0.012;
      targetLift = THREE.MathUtils.clamp(targetLift - deltaY * 0.008, -0.45, 0.65);
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!pointerDown || event.pointerId !== pointerId) return;
      pointerDown = false;
      renderer.domElement.releasePointerCapture(event.pointerId);
      if (dragDistance < 7 && Math.hypot(event.clientX - startX, event.clientY - startY) < 7) {
        activateRobot(event.clientX, event.clientY);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleNarration();
      } else if (event.key === "ArrowLeft") {
        targetYaw -= 0.24;
      } else if (event.key === "ArrowRight") {
        targetYaw += 0.24;
      } else if (event.key === "ArrowUp") {
        targetLift = Math.min(0.65, targetLift + 0.12);
      } else if (event.key === "ArrowDown") {
        targetLift = Math.max(-0.45, targetLift - 0.12);
      }
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);
    renderer.domElement.addEventListener("keydown", onKeyDown);

    const clock = new THREE.Clock();
    let smoothedFrameDelta = 1 / 60;
    let smoothedAudio = 0;
    let voiceActivity = 0;
    let danceMode: HoloboxDanceMode | null = null;
    let danceUntil = 0;
    let danceActivity = 0;
    let dancePhase = 0;
    let presentationPhase = 0;
    let smoothVoiceBounce = 0;
    let smoothVoiceSway = 0;
    let smoothVoiceTurn = 0;
    let coreRotation = 0;
    let orbitRotation = 0;
    const onDanceCommand = (event: Event) => {
      const nextMode = (event as CustomEvent<HoloboxDanceMode>).detail;
      if (!nextMode) return;
      danceMode = nextMode;
      danceUntil = clock.elapsedTime + (nextMode === "spin" ? 5.4 : 7);
      danceActivity = Math.max(danceActivity, 0.45);
      dancePhase = 0;
      setShowDanceControls(true);
    };
    window.addEventListener(DANCE_EVENT, onDanceCommand);

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

    renderer.setAnimationLoop(() => {
      const rawDelta = Math.min(clock.getDelta(), 0.05);
      smoothedFrameDelta = THREE.MathUtils.damp(smoothedFrameDelta, rawDelta, 10, rawDelta);
      const delta = Math.min(smoothedFrameDelta, 1 / 30);
      const time = clock.elapsedTime;
      const motion = reducedMotion ? 0.15 : 1;
      smoothedAudio = THREE.MathUtils.damp(smoothedAudio, readAudioLevel(time), 8, delta);
      speechPulse *= Math.exp(-delta * 6.3);
      currentYaw = THREE.MathUtils.damp(currentYaw, targetYaw, 8, delta);
      currentLift = THREE.MathUtils.damp(currentLift, targetLift, 8, delta);

      const isVoiceActive = speaking || window.speechSynthesis?.speaking || smoothedAudio > 0.06;
      voiceActivity = THREE.MathUtils.damp(
        voiceActivity,
        isVoiceActive ? 1 : 0,
        isVoiceActive ? 6.5 : 4.5,
        delta
      );
      const isDanceActive = danceMode !== null && time < danceUntil;
      if (!isDanceActive && danceMode !== null) danceMode = null;
      danceActivity = THREE.MathUtils.damp(
        danceActivity,
        isDanceActive ? 1 : 0,
        isDanceActive ? 8 : 4.5,
        delta
      );
      dancePhase += delta * (3.4 + danceActivity * 2.3) * Math.max(danceActivity, 0.05);
      const performanceActivity = Math.max(voiceActivity, danceActivity);
      presentationPhase +=
        delta *
        (1.78 + smoothedAudio * 0.46 + danceActivity * 1.15) *
        Math.max(performanceActivity, 0.04);
      const legPhase = presentationPhase * 1.18;
      const legWave = Math.sin(legPhase);
      const legPulse = 0.5 - Math.cos(legPhase * 2) * 0.5;

      // Nhún thân theo một phase liên tục và damping để không đổi tần số đột ngột gây giật.
      const hover = Math.sin(time * 0.72) * 0.055 * motion;
      const bounceTarget =
        voiceActivity *
        (Math.sin(presentationPhase * 1.12) * 0.14 +
          Math.sin(presentationPhase * 2.24) * 0.022 +
          (legPulse - 0.5) * 0.14 +
          smoothedAudio * 0.04) *
        motion;
      const danceBounce =
        danceMode === "bounce"
          ? Math.abs(Math.sin(dancePhase * 1.15)) * 0.32
          : danceMode === "wave"
            ? Math.sin(dancePhase * 1.25) * 0.08
            : danceMode === "spin"
              ? Math.abs(Math.sin(dancePhase * 1.4)) * 0.13
              : 0;
      const swayTarget =
        (Math.sin(presentationPhase * 0.55) * 0.13 * voiceActivity +
          Math.sin(dancePhase * 0.8) * 0.18 * danceActivity) *
        motion;
      const turnTarget =
        ((Math.sin(presentationPhase * 0.5) * 0.52 + Math.sin(presentationPhase * 1.05) * 0.14) *
          voiceActivity +
          Math.sin(dancePhase * 0.7) * 0.35 * danceActivity) *
        motion;
      smoothVoiceBounce = THREE.MathUtils.damp(smoothVoiceBounce, bounceTarget, 8, delta);
      smoothVoiceSway = THREE.MathUtils.damp(smoothVoiceSway, swayTarget, 7, delta);
      smoothVoiceTurn = THREE.MathUtils.damp(smoothVoiceTurn, turnTarget, 6, delta);
      const verticalMotion = hover + smoothVoiceBounce + danceBounce * danceActivity * motion;
      robotRoot.position.x = smoothVoiceSway;
      robotRoot.position.y = 0.45 + currentLift + verticalMotion;
      const spinYaw = danceMode === "spin" ? dancePhase * 0.42 * danceActivity * motion : 0;
      robotRoot.rotation.y =
        currentYaw + Math.sin(time * 0.28) * 0.055 * motion + smoothVoiceTurn + spinYaw;
      robotRoot.rotation.x = THREE.MathUtils.damp(
        robotRoot.rotation.x,
        Math.sin(presentationPhase * 0.58 + 0.5) * 0.055 * performanceActivity * motion,
        6,
        delta
      );
      robotRoot.rotation.z =
        Math.sin(time * 0.22) * 0.006 * motion +
        ((Math.sin(presentationPhase * 0.62) * 0.035 + legWave * 0.018) * performanceActivity +
          Math.sin(dancePhase * 1.05) * 0.05 * danceActivity) *
          motion;

      // Tay buông dài xuống; vai, khuỷu và cổ tay chuyển động độc lập khi phát voice.
      const gestureStrength =
        THREE.MathUtils.clamp(performanceActivity * (0.9 + smoothedAudio * 0.1), 0, 1) * motion;
      const openGesture = 0.5 + Math.sin(presentationPhase * 0.72 - 0.4) * 0.5;
      const alternatingGesture = Math.sin(presentationPhase * 1.12);
      const emphasisPulse = Math.pow(0.5 + Math.sin(presentationPhase * 1.55 + 0.35) * 0.5, 3);
      const headNodTarget =
        Math.sin(time * 0.46) * 0.01 * motion +
        Math.sin(presentationPhase * 1.18) * 0.055 * gestureStrength;
      const headTurnTarget =
        Math.sin(time * 0.38) * 0.035 * motion +
        Math.sin(presentationPhase * 0.48 + 0.6) * 0.12 * gestureStrength -
        smoothVoiceTurn * 0.24;
      headGroup.rotation.x = THREE.MathUtils.damp(headGroup.rotation.x, headNodTarget, 7, delta);
      headGroup.rotation.y = THREE.MathUtils.damp(headGroup.rotation.y, headTurnTarget, 7, delta);

      // Nâng hai vai ra ngang rồi hạ luân phiên. Dấu Z trái/phải phải đối nhau theo cấu trúc rig.
      const idleArmWave = Math.sin(time * 0.6) * 0.012 * motion;
      const sharedLift = 0.52 + openGesture * 0.31 + emphasisPulse * 0.1;
      const alternatingLift = alternatingGesture * 0.46 * (1 - openGesture * 0.35);
      const voiceAccent = smoothedAudio * 0.12;
      const leftLift = THREE.MathUtils.clamp(
        sharedLift + alternatingLift + voiceAccent,
        0.08,
        1.18
      );
      const rightLift = THREE.MathUtils.clamp(
        sharedLift - alternatingLift + voiceAccent,
        0.08,
        1.18
      );
      const danceWave = Math.sin(dancePhase * 1.2);
      const danceWaveLift =
        danceMode === "wave"
          ? 0.48 + Math.max(0, danceWave) * 0.75
          : danceMode === "bounce"
            ? Math.abs(danceWave) * 0.28
            : danceMode === "spin"
              ? Math.sin(dancePhase * 1.05) * 0.38
              : 0;
      const leftShoulderZTarget =
        idleArmWave - leftLift * gestureStrength - danceWaveLift * danceActivity * motion;
      const rightShoulderZTarget =
        -idleArmWave + rightLift * gestureStrength + danceWaveLift * danceActivity * motion;

      // X/Y đưa tay ra trước–sau, tạo quỹ đạo vòng thay vì chỉ lắc phẳng trên màn hình.
      const shoulderOrbit = presentationPhase;
      const leftShoulderXTarget =
        (Math.sin(shoulderOrbit + 0.25) * 0.28 -
          emphasisPulse * 0.08 +
          Math.sin(dancePhase * 1.35) * 0.18 * danceActivity) *
        gestureStrength;
      const rightShoulderXTarget =
        (-Math.sin(shoulderOrbit + 0.85) * 0.28 -
          emphasisPulse * 0.08 -
          Math.sin(dancePhase * 1.35) * 0.18 * danceActivity) *
        gestureStrength;
      const leftShoulderYTarget =
        (Math.cos(shoulderOrbit + 0.25) * 0.17 - openGesture * 0.09) * gestureStrength;
      const rightShoulderYTarget =
        (-Math.cos(shoulderOrbit + 0.85) * 0.17 + openGesture * 0.09) * gestureStrength;
      leftArmRig.rotation.x = THREE.MathUtils.damp(
        leftArmRig.rotation.x,
        leftShoulderXTarget,
        6.5,
        delta
      );
      rightArmRig.rotation.x = THREE.MathUtils.damp(
        rightArmRig.rotation.x,
        rightShoulderXTarget,
        6.5,
        delta
      );
      leftArmRig.rotation.y = THREE.MathUtils.damp(
        leftArmRig.rotation.y,
        leftShoulderYTarget,
        6.5,
        delta
      );
      rightArmRig.rotation.y = THREE.MathUtils.damp(
        rightArmRig.rotation.y,
        rightShoulderYTarget,
        6.5,
        delta
      );
      leftArmRig.rotation.z = THREE.MathUtils.damp(
        leftArmRig.rotation.z,
        leftShoulderZTarget,
        6.5,
        delta
      );
      rightArmRig.rotation.z = THREE.MathUtils.damp(
        rightArmRig.rotation.z,
        rightShoulderZTarget,
        6.5,
        delta
      );

      // Khuỷu gập mạnh hơn khi tay được nâng; X/Y chạy sin/cos để cẳng tay xoay vòng có chiều sâu.
      const forearmOrbit = presentationPhase * 1.42;
      const leftExplainTarget =
        (1.02 +
          leftLift * 0.96 -
          openGesture * 0.32 +
          emphasisPulse * 0.24 +
          Math.sin(forearmOrbit + 0.2) * 0.18) *
        gestureStrength;
      const rightExplainTarget =
        -(
          1.02 +
          rightLift * 0.96 -
          openGesture * 0.32 +
          emphasisPulse * 0.24 +
          Math.sin(forearmOrbit + 0.9) * 0.18
        ) * gestureStrength;
      const leftForearmXTarget = Math.sin(forearmOrbit + 0.2) * 0.39 * gestureStrength;
      const rightForearmXTarget = -Math.sin(forearmOrbit + 0.9) * 0.39 * gestureStrength;
      const leftForearmYTarget = Math.cos(forearmOrbit + 0.2) * 0.29 * gestureStrength;
      const rightForearmYTarget = -Math.cos(forearmOrbit + 0.9) * 0.29 * gestureStrength;
      leftForearmRig.rotation.x = THREE.MathUtils.damp(
        leftForearmRig.rotation.x,
        leftForearmXTarget,
        6.5,
        delta
      );
      rightForearmRig.rotation.x = THREE.MathUtils.damp(
        rightForearmRig.rotation.x,
        rightForearmXTarget,
        6.5,
        delta
      );
      leftForearmRig.rotation.y = THREE.MathUtils.damp(
        leftForearmRig.rotation.y,
        leftForearmYTarget,
        6.5,
        delta
      );
      rightForearmRig.rotation.y = THREE.MathUtils.damp(
        rightForearmRig.rotation.y,
        rightForearmYTarget,
        6.5,
        delta
      );
      leftForearmRig.rotation.z = THREE.MathUtils.damp(
        leftForearmRig.rotation.z,
        leftExplainTarget,
        6.5,
        delta
      );
      rightForearmRig.rotation.z = THREE.MathUtils.damp(
        rightForearmRig.rotation.z,
        rightExplainTarget,
        6.5,
        delta
      );

      // Cổ tay vẽ vòng nhỏ để bàn tay đổi hướng liên tục như đang minh họa bài nói.
      const wristPhase = presentationPhase * 1.75;
      leftHand.rotation.x = THREE.MathUtils.damp(
        leftHand.rotation.x,
        (Math.sin(wristPhase + 0.2) * 0.26 + emphasisPulse * 0.12) * gestureStrength,
        9,
        delta
      );
      rightHand.rotation.x = THREE.MathUtils.damp(
        rightHand.rotation.x,
        (-Math.sin(wristPhase + 0.8) * 0.26 + emphasisPulse * 0.12) * gestureStrength,
        9,
        delta
      );
      leftHand.rotation.y = THREE.MathUtils.damp(
        leftHand.rotation.y,
        (Math.cos(wristPhase + 0.2) * 0.3 - openGesture * 0.42) * gestureStrength,
        9,
        delta
      );
      rightHand.rotation.y = THREE.MathUtils.damp(
        rightHand.rotation.y,
        (-Math.cos(wristPhase + 0.8) * 0.3 + openGesture * 0.42) * gestureStrength,
        9,
        delta
      );
      leftHand.rotation.z = THREE.MathUtils.damp(
        leftHand.rotation.z,
        (Math.sin(wristPhase * 0.8) * 0.26 - openGesture * 0.18) * gestureStrength,
        9,
        delta
      );
      rightHand.rotation.z = THREE.MathUtils.damp(
        rightHand.rotation.z,
        (-Math.sin(wristPhase * 0.8 + 0.65) * 0.26 + openGesture * 0.18) * gestureStrength,
        9,
        delta
      );
      bodyGroup.position.y = THREE.MathUtils.damp(
        bodyGroup.position.y,
        -0.3 + smoothedAudio * 0.05 + Math.sin(presentationPhase * 1.1) * 0.045 * gestureStrength,
        8,
        delta
      );
      bodyGroup.rotation.y = THREE.MathUtils.damp(
        bodyGroup.rotation.y,
        -smoothVoiceTurn * 0.16 + Math.sin(presentationPhase * 0.82 + 0.45) * 0.1 * gestureStrength,
        7,
        delta
      );
      bodyGroup.rotation.z = THREE.MathUtils.damp(
        bodyGroup.rotation.z,
        Math.sin(presentationPhase * 0.9) * 0.028 * gestureStrength,
        7,
        delta
      );

      // Hai chân nhịp luân phiên như đang dồn trọng lượng khi thuyết trình.
      const danceStepWave = Math.sin(dancePhase * 1.45);
      const danceLegBoost = danceActivity * (danceMode === "bounce" ? 0.55 : 0.34);
      const leftStepLift = Math.max(0, legWave + danceStepWave * danceLegBoost);
      const rightStepLift = Math.max(0, -legWave - danceStepWave * danceLegBoost);
      leftHipRig.position.y = THREE.MathUtils.damp(
        leftHipRig.position.y,
        legBaseY + leftStepLift * (0.18 + danceActivity * 0.08) * gestureStrength,
        8,
        delta
      );
      rightHipRig.position.y = THREE.MathUtils.damp(
        rightHipRig.position.y,
        legBaseY + rightStepLift * (0.18 + danceActivity * 0.08) * gestureStrength,
        8,
        delta
      );
      leftHipRig.rotation.x = THREE.MathUtils.damp(
        leftHipRig.rotation.x,
        legWave * 0.28 * gestureStrength,
        7.5,
        delta
      );
      rightHipRig.rotation.x = THREE.MathUtils.damp(
        rightHipRig.rotation.x,
        -legWave * 0.28 * gestureStrength,
        7.5,
        delta
      );
      leftHipRig.rotation.y = THREE.MathUtils.damp(
        leftHipRig.rotation.y,
        Math.sin(legPhase * 0.5) * 0.045 * gestureStrength,
        7,
        delta
      );
      rightHipRig.rotation.y = THREE.MathUtils.damp(
        rightHipRig.rotation.y,
        -Math.sin(legPhase * 0.5) * 0.045 * gestureStrength,
        7,
        delta
      );

      // Đầu gối gập khi chân được nhấc; bàn chân bù góc để động tác mềm và có trọng lượng.
      leftShinRig.rotation.x = THREE.MathUtils.damp(
        leftShinRig.rotation.x,
        (0.08 + leftStepLift * 0.7 + emphasisPulse * 0.08) * gestureStrength,
        8,
        delta
      );
      rightShinRig.rotation.x = THREE.MathUtils.damp(
        rightShinRig.rotation.x,
        (0.08 + rightStepLift * 0.7 + emphasisPulse * 0.08) * gestureStrength,
        8,
        delta
      );
      leftFootRig.rotation.x = THREE.MathUtils.damp(
        leftFootRig.rotation.x,
        -(0.06 + leftStepLift * 0.45) * gestureStrength,
        9,
        delta
      );
      rightFootRig.rotation.x = THREE.MathUtils.damp(
        rightFootRig.rotation.x,
        -(0.06 + rightStepLift * 0.45) * gestureStrength,
        9,
        delta
      );
      leftFootRig.rotation.z = THREE.MathUtils.damp(
        leftFootRig.rotation.z,
        legWave * 0.045 * gestureStrength,
        8,
        delta
      );
      rightFootRig.rotation.z = THREE.MathUtils.damp(
        rightFootRig.rotation.z,
        -legWave * 0.045 * gestureStrength,
        8,
        delta
      );
      pelvis.rotation.z = THREE.MathUtils.damp(
        pelvis.rotation.z,
        legWave * 0.05 * gestureStrength,
        7,
        delta
      );
      pelvis.rotation.y = THREE.MathUtils.damp(
        pelvis.rotation.y,
        Math.sin(legPhase * 0.5) * 0.045 * gestureStrength,
        7,
        delta
      );

      // Miệng phản hồi theo âm tiết: nghỉ là một nét mảnh, đang nói thành waveform mềm.
      const mouthMotion = reducedMotion ? 0.35 : 1;
      const mouthEnergy = THREE.MathUtils.clamp(voiceActivity * (0.38 + smoothedAudio * 0.9), 0, 1);
      mouthBars.forEach((bar, index) => {
        const distanceFromCenter = Math.abs(index - (mouthBars.length - 1) / 2);
        const centerWeight = 1 - distanceFromCenter * 0.12;
        const syllableWave =
          0.35 + Math.abs(Math.sin(time * (7.8 + index * 0.22) + index * 0.85)) * 0.65;
        const targetScaleY = 0.26 + mouthEnergy * syllableWave * centerWeight * 1.65 * mouthMotion;

        bar.scale.y = THREE.MathUtils.damp(bar.scale.y, targetScaleY, 15, delta);
        bar.scale.x = THREE.MathUtils.damp(bar.scale.x, 1 - mouthEnergy * 0.08, 11, delta);
      });
      mouthGroup.scale.x = THREE.MathUtils.damp(
        mouthGroup.scale.x,
        1 + mouthEnergy * 0.06,
        10,
        delta
      );

      const blinkPhase = time % 4.4;
      const blink = blinkPhase > 4.18 ? Math.max(0.12, Math.abs(blinkPhase - 4.29) * 8) : 1;
      eyeGroups.forEach((eye) => {
        eye.scale.y = blink;
        eye.scale.setScalar(1 + smoothedAudio * 0.045);
        eye.scale.y *= blink;
      });
      eyeMaterial.emissiveIntensity = 2.35 + smoothedAudio * 2.6;
      core.scale.setScalar(1 + smoothedAudio * 0.34 + Math.sin(time * 2.2) * 0.035 * motion);
      coreRotation += delta * (0.4 + smoothedAudio * 0.85) * motion;
      coreRing.rotation.z = coreRotation;
      coreRing.scale.setScalar(1 + smoothedAudio * 0.12);
      orangeMaterial.emissiveIntensity = 1.5 + smoothedAudio * 1.8;
      orbitRotation += delta * (0.13 + smoothedAudio * 0.3) * motion;
      orbit.rotation.z = orbitRotation;
      orbitMaterial.opacity = 0.22 + smoothedAudio * 0.34;
      beamMaterial.opacity = 0.055 + smoothedAudio * 0.12;
      hoverBeam.scale.x = hoverBeam.scale.z = 1 + smoothedAudio * 0.12;
      particles.rotation.y = Math.sin(time * 0.1) * 0.05 * motion;
      particleMaterial.opacity = 0.3 + smoothedAudio * 0.42;
      contactShadow.position.x = robotRoot.position.x * 0.58;
      footContactShadow.position.x = robotRoot.position.x * 0.76;
      soleShadows.forEach(({ mesh, baseX }) => {
        mesh.position.x = baseX + robotRoot.position.x * 0.88;
        mesh.scale.set(1 + danceActivity * 0.08, 1 + danceActivity * 0.1, 1);
      });
      contactShadow.scale.set(1 + verticalMotion * 0.018, 1 + danceActivity * 0.08, 1);
      footContactShadow.scale.set(1 + verticalMotion * 0.01, 1 + danceActivity * 0.05, 1);
      shadowMaterial.opacity = THREE.MathUtils.clamp(0.62 - verticalMotion * 0.26, 0.42, 0.74);
      footShadowMaterial.opacity = THREE.MathUtils.clamp(0.52 - verticalMotion * 0.18, 0.34, 0.62);
      soleShadowMaterial.opacity = THREE.MathUtils.clamp(0.44 - verticalMotion * 0.14, 0.28, 0.52);
      renderer.render(scene, camera);
    });

    const resize = () => {
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(getRenderPixelRatio(width, height));
      renderer.setSize(width, height, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(viewport);
    resize();

    return () => {
      if (danceResetTimerRef.current !== null) window.clearTimeout(danceResetTimerRef.current);
      stopNarration();
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      window.removeEventListener(DANCE_EVENT, onDanceCommand);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      renderer.domElement.removeEventListener("keydown", onKeyDown);
      audioContext?.close();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (material instanceof THREE.MeshBasicMaterial) material.map?.dispose();
          material.dispose();
        });
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [script]);

  return (
    <main className="holobox-ai-only-page" aria-label="AI Holobox 3D">
      <div ref={viewportRef} className="holobox-three-viewport" />
      {showDanceControls ? (
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
    </main>
  );
}
