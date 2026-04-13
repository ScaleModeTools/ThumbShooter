import {
  constrainMetaverseWorldPlanarPositionAgainstBlockers,
  isMetaverseWorldWaterbornePosition,
  resolveMetaverseWorldAutomaticSurfaceLocomotion,
  resolveMetaverseWorldGroundedAutostepHeightMeters,
  resolveMetaverseWorldSurfaceHeightMeters,
  type MetaverseWorldSurfaceLocomotionDecision,
  type MetaverseWorldSurfacePolicyConfig,
  type MetaverseWorldSurfaceVector3Snapshot
} from "@webgpu-metaverse/shared";

import type { MetaverseAuthoritativeSurfaceColliderSnapshot } from "../config/metaverse-authoritative-world-surface.js";

export type MetaverseAuthoritativeSurfaceConfig =
  MetaverseWorldSurfacePolicyConfig;
export type MetaverseAuthoritativeSurfaceLocomotionDecision =
  MetaverseWorldSurfaceLocomotionDecision;
export type MetaverseAuthoritativeVector3Snapshot =
  MetaverseWorldSurfaceVector3Snapshot;

export function resolveAuthoritativeSurfaceHeightMeters(
  config: MetaverseAuthoritativeSurfaceConfig,
  surfaceColliderSnapshots: readonly MetaverseAuthoritativeSurfaceColliderSnapshot[],
  x: number,
  z: number
): number {
  return resolveMetaverseWorldSurfaceHeightMeters(
    config,
    surfaceColliderSnapshots,
    x,
    z
  );
}

export function constrainAuthoritativePlanarPositionAgainstBlockers(
  surfaceColliderSnapshots: readonly MetaverseAuthoritativeSurfaceColliderSnapshot[],
  currentPosition: MetaverseAuthoritativeVector3Snapshot,
  nextPosition: MetaverseAuthoritativeVector3Snapshot,
  paddingMeters: number,
  minHeightMeters: number,
  maxHeightMeters: number
): MetaverseAuthoritativeVector3Snapshot {
  return constrainMetaverseWorldPlanarPositionAgainstBlockers(
    surfaceColliderSnapshots,
    currentPosition,
    nextPosition,
    paddingMeters,
    minHeightMeters,
    maxHeightMeters
  );
}

export function resolveAuthoritativeGroundedAutostepHeightMeters(
  config: MetaverseAuthoritativeSurfaceConfig,
  surfaceColliderSnapshots: readonly MetaverseAuthoritativeSurfaceColliderSnapshot[],
  position: MetaverseAuthoritativeVector3Snapshot,
  yawRadians: number,
  moveAxis: number,
  strafeAxis: number,
  verticalSpeedUnitsPerSecond = 0,
  jumpRequested = false
): number | null {
  return resolveMetaverseWorldGroundedAutostepHeightMeters(
    config,
    surfaceColliderSnapshots,
    position,
    yawRadians,
    moveAxis,
    strafeAxis,
    verticalSpeedUnitsPerSecond,
    jumpRequested
  );
}

export function resolveAuthoritativeAutomaticSurfaceLocomotionMode(
  config: MetaverseAuthoritativeSurfaceConfig,
  surfaceColliderSnapshots: readonly MetaverseAuthoritativeSurfaceColliderSnapshot[],
  position: MetaverseAuthoritativeVector3Snapshot,
  yawRadians: number,
  currentLocomotionMode: "grounded" | "swim"
): MetaverseAuthoritativeSurfaceLocomotionDecision {
  return resolveMetaverseWorldAutomaticSurfaceLocomotion(
    config,
    surfaceColliderSnapshots,
    position,
    yawRadians,
    currentLocomotionMode
  ).decision;
}

export function isAuthoritativeWaterbornePosition(
  config: MetaverseAuthoritativeSurfaceConfig,
  surfaceColliderSnapshots: readonly MetaverseAuthoritativeSurfaceColliderSnapshot[],
  position: MetaverseAuthoritativeVector3Snapshot,
  paddingMeters = 0
): boolean {
  return isMetaverseWorldWaterbornePosition(
    config,
    surfaceColliderSnapshots,
    position,
    paddingMeters
  );
}
