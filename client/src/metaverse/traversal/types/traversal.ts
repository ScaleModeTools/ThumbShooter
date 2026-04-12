import {
  type MetaverseGroundedBodyRuntime,
  type PhysicsVector3Snapshot
} from "@/physics";

import type {
  MetaverseEnvironmentAssetProofConfig,
  MountedEnvironmentSnapshot
} from "../../types/metaverse-runtime";
import type { MetaversePlacedCuboidColliderSnapshot } from "../../states/metaverse-environment-collision";
import type {
  MountedVehicleControlIntent,
  MountedVehicleRuntimeSnapshot
} from "../../vehicles";

export interface SurfaceLocomotionConfig {
  readonly accelerationCurveExponent: number;
  readonly accelerationUnitsPerSecondSquared: number;
  readonly baseSpeedUnitsPerSecond: number;
  readonly boostCurveExponent: number;
  readonly boostMultiplier: number;
  readonly decelerationUnitsPerSecondSquared: number;
  readonly dragCurveExponent: number;
  readonly maxTurnSpeedRadiansPerSecond: number;
}

export interface SurfaceLocomotionSnapshot {
  readonly planarSpeedUnitsPerSecond: number;
  readonly position: PhysicsVector3Snapshot;
  readonly yawRadians: number;
}

export interface SurfaceLocomotionSpeedSnapshot {
  readonly forwardSpeedUnitsPerSecond: number;
  readonly strafeSpeedUnitsPerSecond: number;
}

export interface DynamicEnvironmentPoseSnapshot {
  readonly position: PhysicsVector3Snapshot;
  readonly yawRadians: number;
}

export interface MountedEnvironmentAnchorSnapshot {
  readonly position: PhysicsVector3Snapshot;
  readonly yawRadians: number;
}

export interface MetaverseTraversalRuntimeDependencies {
  readonly groundedBodyRuntime: MetaverseGroundedBodyRuntime;
  readonly readDynamicEnvironmentPose: (
    environmentAssetId: string
  ) => DynamicEnvironmentPoseSnapshot | null;
  readonly readMountedEnvironmentAnchorSnapshot: (
    mountedEnvironment: MountedEnvironmentSnapshot
  ) => MountedEnvironmentAnchorSnapshot | null;
  readonly readMountableEnvironmentConfig: (
    environmentAssetId: string
  ) => Pick<
    MetaverseEnvironmentAssetProofConfig,
    "entries" | "environmentAssetId" | "label" | "seats"
  > | null;
  readonly setDynamicEnvironmentPose: (
    environmentAssetId: string,
    poseSnapshot: DynamicEnvironmentPoseSnapshot | null
  ) => void;
  readonly surfaceColliderSnapshots: readonly MetaversePlacedCuboidColliderSnapshot[];
}

export type AutomaticSurfaceLocomotionModeId = "grounded" | "swim";

export interface AutomaticSurfaceLocomotionDecision {
  readonly locomotionMode: AutomaticSurfaceLocomotionModeId;
  readonly supportHeightMeters: number | null;
}

export type TraversalMountedVehicleSnapshot = MountedVehicleRuntimeSnapshot;

export interface RoutedDriverVehicleControlIntentSnapshot {
  readonly controlIntent: MountedVehicleControlIntent;
  readonly environmentAssetId: string;
}
