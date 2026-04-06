import type { HandTrackingPoseSnapshot } from "./hand-tracking";

export interface HandTriggerGestureConfig {
  readonly pressAxisAngleDegrees: number;
  readonly pressEngagementRatio: number;
  readonly releaseAxisAngleDegrees: number;
  readonly releaseEngagementRatio: number;
}

export interface HandTriggerGestureSnapshot {
  readonly axisAngleDegrees: number;
  readonly engagementRatio: number;
  readonly triggerPressed: boolean;
  readonly triggerReady: boolean;
}

interface HandVector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

function subtractPoints(
  endPoint: HandVector3,
  startPoint: HandVector3
): HandVector3 {
  return {
    x: endPoint.x - startPoint.x,
    y: endPoint.y - startPoint.y,
    z: endPoint.z - startPoint.z
  };
}

function readVectorMagnitude(vector: HandVector3): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function readDistance(pointA: HandVector3, pointB: HandVector3): number {
  return readVectorMagnitude(subtractPoints(pointA, pointB));
}

function readNearestDistance(
  point: HandVector3,
  candidates: readonly HandVector3[]
): number {
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    nearestDistance = Math.min(nearestDistance, readDistance(point, candidate));
  }

  return nearestDistance;
}

function readAxisAngleDegrees(vectorA: HandVector3, vectorB: HandVector3): number {
  const magnitudeA = readVectorMagnitude(vectorA);
  const magnitudeB = readVectorMagnitude(vectorB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 180;
  }

  const normalizedDotProduct =
    (vectorA.x * vectorB.x + vectorA.y * vectorB.y + vectorA.z * vectorB.z) /
    (magnitudeA * magnitudeB);
  const clampedDotProduct = Math.min(1, Math.max(-1, normalizedDotProduct));

  return (Math.acos(clampedDotProduct) * 180) / Math.PI;
}

function readTriggerEngagementRatio(
  pose: HandTrackingPoseSnapshot
): number {
  const indexAxisLength = Math.max(
    readDistance(pose.indexBase, pose.indexTip),
    0.0001
  );
  const thumbChain = [pose.thumbKnuckle, pose.thumbJoint, pose.thumbTip];
  const indexChain = [pose.indexBase, pose.indexKnuckle, pose.indexJoint, pose.indexTip];
  const totalNearestDistance = thumbChain.reduce((distanceSum, thumbPoint) => {
    return distanceSum + readNearestDistance(thumbPoint, indexChain);
  }, 0);

  return totalNearestDistance / thumbChain.length / indexAxisLength;
}

function readTriggerAxisAngleDegrees(
  pose: HandTrackingPoseSnapshot
): number {
  return readAxisAngleDegrees(
    subtractPoints(pose.thumbTip, pose.handPivot),
    subtractPoints(pose.indexTip, pose.handPivot)
  );
}

export function evaluateHandTriggerGesture(
  pose: HandTrackingPoseSnapshot,
  triggerHeld: boolean,
  config: HandTriggerGestureConfig
): HandTriggerGestureSnapshot {
  const engagementRatio = readTriggerEngagementRatio(pose);
  const axisAngleDegrees = readTriggerAxisAngleDegrees(pose);
  const pressSatisfied =
    engagementRatio <= config.pressEngagementRatio &&
    axisAngleDegrees <= config.pressAxisAngleDegrees;
  const releaseSatisfied =
    engagementRatio >= config.releaseEngagementRatio ||
    axisAngleDegrees >= config.releaseAxisAngleDegrees;
  const nextTriggerPressed = triggerHeld ? !releaseSatisfied : pressSatisfied;

  return Object.freeze({
    axisAngleDegrees,
    engagementRatio,
    triggerPressed: nextTriggerPressed,
    triggerReady: !nextTriggerPressed && releaseSatisfied
  });
}
