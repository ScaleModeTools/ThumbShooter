import type {
  MetaverseMapBundleSemanticConnectorSnapshot,
  MetaverseMapBundleSemanticEdgeSnapshot,
  MetaverseMapBundleSemanticPlanarLoopSnapshot,
  MetaverseMapBundleSemanticRegionSnapshot,
  MetaverseMapBundleSemanticSurfaceSnapshot,
  MetaverseMapBundleSemanticTerrainChunkSnapshot,
  MetaverseMapBundleSemanticWorldSnapshot,
  MetaverseWorldSurfaceVector3Snapshot
} from "@webgpu-metaverse/shared/metaverse/world";

export interface MapEditorTerrainChunkDraftSnapshot {
  readonly chunkId: string;
  readonly heights: readonly number[];
  readonly label: string;
  readonly origin: MetaverseWorldSurfaceVector3Snapshot;
  readonly sampleCountX: number;
  readonly sampleCountZ: number;
  readonly sampleStrideMeters: number;
  readonly waterLevelMeters: number | null;
}

export interface MapEditorSurfaceDraftSnapshot {
  readonly center: MetaverseWorldSurfaceVector3Snapshot;
  readonly elevation: number;
  readonly kind: "flat-slab" | "terrain-patch";
  readonly label: string;
  readonly rotationYRadians: number;
  readonly size: MetaverseWorldSurfaceVector3Snapshot;
  readonly surfaceId: string;
  readonly terrainChunkId: string | null;
}

export interface MapEditorRegionDraftSnapshot {
  readonly center: MetaverseWorldSurfaceVector3Snapshot;
  readonly label: string;
  readonly materialReferenceId: string | null;
  readonly regionId: string;
  readonly regionKind: "arena" | "floor" | "path";
  readonly rotationYRadians: number;
  readonly size: MetaverseWorldSurfaceVector3Snapshot;
  readonly surfaceId: string;
}

export interface MapEditorEdgeDraftSnapshot {
  readonly center: MetaverseWorldSurfaceVector3Snapshot;
  readonly edgeId: string;
  readonly edgeKind:
    | "curb"
    | "fence"
    | "rail"
    | "retaining-wall"
    | "wall";
  readonly heightMeters: number;
  readonly label: string;
  readonly lengthMeters: number;
  readonly rotationYRadians: number;
  readonly surfaceId: string;
  readonly thicknessMeters: number;
}

export interface MapEditorConnectorDraftSnapshot {
  readonly center: MetaverseWorldSurfaceVector3Snapshot;
  readonly connectorId: string;
  readonly connectorKind: "door" | "gate" | "ramp" | "stairs";
  readonly fromSurfaceId: string;
  readonly label: string;
  readonly rotationYRadians: number;
  readonly size: MetaverseWorldSurfaceVector3Snapshot;
  readonly toSurfaceId: string;
}

function freezeVector3(
  vector: MetaverseWorldSurfaceVector3Snapshot
): MetaverseWorldSurfaceVector3Snapshot {
  return Object.freeze({
    x: vector.x,
    y: vector.y,
    z: vector.z
  });
}

function resolveLoopBounds(
  loop: MetaverseMapBundleSemanticPlanarLoopSnapshot
): {
  readonly size: MetaverseWorldSurfaceVector3Snapshot;
} {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const point of loop.points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minZ)) {
    return Object.freeze({
      size: Object.freeze({
        x: 4,
        y: 0.5,
        z: 4
      })
    });
  }

  return Object.freeze({
    size: Object.freeze({
      x: Math.max(0.5, maxX - minX),
      y: 0.5,
      z: Math.max(0.5, maxZ - minZ)
    })
  });
}

function freezeTerrainChunkDraft(
  draft: MapEditorTerrainChunkDraftSnapshot
): MapEditorTerrainChunkDraftSnapshot {
  return Object.freeze({
    ...draft,
    heights: Object.freeze([...draft.heights]),
    origin: freezeVector3(draft.origin)
  });
}

export function freezeSurfaceDraft(
  draft: MapEditorSurfaceDraftSnapshot
): MapEditorSurfaceDraftSnapshot {
  return Object.freeze({
    ...draft,
    center: freezeVector3(draft.center),
    size: freezeVector3(draft.size)
  });
}

export function freezeRegionDraft(
  draft: MapEditorRegionDraftSnapshot
): MapEditorRegionDraftSnapshot {
  return Object.freeze({
    ...draft,
    center: freezeVector3(draft.center),
    size: freezeVector3(draft.size)
  });
}

