import type { PhysicsVector3Snapshot } from "@/physics";
import {
  constrainMetaverseWorldPlanarPositionAgainstBlockers,
  isMetaverseWorldWaterbornePosition,
  resolveMetaverseWorldAutomaticSurfaceLocomotion,
  resolveMetaverseWorldGroundedAutostepHeightMeters,
  resolveMetaverseWorldSurfaceHeightMeters,
  type MetaverseWorldAutomaticSurfaceLocomotionDebugSnapshot,
  type MetaverseWorldAutomaticSurfaceLocomotionSnapshot,
  type MetaverseWorldSurfacePolicyConfig
} from "@webgpu-metaverse/shared";

import type { MetaversePlacedCuboidColliderSnapshot } from "../../states/metaverse-environment-collision";
import type { MetaverseRuntimeConfig } from "../../types/metaverse-runtime";
import type {
  AutomaticSurfaceLocomotionDecision,
  AutomaticSurfaceLocomotionModeId
} from "../types/traversal";

const surfacePolicyConfigByRuntimeConfig = new WeakMap<
  MetaverseRuntimeConfig,
  MetaverseWorldSurfacePolicyConfig
>();

function readSurfacePolicyConfig(
  config: MetaverseRuntimeConfig
): MetaverseWorldSurfacePolicyConfig {
  const cachedConfig = surfacePolicyConfigByRuntimeConfig.get(config);

  if (cachedConfig !== undefined) {
    return cachedConfig;
  }

  const surfacePolicyConfig = Object.freeze({
    capsuleHalfHeightMeters: config.groundedBody.capsuleHalfHeightMeters,
    capsuleRadiusMeters: config.groundedBody.capsuleRadiusMeters,
    gravityUnitsPerSecond: config.groundedBody.gravityUnitsPerSecond,
    jumpImpulseUnitsPerSecond: config.groundedBody.jumpImpulseUnitsPerSecond,
    oceanHeightMeters: config.ocean.height,
    stepHeightMeters: config.groundedBody.stepHeightMeters
  } satisfies MetaverseWorldSurfacePolicyConfig);

  surfacePolicyConfigByRuntimeConfig.set(config, surfacePolicyConfig);

  return surfacePolicyConfig;
}

export type AutomaticSurfaceLocomotionDebugSnapshot =
  MetaverseWorldAutomaticSurfaceLocomotionDebugSnapshot;
export type AutomaticSurfaceLocomotionSnapshot =
  MetaverseWorldAutomaticSurfaceLocomotionSnapshot;

export function resolveSurfaceHeightMeters(
  config: MetaverseRuntimeConfig,
  surfaceColliderSnapshots: readonly MetaversePlacedCuboidColliderSnapshot[],
  x: number,
  z: number,
  excludedOwnerEnvironmentAssetId: string | null = null
): number {
  return resolveMetaverseWorldSurfaceHeightMeters(
    readSurfacePolicyConfig(config),
    surfaceColliderSnapshots,
    x,
    z,
    excludedOwnerEnvironmentAssetId
  );
}

export function constrainPlanarPositionAgainstBlockers(
  surfaceColliderSnapshots: readonly MetaversePlacedCuboidColliderSnapshot[],
  currentPosition: PhysicsVector3Snapshot,
  nextPosition: PhysicsVector3Snapshot,
  paddingMeters: number,
  minHeightMeters: number,
  maxHeightMeters: number,
  excludedOwnerEnvironmentAssetId: string | null = null
): PhysicsVector3Snapshot {
  return constrainMetaverseWorldPlanarPositionAgainstBlockers(
    surfaceColliderSnapshots,
    currentPosition,
    nextPosition,
    paddingMeters,
    minHeightMeters,
    maxHeightMeters,
    excludedOwnerEnvironmentAssetId
  );
}

export function resolveGroundedAutostepHeightMeters(
  config: MetaverseRuntimeConfig,
  surfaceColliderSnapshots: readonly MetaversePlacedCuboidColliderSnapshot[],
  position: PhysicsVector3Snapshot,
  yawRadians: number,
  moveAxis: number,
  strafeAxis: number,
  verticalSpeedUnitsPerSecond = 0,
  jumpRequested = false,
  excludedOwnerEnvironmentAssetId: string | null = null
): number | null {
  return resolveMetaverseWorldGroundedAutostepHeightMeters(
    readSurfacePolicyConfig(config),
    surfaceColliderSnapshots,
    position,
    yawRadians,
    moveAxis,
    strafeAxis,
    verticalSpeedUnitsPerSecond,
    jumpRequested,
    excludedOwnerEnvironmentAssetId
  );
}

export function shouldEnableGroundedAutostep(
  config: MetaverseRuntimeConfig,
  surfaceColliderSnapshots: readonly MetaversePlacedCuboidColliderSnapshot[],
  position: PhysicsVector3Snapshot,
  yawRadians: number,
  moveAxis: number,
  strafeAxis: number,
  verticalSpeedUnitsPerSecond = 0,
  jumpRequested = false,
  excludedOwnerEnvironmentAssetId: string | null = null
): boolean {
  return (
    resolveGroundedAutostepHeightMeters(
      config,
      surfaceColliderSnapshots,
      position,
      yawRadians,
      moveAxis,
      strafeAxis,
      verticalSpeedUnitsPerSecond,
      jumpRequested,
      excludedOwnerEnvironmentAssetId
    ) !== null
  );
}

export function resolveAutomaticSurfaceLocomotionSnapshot(
  config: MetaverseRuntimeConfig,
  surfaceColliderSnapshots: readonly MetaversePlacedCuboidColliderSnapshot[],
  position: PhysicsVector3Snapshot,
  yawRadians: number,
  currentLocomotionMode: AutomaticSurfaceLocomotionModeId,
  excludedOwnerEnvironmentAssetId: string | null = null
): AutomaticSurfaceLocomotionSnapshot {
  return resolveMetaverseWorldAutomaticSurfaceLocomotion(
    readSurfacePolicyConfig(config),
    surfaceColliderSnapshots,
    position,
    yawRadians,
    currentLocomotionMode,
    excludedOwnerEnvironmentAssetId
  );
}

export function resolveAutomaticSurfaceLocomotionMode(
  config: MetaverseRuntimeConfig,
  surfaceColliderSnapshots: readonly MetaversePlacedCuboidColliderSnapshot[],
  position: PhysicsVector3Snapshot,
  yawRadians: number,
  currentLocomotionMode: AutomaticSurfaceLocomotionModeId,
  excludedOwnerEnvironmentAssetId: string | null = null
): AutomaticSurfaceLocomotionDecision {
  return resolveAutomaticSurfaceLocomotionSnapshot(
    config,
    surfaceColliderSnapshots,
    position,
    yawRadians,
    currentLocomotionMode,
    excludedOwnerEnvironmentAssetId
  ).decision;
}

export function isWaterbornePosition(
  config: MetaverseRuntimeConfig,
  surfaceColliderSnapshots: readonly MetaversePlacedCuboidColliderSnapshot[],
  position: PhysicsVector3Snapshot,
  paddingMeters = 0,
  excludedOwnerEnvironmentAssetId: string | null = null
): boolean {
  return isMetaverseWorldWaterbornePosition(
    readSurfacePolicyConfig(config),
    surfaceColliderSnapshots,
    position,
    paddingMeters,
    excludedOwnerEnvironmentAssetId
  );
}
