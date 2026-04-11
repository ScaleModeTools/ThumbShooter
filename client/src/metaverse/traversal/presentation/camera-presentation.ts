import {
  type MetaverseGroundedBodySnapshot,
  type PhysicsVector3Snapshot
} from "@/physics";

import {
  advanceMetaversePitchRadians,
  directionFromYawPitch
} from "../../states/metaverse-flight";
import type { MetaverseFlightInputSnapshot } from "../../types/metaverse-control-mode";
import type {
  MetaverseCameraSnapshot,
  MetaverseRuntimeConfig
} from "../../types/metaverse-runtime";
import { wrapRadians } from "../policies/surface-locomotion";
import type { SurfaceLocomotionSnapshot } from "../types/traversal";

export function advanceTraversalCameraPresentationPitchRadians(
  pitchRadians: number,
  movementInput: Pick<MetaverseFlightInputSnapshot, "pitchAxis">,
  config: MetaverseRuntimeConfig,
  deltaSeconds: number
): number {
  return advanceMetaversePitchRadians(
    pitchRadians,
    movementInput.pitchAxis,
    config.orientation,
    deltaSeconds
  );
}

function createSurfaceCameraPresentationSnapshot(
  position: PhysicsVector3Snapshot,
  eyeHeightMeters: number,
  yawRadians: number,
  pitchRadians: number,
  forwardOffsetMeters = 0
): MetaverseCameraSnapshot {
  const lookDirection = directionFromYawPitch(yawRadians, pitchRadians);
  const forwardX = Math.sin(yawRadians);
  const forwardZ = -Math.cos(yawRadians);

  return Object.freeze({
    lookDirection,
    pitchRadians,
    position: Object.freeze({
      x: position.x + forwardX * forwardOffsetMeters,
      y: position.y + eyeHeightMeters,
      z: position.z + forwardZ * forwardOffsetMeters
    }),
    yawRadians: wrapRadians(yawRadians)
  });
}

export function createTraversalGroundedCameraPresentationSnapshot(
  bodySnapshot: MetaverseGroundedBodySnapshot,
  pitchRadians: number,
  config: MetaverseRuntimeConfig
): MetaverseCameraSnapshot {
  return createSurfaceCameraPresentationSnapshot(
    bodySnapshot.position,
    bodySnapshot.eyeHeightMeters,
    bodySnapshot.yawRadians,
    pitchRadians,
    config.bodyPresentation.groundedFirstPersonForwardOffsetMeters
  );
}

export function createTraversalSwimCameraPresentationSnapshot(
  swimSnapshot: SurfaceLocomotionSnapshot,
  pitchRadians: number,
  config: MetaverseRuntimeConfig
): MetaverseCameraSnapshot {
  return createSurfaceCameraPresentationSnapshot(
    swimSnapshot.position,
    config.swim.cameraEyeHeightMeters +
      config.bodyPresentation.swimThirdPersonHeightOffsetMeters,
    swimSnapshot.yawRadians,
    pitchRadians,
    -config.bodyPresentation.swimThirdPersonFollowDistanceMeters
  );
}

export function createTraversalSkiffCameraPresentationSnapshot(
  skiffSnapshot: SurfaceLocomotionSnapshot,
  pitchRadians: number,
  config: MetaverseRuntimeConfig
): MetaverseCameraSnapshot {
  return createSurfaceCameraPresentationSnapshot(
    skiffSnapshot.position,
    config.skiff.cameraEyeHeightMeters + config.skiff.cameraHeightOffsetMeters,
    skiffSnapshot.yawRadians,
    pitchRadians,
    -config.skiff.cameraFollowDistanceMeters
  );
}