export function freezeEdgeDraft(
  draft: MapEditorEdgeDraftSnapshot
): MapEditorEdgeDraftSnapshot {
  return Object.freeze({
    ...draft,
    center: freezeVector3(draft.center)
  });
}

export function freezeConnectorDraft(
  draft: MapEditorConnectorDraftSnapshot
): MapEditorConnectorDraftSnapshot {
  return Object.freeze({
    ...draft,
    center: freezeVector3(draft.center),
    size: freezeVector3(draft.size)
  });
}

export function createMapEditorTerrainChunkDrafts(
  semanticWorld: MetaverseMapBundleSemanticWorldSnapshot
): readonly MapEditorTerrainChunkDraftSnapshot[] {
  return Object.freeze(
    semanticWorld.terrainChunks.map((terrainChunk) =>
      freezeTerrainChunkDraft({
        chunkId: terrainChunk.chunkId,
        heights: terrainChunk.heights,
        label: terrainChunk.chunkId,
        origin: terrainChunk.origin,
        sampleCountX: terrainChunk.sampleCountX,
        sampleCountZ: terrainChunk.sampleCountZ,
        sampleStrideMeters: terrainChunk.sampleStrideMeters,
        waterLevelMeters: terrainChunk.waterLevelMeters
      })
    )
  );
}

export function createMapEditorSurfaceDrafts(
  semanticWorld: MetaverseMapBundleSemanticWorldSnapshot
): readonly MapEditorSurfaceDraftSnapshot[] {
  return Object.freeze(
    semanticWorld.surfaces.map((surface) =>
      freezeSurfaceDraft({
        center: surface.center,
        elevation: surface.elevation,
        kind: surface.kind,
        label: surface.label,
        rotationYRadians: surface.rotationYRadians,
        size: surface.size,
        surfaceId: surface.surfaceId,
        terrainChunkId: surface.terrainChunkId
      })
    )
  );
}

export function createMapEditorRegionDrafts(
  semanticWorld: MetaverseMapBundleSemanticWorldSnapshot,
  surfaces: readonly MapEditorSurfaceDraftSnapshot[]
): readonly MapEditorRegionDraftSnapshot[] {
  const surfacesById = new Map(surfaces.map((surface) => [surface.surfaceId, surface]));

  return Object.freeze(
    semanticWorld.regions.map((region) => {
      const surface = surfacesById.get(region.surfaceId) ?? null;
      const bounds = resolveLoopBounds(region.outerLoop);

      return freezeRegionDraft({
        center:
          surface === null
            ? Object.freeze({
                x: 0,
                y: 0,
                z: 0
              })
            : surface.center,
        label: region.label,
        materialReferenceId: region.materialReferenceId,
        regionId: region.regionId,
        regionKind: region.regionKind,
        rotationYRadians: surface?.rotationYRadians ?? 0,
        size: bounds.size,
        surfaceId: region.surfaceId
      });
    })
  );
}

export function createMapEditorEdgeDrafts(
  semanticWorld: MetaverseMapBundleSemanticWorldSnapshot,
  surfaces: readonly MapEditorSurfaceDraftSnapshot[]
): readonly MapEditorEdgeDraftSnapshot[] {
  const surfacesById = new Map(surfaces.map((surface) => [surface.surfaceId, surface]));

  return Object.freeze(
    semanticWorld.edges.map((edge) => {
      const surface = surfacesById.get(edge.surfaceId) ?? null;
      const startPoint = edge.path[0] ?? Object.freeze({ x: -2, z: 0 });
      const endPoint = edge.path[edge.path.length - 1] ?? Object.freeze({ x: 2, z: 0 });
      const centerOffset = Object.freeze({
        x: (startPoint.x + endPoint.x) * 0.5,
        z: (startPoint.z + endPoint.z) * 0.5
      });

      return freezeEdgeDraft({
        center:
          surface === null
            ? Object.freeze({
                x: centerOffset.x,
                y: edge.heightMeters * 0.5,
                z: centerOffset.z
              })
            : Object.freeze({
                x: surface.center.x + centerOffset.x,
                y: surface.elevation + edge.heightMeters * 0.5,
                z: surface.center.z + centerOffset.z
              }),
        edgeId: edge.edgeId,
        edgeKind: edge.edgeKind,
        heightMeters: edge.heightMeters,
        label: edge.label,
        lengthMeters: Math.max(
          0.5,
          Math.hypot(endPoint.x - startPoint.x, endPoint.z - startPoint.z)
        ),
        rotationYRadians: surface?.rotationYRadians ?? 0,
        surfaceId: edge.surfaceId,
        thicknessMeters: edge.thicknessMeters
      });
    })
  );
}

