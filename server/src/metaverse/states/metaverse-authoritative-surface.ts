import type { MetaverseAuthoritativeSurfaceColliderSnapshot } from "../config/metaverse-authoritative-world-surface.js";

export interface MetaverseAuthoritativeSurfaceConfig {
  readonly capsuleHalfHeightMeters: number;
  readonly capsuleRadiusMeters: number;
  readonly gravityUnitsPerSecond: number;
  readonly jumpImpulseUnitsPerSecond: number;
  readonly oceanHeightMeters: number;
  readonly stepHeightMeters: number;
}

export interface MetaverseAuthoritativeSurfaceLocomotionDecision {
  readonly locomotionMode: "grounded" | "swim";
  readonly supportHeightMeters: number | null;
}

export interface MetaverseAuthoritativeVector3Snapshot {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

const automaticSurfaceWaterlineThresholdMeters = 0.05;
const automaticSurfaceExitSupportProbeCount = 3;
const automaticSurfaceGroundedHoldProbeCount = 2;
const automaticSurfaceGroundedHoldPaddingFactor = 0.45;
const automaticSurfaceProbeForwardDistanceFactor = 0.88;
const automaticSurfaceProbeLateralDistanceFactor = 0.72;
const automaticSurfaceStepHeightLeewayMeters = 0.04;
const automaticSurfaceBlockingHeightToleranceMeters = 0.01;

interface AutomaticSurfaceSupportSnapshot {
  readonly centerStepBlocked: boolean;
  readonly centerStepSupportHeightMeters: number | null;
  readonly forwardStepBlocked: boolean;
  readonly forwardStepSupportHeightMeters: number | null;
  readonly highestStepSupportHeightMeters: number | null;
  readonly stepSupportedProbeCount: number;
}

interface AutomaticSurfaceProbeSupportSnapshot {
  readonly stepSupportHeightMeters: number | null;
  readonly supportHeightMeters: number | null;
}

function toFiniteNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function rotatePlanarPoint(
  x: number,
  z: number,
  yawRadians: number
): MetaverseAuthoritativeVector3Snapshot {
  const sine = Math.sin(yawRadians);
  const cosine = Math.cos(yawRadians);

  return Object.freeze({
    x: x * cosine + z * sine,
    y: 0,
    z: -x * sine + z * cosine
  });
}

function resolvePlanarProbeOffset(
  forwardMeters: number,
  lateralMeters: number,
  yawRadians: number
): MetaverseAuthoritativeVector3Snapshot {
  const forwardX = Math.sin(yawRadians);
  const forwardZ = -Math.cos(yawRadians);
  const rightX = Math.cos(yawRadians);
  const rightZ = Math.sin(yawRadians);

  return Object.freeze({
    x: forwardX * forwardMeters + rightX * lateralMeters,
    y: 0,
    z: forwardZ * forwardMeters + rightZ * lateralMeters
  });
}

function hasBlockingSupport(
  probeSupport: AutomaticSurfaceProbeSupportSnapshot
): boolean {
  return (
    probeSupport.supportHeightMeters !== null &&
    (probeSupport.stepSupportHeightMeters === null ||
      probeSupport.supportHeightMeters >
        probeSupport.stepSupportHeightMeters +
          automaticSurfaceBlockingHeightToleranceMeters)
  );
}

function resolveSurfaceSupportHeightMeters(
  surfaceColliderSnapshots: readonly MetaverseAuthoritativeSurfaceColliderSnapshot[],
  x: number,
  z: number,
  paddingMeters = 0
): number | null {
  let highestSurfaceY: number | null = null;

  for (const collider of surfaceColliderSnapshots) {
    if (collider.traversalAffordance !== "support") {
      continue;
    }

    const localOffset = rotatePlanarPoint(
      x - collider.translation.x,
      z - collider.translation.z,
      -collider.rotationYRadians
    );

    if (
      Math.abs(localOffset.x) > collider.halfExtents.x + paddingMeters ||
      Math.abs(localOffset.z) > collider.halfExtents.z + paddingMeters
    ) {
      continue;
    }

    const surfaceY = collider.translation.y + collider.halfExtents.y;

    if (highestSurfaceY === null || surfaceY > highestSurfaceY) {
      highestSurfaceY = surfaceY;
    }
  }

  return highestSurfaceY;
}

function isPlanarPositionInsideCollider(
  collider: MetaverseAuthoritativeSurfaceColliderSnapshot,
  x: number,
  z: number,
  paddingMeters: number
): boolean {
  const localOffset = rotatePlanarPoint(
    x - collider.translation.x,
    z - collider.translation.z,
    -collider.rotationYRadians
  );

  return (
    Math.abs(localOffset.x) <= collider.halfExtents.x + paddingMeters &&
    Math.abs(localOffset.z) <= collider.halfExtents.z + paddingMeters
  );
}

function isPlanarPositionBlocked(
  surfaceColliderSnapshots: readonly MetaverseAuthoritativeSurfaceColliderSnapshot[],
  x: number,
  z: number,
  paddingMeters: number,
  minHeightMeters: number,
  maxHeightMeters: number
): boolean {
  for (const collider of surfaceColliderSnapshots) {
    if (collider.traversalAffordance !== "blocker") {
      continue;
    }

    const blockerMinHeightMeters =
      collider.translation.y - collider.halfExtents.y;
    const blockerMaxHeightMeters =
      collider.translation.y + collider.halfExtents.y;

    if (
      blockerMaxHeightMeters < minHeightMeters ||
      blockerMinHeightMeters > maxHeightMeters
    ) {
      continue;
    }

    if (isPlanarPositionInsideCollider(collider, x, z, paddingMeters)) {
      return true;
    }
  }

  return false;
}

function resolveAutomaticSurfaceProbeSupport(
  config: MetaverseAuthoritativeSurfaceConfig,
  surfaceColliderSnapshots: readonly MetaverseAuthoritativeSurfaceColliderSnapshot[],
  x: number,
  z: number,
  paddingMeters: number
): AutomaticSurfaceProbeSupportSnapshot {
  let highestSupportHeightMeters: number | null = null;
  let highestStepSupportHeightMeters: number | null = null;

  for (const collider of surfaceColliderSnapshots) {
    if (collider.traversalAffordance !== "support") {
      continue;
    }

    if (!isPlanarPositionInsideCollider(collider, x, z, paddingMeters)) {
      continue;
    }

    const surfaceY = collider.translation.y + collider.halfExtents.y;
    const riseAboveWaterMeters = surfaceY - config.oceanHeightMeters;
    const highestStepRiseAboveWaterMeters =
      config.stepHeightMeters + automaticSurfaceStepHeightLeewayMeters;

    if (
      highestSupportHeightMeters === null ||
      surfaceY > highestSupportHeightMeters
    ) {
      highestSupportHeightMeters = surfaceY;
    }

    if (
      riseAboveWaterMeters <= highestStepRiseAboveWaterMeters &&
      (highestStepSupportHeightMeters === null ||
        surfaceY > highestStepSupportHeightMeters)
    ) {
      highestStepSupportHeightMeters = surfaceY;
    }
  }

  return {
    stepSupportHeightMeters: highestStepSupportHeightMeters,
    supportHeightMeters: highestSupportHeightMeters
  };
}

function sampleAutomaticSurfaceSupport(
  config: MetaverseAuthoritativeSurfaceConfig,
  surfaceColliderSnapshots: readonly MetaverseAuthoritativeSurfaceColliderSnapshot[],
  position: MetaverseAuthoritativeVector3Snapshot,
  yawRadians: number,
  paddingMeters: number
): AutomaticSurfaceSupportSnapshot {
  const probeForwardDistanceMeters =
    config.capsuleRadiusMeters * automaticSurfaceProbeForwardDistanceFactor;
  const probeLateralDistanceMeters =
    config.capsuleRadiusMeters * automaticSurfaceProbeLateralDistanceFactor;
  const centerProbeSupport = resolveAutomaticSurfaceProbeSupport(
    config,
    surfaceColliderSnapshots,
    position.x,
    position.z,
    paddingMeters
  );
  const forwardProbeOffset = resolvePlanarProbeOffset(
    probeForwardDistanceMeters,
    0,
    yawRadians
  );
  const forwardProbeSupport = resolveAutomaticSurfaceProbeSupport(
    config,
    surfaceColliderSnapshots,
    position.x + forwardProbeOffset.x,
    position.z + forwardProbeOffset.z,
    paddingMeters
  );
  const forwardLeftProbeOffset = resolvePlanarProbeOffset(
    probeForwardDistanceMeters * 0.72,
    -probeLateralDistanceMeters,
    yawRadians
  );
  const forwardLeftProbeSupport = resolveAutomaticSurfaceProbeSupport(
    config,
    surfaceColliderSnapshots,
    position.x + forwardLeftProbeOffset.x,
    position.z + forwardLeftProbeOffset.z,
    paddingMeters
  );
  const forwardRightProbeOffset = resolvePlanarProbeOffset(
    probeForwardDistanceMeters * 0.72,
    probeLateralDistanceMeters,
    yawRadians
  );
  const forwardRightProbeSupport = resolveAutomaticSurfaceProbeSupport(
    config,
    surfaceColliderSnapshots,
    position.x + forwardRightProbeOffset.x,
    position.z + forwardRightProbeOffset.z,
    paddingMeters
  );
  const probeSupports = [
    centerProbeSupport,
    forwardProbeSupport,
    forwardLeftProbeSupport,
    forwardRightProbeSupport
  ];
  let highestStepSupportHeightMeters: number | null = null;
  let stepSupportedProbeCount = 0;

  for (const probeSupport of probeSupports) {
    if (probeSupport.stepSupportHeightMeters === null) {
      continue;
    }

    stepSupportedProbeCount += 1;

    if (
      highestStepSupportHeightMeters === null ||
      probeSupport.stepSupportHeightMeters > highestStepSupportHeightMeters
    ) {
      highestStepSupportHeightMeters = probeSupport.stepSupportHeightMeters;
    }
  }

  return {
    centerStepBlocked: hasBlockingSupport(centerProbeSupport),
    centerStepSupportHeightMeters: centerProbeSupport.stepSupportHeightMeters,
    forwardStepBlocked: hasBlockingSupport(forwardProbeSupport),
    forwardStepSupportHeightMeters: forwardProbeSupport.stepSupportHeightMeters,
    highestStepSupportHeightMeters,
    stepSupportedProbeCount
  };
}

export function resolveAuthoritativeSurfaceHeightMeters(
  config: MetaverseAuthoritativeSurfaceConfig,
  surfaceColliderSnapshots: readonly MetaverseAuthoritativeSurfaceColliderSnapshot[],
  x: number,
  z: number
): number {
  return Math.max(
    config.oceanHeightMeters,
    resolveSurfaceSupportHeightMeters(
      surfaceColliderSnapshots,
      x,
      z,
      config.capsuleRadiusMeters
    ) ?? config.oceanHeightMeters
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
  if (
    !isPlanarPositionBlocked(
      surfaceColliderSnapshots,
      nextPosition.x,
      nextPosition.z,
      paddingMeters,
      minHeightMeters,
      maxHeightMeters
    )
  ) {
    return Object.freeze({
      x: nextPosition.x,
      y: nextPosition.y,
      z: nextPosition.z
    });
  }

  const deltaX = nextPosition.x - currentPosition.x;
  const deltaZ = nextPosition.z - currentPosition.z;
  const axisOrder =
    Math.abs(deltaX) >= Math.abs(deltaZ)
      ? (["x", "z"] as const)
      : (["z", "x"] as const);
  let constrainedPosition = Object.freeze({
    x: currentPosition.x,
    y: nextPosition.y,
    z: currentPosition.z
  });

  for (const axis of axisOrder) {
    const candidate =
      axis === "x"
        ? Object.freeze({
            x: nextPosition.x,
            y: nextPosition.y,
            z: constrainedPosition.z
          })
        : Object.freeze({
            x: constrainedPosition.x,
            y: nextPosition.y,
            z: nextPosition.z
          });

    if (
      isPlanarPositionBlocked(
        surfaceColliderSnapshots,
        candidate.x,
        candidate.z,
        paddingMeters,
        minHeightMeters,
        maxHeightMeters
      )
    ) {
      continue;
    }

    constrainedPosition = candidate;
  }

  return constrainedPosition;
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
  const clampedMoveAxis = clamp(toFiniteNumber(moveAxis, 0), -1, 1);
  const clampedStrafeAxis = clamp(toFiniteNumber(strafeAxis, 0), -1, 1);
  const inputMagnitude = Math.hypot(clampedMoveAxis, clampedStrafeAxis);

  if (inputMagnitude <= 0.0001) {
    return null;
  }

  const normalizedMoveAxis = clampedMoveAxis / inputMagnitude;
  const normalizedStrafeAxis = clampedStrafeAxis / inputMagnitude;
  const forwardX = Math.sin(yawRadians);
  const forwardZ = -Math.cos(yawRadians);
  const rightX = Math.cos(yawRadians);
  const rightZ = Math.sin(yawRadians);
  const movementDirectionX =
    forwardX * normalizedMoveAxis + rightX * normalizedStrafeAxis;
  const movementDirectionZ =
    forwardZ * normalizedMoveAxis + rightZ * normalizedStrafeAxis;
  const movementYawRadians = Math.atan2(movementDirectionX, -movementDirectionZ);
  const currentSupportHeightMeters = position.y;
  const effectiveUpwardSpeedUnitsPerSecond = Math.max(
    0,
    toFiniteNumber(verticalSpeedUnitsPerSecond, 0),
    jumpRequested ? config.jumpImpulseUnitsPerSecond : 0
  );
  const maxJumpRiseMeters =
    effectiveUpwardSpeedUnitsPerSecond <= 0
      ? 0
      : (effectiveUpwardSpeedUnitsPerSecond *
          effectiveUpwardSpeedUnitsPerSecond) /
        Math.max(0.001, config.gravityUnitsPerSecond * 2);
  const maxEligibleStepRiseMeters = Math.max(
    config.stepHeightMeters + automaticSurfaceStepHeightLeewayMeters,
    maxJumpRiseMeters + automaticSurfaceStepHeightLeewayMeters
  );
  const probeForwardDistanceMeters =
    config.capsuleRadiusMeters * automaticSurfaceProbeForwardDistanceFactor;
  const probeLateralDistanceMeters =
    config.capsuleRadiusMeters * automaticSurfaceProbeLateralDistanceFactor;
  let highestEligibleStepRiseMeters: number | null = null;

  for (const probeOffset of [
    resolvePlanarProbeOffset(probeForwardDistanceMeters, 0, movementYawRadians),
    resolvePlanarProbeOffset(
      probeForwardDistanceMeters * 0.72,
      -probeLateralDistanceMeters,
      movementYawRadians
    ),
    resolvePlanarProbeOffset(
      probeForwardDistanceMeters * 0.72,
      probeLateralDistanceMeters,
      movementYawRadians
    )
  ]) {
    const supportHeightMeters = resolveSurfaceSupportHeightMeters(
      surfaceColliderSnapshots,
      position.x + probeOffset.x,
      position.z + probeOffset.z
    );

    if (supportHeightMeters === null) {
      continue;
    }

    const supportRiseMeters = supportHeightMeters - currentSupportHeightMeters;

    if (
      supportRiseMeters > automaticSurfaceBlockingHeightToleranceMeters &&
      supportRiseMeters <= maxEligibleStepRiseMeters &&
      (highestEligibleStepRiseMeters === null ||
        supportRiseMeters > highestEligibleStepRiseMeters)
    ) {
      highestEligibleStepRiseMeters = supportRiseMeters;
    }
  }

  return highestEligibleStepRiseMeters === null
    ? null
    : Math.max(config.stepHeightMeters, highestEligibleStepRiseMeters);
}

export function resolveAuthoritativeAutomaticSurfaceLocomotionMode(
  config: MetaverseAuthoritativeSurfaceConfig,
  surfaceColliderSnapshots: readonly MetaverseAuthoritativeSurfaceColliderSnapshot[],
  position: MetaverseAuthoritativeVector3Snapshot,
  yawRadians: number,
  currentLocomotionMode: "grounded" | "swim"
): MetaverseAuthoritativeSurfaceLocomotionDecision {
  const supportSnapshot = sampleAutomaticSurfaceSupport(
    config,
    surfaceColliderSnapshots,
    position,
    yawRadians,
    currentLocomotionMode === "grounded"
      ? config.capsuleRadiusMeters * automaticSurfaceGroundedHoldPaddingFactor
      : 0
  );

  if (currentLocomotionMode === "grounded") {
    const shouldStayGrounded =
      supportSnapshot.centerStepSupportHeightMeters !== null ||
      supportSnapshot.stepSupportedProbeCount >=
        automaticSurfaceGroundedHoldProbeCount;

    return shouldStayGrounded
      ? {
          locomotionMode: "grounded",
          supportHeightMeters:
            supportSnapshot.centerStepSupportHeightMeters ??
            supportSnapshot.highestStepSupportHeightMeters
        }
      : {
          locomotionMode: "swim",
          supportHeightMeters: null
        };
  }

  const canExitWater =
    supportSnapshot.centerStepSupportHeightMeters !== null &&
    !supportSnapshot.centerStepBlocked &&
    supportSnapshot.forwardStepSupportHeightMeters !== null &&
    !supportSnapshot.forwardStepBlocked &&
    supportSnapshot.stepSupportedProbeCount >= automaticSurfaceExitSupportProbeCount;

  return canExitWater
    ? {
        locomotionMode: "grounded",
        supportHeightMeters:
          supportSnapshot.centerStepSupportHeightMeters ??
          supportSnapshot.highestStepSupportHeightMeters
      }
    : {
        locomotionMode: "swim",
        supportHeightMeters: null
      };
}

export function isAuthoritativeWaterbornePosition(
  config: MetaverseAuthoritativeSurfaceConfig,
  surfaceColliderSnapshots: readonly MetaverseAuthoritativeSurfaceColliderSnapshot[],
  position: MetaverseAuthoritativeVector3Snapshot,
  paddingMeters = 0
): boolean {
  const supportHeight = resolveSurfaceSupportHeightMeters(
    surfaceColliderSnapshots,
    position.x,
    position.z,
    paddingMeters
  );

  return (
    supportHeight === null ||
    supportHeight <= config.oceanHeightMeters + automaticSurfaceWaterlineThresholdMeters
  );
}
