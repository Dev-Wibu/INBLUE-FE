import * as THREE from "three";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const MODEL_URL = "/models/experience-day-robot/experience-day-robot-rigged.glb";
const TARGET_LOCAL_HEIGHT = 7.6;
const TARGET_LOCAL_FLOOR = -3.6;

export const EXPERIENCE_DAY_PRESENTATION_DURATION = 16;

export const EXPERIENCE_DAY_ROBOT_FRAME = {
  position: new THREE.Vector3(0, 0.45, 0.1),
  scale: 0.9,
} as const;

export type ExperienceDayRobotModel = {
  root: THREE.Group;
  model: THREE.Group;
  mixer: THREE.AnimationMixer;
  blinkMeshes: THREE.Mesh[];
};

type PresentationBones = {
  root: THREE.Bone;
  leftUpperArm: THREE.Bone;
  leftForearm: THREE.Bone;
  leftHand: THREE.Bone;
  rightUpperArm: THREE.Bone;
  rightForearm: THREE.Bone;
  rightHand: THREE.Bone;
  head: THREE.Bone;
  leftUpperLeg: THREE.Bone;
  leftLowerLeg: THREE.Bone;
  rightUpperLeg: THREE.Bone;
  rightLowerLeg: THREE.Bone;
  chest: THREE.Bone;
  hip: THREE.Bone;
  leftFoot: THREE.Bone;
  rightFoot: THREE.Bone;
  blinkMeshes: THREE.Mesh[];
};

function normalizeModel(model: THREE.Group) {
  model.updateMatrixWorld(true);
  const sourceBounds = new THREE.Box3().setFromObject(model);
  const sourceSize = sourceBounds.getSize(new THREE.Vector3());

  if (!Number.isFinite(sourceSize.y) || sourceSize.y <= 0) {
    throw new Error("Experience Day robot has invalid bounds.");
  }

  model.scale.setScalar(TARGET_LOCAL_HEIGHT / sourceSize.y);
  model.updateMatrixWorld(true);

  const scaledBounds = new THREE.Box3().setFromObject(model);
  const scaledCenter = scaledBounds.getCenter(new THREE.Vector3());
  model.position.x -= scaledCenter.x;
  model.position.y += TARGET_LOCAL_FLOOR - scaledBounds.min.y;
  model.position.z -= scaledCenter.z;
  model.updateMatrixWorld(true);
}

function configureMesh(mesh: THREE.Mesh, maxAnisotropy: number) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  materials.forEach((material) => {
    if (!(material instanceof THREE.MeshStandardMaterial)) return;

    if (material.map) material.map.anisotropy = Math.min(8, maxAnisotropy);
    if (material.normalMap) material.normalMap.anisotropy = Math.min(8, maxAnisotropy);
    if (material.metalnessMap) material.metalnessMap.anisotropy = Math.min(8, maxAnisotropy);
    material.envMapIntensity = 0.65;
    material.needsUpdate = true;
  });
}

function createBone(name: string, position: THREE.Vector3, parent?: THREE.Object3D) {
  const bone = new THREE.Bone();
  bone.name = name;
  bone.position.copy(position);
  parent?.add(bone);
  return bone;
}

