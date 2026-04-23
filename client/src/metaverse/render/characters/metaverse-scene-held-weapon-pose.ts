import {
  Bone,
  Group,
  Matrix4,
  Object3D,
  Quaternion,
  Vector3
} from "three/webgpu";
import type { MetaverseRealtimePlayerWeaponStateSnapshot } from "@webgpu-metaverse/shared";

import { metaverseServicePistolAttachmentAssetId } from "@/assets/config/attachment-model-manifest";
import { isHumanoidV2PistolAimOverlayTrack } from "../humanoid-v2-rig";
import type { MetaverseSceneHeldWeaponGripDebugState } from "./metaverse-scene-held-weapon-grip-debug-state";

import type { MetaverseAttachmentProofRuntime } from "../attachments/metaverse-scene-attachment-runtime";

import type {
  MetaverseCameraSnapshot,
  MetaverseLocalHeldWeaponGripDebugSolveFailureReason,
  MetaverseRuntimeConfig
} from "../../types/metaverse-runtime";

export interface HumanoidV2HeldWeaponPoseRuntime {
  readonly drivenBones: readonly {
    readonly authoredLocalQuaternion: Quaternion;
    readonly bone: Bone;
    readonly restoreSource: "authored" | "sampled";
    readonly sampledLocalQuaternion: Quaternion;
  }[];
  readonly leftClavicleBone: Bone;
  readonly leftIndexBaseBone: Bone;
  readonly leftIndexGripContactNode: Object3D;
  readonly leftIndexGripGuideNode: Object3D;
  readonly leftIndexMiddleBone: Bone;
  readonly leftIndexTipBone: Bone;
  readonly leftGripSocketNode: Object3D;
  readonly leftHandBone: Bone;
  readonly leftLowerarmBone: Bone;
  readonly leftMiddleBaseBone: Bone;
  readonly leftMiddleGripContactNode: Object3D;
  readonly leftMiddleGripGuideNode: Object3D;
  readonly leftMiddleMiddleBone: Bone;
  readonly leftMiddleTipBone: Bone;
  readonly leftPalmSocketNode: Object3D;
  readonly leftSupportSocketNode: Object3D;
  readonly leftUpperarmBone: Bone;
  readonly rightClavicleBone: Bone;
  readonly rightHandBone: Bone;
  readonly rightIndexBaseBone: Bone;
  readonly rightIndexMiddleBone: Bone;
  readonly rightIndexTipBone: Bone;
  readonly rightGripSocketNode: Object3D;
  readonly rightLowerarmBone: Bone;
  readonly rightTriggerContactNode: Object3D;
  readonly rightPalmSocketNode: Object3D;
  readonly rightTriggerGuideNode: Object3D;
  readonly rightUpperarmBone: Bone;
}

interface HeldWeaponArmReachTelemetry {
  clampDeltaMeters: number | null;
  maxReachMeters: number | null;
  targetDistanceMeters: number | null;
}

export interface MetaverseHeldWeaponPoseRuntimeNodeResolvers {
  readonly findBoneNode: (
    characterScene: Group,
    boneName: string,
    label: string
  ) => Bone;
  readonly findSocketNode: (
    characterScene: Group,
    socketName: string
  ) => Object3D;
}

