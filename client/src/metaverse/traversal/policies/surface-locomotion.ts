import type { PhysicsVector3Snapshot } from "@/physics";

import type { MetaverseFlightInputSnapshot } from "../../types/metaverse-control-mode";
import type {
  SurfaceLocomotionConfig,
  SurfaceLocomotionSnapshot,
  SurfaceLocomotionSpeedSnapshot
} from "../types/traversal";

export function toFiniteNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function wrapRadians(rawValue: number): number {
  if (!Number.isFinite(rawValue)) {
    return 0;
  }

  let nextValue = rawValue;

  while (nextValue > Math.PI) {
    nextValue -= Math.PI * 2;
  }

  while (nextValue <= -Math.PI) {
    nextValue += Math.PI * 2;
  }

  return nextValue;
}

export function freezeVector3(
  x: number,
  y: number,
  z: number
): PhysicsVector3Snapshot {
  return Object.freeze({
    x: toFiniteNumber(x),
    y: toFiniteNumber(y),
    z: toFiniteNumber(z)
  });
}

export function createSurfaceLocomotionSnapshot(
  position: PhysicsVector3Snapshot,
  yawRadians: number
): SurfaceLocomotionSnapshot {
  return Object.freeze({
    planarSpeedUnitsPerSecond: 0,
    position: freezeVector3(position.x, position.y, position.z),
    yawRadians: wrapRadians(yawRadians)
  });
}

export function resolvePlanarProbeOffset(
  forwardMeters: number,
  lateralMeters: number,
  yawRadians: number
): PhysicsVector3Snapshot {
  const forwardX = Math.sin(yawRadians);
  const forwardZ = -Math.cos(yawRadians);
  const rightX = Math.cos(yawRadians);
  const rightZ = Math.sin(yawRadians);

  return freezeVector3(
    forwardX * forwardMeters + rightX * lateralMeters,
    0,
    forwardZ * forwardMeters + rightZ * lateralMeters
  );
}

function shapeSignedAxis(value: number, exponent: number): number {
  const sanitizedValue = clamp(value, -1, 1);
  const magnitude = Math.pow(
    clamp01(Math.abs(sanitizedValue)),
    Math.max(0.1, toFiniteNumber(exponent, 1))
  );

  return Math.sign(sanitizedValue) * magnitude;
}

function resolveBoostMultiplier(
  boost: boolean,
  moveAxis: number,
  boostMultiplier: number,
  boostCurveExponent: number
): number {
  if (!boost) {
    return 1;
  }

  const shapedBoostAmount = Math.pow(
    clamp01(Math.abs(clamp(moveAxis, -1, 1))),
    Math.max(0.1, toFiniteNumber(boostCurveExponent, 1))
  );

  return 1 + (boostMultiplier - 1) * shapedBoostAmount;
}

function resolveShapedDragScale(
  currentSpeedUnitsPerSecond: number,
  baseSpeedUnitsPerSecond: number,
  dragCurveExponent: number
): number {
  const normalizedSpeed = clamp01(
    Math.abs(currentSpeedUnitsPerSecond) / Math.max(0.001, baseSpeedUnitsPerSecond)
  );

  return Math.max(
    0.18,
    Math.pow(
      normalizedSpeed,
      Math.max(0.1, toFiniteNumber(dragCurveExponent, 1))
    )
  );
}