function smoothstep(min: number, max: number, value: number) {
  const normalized = THREE.MathUtils.clamp((value - min) / (max - min), 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
}

function assignSkinWeight(
  skinIndices: Uint16Array,
  skinWeights: Float32Array,
  vertexIndex: number,
  firstBone: number,
  secondBone = 0,
  firstWeight = 1
) {
  const offset = vertexIndex * 4;
  skinIndices[offset] = firstBone;
  skinIndices[offset + 1] = secondBone;
  skinWeights[offset] = firstWeight;
  skinWeights[offset + 1] = 1 - firstWeight;
}

function createPresentationSkeleton(mesh: THREE.SkinnedMesh): PresentationBones {
  mesh.geometry.computeBoundingBox();
  const bounds = mesh.geometry.boundingBox;
  if (!bounds) {
    throw new Error("Experience Day robot geometry has no bounds.");
  }

  const sourceHeight = bounds.max.y - bounds.min.y;
  const sourceCenter = bounds.getCenter(new THREE.Vector3());
  const fromCanonical = (x: number, y: number, z: number) =>
    new THREE.Vector3(
      sourceCenter.x + x * sourceHeight,
      bounds.min.y + y * sourceHeight,
      sourceCenter.z + z * sourceHeight
    );

  const root = createBone("Presentation_Root", new THREE.Vector3());
  const leftUpperArm = createBone("Presentation_L_UpperArm", fromCanonical(-0.145, 0.67, 0), root);
  const leftForearm = createBone(
    "Presentation_L_Forearm",
    new THREE.Vector3(-0.125 * sourceHeight, 0, 0),
    leftUpperArm
  );
  const leftHand = createBone(
    "Presentation_L_Hand",
    new THREE.Vector3(-0.11 * sourceHeight, 0, 0),
    leftForearm
  );
  const rightUpperArm = createBone("Presentation_R_UpperArm", fromCanonical(0.145, 0.67, 0), root);
  const rightForearm = createBone(
    "Presentation_R_Forearm",
    new THREE.Vector3(0.125 * sourceHeight, 0, 0),
    rightUpperArm
  );
  const rightHand = createBone(
    "Presentation_R_Hand",
    new THREE.Vector3(0.11 * sourceHeight, 0, 0),
    rightForearm
  );
  const head = createBone("Presentation_Head", fromCanonical(0, 0.73, 0), root);
  const blinkGeometry = new THREE.CircleGeometry(0.028 * sourceHeight, 32);
  const blinkMaterial = new THREE.MeshBasicMaterial({
    color: 0x00171d,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const createBlinkMesh = (name: string, x: number) => {
    const blinkMesh = new THREE.Mesh(blinkGeometry, blinkMaterial);
    blinkMesh.name = name;
    blinkMesh.position.copy(fromCanonical(x, 0.835, 0.11)).sub(head.position);
    blinkMesh.scale.set(1.2, 0.04, 1);
    blinkMesh.visible = false;
    blinkMesh.renderOrder = 10;
    head.add(blinkMesh);
    return blinkMesh;
  };
  const blinkMeshes = [
    createBlinkMesh("Presentation_L_Eyelid", -0.055),
    createBlinkMesh("Presentation_R_Eyelid", 0.055),
  ];
  const leftUpperLeg = createBone("Presentation_L_UpperLeg", fromCanonical(-0.095, 0.445, 0), root);
  const leftLowerLeg = createBone(
    "Presentation_L_LowerLeg",
    new THREE.Vector3(0, -0.19 * sourceHeight, 0),
    leftUpperLeg
  );
  const rightUpperLeg = createBone("Presentation_R_UpperLeg", fromCanonical(0.095, 0.445, 0), root);
  const rightLowerLeg = createBone(
    "Presentation_R_LowerLeg",
    new THREE.Vector3(0, -0.19 * sourceHeight, 0),
    rightUpperLeg
  );
  const chest = createBone("Presentation_Chest", fromCanonical(0, 0.59, 0), root);
  const hip = createBone("Presentation_Hip", fromCanonical(0, 0.43, 0), root);
  const leftFoot = createBone(
    "Presentation_L_Foot",
    new THREE.Vector3(0, -0.08 * sourceHeight, 0),
    leftLowerLeg
  );
  const rightFoot = createBone(
    "Presentation_R_Foot",
    new THREE.Vector3(0, -0.08 * sourceHeight, 0),
    rightLowerLeg
  );

  const bones = [
    root,
    leftUpperArm,
    leftForearm,
    leftHand,
    rightUpperArm,
    rightForearm,
    rightHand,
    head,
    leftUpperLeg,
    leftLowerLeg,
    rightUpperLeg,
    rightLowerLeg,
    chest,
    hip,
    leftFoot,
    rightFoot,
  ];
  const position = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
  const skinIndices = new Uint16Array(position.count * 4);
  const skinWeights = new Float32Array(position.count * 4);

  for (let vertexIndex = 0; vertexIndex < position.count; vertexIndex += 1) {
    const x = (position.getX(vertexIndex) - sourceCenter.x) / sourceHeight;
    const y = (position.getY(vertexIndex) - bounds.min.y) / sourceHeight;
    const absoluteX = Math.abs(x);

    if (y > 0.735 && absoluteX < 0.195) {
      assignSkinWeight(skinIndices, skinWeights, vertexIndex, 7);
      continue;
    }

    // Keep every shoe panel on one rigid foot bone. Blending the sole with the
    // lower leg makes separate hard-surface pieces slide apart when the ankle bends.
    if (y < 0.2) {
      assignSkinWeight(skinIndices, skinWeights, vertexIndex, x < 0 ? 14 : 15);
      continue;
    }

    if (y < 0.46 && absoluteX > 0.035 && absoluteX < 0.25) {
      const upperLeg = x < 0 ? 8 : 10;
      const lowerLeg = x < 0 ? 9 : 11;
      assignSkinWeight(skinIndices, skinWeights, vertexIndex, y < 0.265 ? lowerLeg : upperLeg);
      continue;
    }

    if (y >= 0.535 && y <= 0.735 && absoluteX < 0.145) {
      assignSkinWeight(skinIndices, skinWeights, vertexIndex, 12);
      continue;
    }

    if (y >= 0.36 && y < 0.535 && absoluteX < 0.15) {
      assignSkinWeight(skinIndices, skinWeights, vertexIndex, 13);
      continue;
    }

    if (y < 0.575 || y > 0.735 || absoluteX < 0.115) {
      assignSkinWeight(skinIndices, skinWeights, vertexIndex, 0);
      continue;
    }

    const upperArm = x < 0 ? 1 : 4;
    const forearm = x < 0 ? 2 : 5;
    if (absoluteX < 0.16) {
      const armWeight = smoothstep(0.115, 0.16, absoluteX);
      assignSkinWeight(skinIndices, skinWeights, vertexIndex, upperArm, 0, armWeight);
    } else if (absoluteX < 0.25) {
      assignSkinWeight(skinIndices, skinWeights, vertexIndex, upperArm);
    } else if (absoluteX < 0.29) {
      const forearmWeight = smoothstep(0.25, 0.29, absoluteX);
      assignSkinWeight(skinIndices, skinWeights, vertexIndex, forearm, upperArm, forearmWeight);
    } else {
      assignSkinWeight(skinIndices, skinWeights, vertexIndex, forearm);
    }
  }

  mesh.geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
  mesh.geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));

  const host = mesh.parent ?? mesh;
  host.add(root);
  host.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  mesh.bind(skeleton, mesh.matrixWorld);
  mesh.normalizeSkinWeights();
  mesh.frustumCulled = false;

  return {
    root,
    leftUpperArm,
    leftForearm,
    leftHand,
    rightUpperArm,
    rightForearm,
    rightHand,
    head,
    leftUpperLeg,
    leftLowerLeg,
    rightUpperLeg,
    rightLowerLeg,
    chest,
    hip,
    leftFoot,
    rightFoot,
    blinkMeshes,
  };
}

type RotationPose = [number, number, number];

function createQuaternionTrack(bone: THREE.Bone, times: number[], poses: RotationPose[]) {
  const values = poses.flatMap(([x, y, z]) =>
    new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, "XYZ")).toArray()
  );
  return new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, times, values);
}