const heldWeaponElbowPoleAcrossBias = 0.42;
const heldWeaponElbowPoleBiasWeight = 0.92;
const heldWeaponElbowPoleDownBias = 0.7;
const heldWeaponElbowPolePreferenceWeight = 1.4;
const heldWeaponChestForwardMeters = 0.42;
const heldWeaponLeftArmReachSlackMeters = 0.001;
const heldWeaponRightArmReachSlackMeters = 0.045;
const heldWeaponServicePistolLeftArmReachSlackMeters = 0.02;
const heldWeaponSupportMarkerRefinementPassCount = 3;
const heldWeaponGripFingerContactLocalOffsetMeters = 0.014;
const heldWeaponRightTriggerContactLocalExtensionScale = 0.36;
const heldWeaponSampledRestoreBoneNames = Object.freeze([
  "clavicle_l",
  "clavicle_r",
  "index_01_r",
  "index_02_r",
  "index_03_r"
] as const);
export const heldWeaponSolveDirectionEpsilon = 0.000001;
const heldWeaponClampedHandTargetWorldPositionScratch = new Vector3();
const heldWeaponCameraWorldPositionScratch = new Vector3();
const heldWeaponHipFireGripWorldPositionScratch = new Vector3();
const heldWeaponAdsGripWorldPositionScratch = new Vector3();
const heldWeaponHeadToCameraScratch = new Vector3();
const heldWeaponHeadWorldPositionScratch = new Vector3();
const heldWeaponEffectorWorldPositionScratch = new Vector3();
const heldWeaponBoneWorldPositionScratch = new Vector3();
const heldWeaponElbowTargetWorldPositionScratch = new Vector3();
const heldWeaponEffectorDirectionScratch = new Vector3();
const heldWeaponTargetDirectionScratch = new Vector3();
const heldWeaponLookDirectionScratch = new Vector3();
const heldWeaponGripUpDirectionScratch = new Vector3();
const heldWeaponGripAcrossDirectionScratch = new Vector3();
const heldWeaponGripSocketWorldPositionScratch = new Vector3();
const heldWeaponLeftHandTargetWorldPositionScratch = new Vector3();
const heldWeaponLocalChainAxisScratch = new Vector3();
const heldWeaponLocalChainRootPositionScratch = new Vector3();
const heldWeaponFingerContactTargetWorldPositionScratch = new Vector3();
const heldWeaponFingerTargetGripLocalPositionScratch = new Vector3();
const heldWeaponFingerBaseGripLocalPositionScratch = new Vector3();
const heldWeaponFingerMiddleGripLocalPositionScratch = new Vector3();
const heldWeaponFingerTipGripLocalPositionScratch = new Vector3();
const heldWeaponFingerGuideGripLocalPositionScratch = new Vector3();
const heldWeaponFingerGuideAlternateGripLocalPositionScratch = new Vector3();
const heldWeaponTriggerMarkerWorldPositionScratch = new Vector3();
const heldWeaponShoulderWorldPositionScratch = new Vector3();
const heldWeaponElbowWorldPositionScratch = new Vector3();
const heldWeaponHandEffectorLocalPositionScratch = new Vector3();
const heldWeaponRightHandTargetWorldPositionScratch = new Vector3();
const heldWeaponSocketLocalOffsetScratch = new Vector3();
const heldWeaponWristWorldPositionScratch = new Vector3();
const heldWeaponArmAxisScratch = new Vector3();
const heldWeaponCurrentPoleDirectionScratch = new Vector3();
const heldWeaponPoleDirectionCrossScratch = new Vector3();
const heldWeaponTargetPoleDirectionScratch = new Vector3();
const heldWeaponRightElbowPolePreferenceScratch = new Vector3();
const heldWeaponLeftElbowPolePreferenceScratch = new Vector3();
const heldWeaponRightElbowPoleTargetScratch = new Vector3();
const heldWeaponLeftElbowPoleTargetScratch = new Vector3();
const heldWeaponParentWorldQuaternionScratch = new Quaternion();
const heldWeaponParentWorldQuaternionInverseScratch = new Quaternion();
const heldWeaponLocalDeltaQuaternionScratch = new Quaternion();
const heldWeaponSupportHandTargetWorldQuaternionScratch = new Quaternion();
const heldWeaponAttachmentWorldQuaternionScratch = new Quaternion();
const heldWeaponGripLocalAimQuaternionScratch = new Quaternion();
const heldWeaponHandTargetWorldQuaternionScratch = new Quaternion();
const heldWeaponHandEffectorLocalQuaternionScratch = new Quaternion();
const heldWeaponTargetWorldQuaternionScratch = new Quaternion();
const heldWeaponCurrentWorldQuaternionScratch = new Quaternion();
const heldWeaponEffectorWorldQuaternionScratch = new Quaternion();
const heldWeaponWorldDeltaQuaternionScratch = new Quaternion();
const heldWeaponParentLocalDeltaQuaternionScratch = new Quaternion();
const heldWeaponGripAlignmentMatrixScratch = new Matrix4();
const heldWeaponArmReachTelemetryScratch: HeldWeaponArmReachTelemetry = {
  clampDeltaMeters: null,
  maxReachMeters: null,
  targetDistanceMeters: null
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveHumanoidV2HeldWeaponDrivenBoneRestoreSource(
  boneName: string
): "authored" | "sampled" {
  return (
    isHumanoidV2PistolAimOverlayTrack(`${boneName}.quaternion`) &&
    heldWeaponSampledRestoreBoneNames.includes(
      boneName as (typeof heldWeaponSampledRestoreBoneNames)[number]
    )
  )
    ? "sampled"
    : "authored";
}

function createHeldWeaponFingerContactNode(
  nodeName: string,
  tipBone: Bone,
  localXOffset: number
): Object3D {
  const contactNode = new Object3D();

  contactNode.name = nodeName;
  contactNode.position.set(localXOffset, 0, 0);
  contactNode.quaternion.identity();
  tipBone.add(contactNode);

  return contactNode;
}

function createHeldWeaponFingerGuideNode(
  nodeName: string,
  baseBone: Bone
): Object3D {
  const guideNode = new Object3D();

  guideNode.name = nodeName;
  guideNode.position.set(0, 0, 0);
  guideNode.quaternion.identity();
  baseBone.add(guideNode);

  return guideNode;
}

function createHumanoidV2HeldWeaponPoseRuntime(
  characterScene: Group,
  nodeResolvers: MetaverseHeldWeaponPoseRuntimeNodeResolvers
): HumanoidV2HeldWeaponPoseRuntime {
  const leftHandBone = nodeResolvers.findBoneNode(
    characterScene,
    "hand_l",
    "Metaverse humanoid_v2 held weapon pose"
  );
  const rightHandBone = nodeResolvers.findBoneNode(
    characterScene,
    "hand_r",
    "Metaverse humanoid_v2 held weapon pose"
  );
  const leftLowerarmBone = nodeResolvers.findBoneNode(
    characterScene,
    "lowerarm_l",
    "Metaverse humanoid_v2 held weapon pose"
  );
  const leftUpperarmBone = nodeResolvers.findBoneNode(
    characterScene,
    "upperarm_l",
    "Metaverse humanoid_v2 held weapon pose"
  );
  const rightLowerarmBone = nodeResolvers.findBoneNode(
    characterScene,
    "lowerarm_r",
    "Metaverse humanoid_v2 held weapon pose"
  );
  const rightUpperarmBone = nodeResolvers.findBoneNode(
    characterScene,
    "upperarm_r",
    "Metaverse humanoid_v2 held weapon pose"
  );
  const leftClavicleBone = nodeResolvers.findBoneNode(
    characterScene,
    "clavicle_l",
    "Metaverse humanoid_v2 held weapon pose"
  );
  const rightClavicleBone = nodeResolvers.findBoneNode(
    characterScene,
    "clavicle_r",
    "Metaverse humanoid_v2 held weapon pose"
  );
  const leftIndexBaseBone = nodeResolvers.findBoneNode(
    characterScene,
    "index_01_l",
    "Metaverse humanoid_v2 held weapon pose"
  );
  const leftIndexMiddleBone = nodeResolvers.findBoneNode(
    characterScene,
    "index_02_l",
    "Metaverse humanoid_v2 held weapon pose"
  );
  const leftIndexTipBone = nodeResolvers.findBoneNode(
    characterScene,
    "index_03_l",
    "Metaverse humanoid_v2 held weapon pose"
  );
  const leftMiddleBaseBone = nodeResolvers.findBoneNode(
    characterScene,
    "middle_01_l",
    "Metaverse humanoid_v2 held weapon pose"
  );
  const leftMiddleMiddleBone = nodeResolvers.findBoneNode(
    characterScene,
    "middle_02_l",
    "Metaverse humanoid_v2 held weapon pose"
  );
  const leftMiddleTipBone = nodeResolvers.findBoneNode(
    characterScene,
    "middle_03_l",
    "Metaverse humanoid_v2 held weapon pose"
  );
  const rightIndexBaseBone = nodeResolvers.findBoneNode(
    characterScene,
    "index_01_r",
    "Metaverse humanoid_v2 held weapon pose"
  );
  const rightIndexMiddleBone = nodeResolvers.findBoneNode(
    characterScene,
    "index_02_r",
    "Metaverse humanoid_v2 held weapon pose"
  );
  const rightIndexTipBone = nodeResolvers.findBoneNode(
    characterScene,
    "index_03_r",
    "Metaverse humanoid_v2 held weapon pose"
  );
  const leftPalmSocketNode = nodeResolvers.findSocketNode(
    characterScene,
    "palm_l_socket"
  );
  const leftSupportSocketNode = nodeResolvers.findSocketNode(
    characterScene,
    "support_l_socket"
  );
  const rightPalmSocketNode = nodeResolvers.findSocketNode(
    characterScene,
    "palm_r_socket"
  );
  const leftIndexGripContactNode = createHeldWeaponFingerContactNode(
    "metaverse_left_index_grip_contact",
    leftIndexTipBone,
    heldWeaponGripFingerContactLocalOffsetMeters
  );
  const leftIndexGripGuideNode = createHeldWeaponFingerGuideNode(
    "metaverse_left_index_grip_guide",
    leftIndexBaseBone
  );
  const leftMiddleGripContactNode = createHeldWeaponFingerContactNode(
    "metaverse_left_middle_grip_contact",
    leftMiddleTipBone,
    heldWeaponGripFingerContactLocalOffsetMeters
  );
  const leftMiddleGripGuideNode = createHeldWeaponFingerGuideNode(
    "metaverse_left_middle_grip_guide",
    leftMiddleBaseBone
  );
  const rightTriggerContactNode = createHeldWeaponFingerContactNode(
    "metaverse_right_trigger_contact",
    rightIndexTipBone,
    Math.max(
      heldWeaponGripFingerContactLocalOffsetMeters,
      Math.abs(rightIndexTipBone.position.x) *
        heldWeaponRightTriggerContactLocalExtensionScale
    )
  );
  const rightTriggerGuideNode = createHeldWeaponFingerGuideNode(
    "metaverse_right_trigger_guide",
    rightIndexBaseBone
  );
  const drivenBones = [
    leftClavicleBone,
    leftUpperarmBone,
    leftLowerarmBone,
    leftHandBone,
    leftIndexBaseBone,
    leftIndexMiddleBone,
    leftIndexTipBone,
    leftMiddleBaseBone,
    leftMiddleMiddleBone,
    leftMiddleTipBone,
    rightClavicleBone,
    rightUpperarmBone,
    rightLowerarmBone,
    rightHandBone,
    rightIndexBaseBone,
    rightIndexMiddleBone,
    rightIndexTipBone
  ] as const;

  return {
    drivenBones: drivenBones.map((bone) => ({
      authoredLocalQuaternion: bone.quaternion.clone(),
      bone,
      restoreSource: resolveHumanoidV2HeldWeaponDrivenBoneRestoreSource(
        bone.name
      ),
      sampledLocalQuaternion: bone.quaternion.clone()
    })),
    leftClavicleBone,
    leftIndexBaseBone,
    leftIndexGripContactNode,
    leftIndexGripGuideNode,
    leftIndexMiddleBone,
    leftIndexTipBone,
    leftGripSocketNode: nodeResolvers.findSocketNode(characterScene, "grip_l_socket"),
    leftHandBone,
    leftLowerarmBone,
    leftMiddleBaseBone,
    leftMiddleGripContactNode,
    leftMiddleGripGuideNode,
    leftMiddleMiddleBone,
    leftMiddleTipBone,
    leftPalmSocketNode,
    leftSupportSocketNode,
    leftUpperarmBone,
    rightClavicleBone,
    rightHandBone,
    rightIndexBaseBone,
    rightIndexMiddleBone,
    rightIndexTipBone,
    rightGripSocketNode: nodeResolvers.findSocketNode(characterScene, "grip_r_socket"),
    rightLowerarmBone,
    rightTriggerContactNode,
    rightPalmSocketNode,
    rightTriggerGuideNode,
    rightUpperarmBone
  };
}

export function createHeldWeaponPoseRuntime(
  characterScene: Group,
  nodeResolvers: MetaverseHeldWeaponPoseRuntimeNodeResolvers
): HumanoidV2HeldWeaponPoseRuntime {
  return createHumanoidV2HeldWeaponPoseRuntime(characterScene, nodeResolvers);
}

export function captureHumanoidV2HeldWeaponPoseRuntime(
  heldWeaponPoseRuntime: HumanoidV2HeldWeaponPoseRuntime
): void {
  for (const drivenBone of heldWeaponPoseRuntime.drivenBones) {
    if (drivenBone.restoreSource !== "sampled") {
      continue;
    }

    drivenBone.sampledLocalQuaternion.copy(drivenBone.bone.quaternion);
  }
}

export function restoreHumanoidV2HeldWeaponPoseRuntime(
  heldWeaponPoseRuntime: HumanoidV2HeldWeaponPoseRuntime
): void {
  for (const drivenBone of heldWeaponPoseRuntime.drivenBones) {
    drivenBone.bone.quaternion.copy(
      drivenBone.restoreSource === "sampled"
        ? drivenBone.sampledLocalQuaternion
        : drivenBone.authoredLocalQuaternion
    );
  }
}

function alignBoneTowardEffectorWorldQuaternion(
  bone: Bone,
  effectorNode: Object3D,
  targetWorldQuaternion: Quaternion
): void {
  const parentNode = bone.parent;

  if (parentNode === null) {
    return;
  }

  effectorNode.updateMatrixWorld(true);
  heldWeaponCurrentWorldQuaternionScratch.copy(
    effectorNode.getWorldQuaternion(heldWeaponCurrentWorldQuaternionScratch)
  );

  if (
    heldWeaponCurrentWorldQuaternionScratch.angleTo(targetWorldQuaternion) <=
    heldWeaponSolveDirectionEpsilon
  ) {
    return;
  }

  heldWeaponWorldDeltaQuaternionScratch
    .copy(targetWorldQuaternion)
    .multiply(heldWeaponCurrentWorldQuaternionScratch.invert());
  heldWeaponParentWorldQuaternionScratch.copy(
    parentNode.getWorldQuaternion(heldWeaponParentWorldQuaternionScratch)
  );
  heldWeaponParentWorldQuaternionInverseScratch
    .copy(heldWeaponParentWorldQuaternionScratch)
    .invert();
  heldWeaponParentLocalDeltaQuaternionScratch
    .copy(heldWeaponParentWorldQuaternionInverseScratch)
    .multiply(heldWeaponWorldDeltaQuaternionScratch)
    .multiply(heldWeaponParentWorldQuaternionScratch);
  bone.quaternion.premultiply(heldWeaponParentLocalDeltaQuaternionScratch);
  bone.updateMatrixWorld(true);
}

function alignBoneTowardWorldPoint(
  bone: Bone,
  effectorNode: Object3D,
  targetWorldPosition: Vector3
): void {
  const parentNode = bone.parent;

  if (parentNode === null) {
    return;
  }

  bone.getWorldPosition(heldWeaponBoneWorldPositionScratch);
  effectorNode.getWorldPosition(heldWeaponEffectorWorldPositionScratch);
  heldWeaponEffectorDirectionScratch
    .copy(heldWeaponEffectorWorldPositionScratch)
    .sub(heldWeaponBoneWorldPositionScratch);
  heldWeaponTargetDirectionScratch
    .copy(targetWorldPosition)
    .sub(heldWeaponBoneWorldPositionScratch);

  if (
    heldWeaponEffectorDirectionScratch.lengthSq() <= heldWeaponSolveDirectionEpsilon ||
    heldWeaponTargetDirectionScratch.lengthSq() <= heldWeaponSolveDirectionEpsilon
  ) {
    return;
  }

  heldWeaponParentWorldQuaternionInverseScratch
    .copy(parentNode.getWorldQuaternion(heldWeaponParentWorldQuaternionScratch))
    .invert();
  heldWeaponEffectorDirectionScratch
    .normalize()
    .applyQuaternion(heldWeaponParentWorldQuaternionInverseScratch);
  heldWeaponTargetDirectionScratch
    .normalize()
    .applyQuaternion(heldWeaponParentWorldQuaternionInverseScratch);
  heldWeaponLocalDeltaQuaternionScratch.setFromUnitVectors(
    heldWeaponEffectorDirectionScratch,
    heldWeaponTargetDirectionScratch
  );
  bone.quaternion.premultiply(heldWeaponLocalDeltaQuaternionScratch);
  bone.updateMatrixWorld(true);
}

function resolveHandWorldTargetPosition(
  handTargetWorldQuaternion: Quaternion,
  handEffectorLocalPosition: Vector3,
  handEffectorTargetWorldPosition: Vector3,
  outputHandWorldPosition: Vector3
): void {
  outputHandWorldPosition.copy(handEffectorTargetWorldPosition).sub(
    heldWeaponSocketLocalOffsetScratch
      .copy(handEffectorLocalPosition)
      .applyQuaternion(handTargetWorldQuaternion)
  );
}

function resolveHandBoneTargetWorldQuaternion(
  handBone: Bone,
  handEffectorNode: Object3D,
  handEffectorTargetWorldQuaternion: Quaternion,
  outputHandWorldQuaternion: Quaternion
): Quaternion {
  heldWeaponHandEffectorLocalQuaternionScratch
    .copy(handBone.getWorldQuaternion(heldWeaponCurrentWorldQuaternionScratch))
    .invert()
    .multiply(
      handEffectorNode.getWorldQuaternion(heldWeaponEffectorWorldQuaternionScratch)
    )
    .normalize();

  return outputHandWorldQuaternion
    .copy(handEffectorTargetWorldQuaternion)
    .multiply(heldWeaponHandEffectorLocalQuaternionScratch.invert())
    .normalize();
}

function resolveHandEffectorLocalPosition(
  handBone: Bone,
  handEffectorNode: Object3D,
  outputLocalPosition: Vector3
): Vector3 {
  return handBone.worldToLocal(
    outputLocalPosition.copy(
      handEffectorNode.getWorldPosition(heldWeaponEffectorWorldPositionScratch)
    )
  );
}

function resolveClosestPointOnSegmentToTarget(
  segmentStart: Vector3,
  segmentEnd: Vector3,
  target: Vector3,
  outputClosestPoint: Vector3
): number {
  heldWeaponLocalChainAxisScratch.copy(segmentEnd).sub(segmentStart);
  const segmentLengthSq = heldWeaponLocalChainAxisScratch.lengthSq();

  if (segmentLengthSq <= heldWeaponSolveDirectionEpsilon) {
    outputClosestPoint.copy(segmentStart);

    return outputClosestPoint.distanceTo(target);
  }

  const closestPointAlpha = clamp(
    heldWeaponLocalChainRootPositionScratch
      .copy(target)
      .sub(segmentStart)
      .dot(heldWeaponLocalChainAxisScratch) / segmentLengthSq,
    0,
    1
  );

  outputClosestPoint.copy(segmentStart).addScaledVector(
    heldWeaponLocalChainAxisScratch,
    closestPointAlpha
  );

  return outputClosestPoint.distanceTo(target);
}

function resolveGripLocalPositionWorldPositionFromTarget(
  gripTargetWorldPosition: Vector3,
  gripTargetWorldQuaternion: Quaternion,
  gripLocalPosition: Vector3,
  outputWorldPosition: Vector3
): Vector3 {
  return outputWorldPosition
    .copy(gripTargetWorldPosition)
    .add(
      heldWeaponSocketLocalOffsetScratch
        .copy(gripLocalPosition)
        .applyQuaternion(gripTargetWorldQuaternion)
    );
}

function resolveGripTargetWorldPositionFromLocalGripOffset(
  targetNodeWorldPosition: Vector3,
  gripTargetWorldQuaternion: Quaternion,
  gripLocalPosition: Vector3,
  outputWorldPosition: Vector3
): Vector3 {
  return outputWorldPosition
    .copy(targetNodeWorldPosition)
    .sub(
      heldWeaponSocketLocalOffsetScratch
        .copy(gripLocalPosition)
        .applyQuaternion(gripTargetWorldQuaternion)
    );
}

function shouldUseServicePistolAdsPose(
  attachmentRuntime: Pick<
    MetaverseAttachmentProofRuntime,
    "heldGripToAdsCameraAnchorLocalPosition"
  >,
  weaponState: MetaverseRealtimePlayerWeaponStateSnapshot | null,
  adsBlend: number | null
): boolean {
  return (
    weaponState?.weaponId === metaverseServicePistolAttachmentAssetId &&
    (weaponState?.aimMode === "ads" ||
      Math.abs(adsBlend ?? 0) > heldWeaponSolveDirectionEpsilon) &&
    attachmentRuntime.heldGripToAdsCameraAnchorLocalPosition !== null
  );
}

function shouldUseServicePistolSupportPalmPose(
  attachmentRuntime: Pick<MetaverseAttachmentProofRuntime, "heldSupportMarkerNode">,
  weaponState: MetaverseRealtimePlayerWeaponStateSnapshot | null
): boolean {
  return (
    attachmentRuntime.heldSupportMarkerNode !== null &&
    weaponState?.weaponId === metaverseServicePistolAttachmentAssetId
  );
}

function resolveHipFireGripTargetWorldPosition(
  heldWeaponPoseRuntime: HumanoidV2HeldWeaponPoseRuntime,
  lookDirection: Vector3,
  outputGripWorldPosition: Vector3
): void {
  outputGripWorldPosition.copy(
    heldWeaponPoseRuntime.rightClavicleBone.getWorldPosition(
      outputGripWorldPosition
    )
  );
  outputGripWorldPosition.addScaledVector(
    lookDirection,
    heldWeaponChestForwardMeters
  );
}

function resolveCameraWorldPositionWithHeadClearance(
  cameraSnapshot: MetaverseCameraSnapshot,
  lookDirection: Vector3,
  headAnchorNodes: readonly Object3D[],
  bodyPresentation: Pick<
    MetaverseRuntimeConfig["bodyPresentation"],
    | "groundedFirstPersonHeadClearanceMeters"
    | "groundedFirstPersonHeadOcclusionRadiusMeters"
  >,
  outputWorldPosition: Vector3
): Vector3 {
  outputWorldPosition.set(
    cameraSnapshot.position.x,
    cameraSnapshot.position.y,
    cameraSnapshot.position.z
  );

  if (headAnchorNodes.length === 0) {
    return outputWorldPosition;
  }

  let selectedForwardDistanceMeters = Number.NEGATIVE_INFINITY;
  let selectedLateralDistanceMeters = Number.POSITIVE_INFINITY;

  for (const headAnchorNode of headAnchorNodes) {
    headAnchorNode.getWorldPosition(heldWeaponHeadWorldPositionScratch);
    heldWeaponHeadToCameraScratch.set(
      heldWeaponHeadWorldPositionScratch.x - cameraSnapshot.position.x,
      heldWeaponHeadWorldPositionScratch.y - cameraSnapshot.position.y,
      heldWeaponHeadWorldPositionScratch.z - cameraSnapshot.position.z
    );
    const forwardDistanceMeters =
      heldWeaponHeadToCameraScratch.dot(lookDirection);
    const lateralDistanceMeters = Math.sqrt(
      Math.max(
        0,
        heldWeaponHeadToCameraScratch.lengthSq() -
          forwardDistanceMeters * forwardDistanceMeters
      )
    );

    if (lateralDistanceMeters > selectedLateralDistanceMeters) {
      continue;
    }

    if (
      lateralDistanceMeters === selectedLateralDistanceMeters &&
      forwardDistanceMeters <= selectedForwardDistanceMeters
    ) {
      continue;
    }

    selectedForwardDistanceMeters = forwardDistanceMeters;
    selectedLateralDistanceMeters = lateralDistanceMeters;
  }

  if (
    !Number.isFinite(selectedLateralDistanceMeters) ||
    selectedLateralDistanceMeters >
      bodyPresentation.groundedFirstPersonHeadOcclusionRadiusMeters
  ) {
    return outputWorldPosition;
  }

  const requiredForwardShiftMeters =
    selectedForwardDistanceMeters +
    bodyPresentation.groundedFirstPersonHeadClearanceMeters;

  if (requiredForwardShiftMeters <= 0) {
    return outputWorldPosition;
  }

  outputWorldPosition.addScaledVector(lookDirection, requiredForwardShiftMeters);

  return outputWorldPosition;
}

function resolveHeldWeaponGripAimTarget(
  heldWeaponPoseRuntime: HumanoidV2HeldWeaponPoseRuntime,
  firstPersonHeadAnchorNodes: readonly Object3D[],
  attachmentRuntime: MetaverseAttachmentProofRuntime,
  cameraSnapshot: MetaverseCameraSnapshot,
  weaponState: MetaverseRealtimePlayerWeaponStateSnapshot | null,
  adsBlend: number | null,
  bodyPresentation:
    | Pick<
        MetaverseRuntimeConfig["bodyPresentation"],
        | "groundedFirstPersonHeadClearanceMeters"
        | "groundedFirstPersonHeadOcclusionRadiusMeters"
      >
    | null,
  outputGripWorldPosition: Vector3,
  outputGripWorldQuaternion: Quaternion
): MetaverseLocalHeldWeaponGripDebugSolveFailureReason | null {
  heldWeaponLookDirectionScratch.set(
    cameraSnapshot.lookDirection.x,
    cameraSnapshot.lookDirection.y,
    cameraSnapshot.lookDirection.z
  );

  if (heldWeaponLookDirectionScratch.lengthSq() <= heldWeaponSolveDirectionEpsilon) {
    return "look-direction-degenerate";
  }

  heldWeaponLookDirectionScratch.normalize();
  heldWeaponGripUpDirectionScratch.set(0, 1, 0);
  heldWeaponGripUpDirectionScratch.addScaledVector(
    heldWeaponLookDirectionScratch,
    -heldWeaponGripUpDirectionScratch.dot(heldWeaponLookDirectionScratch)
  );

  if (heldWeaponGripUpDirectionScratch.lengthSq() <= heldWeaponSolveDirectionEpsilon) {
    heldWeaponGripUpDirectionScratch.set(0, 0, 1);
    heldWeaponGripUpDirectionScratch.addScaledVector(
      heldWeaponLookDirectionScratch,
      -heldWeaponGripUpDirectionScratch.dot(heldWeaponLookDirectionScratch)
    );
  }

  if (heldWeaponGripUpDirectionScratch.lengthSq() <= heldWeaponSolveDirectionEpsilon) {
    return "grip-up-direction-degenerate";
  }

  heldWeaponGripUpDirectionScratch.normalize();
  heldWeaponGripAcrossDirectionScratch
    .copy(heldWeaponLookDirectionScratch)
    .cross(heldWeaponGripUpDirectionScratch);

  if (heldWeaponGripAcrossDirectionScratch.lengthSq() <= heldWeaponSolveDirectionEpsilon) {
    return "grip-across-direction-degenerate";
  }

  heldWeaponGripAcrossDirectionScratch.normalize();
  heldWeaponGripUpDirectionScratch
    .copy(heldWeaponGripAcrossDirectionScratch)
    .cross(heldWeaponLookDirectionScratch)
    .normalize();
  outputGripWorldQuaternion.setFromRotationMatrix(
    heldWeaponGripAlignmentMatrixScratch.makeBasis(
      heldWeaponLookDirectionScratch,
      heldWeaponGripUpDirectionScratch,
      heldWeaponGripAcrossDirectionScratch
    )
  );
  outputGripWorldQuaternion.multiply(
    heldWeaponGripLocalAimQuaternionScratch
      .copy(attachmentRuntime.heldGripLocalAimQuaternion)
      .invert()
  ).normalize();
  resolveHipFireGripTargetWorldPosition(
    heldWeaponPoseRuntime,
    heldWeaponLookDirectionScratch,
    heldWeaponHipFireGripWorldPositionScratch
  );
  outputGripWorldPosition.copy(heldWeaponHipFireGripWorldPositionScratch);

  if (shouldUseServicePistolAdsPose(attachmentRuntime, weaponState, adsBlend)) {
    // Align the authored service-pistol ADS camera anchor to the camera so the
    // rendered weapon follows the same line as the gameplay reticle.
    const resolvedAdsBlend = clamp(
      adsBlend ?? (weaponState?.aimMode === "ads" ? 1 : 0),
      0,
      1
    );

    if (adsBlend === null && bodyPresentation !== null) {
      resolveCameraWorldPositionWithHeadClearance(
        cameraSnapshot,
        heldWeaponLookDirectionScratch,
        firstPersonHeadAnchorNodes,
        bodyPresentation,
        heldWeaponCameraWorldPositionScratch
      );
    } else {
      heldWeaponCameraWorldPositionScratch.set(
        cameraSnapshot.position.x,
        cameraSnapshot.position.y,
        cameraSnapshot.position.z
      );
    }
    if (attachmentRuntime.heldAdsCameraTargetOffset !== null) {
      heldWeaponCameraWorldPositionScratch
        .addScaledVector(
          heldWeaponLookDirectionScratch,
          attachmentRuntime.heldAdsCameraTargetOffset.forward
        )
        .addScaledVector(
          heldWeaponGripUpDirectionScratch,
          attachmentRuntime.heldAdsCameraTargetOffset.up
        )
        .addScaledVector(
          heldWeaponGripAcrossDirectionScratch,
          attachmentRuntime.heldAdsCameraTargetOffset.across
        );
    }
    resolveGripTargetWorldPositionFromLocalGripOffset(
      heldWeaponCameraWorldPositionScratch,
      outputGripWorldQuaternion,
      attachmentRuntime.heldGripToAdsCameraAnchorLocalPosition!,
      heldWeaponAdsGripWorldPositionScratch
    );
    outputGripWorldPosition.lerpVectors(
      heldWeaponHipFireGripWorldPositionScratch,
      heldWeaponAdsGripWorldPositionScratch,
      resolvedAdsBlend
    );

    return null;
  }

  return null;
}

function resolveRightHandWorldTargetPosition(
  heldWeaponPoseRuntime: HumanoidV2HeldWeaponPoseRuntime,
  handEffectorNode: Object3D,
  gripTargetWorldPosition: Vector3,
  handEffectorTargetWorldQuaternion: Quaternion,
  outputHandWorldPosition: Vector3
): void {
  const handEffectorLocalPosition = resolveHandEffectorLocalPosition(
    heldWeaponPoseRuntime.rightHandBone,
    handEffectorNode,
    heldWeaponHandEffectorLocalPositionScratch
  );
  const handTargetWorldQuaternion = resolveHandBoneTargetWorldQuaternion(
    heldWeaponPoseRuntime.rightHandBone,
    handEffectorNode,
    handEffectorTargetWorldQuaternion,
    heldWeaponHandTargetWorldQuaternionScratch
  );

  resolveHandWorldTargetPosition(
    handTargetWorldQuaternion,
    handEffectorLocalPosition,
    gripTargetWorldPosition,
    outputHandWorldPosition
  );
}

function solveTwoBoneChainToWorldTarget(
  rootBone: Bone,
  middleBone: Bone,
  effectorNode: Object3D,
  effectorWorldTargetPosition: Vector3,
  poleWorldDirection: Vector3,
  reachSlackMeters: number
): void {
  rootBone.getWorldPosition(heldWeaponShoulderWorldPositionScratch);
  middleBone.getWorldPosition(heldWeaponElbowWorldPositionScratch);
  effectorNode.getWorldPosition(heldWeaponWristWorldPositionScratch);
  const upperarmLength = heldWeaponShoulderWorldPositionScratch.distanceTo(
    heldWeaponElbowWorldPositionScratch
  );
  const lowerarmLength = heldWeaponElbowWorldPositionScratch.distanceTo(
    heldWeaponWristWorldPositionScratch
  );

  if (
    upperarmLength <= heldWeaponSolveDirectionEpsilon ||
    lowerarmLength <= heldWeaponSolveDirectionEpsilon
  ) {
    return;
  }

  heldWeaponTargetDirectionScratch
    .copy(effectorWorldTargetPosition)
    .sub(heldWeaponShoulderWorldPositionScratch);
  const targetDistance = heldWeaponTargetDirectionScratch.length();

  if (targetDistance <= heldWeaponSolveDirectionEpsilon) {
    return;
  }

  heldWeaponTargetDirectionScratch.normalize();
  heldWeaponTargetPoleDirectionScratch.copy(poleWorldDirection);
  heldWeaponTargetPoleDirectionScratch.addScaledVector(
    heldWeaponTargetDirectionScratch,
    -heldWeaponTargetPoleDirectionScratch.dot(heldWeaponTargetDirectionScratch)
  );

  if (
    heldWeaponTargetPoleDirectionScratch.lengthSq() <=
    heldWeaponSolveDirectionEpsilon
  ) {
    heldWeaponTargetPoleDirectionScratch
      .copy(heldWeaponElbowWorldPositionScratch)
      .sub(heldWeaponShoulderWorldPositionScratch);
    heldWeaponTargetPoleDirectionScratch.addScaledVector(
      heldWeaponTargetDirectionScratch,
      -heldWeaponTargetPoleDirectionScratch.dot(heldWeaponTargetDirectionScratch)
    );
  }

  if (
    heldWeaponTargetPoleDirectionScratch.lengthSq() <=
    heldWeaponSolveDirectionEpsilon
  ) {
    return;
  }

  heldWeaponTargetPoleDirectionScratch.normalize();
  const clampedTargetDistance = clamp(
    targetDistance,
    Math.max(
      heldWeaponSolveDirectionEpsilon,
      Math.abs(upperarmLength - lowerarmLength) + 0.0001
    ),
    Math.max(
      heldWeaponSolveDirectionEpsilon,
      upperarmLength + lowerarmLength - reachSlackMeters
    )
  );
  heldWeaponClampedHandTargetWorldPositionScratch
    .copy(heldWeaponShoulderWorldPositionScratch)
    .addScaledVector(heldWeaponTargetDirectionScratch, clampedTargetDistance);
  const elbowProjectionDistance =
    (upperarmLength * upperarmLength -
      lowerarmLength * lowerarmLength +
      clampedTargetDistance * clampedTargetDistance) /
    (2 * clampedTargetDistance);
  const elbowHeight = Math.sqrt(
    Math.max(
      0,
      upperarmLength * upperarmLength -
        elbowProjectionDistance * elbowProjectionDistance
    )
  );

  heldWeaponElbowTargetWorldPositionScratch
    .copy(heldWeaponShoulderWorldPositionScratch)
    .addScaledVector(heldWeaponTargetDirectionScratch, elbowProjectionDistance)
    .addScaledVector(heldWeaponTargetPoleDirectionScratch, elbowHeight);
  alignBoneTowardWorldPoint(
    rootBone,
    middleBone,
    heldWeaponElbowTargetWorldPositionScratch
  );
  alignBoneTowardWorldPoint(
    middleBone,
    effectorNode,
    heldWeaponClampedHandTargetWorldPositionScratch
  );
}

function solveBoneChainCcdToWorldTarget(
  rotatingBones: readonly Bone[],
  effectorNode: Object3D,
  effectorWorldTargetPosition: Vector3,
  maxIterations: number
): void {
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    for (
      let boneIndex = rotatingBones.length - 1;
      boneIndex >= 0;
      boneIndex -= 1
    ) {
      const rotatingBone = rotatingBones[boneIndex];

      if (rotatingBone === undefined) {
        continue;
      }

      alignBoneTowardWorldPoint(
        rotatingBone,
        effectorNode,
        effectorWorldTargetPosition
      );
    }

    if (
      effectorNode.getWorldPosition(heldWeaponWristWorldPositionScratch).distanceTo(
        effectorWorldTargetPosition
      ) <= heldWeaponSolveDirectionEpsilon
    ) {
      return;
    }
  }
}