export function advanceSurfaceLocomotionSnapshot(
  snapshot: SurfaceLocomotionSnapshot,
  speedSnapshot: SurfaceLocomotionSpeedSnapshot,
  movementInput: Pick<
    MetaverseFlightInputSnapshot,
    "boost" | "moveAxis" | "strafeAxis" | "yawAxis"
  >,
  config: SurfaceLocomotionConfig,
  deltaSeconds: number,
  worldRadius: number,
  fixedHeightMeters: number,
  movementEnabled = true
): {
  readonly speedSnapshot: SurfaceLocomotionSpeedSnapshot;
  readonly snapshot: SurfaceLocomotionSnapshot;
} {
  if (deltaSeconds <= 0) {
    return Object.freeze({
      speedSnapshot,
      snapshot
    });
  }

  const yawRadians = wrapRadians(
    snapshot.yawRadians +
      clamp(toFiniteNumber(movementInput.yawAxis, 0), -1, 1) *
        config.maxTurnSpeedRadiansPerSecond *
        deltaSeconds
  );
  const moveAxis = movementEnabled
    ? clamp(toFiniteNumber(movementInput.moveAxis, 0), -1, 1)
    : 0;
  const strafeAxis = movementEnabled
    ? clamp(toFiniteNumber(movementInput.strafeAxis, 0), -1, 1)
    : 0;
  const movementMagnitude = clamp01(Math.hypot(moveAxis, strafeAxis));
  const boostScale = resolveBoostMultiplier(
    movementInput.boost,
    movementMagnitude,
    config.boostMultiplier,
    config.boostCurveExponent
  );
  const targetSpeedUnitsPerSecond =
    config.baseSpeedUnitsPerSecond *
    shapeSignedAxis(moveAxis, config.accelerationCurveExponent) *
    boostScale;
  const targetStrafeSpeedUnitsPerSecond =
    config.baseSpeedUnitsPerSecond *
    shapeSignedAxis(strafeAxis, config.accelerationCurveExponent) *
    boostScale;
  const resolveAxisSpeedUnitsPerSecond = (
    currentSpeedUnitsPerSecond: number,
    targetAxisSpeedUnitsPerSecond: number,
    axisInput: number
  ): number =>
    axisInput === 0
      ? (() => {
          const speedDelta =
            config.decelerationUnitsPerSecondSquared *
            resolveShapedDragScale(
              currentSpeedUnitsPerSecond,
              config.baseSpeedUnitsPerSecond,
              config.dragCurveExponent
            ) *
            deltaSeconds;

          if (
            Math.abs(targetAxisSpeedUnitsPerSecond - currentSpeedUnitsPerSecond) <=
            speedDelta
          ) {
            return 0;
          }

          return (
            currentSpeedUnitsPerSecond -
            Math.sign(currentSpeedUnitsPerSecond) * speedDelta
          );
        })()
      : (() => {
          const speedDelta =
            config.accelerationUnitsPerSecondSquared *
            Math.max(
              0.2,
              Math.abs(
                shapeSignedAxis(axisInput, config.accelerationCurveExponent)
              )
            ) *
            deltaSeconds;

          if (
            Math.abs(targetAxisSpeedUnitsPerSecond - currentSpeedUnitsPerSecond) <=
            speedDelta
          ) {
            return targetAxisSpeedUnitsPerSecond;
          }

          return (
            currentSpeedUnitsPerSecond +
            Math.sign(
              targetAxisSpeedUnitsPerSecond - currentSpeedUnitsPerSecond
            ) *
              speedDelta
          );
        })();
  const nextForwardSpeedUnitsPerSecond = resolveAxisSpeedUnitsPerSecond(
    speedSnapshot.forwardSpeedUnitsPerSecond,
    targetSpeedUnitsPerSecond,
    moveAxis
  );
  const nextStrafeSpeedUnitsPerSecond = resolveAxisSpeedUnitsPerSecond(
    speedSnapshot.strafeSpeedUnitsPerSecond,
    targetStrafeSpeedUnitsPerSecond,
    strafeAxis
  );
  const forwardX = Math.sin(yawRadians);
  const forwardZ = -Math.cos(yawRadians);
  const rightX = Math.cos(yawRadians);
  const rightZ = Math.sin(yawRadians);
  const unclampedPosition = freezeVector3(
    snapshot.position.x +
      (forwardX * nextForwardSpeedUnitsPerSecond +
        rightX * nextStrafeSpeedUnitsPerSecond) *
        deltaSeconds,
    fixedHeightMeters,
    snapshot.position.z +
      (forwardZ * nextForwardSpeedUnitsPerSecond +
        rightZ * nextStrafeSpeedUnitsPerSecond) *
        deltaSeconds
  );
  const radialDistance = Math.hypot(unclampedPosition.x, unclampedPosition.z);
  const radiusScale =
    radialDistance <= worldRadius ? 1 : worldRadius / Math.max(1, radialDistance);
  const position = freezeVector3(
    unclampedPosition.x * radiusScale,
    fixedHeightMeters,
    unclampedPosition.z * radiusScale
  );
  const deltaX = position.x - snapshot.position.x;
  const deltaZ = position.z - snapshot.position.z;

  return Object.freeze({
    speedSnapshot: Object.freeze({
      forwardSpeedUnitsPerSecond:
        deltaSeconds <= 0
          ? nextForwardSpeedUnitsPerSecond
          : (deltaX * forwardX + deltaZ * forwardZ) / deltaSeconds,
      strafeSpeedUnitsPerSecond:
        deltaSeconds <= 0
          ? nextStrafeSpeedUnitsPerSecond
          : (deltaX * rightX + deltaZ * rightZ) / deltaSeconds
    }),
    snapshot: Object.freeze({
      planarSpeedUnitsPerSecond: Math.hypot(deltaX, deltaZ) / deltaSeconds,
      position,
      yawRadians
    })
  });
}