export function createMapEditorConnectorDrafts(
  semanticWorld: MetaverseMapBundleSemanticWorldSnapshot
): readonly MapEditorConnectorDraftSnapshot[] {
  return Object.freeze(
    semanticWorld.connectors.map((connector) =>
      freezeConnectorDraft({
        center: connector.center,
        connectorId: connector.connectorId,
        connectorKind: connector.connectorKind,
        fromSurfaceId: connector.fromSurfaceId,
        label: connector.label,
        rotationYRadians: connector.rotationYRadians,
        size: connector.size,
        toSurfaceId: connector.toSurfaceId
      })
    )
  );
}

export function createSemanticSurfaceSnapshotFromDraft(
  draft: MapEditorSurfaceDraftSnapshot
): MetaverseMapBundleSemanticSurfaceSnapshot {
  return Object.freeze({
    center: freezeVector3(draft.center),
    elevation: draft.elevation,
    kind: draft.kind,
    label: draft.label,
    rotationYRadians: draft.rotationYRadians,
    size: freezeVector3(draft.size),
    surfaceId: draft.surfaceId,
    terrainChunkId: draft.terrainChunkId
  });
}

function createRectangularLoop(
  size: MetaverseWorldSurfaceVector3Snapshot
): MetaverseMapBundleSemanticPlanarLoopSnapshot {
  return Object.freeze({
    points: Object.freeze([
      Object.freeze({
        x: -size.x * 0.5,
        z: -size.z * 0.5
      }),
      Object.freeze({
        x: size.x * 0.5,
        z: -size.z * 0.5
      }),
      Object.freeze({
        x: size.x * 0.5,
        z: size.z * 0.5
      }),
      Object.freeze({
        x: -size.x * 0.5,
        z: size.z * 0.5
      })
    ])
  });
}

export function createSemanticRegionSnapshotFromDraft(
  draft: MapEditorRegionDraftSnapshot
): MetaverseMapBundleSemanticRegionSnapshot {
  return Object.freeze({
    holes: Object.freeze([]),
    label: draft.label,
    materialReferenceId: draft.materialReferenceId,
    outerLoop: createRectangularLoop(draft.size),
    regionId: draft.regionId,
    regionKind: draft.regionKind,
    surfaceId: draft.surfaceId
  });
}

export function createSemanticEdgeSnapshotFromDraft(
  draft: MapEditorEdgeDraftSnapshot
): MetaverseMapBundleSemanticEdgeSnapshot {
  return Object.freeze({
    edgeId: draft.edgeId,
    edgeKind: draft.edgeKind,
    heightMeters: draft.heightMeters,
    label: draft.label,
    path: Object.freeze([
      Object.freeze({
        x: -draft.lengthMeters * 0.5,
        z: 0
      }),
      Object.freeze({
        x: draft.lengthMeters * 0.5,
        z: 0
      })
    ]),
    surfaceId: draft.surfaceId,
    thicknessMeters: draft.thicknessMeters
  });
}

export function createSemanticConnectorSnapshotFromDraft(
  draft: MapEditorConnectorDraftSnapshot
): MetaverseMapBundleSemanticConnectorSnapshot {
  return Object.freeze({
    center: freezeVector3(draft.center),
    connectorId: draft.connectorId,
    connectorKind: draft.connectorKind,
    fromSurfaceId: draft.fromSurfaceId,
    label: draft.label,
    rotationYRadians: draft.rotationYRadians,
    size: freezeVector3(draft.size),
    toSurfaceId: draft.toSurfaceId
  });
}

export function createSemanticTerrainChunkSnapshotFromDraft(
  draft: MapEditorTerrainChunkDraftSnapshot
): MetaverseMapBundleSemanticTerrainChunkSnapshot {
  return Object.freeze({
    chunkId: draft.chunkId,
    heights: Object.freeze([...draft.heights]),
    origin: freezeVector3(draft.origin),
    sampleCountX: draft.sampleCountX,
    sampleCountZ: draft.sampleCountZ,
    sampleStrideMeters: draft.sampleStrideMeters,
    waterLevelMeters: draft.waterLevelMeters
  });
}