function resolveElbowPoleDirection(
  upperarmBone: Bone,
  lowerarmBone: Bone,
  handBone: Bone,
  fallbackWorldDirection: Vector3,
  outputWorldDirection: Vector3
): void {
  upperarmBone.getWorldPosition(heldWeaponShoulderWorldPositionScratch);
  lowerarmBone.getWorldPosition(heldWeaponElbowWorldPositionScratch);
  handBone.getWorldPosition(heldWeaponWristWorldPositionScratch);
  heldWeaponArmAxisScratch
    .copy(heldWeaponWristWorldPositionScratch)
    .sub(heldWeaponShoulderWorldPositionScratch);

  if (heldWeaponArmAxisScratch.lengthSq() <= heldWeaponSolveDirectionEpsilon) {
    outputWorldDirection.copy(fallbackWorldDirection).normalize();

    return;
  }

  heldWeaponArmAxisScratch.normalize();
  outputWorldDirection
    .copy(heldWeaponElbowWorldPositionScratch)
    .sub(heldWeaponShoulderWorldPositionScratch);
  outputWorldDirection.addScaledVector(
    heldWeaponArmAxisScratch,
    -outputWorldDirection.dot(heldWeaponArmAxisScratch)
  );

  if (outputWorldDirection.lengthSq() <= heldWeaponSolveDirectionEpsilon) {
    outputWorldDirection.copy(fallbackWorldDirection);
    outputWorldDirection.addScaledVector(
      heldWeaponArmAxisScratch,
      -outputWorldDirection.dot(heldWeaponArmAxisScratch)
    );
  }

  if (outputWorldDirection.lengthSq() <= heldWeaponSolveDirectionEpsilon) {
    outputWorldDirection.copy(fallbackWorldDirection).normalize();

    return;
  }

  outputWorldDirection.normalize();
}

