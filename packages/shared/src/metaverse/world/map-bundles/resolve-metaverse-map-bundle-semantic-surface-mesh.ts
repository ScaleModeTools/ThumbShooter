import type {
  MetaverseMapBundleSemanticPlanarLoopSnapshot,
  MetaverseMapBundleSemanticRegionSnapshot,
  MetaverseMapBundleSemanticSurfaceSnapshot
} from "./metaverse-map-bundle.js";
import type {
  MetaverseWorldSurfaceVector3Snapshot
} from "../../metaverse-world-surface-query.js";

const semanticSurfaceMeshEpsilon = 0.000001;

export interface MetaverseMapBundleSemanticSurfaceMeshSnapshot {
  readonly indices: readonly number[];
  readonly rotationYRadians: number;
  readonly translation: MetaverseWorldSurfaceVector3Snapshot;
  readonly vertices: readonly number[];
}

export interface MetaverseMapBundleSemanticLoopBoundsSnapshot {
  readonly maxX: number;
  readonly maxZ: number;
  readonly minX: number;
  readonly minZ: number;
}

function freezeVector3(
  x: number,
  y: number,
  z: number
): MetaverseWorldSurfaceVector3Snapshot {
  return Object.freeze({ x, y, z });
}

function pointsMatch(
  left: { readonly x: number; readonly z: number },
  right: { readonly x: number; readonly z: number },
  tolerance = semanticSurfaceMeshEpsilon
): boolean {
  return (
    Math.abs(left.x - right.x) <= tolerance &&
    Math.abs(left.z - right.z) <= tolerance
  );
}

function computeSignedLoopArea(
  points: readonly { readonly x: number; readonly z: number }[]
): number {
  let area = 0;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]!;
    const nextPoint = points[(index + 1) % points.length]!;

    area += point.x * nextPoint.z - nextPoint.x * point.z;
  }

  return area * 0.5;
}

function computeCrossProductZ(
  previousPoint: { readonly x: number; readonly z: number },
  currentPoint: { readonly x: number; readonly z: number },
  nextPoint: { readonly x: number; readonly z: number }
): number {
  return (
    (currentPoint.x - previousPoint.x) * (nextPoint.z - currentPoint.z) -
    (currentPoint.z - previousPoint.z) * (nextPoint.x - currentPoint.x)
  );
}

function isPointInsideTriangle(
  point: { readonly x: number; readonly z: number },
  vertexA: { readonly x: number; readonly z: number },
  vertexB: { readonly x: number; readonly z: number },
  vertexC: { readonly x: number; readonly z: number }
): boolean {
  const denominator =
    (vertexB.z - vertexC.z) * (vertexA.x - vertexC.x) +
    (vertexC.x - vertexB.x) * (vertexA.z - vertexC.z);

  if (Math.abs(denominator) <= semanticSurfaceMeshEpsilon) {
    return false;
  }

  const barycentricA =
    ((vertexB.z - vertexC.z) * (point.x - vertexC.x) +
      (vertexC.x - vertexB.x) * (point.z - vertexC.z)) /
    denominator;
  const barycentricB =
    ((vertexC.z - vertexA.z) * (point.x - vertexC.x) +
      (vertexA.x - vertexC.x) * (point.z - vertexC.z)) /
    denominator;
  const barycentricC = 1 - barycentricA - barycentricB;

  return (
    barycentricA >= -semanticSurfaceMeshEpsilon &&
    barycentricB >= -semanticSurfaceMeshEpsilon &&
    barycentricC >= -semanticSurfaceMeshEpsilon
  );
}