function createPresentationClip(bones: PresentationBones) {
  const duration = EXPERIENCE_DAY_PRESENTATION_DURATION;
  const gestureTimes = [0, 1.2, 2.5, 3.7, 4.8, 6, 7.2, 8.4, 9.6, 10.8, 12, 13.2, 14.2, 15.1, 16];
  const rhythmTimes = Array.from({ length: duration * 2 + 1 }, (_, index) => index * 0.5);
  const leftUpperLegPoses = rhythmTimes.map((_, index): RotationPose => {
    if (index % 4 === 1) return [-0.1, 0, 0.03];
    if (index % 4 === 3) return [0.02, 0, -0.02];
    return [0.01, 0, 0];
  });
  const leftLowerLegPoses = rhythmTimes.map((_, index): RotationPose => {
    if (index % 4 === 1) return [0.2, 0, -0.025];
    if (index % 4 === 3) return [-0.03, 0, 0.015];
    return [0, 0, 0];
  });
  const rightUpperLegPoses = rhythmTimes.map((_, index): RotationPose => {
    if (index % 4 === 1) return [0.02, 0, 0.02];
    if (index % 4 === 3) return [-0.1, 0, -0.03];
    return [0.01, 0, 0];
  });
  const rightLowerLegPoses = rhythmTimes.map((_, index): RotationPose => {
    if (index % 4 === 1) return [-0.03, 0, -0.015];
    if (index % 4 === 3) return [0.2, 0, 0.025];
    return [0, 0, 0];
  });

  const tracks = [
    createQuaternionTrack(bones.leftUpperArm, gestureTimes, [
      [0.02, 0.22, 1.42],
      [0.06, 0.3, 1.34],
      [0, 0.12, 1.38],
      [0.03, 0.18, 1.3],
      [0.02, 0.22, 1.42],
      [0, 0.25, 0.38],
      [-0.03, 0.32, 0.31],
      [0.02, 0.22, 1.42],
      [0.03, 0.28, 1.02],
      [0, 0.18, 1.15],
      [0, 0.1, 1.4],
      [0.02, 0.22, 1.4],
      [0, 0.28, 0.36],
      [0.04, 0.3, 1.32],
      [0.02, 0.22, 1.42],
    ]),
    createQuaternionTrack(bones.leftForearm, gestureTimes, [
      [0, 0, 0.4],
      [0, 0, 0.55],
      [0, 0, 0.55],
      [0, 0, 0.75],
      [0, 0, 0.4],
      [0, 0, 2.45],
      [0, 0, 2.62],
      [0, 0, 0.4],
      [0, 0, 1.85],
      [0, 0, 1.25],
      [0, 0, 0.45],
      [0, 0, 1.25],
      [0, 0, 2.5],
      [0, 0, 1.15],
      [0, 0, 0.4],
    ]),
    createQuaternionTrack(bones.rightUpperArm, gestureTimes, [
      [0.02, -0.22, -1.42],
      [-0.02, -0.18, -1.34],
      [0, -0.25, -0.38],
      [-0.03, -0.32, -0.31],
      [0.02, -0.22, -1.42],
      [0, -0.12, -1.38],
      [0.03, -0.18, -1.3],
      [0.02, -0.22, -1.42],
      [-0.03, -0.18, -1.15],
      [0.03, -0.28, -1.02],
      [0, -0.28, -0.36],
      [0.02, -0.22, -1.4],
      [0, -0.1, -1.4],
      [-0.04, -0.3, -1.32],
      [0.02, -0.22, -1.42],
    ]),
    createQuaternionTrack(bones.rightForearm, gestureTimes, [
      [0, 0, -0.4],
      [0, 0, -0.55],
      [0, 0, -2.45],
      [0, 0, -2.62],
      [0, 0, -0.4],
      [0, 0, -0.55],
      [0, 0, -0.75],
      [0, 0, -0.4],
      [0, 0, -1.25],
      [0, 0, -1.85],
      [0, 0, -2.5],
      [0, 0, -1.25],
      [0, 0, -0.45],
      [0, 0, -1.15],
      [0, 0, -0.4],
    ]),
    createQuaternionTrack(bones.head, gestureTimes, [
      [0, 0, 0],
      [0.02, 0.04, 0.008],
      [0.015, -0.1, -0.012],
      [0.025, -0.12, -0.015],
      [0, 0, 0],
      [0.015, 0.1, 0.012],
      [0.025, 0.12, 0.015],
      [0, 0, 0],
      [0.018, 0.05, 0.008],
      [0.018, -0.05, -0.008],
      [0.02, -0.12, -0.015],
      [0, 0, 0],
      [0.02, 0.12, 0.015],
      [0.015, 0.04, 0.008],
      [0, 0, 0],
    ]),
    createQuaternionTrack(bones.leftUpperLeg, rhythmTimes, leftUpperLegPoses),
    createQuaternionTrack(bones.leftLowerLeg, rhythmTimes, leftLowerLegPoses),
    createQuaternionTrack(bones.rightUpperLeg, rhythmTimes, rightUpperLegPoses),
    createQuaternionTrack(bones.rightLowerLeg, rhythmTimes, rightLowerLegPoses),
  ];

  return new THREE.AnimationClip("presentation", duration, tracks).optimize();
}

