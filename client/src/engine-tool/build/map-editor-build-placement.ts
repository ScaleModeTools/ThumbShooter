import type { EnvironmentAssetDescriptor } from "@/assets/types/environment-asset-manifest";
import type { MapEditorBuildPrimitiveCatalogEntry } from "@/engine-tool/build/map-editor-build-primitives";
import { readMapEditorBuildPrimitiveCatalogEntry } from "@/engine-tool/build/map-editor-build-primitives";

export interface MapEditorBuildPlacementPositionSnapshot {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface MapEditorBuildRectangleSnapshot {
  readonly center: MapEditorBuildPlacementPositionSnapshot;
  readonly size: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
}

export interface MapEditorBuildWallSegmentSnapshot {
  readonly center: MapEditorBuildPlacementPositionSnapshot;
  readonly end: MapEditorBuildPlacementPositionSnapshot;
  readonly lengthMeters: number;
  readonly rotationYRadians: number;
  readonly start: MapEditorBuildPlacementPositionSnapshot;
}

export const mapEditorBuildGridUnitMeters = 4;

export function snapMapEditorBuildCoordinateToGrid(value: number): number {
  return Math.round(value / mapEditorBuildGridUnitMeters) * mapEditorBuildGridUnitMeters;
}

export function snapMapEditorBuildCoordinateToCellCenter(value: number): number {
  return (
    Math.floor(value / mapEditorBuildGridUnitMeters) *
      mapEditorBuildGridUnitMeters +
    mapEditorBuildGridUnitMeters * 0.5
  );
}

export function snapMapEditorBuildCoordinateToFootprintCenter(
  value: number,
  footprintCells: number
): number {
  const normalizedFootprintCells = Math.max(1, Math.round(footprintCells));

  return normalizedFootprintCells % 2 === 0
    ? snapMapEditorBuildCoordinateToGrid(value)
    : snapMapEditorBuildCoordinateToCellCenter(value);
}

export function resolveMapEditorBuildFootprintCellsFromSizeMeters(
  sizeMeters: number
): number {
  return Math.max(1, Math.round(sizeMeters / mapEditorBuildGridUnitMeters));
}

export function resolveMapEditorBuildGroundPosition(
  point: MapEditorBuildPlacementPositionSnapshot,
  elevationMeters = 0
): MapEditorBuildPlacementPositionSnapshot {
  return Object.freeze({
    x: snapMapEditorBuildCoordinateToGrid(point.x),
    y: elevationMeters,
    z: snapMapEditorBuildCoordinateToGrid(point.z)
  });
}

export function resolveMapEditorBuildCellCenterPosition(
  point: MapEditorBuildPlacementPositionSnapshot,
  elevationMeters = 0
): MapEditorBuildPlacementPositionSnapshot {
  return Object.freeze({
    x: snapMapEditorBuildCoordinateToCellCenter(point.x),
    y: elevationMeters,
    z: snapMapEditorBuildCoordinateToCellCenter(point.z)
  });
}

export function resolveMapEditorBuildFootprintCenterPosition(
  point: MapEditorBuildPlacementPositionSnapshot,
  elevationMeters = 0,
  footprintCellsX = 1,
  footprintCellsZ = 1
): MapEditorBuildPlacementPositionSnapshot {
  return Object.freeze({
    x: snapMapEditorBuildCoordinateToFootprintCenter(point.x, footprintCellsX),
    y: elevationMeters,
    z: snapMapEditorBuildCoordinateToFootprintCenter(point.z, footprintCellsZ)
  });
}

export function resolveMapEditorBuildSizedCenterPosition(
  point: MapEditorBuildPlacementPositionSnapshot,
  elevationMeters = 0,
  sizeMetersX = mapEditorBuildGridUnitMeters,
  sizeMetersZ = mapEditorBuildGridUnitMeters
): MapEditorBuildPlacementPositionSnapshot {
  return resolveMapEditorBuildFootprintCenterPosition(
    point,
    elevationMeters,
    resolveMapEditorBuildFootprintCellsFromSizeMeters(sizeMetersX),
    resolveMapEditorBuildFootprintCellsFromSizeMeters(sizeMetersZ)
  );
}

function resolveMapEditorBuildAssetFootprintSize(
  asset: EnvironmentAssetDescriptor
): {
  readonly x: number;
  readonly z: number;
} | null {
  const buildPrimitiveEntry = readMapEditorBuildPrimitiveCatalogEntry(asset.id);

  if (buildPrimitiveEntry !== null) {
    return Object.freeze({
      x: buildPrimitiveEntry.footprint.x,
      z: buildPrimitiveEntry.footprint.z
    });
  }

  const defaultRenderLod =
    asset.renderModel.lods.find(
      (lodDescriptor) => lodDescriptor.tier === asset.renderModel.defaultTier
    ) ??
    asset.renderModel.lods[0] ??
    null;

  if (
    defaultRenderLod !== null &&
    "kind" in defaultRenderLod &&
    defaultRenderLod.kind === "procedural-box"
  ) {
    return Object.freeze({
      x: defaultRenderLod.size.x,
      z: defaultRenderLod.size.z
    });
  }

  let maxHalfExtentX = 0;
  let maxHalfExtentZ = 0;

  for (const colliderDescriptor of [
    ...(asset.collider === null ? [] : [asset.collider]),
    ...(asset.physicsColliders ?? [])
  ]) {
    maxHalfExtentX = Math.max(
      maxHalfExtentX,
      Math.abs(colliderDescriptor.center.x) + colliderDescriptor.size.x * 0.5
    );
    maxHalfExtentZ = Math.max(
      maxHalfExtentZ,
      Math.abs(colliderDescriptor.center.z) + colliderDescriptor.size.z * 0.5
    );
  }

  return maxHalfExtentX > 0 || maxHalfExtentZ > 0
    ? Object.freeze({
        x: Math.max(mapEditorBuildGridUnitMeters, maxHalfExtentX * 2),
        z: Math.max(mapEditorBuildGridUnitMeters, maxHalfExtentZ * 2)
      })
    : null;
}

export function resolveMapEditorBuildAssetPlacementPosition(
  point: MapEditorBuildPlacementPositionSnapshot,
  asset: EnvironmentAssetDescriptor,
  elevationMeters = 0
): MapEditorBuildPlacementPositionSnapshot {
  const footprintSize = resolveMapEditorBuildAssetFootprintSize(asset);

  return footprintSize === null
    ? resolveMapEditorBuildGroundPosition(point, elevationMeters)
    : resolveMapEditorBuildSizedCenterPosition(
        point,
        elevationMeters,
        footprintSize.x,
        footprintSize.z
      );
}

export function resolveMapEditorBuildGroundPlacementPosition(
  point: MapEditorBuildPlacementPositionSnapshot,
  primitive: MapEditorBuildPrimitiveCatalogEntry
): MapEditorBuildPlacementPositionSnapshot {
  return resolveMapEditorBuildFootprintCenterPosition(
    point,
    0,
    Math.max(1, Math.round(primitive.footprint.x / mapEditorBuildGridUnitMeters)),
    Math.max(1, Math.round(primitive.footprint.z / mapEditorBuildGridUnitMeters))
  );
}

export function resolveMapEditorBuildRectangleFromGridPoints(
  startPoint: MapEditorBuildPlacementPositionSnapshot,
  endPoint: MapEditorBuildPlacementPositionSnapshot,
  heightMeters: number
): MapEditorBuildRectangleSnapshot {
  const start = resolveMapEditorBuildCellCenterPosition(startPoint, startPoint.y);
  const end = resolveMapEditorBuildCellCenterPosition(endPoint, start.y);
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minZ = Math.min(start.z, end.z);
  const maxZ = Math.max(start.z, end.z);

  return Object.freeze({
    center: Object.freeze({
      x: (minX + maxX) * 0.5,
      y: start.y,
      z: (minZ + maxZ) * 0.5
    }),
    size: Object.freeze({
      x: Math.max(mapEditorBuildGridUnitMeters, maxX - minX + mapEditorBuildGridUnitMeters),
      y: Math.max(0.01, heightMeters),
      z: Math.max(mapEditorBuildGridUnitMeters, maxZ - minZ + mapEditorBuildGridUnitMeters)
    })
  });
}

export function resolveMapEditorBuildWallSegmentEnd(
  startPoint: MapEditorBuildPlacementPositionSnapshot,
  hoverPoint: MapEditorBuildPlacementPositionSnapshot
): MapEditorBuildPlacementPositionSnapshot {
  return resolveMapEditorBuildGroundPosition(hoverPoint, startPoint.y);
}

export function resolveMapEditorBuildWallSegment(
  startPoint: MapEditorBuildPlacementPositionSnapshot,
  endPoint: MapEditorBuildPlacementPositionSnapshot
): MapEditorBuildWallSegmentSnapshot | null {
  const start = resolveMapEditorBuildGroundPosition(startPoint, startPoint.y);
  const end = resolveMapEditorBuildWallSegmentEnd(start, endPoint);
  const deltaX = end.x - start.x;
  const deltaZ = end.z - start.z;
  const lengthMeters = Math.hypot(deltaX, deltaZ);

  if (lengthMeters < mapEditorBuildGridUnitMeters * 0.5) {
    return null;
  }

  return Object.freeze({
    center: Object.freeze({
      x: (start.x + end.x) * 0.5,
      y: start.y,
      z: (start.z + end.z) * 0.5
    }),
    end,
    lengthMeters,
    rotationYRadians: Math.atan2(deltaX, deltaZ) - Math.PI * 0.5,
    start
  });
}

export function resolveMapEditorBuildPathAnchorPosition(
  point: MapEditorBuildPlacementPositionSnapshot,
  elevationMeters = 0,
  widthCells = 1
): MapEditorBuildPlacementPositionSnapshot {
  return resolveMapEditorBuildFootprintCenterPosition(
    point,
    elevationMeters,
    widthCells,
    widthCells
  );
}

export function resolveMapEditorBuildPathSegmentEnd(
  startPoint: MapEditorBuildPlacementPositionSnapshot,
  hoverPoint: MapEditorBuildPlacementPositionSnapshot,
  widthCells = 1
): MapEditorBuildPlacementPositionSnapshot {
  return resolveMapEditorBuildPathAnchorPosition(
    hoverPoint,
    startPoint.y,
    widthCells
  );
}

export function resolveMapEditorBuildPathSlopeSegmentEnd(
  startPoint: MapEditorBuildPlacementPositionSnapshot,
  lengthCells: number,
  rotationDegrees: number
): MapEditorBuildPlacementPositionSnapshot {
  const normalizedLengthCells = Math.max(1, Math.round(lengthCells));
  const rotationRadians = (rotationDegrees * Math.PI) / 180;
  const segmentLengthMeters =
    normalizedLengthCells * mapEditorBuildGridUnitMeters;

  return Object.freeze({
    x: startPoint.x + Math.sin(rotationRadians) * segmentLengthMeters,
    y: startPoint.y,
    z: startPoint.z + Math.cos(rotationRadians) * segmentLengthMeters
  });
}

export function resolveMapEditorBuildPathDirectedSlopeSegmentEnd(
  startPoint: MapEditorBuildPlacementPositionSnapshot,
  hoverPoint: MapEditorBuildPlacementPositionSnapshot,
  lengthCells: number,
  fallbackRotationDegrees: number
): MapEditorBuildPlacementPositionSnapshot {
  const normalizedLengthCells = Math.max(1, Math.round(lengthCells));
  const segmentLengthMeters =
    normalizedLengthCells * mapEditorBuildGridUnitMeters;
  const deltaX = hoverPoint.x - startPoint.x;
  const deltaZ = hoverPoint.z - startPoint.z;
  const distanceMeters = Math.hypot(deltaX, deltaZ);

  if (distanceMeters <= 0.01) {
    return resolveMapEditorBuildPathSlopeSegmentEnd(
      startPoint,
      normalizedLengthCells,
      fallbackRotationDegrees
    );
  }

  return Object.freeze({
    x: startPoint.x + (deltaX / distanceMeters) * segmentLengthMeters,
    y: startPoint.y,
    z: startPoint.z + (deltaZ / distanceMeters) * segmentLengthMeters
  });
}