function measureElbowPoleAngleRadians(
  upperarmBone: Bone,
  lowerarmBone: Bone,
  handBone: Bone,
  targetWorldDirection: Vector3
): number | null {
  upperarmBone.getWorldPosition(heldWeaponShoulderWorldPositionScratch);
  lowerarmBone.getWorldPosition(heldWeaponElbowWorldPositionScratch);
  handBone.getWorldPosition(heldWeaponWristWorldPositionScratch);
  heldWeaponArmAxisScratch
    .copy(heldWeaponWristWorldPositionScratch)
    .sub(heldWeaponShoulderWorldPositionScratch);

  if (heldWeaponArmAxisScratch.lengthSq() <= heldWeaponSolveDirectionEpsilon) {
    return null;
  }

  heldWeaponArmAxisScratch.normalize();
  heldWeaponCurrentPoleDirectionScratch
    .copy(heldWeaponElbowWorldPositionScratch)
    .sub(heldWeaponShoulderWorldPositionScratch);
  heldWeaponCurrentPoleDirectionScratch.addScaledVector(
    heldWeaponArmAxisScratch,
    -heldWeaponCurrentPoleDirectionScratch.dot(heldWeaponArmAxisScratch)
  );

  if (
    heldWeaponCurrentPoleDirectionScratch.lengthSq() <=
    heldWeaponSolveDirectionEpsilon
  ) {
    return null;
  }

  heldWeaponCurrentPoleDirectionScratch.normalize();
  heldWeaponTargetPoleDirectionScratch.copy(targetWorldDirection);
  heldWeaponTargetPoleDirectionScratch.addScaledVector(
    heldWeaponArmAxisScratch,
    -heldWeaponTargetPoleDirectionScratch.dot(heldWeaponArmAxisScratch)
  );

  if (
    heldWeaponTargetPoleDirectionScratch.lengthSq() <=
    heldWeaponSolveDirectionEpsilon
  ) {
    return null;
  }

  heldWeaponTargetPoleDirectionScratch.normalize();

  return Math.atan2(
    heldWeaponArmAxisScratch.dot(
      heldWeaponPoleDirectionCrossScratch
        .copy(heldWeaponCurrentPoleDirectionScratch)
        .cross(heldWeaponTargetPoleDirectionScratch)
    ),
    clamp(
      heldWeaponCurrentPoleDirectionScratch.dot(
        heldWeaponTargetPoleDirectionScratch
      ),
      -1,
      1
    )
  );
}

