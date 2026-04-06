import {
  createNormalizedViewportPoint,
  type CalibrationShotSample,
  type NormalizedViewportPoint,
  type NormalizedViewportPointInput
} from "./calibration-types.js";

export interface AffineAimTransformSnapshot {
  readonly xCoefficients: readonly [number, number, number];
  readonly yCoefficients: readonly [number, number, number];
}

function normalizeCoefficient(rawValue: number): number {
  return Number.isFinite(rawValue) ? rawValue : 0;
}

function createCoefficientTriplet(
  coefficients: readonly number[]
): readonly [number, number, number] {
  return Object.freeze([
    normalizeCoefficient(coefficients[0] ?? 0),
    normalizeCoefficient(coefficients[1] ?? 0),
    normalizeCoefficient(coefficients[2] ?? 0)
  ]) as readonly [number, number, number];
}

function freezeAffineAimTransformSnapshot(
  snapshot: AffineAimTransformSnapshot
): AffineAimTransformSnapshot {
  return Object.freeze({
    xCoefficients: createCoefficientTriplet(snapshot.xCoefficients),
    yCoefficients: createCoefficientTriplet(snapshot.yCoefficients)
  });
}

function solveLinear3x3(
  rows: readonly [number, number, number][],
  values: readonly [number, number, number]
): readonly [number, number, number] | null {
  const matrix: [number, number, number, number][] = [
    [rows[0]![0], rows[0]![1], rows[0]![2], values[0]],
    [rows[1]![0], rows[1]![1], rows[1]![2], values[1]],
    [rows[2]![0], rows[2]![1], rows[2]![2], values[2]]
  ];

  for (let pivotIndex = 0; pivotIndex < 3; pivotIndex += 1) {
    let selectedPivotIndex = pivotIndex;

    for (let scanIndex = pivotIndex + 1; scanIndex < 3; scanIndex += 1) {
      const scanRow = matrix[scanIndex]!;
      const selectedRow = matrix[selectedPivotIndex]!;

      if (
        Math.abs(scanRow[pivotIndex] ?? 0) >
        Math.abs(selectedRow[pivotIndex] ?? 0)
      ) {
        selectedPivotIndex = scanIndex;
      }
    }

    const selectedPivotRow = matrix[selectedPivotIndex]!;
    const pivotValue = selectedPivotRow[pivotIndex] ?? 0;

    if (Math.abs(pivotValue) < 1e-8) {
      return null;
    }

    if (selectedPivotIndex !== pivotIndex) {
      const nextRow = matrix[pivotIndex]!;

      matrix[pivotIndex] = matrix[selectedPivotIndex]!;
      matrix[selectedPivotIndex] = nextRow;
    }

    const pivotRow = matrix[pivotIndex]!;
    const normalizationFactor = pivotRow[pivotIndex] ?? 1;

    for (let columnIndex = pivotIndex; columnIndex < 4; columnIndex += 1) {
      const currentValue = pivotRow[columnIndex] ?? 0;

      pivotRow[columnIndex] = currentValue / normalizationFactor;
    }

    for (let rowIndex = 0; rowIndex < 3; rowIndex += 1) {
      if (rowIndex === pivotIndex) {
        continue;
      }

      const row = matrix[rowIndex]!;
      const eliminationFactor = row[pivotIndex] ?? 0;

      for (let columnIndex = pivotIndex; columnIndex < 4; columnIndex += 1) {
        const currentValue = row[columnIndex] ?? 0;
        const pivotRowValue = pivotRow[columnIndex] ?? 0;

        row[columnIndex] = currentValue - eliminationFactor * pivotRowValue;
      }
    }
  }

  return Object.freeze([
    normalizeCoefficient(matrix[0]![3] ?? 0),
    normalizeCoefficient(matrix[1]![3] ?? 0),
    normalizeCoefficient(matrix[2]![3] ?? 0)
  ]) as readonly [number, number, number];
}

function fitObservedAxis(
  samples: readonly CalibrationShotSample[],
  targetSelector: (sample: CalibrationShotSample) => number
): readonly [number, number, number] | null {
  let sumXx = 0;
  let sumXy = 0;
  let sumX = 0;
  let sumYy = 0;
  let sumY = 0;
  let sumTarget = 0;
  let sumTargetX = 0;
  let sumTargetY = 0;

  for (const sample of samples) {
    const observedPoint = sample.observedPose.indexTip;
    const targetValue = targetSelector(sample);

    sumXx += observedPoint.x * observedPoint.x;
    sumXy += observedPoint.x * observedPoint.y;
    sumX += observedPoint.x;
    sumYy += observedPoint.y * observedPoint.y;
    sumY += observedPoint.y;
    sumTarget += targetValue;
    sumTargetX += observedPoint.x * targetValue;
    sumTargetY += observedPoint.y * targetValue;
  }

  return solveLinear3x3(
    [
      [sumXx, sumXy, sumX],
      [sumXy, sumYy, sumY],
      [sumX, sumY, samples.length]
    ],
    [sumTargetX, sumTargetY, sumTarget]
  );
}

export class AffineAimTransform {
  readonly #snapshot: AffineAimTransformSnapshot;

  private constructor(snapshot: AffineAimTransformSnapshot) {
    this.#snapshot = freezeAffineAimTransformSnapshot(snapshot);
  }

  static fromSnapshot(snapshot: AffineAimTransformSnapshot): AffineAimTransform {
    return new AffineAimTransform(snapshot);
  }

  static fit(
    samples: readonly CalibrationShotSample[]
  ): AffineAimTransform | null {
    if (samples.length < 3) {
      return null;
    }

    const xCoefficients = fitObservedAxis(
      samples,
      (sample) => sample.intendedTarget.x
    );
    const yCoefficients = fitObservedAxis(
      samples,
      (sample) => sample.intendedTarget.y
    );

    if (xCoefficients === null || yCoefficients === null) {
      return null;
    }

    return new AffineAimTransform({
      xCoefficients,
      yCoefficients
    });
  }

  get snapshot(): AffineAimTransformSnapshot {
    return this.#snapshot;
  }

  projectUnclamped(
    observedPoint: NormalizedViewportPoint | NormalizedViewportPointInput
  ): NormalizedViewportPointInput {
    return Object.freeze({
      x:
        observedPoint.x * this.#snapshot.xCoefficients[0] +
        observedPoint.y * this.#snapshot.xCoefficients[1] +
        this.#snapshot.xCoefficients[2],
      y:
        observedPoint.x * this.#snapshot.yCoefficients[0] +
        observedPoint.y * this.#snapshot.yCoefficients[1] +
        this.#snapshot.yCoefficients[2]
    });
  }

  apply(
    observedPoint: NormalizedViewportPoint | NormalizedViewportPointInput
  ): NormalizedViewportPoint {
    return createNormalizedViewportPoint(this.projectUnclamped(observedPoint));
  }
}