function normalizeLoopPoints(
  loop: MetaverseMapBundleSemanticPlanarLoopSnapshot
): readonly { readonly x: number; readonly z: number }[] {
  const deduplicatedPoints: { x: number; z: number }[] = [];

  for (const point of loop.points) {
    if (
      deduplicatedPoints.length > 0 &&
      pointsMatch(deduplicatedPoints[deduplicatedPoints.length - 1]!, point)
    ) {
      continue;
    }

    deduplicatedPoints.push({
      x: point.x,
      z: point.z
    });
  }

  if (
    deduplicatedPoints.length > 1 &&
    pointsMatch(deduplicatedPoints[0]!, deduplicatedPoints[deduplicatedPoints.length - 1]!)
  ) {
    deduplicatedPoints.pop();
  }

  if (deduplicatedPoints.length < 3) {
    return Object.freeze(deduplicatedPoints);
  }

  const simplifiedPoints: { x: number; z: number }[] = [];

  for (let index = 0; index < deduplicatedPoints.length; index += 1) {
    const previousPoint =
      deduplicatedPoints[
        (index + deduplicatedPoints.length - 1) % deduplicatedPoints.length
      ]!;
    const currentPoint = deduplicatedPoints[index]!;
    const nextPoint =
      deduplicatedPoints[(index + 1) % deduplicatedPoints.length]!;
    const crossProduct = computeCrossProductZ(
      previousPoint,
      currentPoint,
      nextPoint
    );

    if (Math.abs(crossProduct) <= semanticSurfaceMeshEpsilon) {
      continue;
    }

    simplifiedPoints.push(currentPoint);
  }

  return Object.freeze(simplifiedPoints);
}

function triangulatePlanarLoop(
  points: readonly { readonly x: number; readonly z: number }[]
): readonly number[] {
  if (points.length < 3) {
    return Object.freeze([]);
  }

  const orientedIndices =
    computeSignedLoopArea(points) >= 0
      ? points.map((_, index) => index)
      : points.map((_, index) => points.length - 1 - index);
  const workingIndices = [...orientedIndices];
  const triangleIndices: number[] = [];
  let guard = 0;

  while (workingIndices.length > 3 && guard < points.length * points.length) {
    let clippedEar = false;

    for (
      let workingIndex = 0;
      workingIndex < workingIndices.length;
      workingIndex += 1
    ) {
      const previousVertexIndex =
        workingIndices[
          (workingIndex + workingIndices.length - 1) % workingIndices.length
        ]!;
      const currentVertexIndex = workingIndices[workingIndex]!;
      const nextVertexIndex =
        workingIndices[(workingIndex + 1) % workingIndices.length]!;
      const previousPoint = points[previousVertexIndex]!;
      const currentPoint = points[currentVertexIndex]!;
      const nextPoint = points[nextVertexIndex]!;

      if (
        computeCrossProductZ(previousPoint, currentPoint, nextPoint) <=
        semanticSurfaceMeshEpsilon
      ) {
        continue;
      }

      let containsOtherPoint = false;

      for (const candidateVertexIndex of workingIndices) {
        if (
          candidateVertexIndex === previousVertexIndex ||
          candidateVertexIndex === currentVertexIndex ||
          candidateVertexIndex === nextVertexIndex
        ) {
          continue;
        }

        if (
          isPointInsideTriangle(
            points[candidateVertexIndex]!,
            previousPoint,
            currentPoint,
            nextPoint
          )
        ) {
          containsOtherPoint = true;
          break;
        }
      }

      if (containsOtherPoint) {
        continue;
      }

      triangleIndices.push(
        previousVertexIndex,
        currentVertexIndex,
        nextVertexIndex
      );
      workingIndices.splice(workingIndex, 1);
      clippedEar = true;
      break;
    }

    if (!clippedEar) {
      break;
    }

    guard += 1;
  }

  if (workingIndices.length === 3) {
    triangleIndices.push(
      workingIndices[0]!,
      workingIndices[1]!,
      workingIndices[2]!
    );
  }

  if (triangleIndices.length >= 3) {
    return Object.freeze(triangleIndices);
  }

  const fallbackIndices: number[] = [];

  for (let index = 1; index + 1 < orientedIndices.length; index += 1) {
    fallbackIndices.push(
      orientedIndices[0]!,
      orientedIndices[index]!,
      orientedIndices[index + 1]!
    );
  }

  return Object.freeze(fallbackIndices);
}