function applyElbowPoleBias(
  upperarmBone: Bone,
  lowerarmBone: Bone,
  handBone: Bone,
  targetWorldDirection: Vector3,
  biasWeight: number
): void {
  const clampedBiasWeight = clamp(biasWeight, 0, 1);

  if (clampedBiasWeight <= heldWeaponSolveDirectionEpsilon) {
    return;
  }

  const parentNode = upperarmBone.parent;

  if (parentNode === null) {
    return;
  }

  upperarmBone.getWorldPosition(heldWeaponShoulderWorldPositionScratch);
  handBone.getWorldPosition(heldWeaponWristWorldPositionScratch);
  heldWeaponArmAxisScratch
    .copy(heldWeaponWristWorldPositionScratch)
    .sub(heldWeaponShoulderWorldPositionScratch);

  if (heldWeaponArmAxisScratch.lengthSq() <= heldWeaponSolveDirectionEpsilon) {
    return;
  }

  heldWeaponArmAxisScratch.normalize();
  const signedPoleAngle = measureElbowPoleAngleRadians(
    upperarmBone,
    lowerarmBone,
    handBone,
    targetWorldDirection
  );

  if (
    signedPoleAngle === null ||
    Math.abs(signedPoleAngle) <= heldWeaponSolveDirectionEpsilon
  ) {
    return;
  }

  heldWeaponWorldDeltaQuaternionScratch.setFromAxisAngle(
    heldWeaponArmAxisScratch,
    signedPoleAngle * clampedBiasWeight
  );
  heldWeaponParentWorldQuaternionScratch.copy(
    parentNode.getWorldQuaternion(heldWeaponParentWorldQuaternionScratch)
  );
  heldWeaponParentWorldQuaternionInverseScratch
    .copy(heldWeaponParentWorldQuaternionScratch)
    .invert();
  heldWeaponParentLocalDeltaQuaternionScratch
    .copy(heldWeaponParentWorldQuaternionInverseScratch)
    .multiply(heldWeaponWorldDeltaQuaternionScratch)
    .multiply(heldWeaponParentWorldQuaternionScratch);
  upperarmBone.quaternion.premultiply(heldWeaponParentLocalDeltaQuaternionScratch);
  upperarmBone.updateMatrixWorld(true);
}

