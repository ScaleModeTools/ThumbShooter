import type {
  ExperienceId,
  MetaverseMapBundleEnvironmentPresentationSnapshot
} from "@webgpu-metaverse/shared";
import type { MetaverseWorldPlacedWaterRegionSnapshot } from "@webgpu-metaverse/shared/metaverse/world";

import type { MetaverseVector3Snapshot } from "./presentation";

export interface MetaversePortalConfig {
  readonly beamColor: readonly [number, number, number];
  readonly experienceId: ExperienceId;
  readonly highlightRadius: number;
  readonly interactionRadius: number;
  readonly label: string;
  readonly position: MetaverseVector3Snapshot;
  readonly ringColor: readonly [number, number, number];
}

export interface MetaverseRuntimeConfig {
  readonly bodyPresentation: {
    readonly groundedFirstPersonForwardOffsetMeters: number;
    readonly groundedFirstPersonHeadClearanceMeters: number;
    readonly groundedFirstPersonHeadOcclusionRadiusMeters: number;
    readonly swimIdleBodySubmersionDepthMeters: number;
    readonly swimMovingBodySubmersionDepthMeters: number;
    readonly swimThirdPersonFollowDistanceMeters: number;
    readonly swimThirdPersonHeightOffsetMeters: number;
  };
  readonly camera: {
    readonly far: number;
    readonly fieldOfViewDegrees: number;
    readonly initialPitchRadians: number;
    readonly initialYawRadians: number;
    readonly near: number;
    readonly spawnPosition: MetaverseVector3Snapshot;
  };
  readonly environment:
    MetaverseMapBundleEnvironmentPresentationSnapshot["environment"];
  readonly groundedBody: {
    readonly accelerationCurveExponent: number;
    readonly accelerationUnitsPerSecondSquared: number;
    readonly airborneMovementDampingFactor: number;
    readonly baseSpeedUnitsPerSecond: number;
    readonly boostCurveExponent: number;
    readonly boostMultiplier: number;
    readonly capsuleHalfHeightMeters: number;
    readonly capsuleRadiusMeters: number;
    readonly controllerOffsetMeters: number;
    readonly decelerationUnitsPerSecondSquared: number;
    readonly dragCurveExponent: number;
    readonly eyeHeightMeters: number;
    readonly gravityUnitsPerSecond: number;
    readonly jumpGroundContactGraceSeconds: number;
    readonly jumpImpulseUnitsPerSecond: number;
    readonly maxSlopeClimbAngleRadians: number;
    readonly maxTurnSpeedRadiansPerSecond: number;
    readonly minSlopeSlideAngleRadians: number;
    readonly snapToGroundDistanceMeters: number;
    readonly spawnPosition: MetaverseVector3Snapshot;
    readonly stepHeightMeters: number;
    readonly stepWidthMeters: number;
  };
  readonly movement: {
    readonly baseSpeedUnitsPerSecond: number;
    readonly boostMultiplier: number;
    readonly maxAltitude: number;
    readonly minAltitude: number;
    readonly worldRadius: number;
  };
  readonly waterRegionSnapshots:
    readonly MetaverseWorldPlacedWaterRegionSnapshot[];
  readonly ocean: MetaverseMapBundleEnvironmentPresentationSnapshot["ocean"];
  readonly orientation: {
    readonly maxPitchRadians: number;
    readonly maxTurnSpeedRadiansPerSecond: number;
    readonly minPitchRadians: number;
    readonly mouseEdgeTurn: {
      readonly deadZoneViewportFraction: number;
      readonly responseExponent: number;
    };
  };
  readonly portals: readonly MetaversePortalConfig[];
  readonly skiff: {
    readonly accelerationCurveExponent: number;
    readonly accelerationUnitsPerSecondSquared: number;
    readonly authoritativeCorrection: {
      readonly grossSnapDistanceThresholdMeters: number;
      readonly grossSnapYawThresholdRadians: number;
      readonly routineBlendAlpha: number;
      readonly routinePositionBlendThresholdMeters: number;
      readonly routineYawBlendThresholdRadians: number;
    };
    readonly baseSpeedUnitsPerSecond: number;
    readonly boostCurveExponent: number;
    readonly boostMultiplier: number;
    readonly cameraEyeHeightMeters: number;
    readonly cameraFollowDistanceMeters: number;
    readonly cameraHeightOffsetMeters: number;
    readonly decelerationUnitsPerSecondSquared: number;
    readonly dragCurveExponent: number;
    readonly maxTurnSpeedRadiansPerSecond: number;
    readonly waterContactProbeRadiusMeters: number;
    readonly waterlineHeightMeters: number;
  };
  readonly swim: {
    readonly accelerationCurveExponent: number;
    readonly accelerationUnitsPerSecondSquared: number;
    readonly baseSpeedUnitsPerSecond: number;
    readonly boostCurveExponent: number;
    readonly boostMultiplier: number;
    readonly cameraEyeHeightMeters: number;
    readonly decelerationUnitsPerSecondSquared: number;
    readonly dragCurveExponent: number;
    readonly maxTurnSpeedRadiansPerSecond: number;
  };
}