function createPresentationMixer(model: THREE.Group) {
  let skinnedMesh: THREE.SkinnedMesh | null = null;
  model.traverse((object) => {
    if (!skinnedMesh && object instanceof THREE.SkinnedMesh) skinnedMesh = object;
  });
  if (!skinnedMesh) throw new Error("Experience Day robot does not contain a skinned mesh.");

  const bones = createPresentationSkeleton(skinnedMesh);
  const mixer = new THREE.AnimationMixer(model);
  const action = mixer.clipAction(createPresentationClip(bones));
  action.setLoop(THREE.LoopRepeat, Infinity);
  action.play();
  mixer.update(0);
  return { mixer, blinkMeshes: bones.blinkMeshes };
}

export async function loadExperienceDayRobot(maxAnisotropy = 1): Promise<ExperienceDayRobotModel> {
  const gltfLoader = new GLTFLoader();
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);

  const gltf = await gltfLoader.loadAsync(MODEL_URL);
  const model = gltf.scene;
  model.name = "experience-day-robot-model";
  model.traverse((object) => {
    if (object instanceof THREE.Mesh) configureMesh(object, maxAnisotropy);
  });

  const { mixer, blinkMeshes } = createPresentationMixer(model);
  normalizeModel(model);

  const root = new THREE.Group();
  root.name = "experience-day-robot-root";
  root.add(model);

  return { root, model, mixer, blinkMeshes };
}