function syncFingerChainContactPose(
  baseBone: Bone,
  middleBone: Bone,
  tipBone: Bone,
  guideNode: Object3D,
  contactNode: Object3D,
  handEffectorNode: Object3D,
  contactTargetWorldPosition: Vector3
): void {
  heldWeaponFingerTargetGripLocalPositionScratch.copy(
    handEffectorNode.worldToLocal(
      heldWeaponEffectorWorldPositionScratch.copy(contactTargetWorldPosition)
    )
  );
  heldWeaponFingerBaseGripLocalPositionScratch.copy(
    handEffectorNode.worldToLocal(
      heldWeaponBoneWorldPositionScratch.copy(
        baseBone.getWorldPosition(heldWeaponBoneWorldPositionScratch)
      )
    )
  );
  heldWeaponFingerMiddleGripLocalPositionScratch.copy(
    handEffectorNode.worldToLocal(
      heldWeaponWristWorldPositionScratch.copy(
        middleBone.getWorldPosition(heldWeaponWristWorldPositionScratch)
      )
    )
  );
  heldWeaponFingerTipGripLocalPositionScratch.copy(
    handEffectorNode.worldToLocal(
      heldWeaponShoulderWorldPositionScratch.copy(
        tipBone.getWorldPosition(heldWeaponShoulderWorldPositionScratch)
      )
    )
  );
  const baseSegmentDistance = resolveClosestPointOnSegmentToTarget(
    heldWeaponFingerBaseGripLocalPositionScratch,
    heldWeaponFingerMiddleGripLocalPositionScratch,
    heldWeaponFingerTargetGripLocalPositionScratch,
    heldWeaponFingerGuideGripLocalPositionScratch
  );
  const tipSegmentDistance = resolveClosestPointOnSegmentToTarget(
    heldWeaponFingerMiddleGripLocalPositionScratch,
    heldWeaponFingerTipGripLocalPositionScratch,
    heldWeaponFingerTargetGripLocalPositionScratch,
    heldWeaponFingerGuideAlternateGripLocalPositionScratch
  );

  if (tipSegmentDistance < baseSegmentDistance) {
    heldWeaponFingerGuideGripLocalPositionScratch.copy(
      heldWeaponFingerGuideAlternateGripLocalPositionScratch
    );
  }
  const guideParentBone = tipSegmentDistance < baseSegmentDistance
    ? middleBone
    : baseBone;

  if (guideNode.parent !== guideParentBone) {
    guideNode.removeFromParent();
    guideParentBone.add(guideNode);
  }

  guideNode.position.copy(
    guideParentBone.worldToLocal(
      handEffectorNode.localToWorld(
        heldWeaponEffectorWorldPositionScratch.copy(
          heldWeaponFingerGuideGripLocalPositionScratch
        )
      )
    )
  );
  guideNode.updateMatrixWorld(true);

  solveBoneChainCcdToWorldTarget(
    tipSegmentDistance < baseSegmentDistance
      ? [baseBone, middleBone]
      : [baseBone],
    guideNode,
    contactTargetWorldPosition,
    4
  );
  solveBoneChainCcdToWorldTarget(
    [baseBone, middleBone, tipBone],
    contactNode,
    contactTargetWorldPosition,
    6
  );
}

function syncRightTriggerFingerPose(
  heldWeaponPoseRuntime: HumanoidV2HeldWeaponPoseRuntime,
  mainHandEffectorNode: Object3D,
  attachmentRuntime: MetaverseAttachmentProofRuntime,
  gripTargetWorldPosition: Vector3,
  gripTargetWorldQuaternion: Quaternion
): void {
  if (
    attachmentRuntime.heldTriggerMarkerNode === null &&
    attachmentRuntime.heldGripToTriggerMarkerLocalPosition === null
  ) {
    return;
  }

  if (attachmentRuntime.heldTriggerMarkerNode !== null) {
    attachmentRuntime.heldTriggerMarkerNode.getWorldPosition(
      heldWeaponTriggerMarkerWorldPositionScratch
    );
  } else {
    resolveGripLocalPositionWorldPositionFromTarget(
      gripTargetWorldPosition,
      gripTargetWorldQuaternion,
      attachmentRuntime.heldGripToTriggerMarkerLocalPosition!,
      heldWeaponTriggerMarkerWorldPositionScratch
    );
  }
  syncFingerChainContactPose(
    heldWeaponPoseRuntime.rightIndexBaseBone,
    heldWeaponPoseRuntime.rightIndexMiddleBone,
    heldWeaponPoseRuntime.rightIndexTipBone,
    heldWeaponPoseRuntime.rightTriggerGuideNode,
    heldWeaponPoseRuntime.rightTriggerContactNode,
    mainHandEffectorNode,
    heldWeaponTriggerMarkerWorldPositionScratch,
  );
}

function syncLeftSupportGripFingerPose(
  heldWeaponPoseRuntime: HumanoidV2HeldWeaponPoseRuntime,
  offHandEffectorNode: Object3D,
  attachmentRuntime: Pick<
    MetaverseAttachmentProofRuntime,
    "heldSupportMarkerNode" | "offHandSupportMarkerNode"
  >
): void {
  if (
    attachmentRuntime.offHandSupportMarkerNode === null ||
    attachmentRuntime.heldSupportMarkerNode !== null
  ) {
    return;
  }

  attachmentRuntime.offHandSupportMarkerNode.getWorldPosition(
    heldWeaponFingerContactTargetWorldPositionScratch
  );
  syncFingerChainContactPose(
    heldWeaponPoseRuntime.leftIndexBaseBone,
    heldWeaponPoseRuntime.leftIndexMiddleBone,
    heldWeaponPoseRuntime.leftIndexTipBone,
    heldWeaponPoseRuntime.leftIndexGripGuideNode,
    heldWeaponPoseRuntime.leftIndexGripContactNode,
    offHandEffectorNode,
    heldWeaponFingerContactTargetWorldPositionScratch
  );
  syncFingerChainContactPose(
    heldWeaponPoseRuntime.leftMiddleBaseBone,
    heldWeaponPoseRuntime.leftMiddleMiddleBone,
    heldWeaponPoseRuntime.leftMiddleTipBone,
    heldWeaponPoseRuntime.leftMiddleGripGuideNode,
    heldWeaponPoseRuntime.leftMiddleGripContactNode,
    offHandEffectorNode,
    heldWeaponFingerContactTargetWorldPositionScratch
  );
}

export function resolveHeldWeaponMainHandEffectorNode(
  heldWeaponPoseRuntime: Pick<
    HumanoidV2HeldWeaponPoseRuntime,
    "rightGripSocketNode" | "rightPalmSocketNode"
  >,
  attachmentRuntime: Pick<MetaverseAttachmentProofRuntime, "heldMount">
): Object3D {
  return attachmentRuntime.heldMount.socketName === "palm_r_socket"
    ? heldWeaponPoseRuntime.rightPalmSocketNode
    : heldWeaponPoseRuntime.rightGripSocketNode;
}

function resolveHeldWeaponMainHandSocketId(
  attachmentRuntime: Pick<MetaverseAttachmentProofRuntime, "heldMount">
): "grip" | "palm" {
  return attachmentRuntime.heldMount.socketName === "palm_r_socket"
    ? "palm"
    : "grip";
}

export function resolveHeldWeaponOffHandEffectorNode(
  heldWeaponPoseRuntime: Pick<
    HumanoidV2HeldWeaponPoseRuntime,
    "leftGripSocketNode" | "leftPalmSocketNode" | "leftSupportSocketNode"
  >,
  attachmentRuntime: Pick<
    MetaverseAttachmentProofRuntime,
    "heldSupportMarkerNode" | "offHandSupportMarkerNode"
  >
): Object3D {
  if (attachmentRuntime.heldSupportMarkerNode !== null) {
    return heldWeaponPoseRuntime.leftPalmSocketNode;
  }

  return attachmentRuntime.offHandSupportMarkerNode === null
    ? heldWeaponPoseRuntime.leftGripSocketNode
    : heldWeaponPoseRuntime.leftSupportSocketNode;
}

function resolveHeldWeaponOffHandSocketId(
  attachmentRuntime: Pick<
    MetaverseAttachmentProofRuntime,
    "heldSupportMarkerNode" | "offHandSupportMarkerNode"
  >
): "grip" | "palm" | "support" {
  if (attachmentRuntime.heldSupportMarkerNode !== null) {
    return "palm";
  }

  return attachmentRuntime.offHandSupportMarkerNode === null
    ? "grip"
    : "support";
}

function measureHeldWeaponEffectorWorldErrorMeters(
  effectorNode: Object3D,
  targetWorldPosition: Vector3
): number {
  return effectorNode
    .getWorldPosition(heldWeaponEffectorWorldPositionScratch)
    .distanceTo(targetWorldPosition);
}

function measureRightHandSocketComparisonErrorMeters(
  handEffectorNode: Object3D,
  gripTargetWorldPosition: Vector3
): number {
  return measureHeldWeaponEffectorWorldErrorMeters(
    handEffectorNode,
    gripTargetWorldPosition
  );
}

function resolveTwoBoneReachTelemetry(
  rootBone: Bone,
  middleBone: Bone,
  effectorNode: Object3D,
  effectorWorldTargetPosition: Vector3,
  reachSlackMeters: number,
  output: HeldWeaponArmReachTelemetry
): void {
  rootBone.getWorldPosition(heldWeaponShoulderWorldPositionScratch);
  middleBone.getWorldPosition(heldWeaponElbowWorldPositionScratch);
  effectorNode.getWorldPosition(heldWeaponWristWorldPositionScratch);
  const upperarmLength = heldWeaponShoulderWorldPositionScratch.distanceTo(
    heldWeaponElbowWorldPositionScratch
  );
  const lowerarmLength = heldWeaponElbowWorldPositionScratch.distanceTo(
    heldWeaponWristWorldPositionScratch
  );

  if (
    upperarmLength <= heldWeaponSolveDirectionEpsilon ||
    lowerarmLength <= heldWeaponSolveDirectionEpsilon
  ) {
    output.clampDeltaMeters = null;
    output.maxReachMeters = null;
    output.targetDistanceMeters = null;
    return;
  }

  const targetDistanceMeters = heldWeaponShoulderWorldPositionScratch.distanceTo(
    effectorWorldTargetPosition
  );
  const minReachMeters = Math.max(
    heldWeaponSolveDirectionEpsilon,
    Math.abs(upperarmLength - lowerarmLength) + 0.0001
  );
  const maxReachMeters = Math.max(
    heldWeaponSolveDirectionEpsilon,
    upperarmLength + lowerarmLength - reachSlackMeters
  );

  output.clampDeltaMeters = Math.abs(
    clamp(targetDistanceMeters, minReachMeters, maxReachMeters) -
      targetDistanceMeters
  );
  output.maxReachMeters = maxReachMeters;
  output.targetDistanceMeters = targetDistanceMeters;
}

