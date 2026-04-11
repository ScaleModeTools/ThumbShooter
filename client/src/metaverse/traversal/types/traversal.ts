import {
  type MetaverseGroundedBodyRuntime,
  type PhysicsVector3Snapshot
} from "@/physics";

import type { MetaversePlacedCuboidColliderSnapshot } from "../../states/metaverse-environment-collision";

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

export interface MountedSkiffRuntimeState extends SurfaceLocomotionSnapshot {
  readonly environmentAssetId: string;
  readonly label: string;
  readonly waterborne: boolean;
}

export interface DynamicEnvironmentPoseSnapshot {
  readonly position: PhysicsVector3Snapshot;
  readonly yawRadians: number;
}

export interface MetaverseTraversalRuntimeDependencies {
  readonly groundedBodyRuntime: MetaverseGroundedBodyRuntime;
  readonly readDynamicEnvironmentPose: (
    environmentAssetId: string
  ) => DynamicEnvironmentPoseSnapshot | null;
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
