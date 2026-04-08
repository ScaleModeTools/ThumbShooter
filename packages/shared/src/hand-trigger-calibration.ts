import type { Degrees } from "./unit-measurements.js";
import { createDegrees } from "./unit-measurements.js";

export interface HandTriggerMetricSnapshot {
  readonly axisAngleDegrees: Degrees;
  readonly engagementRatio: number;
}

export interface HandTriggerMetricInput {
  readonly axisAngleDegrees: number;
  readonly engagementRatio: number;
}

export interface HandTriggerCalibrationSnapshot {
  readonly sampleCount: number;
  readonly pressedAxisAngleDegreesMax: Degrees;
  readonly pressedEngagementRatioMax: number;
  readonly readyAxisAngleDegreesMin: Degrees;
  readonly readyEngagementRatioMin: number;
}

export interface HandTriggerCalibrationSnapshotInput {
  readonly sampleCount: number;
  readonly pressedAxisAngleDegreesMax: number;
  readonly pressedEngagementRatioMax: number;
  readonly readyAxisAngleDegreesMin: number;
  readonly readyEngagementRatioMin: number;
}

function normalizeFiniteNonNegativeNumber(rawValue: number): number {
  if (!Number.isFinite(rawValue) || rawValue < 0) {
    return 0;
  }

  return rawValue;
}

function normalizeSampleCount(rawValue: number): number {
  return Math.floor(normalizeFiniteNonNegativeNumber(rawValue));
}

export function createHandTriggerMetricSnapshot(
  input: HandTriggerMetricInput
): HandTriggerMetricSnapshot {
  return Object.freeze({
    axisAngleDegrees: createDegrees(
      normalizeFiniteNonNegativeNumber(input.axisAngleDegrees)
    ),
    engagementRatio: normalizeFiniteNonNegativeNumber(input.engagementRatio)
  });
}

export function createHandTriggerCalibrationSnapshot(
  input: HandTriggerCalibrationSnapshotInput
): HandTriggerCalibrationSnapshot {
  const pressedAxisAngleDegreesMax = normalizeFiniteNonNegativeNumber(
    input.pressedAxisAngleDegreesMax
  );
  const pressedEngagementRatioMax = normalizeFiniteNonNegativeNumber(
    input.pressedEngagementRatioMax
  );
  const readyAxisAngleDegreesMin = Math.max(
    pressedAxisAngleDegreesMax,
    normalizeFiniteNonNegativeNumber(input.readyAxisAngleDegreesMin)
  );
  const readyEngagementRatioMin = Math.max(
    pressedEngagementRatioMax,
    normalizeFiniteNonNegativeNumber(input.readyEngagementRatioMin)
  );

  return Object.freeze({
    sampleCount: normalizeSampleCount(input.sampleCount),
    pressedAxisAngleDegreesMax: createDegrees(pressedAxisAngleDegreesMax),
    pressedEngagementRatioMax,
    readyAxisAngleDegreesMin: createDegrees(readyAxisAngleDegreesMin),
    readyEngagementRatioMin
  });
}