export function syncHumanoidV2HeldWeaponPose<
  TCharacterRuntime extends {
    readonly anchorGroup: Group;
    readonly firstPersonHeadAnchorNodes: readonly Object3D[];
  }
>(
  characterProofRuntime: TCharacterRuntime,
  heldWeaponPoseRuntime: HumanoidV2HeldWeaponPoseRuntime,
  attachmentRuntime: MetaverseAttachmentProofRuntime,
  cameraSnapshot: MetaverseCameraSnapshot,
  weaponState: MetaverseRealtimePlayerWeaponStateSnapshot | null = null,
  adsBlend: number | null = null,
  bodyPresentation:
    | Pick<
        MetaverseRuntimeConfig["bodyPresentation"],
        | "groundedFirstPersonHeadClearanceMeters"
        | "groundedFirstPersonHeadOcclusionRadiusMeters"
      >
    | null = null,
  heldWeaponGripDebugState: MetaverseSceneHeldWeaponGripDebugState | null = null
): void {
  const servicePistolAdsPoseActive = shouldUseServicePistolAdsPose(
    attachmentRuntime,
    weaponState,
    adsBlend
  );
  const gripTargetSolveFailureReason = resolveHeldWeaponGripAimTarget(
    heldWeaponPoseRuntime,
    characterProofRuntime.firstPersonHeadAnchorNodes,
    attachmentRuntime,
    cameraSnapshot,
    weaponState,
    adsBlend,
    bodyPresentation,
    heldWeaponGripSocketWorldPositionScratch,
    heldWeaponTargetWorldQuaternionScratch
  );

  if (gripTargetSolveFailureReason !== null) {
    heldWeaponGripDebugState?.recordGripTargetSolveFailure({
      adsBlend,
      attachmentMountKind: attachmentRuntime.activeMountKind,
      failureReason: gripTargetSolveFailureReason,
      heldSupportMarkerAvailable: attachmentRuntime.heldSupportMarkerNode !== null,
      heldMountSocketName: attachmentRuntime.heldMount.socketName,
      offHandSupportMarkerAvailable:
        attachmentRuntime.offHandSupportMarkerNode !== null,
      weaponState
    });
    return;
  }

  heldWeaponRightElbowPolePreferenceScratch
    .copy(heldWeaponGripAcrossDirectionScratch)
    .multiplyScalar(heldWeaponElbowPoleAcrossBias)
    .addScaledVector(
      heldWeaponGripUpDirectionScratch,
      -heldWeaponElbowPoleDownBias
    )
    .normalize();
  heldWeaponLeftElbowPolePreferenceScratch
    .copy(heldWeaponGripAcrossDirectionScratch)
    .multiplyScalar(-heldWeaponElbowPoleAcrossBias)
    .addScaledVector(
      heldWeaponGripUpDirectionScratch,
      -heldWeaponElbowPoleDownBias
    )
    .normalize();
  resolveElbowPoleDirection(
    heldWeaponPoseRuntime.rightUpperarmBone,
    heldWeaponPoseRuntime.rightLowerarmBone,
    heldWeaponPoseRuntime.rightHandBone,
    heldWeaponRightElbowPolePreferenceScratch,
    heldWeaponRightElbowPoleTargetScratch
  );
  heldWeaponRightElbowPoleTargetScratch.addScaledVector(
    heldWeaponRightElbowPolePreferenceScratch,
    heldWeaponElbowPolePreferenceWeight
  );
  heldWeaponRightElbowPoleTargetScratch.normalize();
  resolveElbowPoleDirection(
    heldWeaponPoseRuntime.leftUpperarmBone,
    heldWeaponPoseRuntime.leftLowerarmBone,
    heldWeaponPoseRuntime.leftHandBone,
    heldWeaponLeftElbowPolePreferenceScratch,
    heldWeaponLeftElbowPoleTargetScratch
  );
  heldWeaponLeftElbowPoleTargetScratch.addScaledVector(
    heldWeaponLeftElbowPolePreferenceScratch,
    heldWeaponElbowPolePreferenceWeight
  );
  heldWeaponLeftElbowPoleTargetScratch.normalize();
  const mainHandEffectorNode = resolveHeldWeaponMainHandEffectorNode(
    heldWeaponPoseRuntime,
    attachmentRuntime
  );
  const mainHandSocket = resolveHeldWeaponMainHandSocketId(attachmentRuntime);
  let mainHandGripErrorMeters: number | null = null;
  let mainHandGripSocketComparisonErrorMeters: number | null = null;
  let mainHandMaxReachMeters: number | null = null;
  let mainHandPalmSocketComparisonErrorMeters: number | null = null;
  let mainHandPoleAngleRadians: number | null = null;
  let mainHandPostPoleBiasErrorMeters: number | null = null;
  let mainHandReachClampDeltaMeters: number | null = null;
  let mainHandSolveErrorMeters: number | null = null;
  let mainHandTargetDistanceMeters: number | null = null;

  resolveRightHandWorldTargetPosition(
    heldWeaponPoseRuntime,
    mainHandEffectorNode,
    heldWeaponGripSocketWorldPositionScratch,
    heldWeaponTargetWorldQuaternionScratch,
    heldWeaponRightHandTargetWorldPositionScratch
  );
  solveTwoBoneChainToWorldTarget(
    heldWeaponPoseRuntime.rightUpperarmBone,
    heldWeaponPoseRuntime.rightLowerarmBone,
    heldWeaponPoseRuntime.rightHandBone,
    heldWeaponRightHandTargetWorldPositionScratch,
    heldWeaponRightElbowPoleTargetScratch,
    heldWeaponRightArmReachSlackMeters
  );
  if (heldWeaponGripDebugState !== null) {
    mainHandSolveErrorMeters = measureHeldWeaponEffectorWorldErrorMeters(
      mainHandEffectorNode,
      heldWeaponGripSocketWorldPositionScratch
    );
    mainHandPoleAngleRadians = measureElbowPoleAngleRadians(
      heldWeaponPoseRuntime.rightUpperarmBone,
      heldWeaponPoseRuntime.rightLowerarmBone,
      heldWeaponPoseRuntime.rightHandBone,
      heldWeaponRightElbowPoleTargetScratch
    );
  }
  applyElbowPoleBias(
    heldWeaponPoseRuntime.rightUpperarmBone,
    heldWeaponPoseRuntime.rightLowerarmBone,
    heldWeaponPoseRuntime.rightHandBone,
    heldWeaponRightElbowPoleTargetScratch,
    heldWeaponElbowPoleBiasWeight
  );
  if (heldWeaponGripDebugState !== null) {
    mainHandPostPoleBiasErrorMeters = measureHeldWeaponEffectorWorldErrorMeters(
      mainHandEffectorNode,
      heldWeaponGripSocketWorldPositionScratch
    );
  }
  alignBoneTowardEffectorWorldQuaternion(
    heldWeaponPoseRuntime.rightHandBone,
    mainHandEffectorNode,
    heldWeaponTargetWorldQuaternionScratch
  );
  characterProofRuntime.anchorGroup.updateMatrixWorld(true);
  syncRightTriggerFingerPose(
    heldWeaponPoseRuntime,
    mainHandEffectorNode,
    attachmentRuntime,
    heldWeaponGripSocketWorldPositionScratch,
    heldWeaponTargetWorldQuaternionScratch
  );
  characterProofRuntime.anchorGroup.updateMatrixWorld(true);

  if (heldWeaponGripDebugState !== null) {
    mainHandGripErrorMeters = measureHeldWeaponEffectorWorldErrorMeters(
      mainHandEffectorNode,
      heldWeaponGripSocketWorldPositionScratch
    );
    mainHandGripSocketComparisonErrorMeters =
      measureRightHandSocketComparisonErrorMeters(
        heldWeaponPoseRuntime.rightGripSocketNode,
        heldWeaponGripSocketWorldPositionScratch
      );
    mainHandPalmSocketComparisonErrorMeters =
      measureRightHandSocketComparisonErrorMeters(
        heldWeaponPoseRuntime.rightPalmSocketNode,
        heldWeaponGripSocketWorldPositionScratch
      );
    resolveTwoBoneReachTelemetry(
      heldWeaponPoseRuntime.rightUpperarmBone,
      heldWeaponPoseRuntime.rightLowerarmBone,
      heldWeaponPoseRuntime.rightHandBone,
      heldWeaponRightHandTargetWorldPositionScratch,
      heldWeaponRightArmReachSlackMeters,
      heldWeaponArmReachTelemetryScratch
    );
    mainHandMaxReachMeters = heldWeaponArmReachTelemetryScratch.maxReachMeters;
    mainHandReachClampDeltaMeters =
      heldWeaponArmReachTelemetryScratch.clampDeltaMeters;
    mainHandTargetDistanceMeters =
      heldWeaponArmReachTelemetryScratch.targetDistanceMeters;
  }

  if (attachmentRuntime.offHandGripMount === null) {
    characterProofRuntime.anchorGroup.updateMatrixWorld(true);
    if (heldWeaponGripDebugState !== null) {
      heldWeaponGripDebugState.recordSolvedFrame({
        adsBlend,
        attachmentMountKind: attachmentRuntime.activeMountKind,
        heldSupportMarkerAvailable:
          attachmentRuntime.heldSupportMarkerNode !== null,
        heldMountSocketName: attachmentRuntime.heldMount.socketName,
        mainHandGripErrorMeters: mainHandGripErrorMeters!,
        mainHandGripSocketComparisonErrorMeters:
          mainHandGripSocketComparisonErrorMeters!,
        mainHandMaxReachMeters,
        mainHandPalmSocketComparisonErrorMeters:
          mainHandPalmSocketComparisonErrorMeters!,
        mainHandPoleAngleRadians,
        mainHandPostPoleBiasErrorMeters,
        mainHandReachClampDeltaMeters,
        mainHandReachSlackMeters: heldWeaponRightArmReachSlackMeters,
        mainHandSolveErrorMeters,
        mainHandSocket,
        mainHandTargetDistanceMeters,
        offHandFinalErrorMeters: null,
        offHandGripMounted: false,
        offHandInitialSolveErrorMeters: null,
        offHandPoleAngleRadians: null,
        offHandPreSolveErrorMeters: null,
        offHandRefinementPassCount: 0,
        offHandSocket: resolveHeldWeaponOffHandSocketId(attachmentRuntime),
        offHandSupportMarkerAvailable:
          attachmentRuntime.offHandSupportMarkerNode !== null,
        servicePistolAdsPoseActive,
        servicePistolSupportPalmPoseActive: false,
        weaponState
      });
    }
    return;
  }

  const {
    localPosition: offHandGripLocalPosition,
    localQuaternion: offHandGripLocalQuaternion
  } = attachmentRuntime.offHandGripMount;
  const offHandEffectorNode = resolveHeldWeaponOffHandEffectorNode(
    heldWeaponPoseRuntime,
    attachmentRuntime
  );
  const offHandSocket = resolveHeldWeaponOffHandSocketId(attachmentRuntime);
  attachmentRuntime.attachmentRoot.localToWorld(
    heldWeaponGripSocketWorldPositionScratch.copy(offHandGripLocalPosition)
  );
  const offHandPreSolveErrorMeters = measureHeldWeaponEffectorWorldErrorMeters(
    offHandEffectorNode,
    heldWeaponGripSocketWorldPositionScratch
  );
  let offHandInitialSolveErrorMeters: number | null = null;
  let offHandPoleAngleRadians: number | null = null;

  const useServicePistolSupportPalmPose = shouldUseServicePistolSupportPalmPose(
    attachmentRuntime,
    weaponState
  );

  if (useServicePistolSupportPalmPose) {
    heldWeaponSupportHandTargetWorldQuaternionScratch.copy(
      offHandEffectorNode.getWorldQuaternion(
        heldWeaponAttachmentWorldQuaternionScratch
      )
    ).normalize();
  } else {
    heldWeaponSupportHandTargetWorldQuaternionScratch
      .copy(
        attachmentRuntime.attachmentRoot.getWorldQuaternion(
          heldWeaponAttachmentWorldQuaternionScratch
        )
      )
      .multiply(offHandGripLocalQuaternion)
      .normalize();
  }
  resolveHandWorldTargetPosition(
    heldWeaponSupportHandTargetWorldQuaternionScratch,
    resolveHandEffectorLocalPosition(
      heldWeaponPoseRuntime.leftHandBone,
      offHandEffectorNode,
      heldWeaponHandEffectorLocalPositionScratch
    ),
    heldWeaponGripSocketWorldPositionScratch,
    heldWeaponLeftHandTargetWorldPositionScratch
  );
  solveTwoBoneChainToWorldTarget(
      heldWeaponPoseRuntime.leftUpperarmBone,
      heldWeaponPoseRuntime.leftLowerarmBone,
      heldWeaponPoseRuntime.leftHandBone,
      heldWeaponLeftHandTargetWorldPositionScratch,
      heldWeaponLeftElbowPoleTargetScratch,
      useServicePistolSupportPalmPose
        ? heldWeaponServicePistolLeftArmReachSlackMeters
        : heldWeaponLeftArmReachSlackMeters
    );
  if (heldWeaponGripDebugState !== null) {
    offHandInitialSolveErrorMeters = measureHeldWeaponEffectorWorldErrorMeters(
      offHandEffectorNode,
      heldWeaponGripSocketWorldPositionScratch
    );
    offHandPoleAngleRadians = measureElbowPoleAngleRadians(
      heldWeaponPoseRuntime.leftUpperarmBone,
      heldWeaponPoseRuntime.leftLowerarmBone,
      heldWeaponPoseRuntime.leftHandBone,
      heldWeaponLeftElbowPoleTargetScratch
    );
  }
  applyElbowPoleBias(
    heldWeaponPoseRuntime.leftUpperarmBone,
    heldWeaponPoseRuntime.leftLowerarmBone,
    heldWeaponPoseRuntime.leftHandBone,
    heldWeaponLeftElbowPoleTargetScratch,
    heldWeaponElbowPoleBiasWeight
  );
  if (!useServicePistolSupportPalmPose) {
    alignBoneTowardEffectorWorldQuaternion(
      heldWeaponPoseRuntime.leftHandBone,
      offHandEffectorNode,
      heldWeaponSupportHandTargetWorldQuaternionScratch
    );
  }
  characterProofRuntime.anchorGroup.updateMatrixWorld(true);
  let offHandRefinementPassCount = 0;

  if (attachmentRuntime.offHandSupportMarkerNode !== null) {
    // Re-solve after the first pass so the palm stays centered on the authored
    // off-hand grip target instead of drifting when the arm settles.
    for (
      let refinementPass = 0;
      refinementPass < heldWeaponSupportMarkerRefinementPassCount;
      refinementPass += 1
    ) {
      heldWeaponTargetDirectionScratch
        .copy(heldWeaponGripSocketWorldPositionScratch)
        .sub(
          offHandEffectorNode.getWorldPosition(
            heldWeaponEffectorWorldPositionScratch
          )
        );

      if (
        heldWeaponTargetDirectionScratch.lengthSq() <=
        heldWeaponSolveDirectionEpsilon
      ) {
        break;
      }

      offHandRefinementPassCount += 1;
      heldWeaponLeftHandTargetWorldPositionScratch.add(
        heldWeaponTargetDirectionScratch
      );
      solveTwoBoneChainToWorldTarget(
        heldWeaponPoseRuntime.leftUpperarmBone,
        heldWeaponPoseRuntime.leftLowerarmBone,
        heldWeaponPoseRuntime.leftHandBone,
        heldWeaponLeftHandTargetWorldPositionScratch,
        heldWeaponLeftElbowPoleTargetScratch,
        useServicePistolSupportPalmPose
          ? heldWeaponServicePistolLeftArmReachSlackMeters
          : heldWeaponLeftArmReachSlackMeters
      );
      applyElbowPoleBias(
        heldWeaponPoseRuntime.leftUpperarmBone,
        heldWeaponPoseRuntime.leftLowerarmBone,
        heldWeaponPoseRuntime.leftHandBone,
        heldWeaponLeftElbowPoleTargetScratch,
        heldWeaponElbowPoleBiasWeight
      );
      if (!useServicePistolSupportPalmPose) {
        alignBoneTowardEffectorWorldQuaternion(
          heldWeaponPoseRuntime.leftHandBone,
          offHandEffectorNode,
          heldWeaponSupportHandTargetWorldQuaternionScratch
        );
      }
      characterProofRuntime.anchorGroup.updateMatrixWorld(true);
    }
  }
  syncLeftSupportGripFingerPose(
    heldWeaponPoseRuntime,
    offHandEffectorNode,
    attachmentRuntime
  );
  characterProofRuntime.anchorGroup.updateMatrixWorld(true);
  if (heldWeaponGripDebugState !== null) {
    heldWeaponGripDebugState.recordSolvedFrame({
      adsBlend,
      attachmentMountKind: attachmentRuntime.activeMountKind,
      heldSupportMarkerAvailable:
        attachmentRuntime.heldSupportMarkerNode !== null,
      heldMountSocketName: attachmentRuntime.heldMount.socketName,
      mainHandGripErrorMeters: mainHandGripErrorMeters!,
      mainHandGripSocketComparisonErrorMeters:
        mainHandGripSocketComparisonErrorMeters!,
      mainHandMaxReachMeters,
      mainHandPalmSocketComparisonErrorMeters:
        mainHandPalmSocketComparisonErrorMeters!,
      mainHandPoleAngleRadians,
      mainHandPostPoleBiasErrorMeters,
      mainHandReachClampDeltaMeters,
      mainHandReachSlackMeters: heldWeaponRightArmReachSlackMeters,
      mainHandSolveErrorMeters,
      mainHandSocket,
      mainHandTargetDistanceMeters,
      offHandFinalErrorMeters: measureHeldWeaponEffectorWorldErrorMeters(
        offHandEffectorNode,
        heldWeaponGripSocketWorldPositionScratch
      ),
      offHandGripMounted: true,
      offHandInitialSolveErrorMeters,
      offHandPoleAngleRadians,
      offHandPreSolveErrorMeters,
      offHandRefinementPassCount,
      offHandSocket,
      offHandSupportMarkerAvailable:
        attachmentRuntime.offHandSupportMarkerNode !== null,
      servicePistolAdsPoseActive,
      servicePistolSupportPalmPoseActive: useServicePistolSupportPalmPose,
      weaponState
    });
  }
}