export function resolveMetaverseMapBundleSemanticRegionLoopBounds(
  loop: MetaverseMapBundleSemanticPlanarLoopSnapshot
): MetaverseMapBundleSemanticLoopBoundsSnapshot | null {
  const normalizedPoints = normalizeLoopPoints(loop);

  if (normalizedPoints.length === 0) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const point of normalizedPoints) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minZ)) {
    return null;
  }

  return Object.freeze({
    maxX,
    maxZ,
    minX,
    minZ
  });
}

export function resolveMetaverseMapBundleSemanticSurfaceLocalHeightMeters(
  surface: Pick<
    MetaverseMapBundleSemanticSurfaceSnapshot,
    "kind" | "size" | "slopeRiseMeters"
  >,
  localX: number,
  localZ: number
): number {
  if (surface.kind !== "sloped-plane") {
    return 0;
  }

  const slopeSpanMeters = Math.max(
    semanticSurfaceMeshEpsilon,
    Math.abs(surface.size.z)
  );

  return (localZ / slopeSpanMeters) * surface.slopeRiseMeters;
}

export function createMetaverseMapBundleSemanticRegionSurfaceMesh(
  region: Pick<MetaverseMapBundleSemanticRegionSnapshot, "outerLoop" | "surfaceId">,
  surface: Pick<
    MetaverseMapBundleSemanticSurfaceSnapshot,
    "center" | "elevation" | "kind" | "rotationYRadians" | "size" | "slopeRiseMeters" | "surfaceId"
  >
): MetaverseMapBundleSemanticSurfaceMeshSnapshot | null {
  if (region.surfaceId !== surface.surfaceId) {
    return null;
  }

  const normalizedPoints = normalizeLoopPoints(region.outerLoop);

  if (normalizedPoints.length < 3) {
    return null;
  }

  const indices = triangulatePlanarLoop(normalizedPoints);

  if (indices.length < 3) {
    return null;
  }

  const vertices = normalizedPoints.flatMap((point) => [
    point.x,
    resolveMetaverseMapBundleSemanticSurfaceLocalHeightMeters(
      surface,
      point.x,
      point.z
    ),
    point.z
  ]);

  return Object.freeze({
    indices,
    rotationYRadians: surface.rotationYRadians,
    translation: freezeVector3(
      surface.center.x,
      surface.elevation,
      surface.center.z
    ),
    vertices: Object.freeze(vertices)
  });
}

export function isMetaverseMapBundleSemanticRegionFlatLocalRectangle(
  region: Pick<MetaverseMapBundleSemanticRegionSnapshot, "outerLoop">,
  surface: Pick<
    MetaverseMapBundleSemanticSurfaceSnapshot,
    "kind" | "slopeRiseMeters"
  >
): boolean {
  if (
    surface.kind !== "flat-slab" ||
    Math.abs(surface.slopeRiseMeters) > semanticSurfaceMeshEpsilon
  ) {
    return false;
  }

  const normalizedPoints = normalizeLoopPoints(region.outerLoop);

  if (normalizedPoints.length !== 4) {
    return false;
  }

  const bounds = resolveMetaverseMapBundleSemanticRegionLoopBounds(region.outerLoop);

  if (bounds === null) {
    return false;
  }

  const rectangleCorners = [
    { x: bounds.minX, z: bounds.minZ },
    { x: bounds.maxX, z: bounds.minZ },
    { x: bounds.maxX, z: bounds.maxZ },
    { x: bounds.minX, z: bounds.maxZ }
  ];

  return normalizedPoints.every((point) =>
    rectangleCorners.some((corner) => pointsMatch(point, corner))
  );
}
