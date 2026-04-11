import {
  normalizePlanarYawRadians,
  resolveVehicleRelativeYawOffsetRadians
} from "@webgpu-metaverse/shared";
import {
  Euler,
  Quaternion,
  type Object3D,
  Vector3
} from "three/webgpu";

import type {
  MetaverseEnvironmentAssetProofConfig,
  MetaverseEnvironmentMountProofConfig
} from "../../types/metaverse-runtime";
import { wrapRadians } from "../policies/surface-locomotion";

export interface MountedCharacterSeatTransformSnapshot {
  readonly localPosition: Vector3;
  readonly localQuaternion: Quaternion;
}

export interface ResolveMountedCharacterSeatTransformInput {
  readonly characterAnchorGroup: Object3D;
  readonly characterRenderYawOffsetRadians: number;
  readonly characterSeatSocketNode: Object3D;
  readonly mount: Pick<MetaverseEnvironmentMountProofConfig, "riderFacingDirection">;
  readonly seatSocketNode: Object3D;
  readonly vehicleAnchorGroup: Object3D;
  readonly vehicleOrientation: Pick<MetaverseEnvironmentAssetProofConfig, "orientation">;
}

const mountedVehicleWorldQuaternionScratch = new Quaternion();
const mountedVehicleWorldEulerScratch = new Euler(0, 0, 0, "YXZ");
const mountedDesiredWorldEulerScratch = new Euler(0, 0, 0, "YXZ");
const mountedDesiredWorldQuaternionScratch = new Quaternion();
const mountedSeatSocketWorldQuaternionScratch = new Quaternion();
const mountedCharacterAnchorOriginalPositionScratch = new Vector3();
const mountedCharacterAnchorOriginalQuaternionScratch = new Quaternion();
const mountedCharacterSeatSocketWorldPositionScratch = new Vector3();

function resolveMountedCharacterRenderYawRadians(
  runtimeYawRadians: number,
  characterRenderYawOffsetRadians: number
): number {
  return wrapRadians(characterRenderYawOffsetRadians - runtimeYawRadians);
}

function resolveMountedSeatFacingYawRadians(
  vehicleYawRadians: number,
  mount: Pick<MetaverseEnvironmentMountProofConfig, "riderFacingDirection">
): number {
  return wrapRadians(
    vehicleYawRadians +
      resolveVehicleRelativeYawOffsetRadians(mount.riderFacingDirection)
  );
}

function resolveMountedCharacterLocalQuaternion(
  seatSocketNode: Object3D,
  desiredWorldQuaternion: Quaternion,
  targetQuaternion: Quaternion
): Quaternion {
  return targetQuaternion.copy(
    seatSocketNode.getWorldQuaternion(mountedSeatSocketWorldQuaternionScratch)
  )
    .invert()
    .multiply(desiredWorldQuaternion);
}

export function createMountedCharacterSeatTransformSnapshot(): MountedCharacterSeatTransformSnapshot {
  return Object.freeze({
    localPosition: new Vector3(),
    localQuaternion: new Quaternion()
  });
}

export function resolveEnvironmentBowModelYawRadians(
  environmentAsset: Pick<
    MetaverseEnvironmentAssetProofConfig,
    "orientation"
  >
): number {
  return environmentAsset.orientation === null ||
    environmentAsset.orientation === undefined
    ? 0
    : normalizePlanarYawRadians(environmentAsset.orientation.bowModelYawRadians);
}

export function resolveEnvironmentRenderYawFromRuntimeYaw(
  environmentAsset: Pick<MetaverseEnvironmentAssetProofConfig, "orientation">,
  yawRadians: number
): number {
  return wrapRadians(
    yawRadians - resolveEnvironmentBowModelYawRadians(environmentAsset)
  );
}

export function resolveEnvironmentRuntimeYawFromRenderYaw(
  environmentAsset: Pick<MetaverseEnvironmentAssetProofConfig, "orientation">,
  renderYawRadians: number
): number {
  return wrapRadians(
    renderYawRadians + resolveEnvironmentBowModelYawRadians(environmentAsset)
  );
}

export function resolveMountedCharacterSeatTransform(
  input: ResolveMountedCharacterSeatTransformInput,
  target: MountedCharacterSeatTransformSnapshot
): MountedCharacterSeatTransformSnapshot {
  const vehicleRuntimeYawRadians = resolveEnvironmentRuntimeYawFromRenderYaw(
    input.vehicleOrientation,
    input.vehicleAnchorGroup.rotation.y
  );
  const desiredCharacterRenderYawRadians = resolveMountedCharacterRenderYawRadians(
    resolveMountedSeatFacingYawRadians(vehicleRuntimeYawRadians, input.mount),
    input.characterRenderYawOffsetRadians
  );
  const vehicleWorldEuler = mountedVehicleWorldEulerScratch.setFromQuaternion(
    input.vehicleAnchorGroup.getWorldQuaternion(
      mountedVehicleWorldQuaternionScratch
    ),
    "YXZ"
  );
  const desiredWorldQuaternion = mountedDesiredWorldQuaternionScratch.setFromEuler(
    mountedDesiredWorldEulerScratch.set(
      vehicleWorldEuler.x,
      desiredCharacterRenderYawRadians,
      vehicleWorldEuler.z,
      "YXZ"
    )
  );

  target.localQuaternion.copy(
    resolveMountedCharacterLocalQuaternion(
      input.seatSocketNode,
      desiredWorldQuaternion,
      target.localQuaternion
    )
  );
  resolveMountedCharacterSeatLocalPosition(
    input.characterAnchorGroup,
    input.characterSeatSocketNode,
    input.seatSocketNode,
    target.localQuaternion,
    target.localPosition
  );

  return target;
}

function resolveMountedCharacterSeatLocalPosition(
  characterAnchorGroup: Object3D,
  characterSeatSocketNode: Object3D,
  seatSocketNode: Object3D,
  localQuaternion: Quaternion,
  targetPosition: Vector3
): Vector3 {
  mountedCharacterAnchorOriginalPositionScratch.copy(characterAnchorGroup.position);
  mountedCharacterAnchorOriginalQuaternionScratch.copy(
    characterAnchorGroup.quaternion
  );

  characterAnchorGroup.position.set(0, 0, 0);
  characterAnchorGroup.quaternion.copy(localQuaternion);
  characterAnchorGroup.updateMatrixWorld(true);

  const mountedSeatSocketLocalPosition = seatSocketNode.worldToLocal(
    characterSeatSocketNode.getWorldPosition(
      mountedCharacterSeatSocketWorldPositionScratch
    )
  );

  targetPosition.set(
    -mountedSeatSocketLocalPosition.x,
    -mountedSeatSocketLocalPosition.y,
    -mountedSeatSocketLocalPosition.z
  );

  characterAnchorGroup.position.copy(mountedCharacterAnchorOriginalPositionScratch);
  characterAnchorGroup.quaternion.copy(
    mountedCharacterAnchorOriginalQuaternionScratch
  );
  characterAnchorGroup.updateMatrixWorld(true);

  return targetPosition;
}
