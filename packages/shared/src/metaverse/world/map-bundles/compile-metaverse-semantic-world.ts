import {
  resolveMetaverseWorldSurfaceScaleVector,
  type MetaverseWorldSurfaceScaleSnapshot,
  type MetaverseWorldSurfaceVector3Snapshot
} from "../../metaverse-world-surface-query.js";

import type {
  MetaverseMapBundleCompiledCollisionBoxSnapshot,
  MetaverseMapBundleCompiledWorldChunkBoundsSnapshot,
  MetaverseMapBundleCompiledWorldChunkSnapshot,
  MetaverseMapBundleCompiledWorldSnapshot,
  MetaverseMapBundleEnvironmentAssetSnapshot,
  MetaverseMapBundlePlacementSnapshot,
  MetaverseMapBundleSemanticConnectorSnapshot,
  MetaverseMapBundleSemanticEdgeSnapshot,
  MetaverseMapBundleSemanticModuleSnapshot,
  MetaverseMapBundleSemanticPlanarPointSnapshot,
  MetaverseMapBundleSemanticRegionSnapshot,
  MetaverseMapBundleSemanticSurfaceSnapshot,
  MetaverseMapBundleSemanticTerrainChunkSnapshot,
  MetaverseMapBundleSemanticWorldSnapshot
} from "./metaverse-map-bundle.js";

const defaultCompiledChunkSizeMeters = 24;
const semanticFloorFootprint = Object.freeze({
  x: 4,
  y: 0.5,
  z: 4
});
const semanticWallFootprint = Object.freeze({
  x: 4,
  y: 4,
  z: 0.5
});
const semanticConnectorFootprint = Object.freeze({
  x: 4,
  y: 1,
  z: 4
});

function freezeVector3(
  x: number,
  y: number,
  z: number
): MetaverseWorldSurfaceVector3Snapshot {
  return Object.freeze({ x, y, z });
}

function freezePlacementScale(
  scale: MetaverseWorldSurfaceScaleSnapshot
): MetaverseWorldSurfaceVector3Snapshot {
  const resolved = resolveMetaverseWorldSurfaceScaleVector(scale);

  return Object.freeze({
    x: Math.max(0.1, resolved.x),
    y: Math.max(0.1, resolved.y),
    z: Math.max(0.1, resolved.z)
  });
}

function createEnvironmentPlacement(
  placementId: string,
  position: MetaverseWorldSurfaceVector3Snapshot,
  rotationYRadians: number,
  scale: MetaverseWorldSurfaceScaleSnapshot,
  notes = "",
  materialReferenceId: string | null = null
): MetaverseMapBundlePlacementSnapshot {
  return Object.freeze({
    collisionEnabled: true,
    isVisible: true,
    materialReferenceId,
    notes,
    placementId,
    position: freezeVector3(position.x, position.y, position.z),
    rotationYRadians,
    scale: freezePlacementScale(scale)
  });
}

function ensureEnvironmentAssetGroup(
  environmentAssetsById: Map<string, MetaverseMapBundleEnvironmentAssetSnapshot>,
  seed: Omit<MetaverseMapBundleEnvironmentAssetSnapshot, "placements">,
  placements: readonly MetaverseMapBundlePlacementSnapshot[]
): void {
  const existingAsset = environmentAssetsById.get(seed.assetId) ?? null;

  if (existingAsset === null) {
    environmentAssetsById.set(
      seed.assetId,
      Object.freeze({
        ...seed,
        placements: Object.freeze([...placements])
      })
    );
    return;
  }

  environmentAssetsById.set(
    seed.assetId,
    Object.freeze({
      ...existingAsset,
      placements: Object.freeze([...existingAsset.placements, ...placements])
    })
  );
}

function resolveChunkIndex(value: number, chunkSizeMeters: number): number {
  return Math.floor(value / chunkSizeMeters);
}

function createChunkId(
  x: number,
  z: number,
  chunkSizeMeters: number
): string {
  return `chunk:${resolveChunkIndex(x, chunkSizeMeters)}:${resolveChunkIndex(
    z,
    chunkSizeMeters
  )}`;
}

function resolveChunkCenterFromId(
  chunkId: string,
  chunkSizeMeters: number
): MetaverseWorldSurfaceVector3Snapshot {
  const [, rawX = "0", rawZ = "0"] = chunkId.split(":");
  const chunkX = Number.parseInt(rawX, 10) || 0;
  const chunkZ = Number.parseInt(rawZ, 10) || 0;

  return freezeVector3(
    (chunkX + 0.5) * chunkSizeMeters,
    0,
    (chunkZ + 0.5) * chunkSizeMeters
  );
}

function createChunkBounds(
  chunkId: string,
  chunkSizeMeters: number
): MetaverseMapBundleCompiledWorldChunkBoundsSnapshot {
  return Object.freeze({
    center: resolveChunkCenterFromId(chunkId, chunkSizeMeters),
    size: freezeVector3(chunkSizeMeters, chunkSizeMeters, chunkSizeMeters)
  });
}

function applyYawToPlanarPoint(
  point: MetaverseMapBundleSemanticPlanarPointSnapshot,
  yawRadians: number
): MetaverseMapBundleSemanticPlanarPointSnapshot {
  const sine = Math.sin(yawRadians);
  const cosine = Math.cos(yawRadians);

  return Object.freeze({
    x: point.x * cosine + point.z * sine,
    z: -point.x * sine + point.z * cosine
  });
}

function resolveLoopBounds(
  region: MetaverseMapBundleSemanticRegionSnapshot,
  surface: MetaverseMapBundleSemanticSurfaceSnapshot
): {
  readonly center: MetaverseWorldSurfaceVector3Snapshot;
  readonly size: MetaverseWorldSurfaceVector3Snapshot;
} {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const point of region.outerLoop.points) {
    const worldPoint = applyYawToPlanarPoint(point, surface.rotationYRadians);

    minX = Math.min(minX, surface.center.x + worldPoint.x);
    maxX = Math.max(maxX, surface.center.x + worldPoint.x);
    minZ = Math.min(minZ, surface.center.z + worldPoint.z);
    maxZ = Math.max(maxZ, surface.center.z + worldPoint.z);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minZ)) {
    return Object.freeze({
      center: freezeVector3(surface.center.x, surface.elevation, surface.center.z),
      size: freezeVector3(surface.size.x, Math.max(0.5, surface.size.y), surface.size.z)
    });
  }

  return Object.freeze({
    center: freezeVector3(
      (minX + maxX) * 0.5,
      surface.elevation,
      (minZ + maxZ) * 0.5
    ),
    size: freezeVector3(
      Math.max(0.5, maxX - minX),
      Math.max(0.5, surface.size.y),
      Math.max(0.5, maxZ - minZ)
    )
  });
}

function resolveEdgeBounds(
  edge: MetaverseMapBundleSemanticEdgeSnapshot,
  surface: MetaverseMapBundleSemanticSurfaceSnapshot
): {
  readonly center: MetaverseWorldSurfaceVector3Snapshot;
  readonly lengthMeters: number;
  readonly rotationYRadians: number;
} {
  const startPoint = edge.path[0] ?? Object.freeze({ x: -2, z: 0 });
  const endPoint = edge.path[edge.path.length - 1] ?? Object.freeze({ x: 2, z: 0 });
  const deltaX = endPoint.x - startPoint.x;
  const deltaZ = endPoint.z - startPoint.z;
  const midPoint = Object.freeze({
    x: (startPoint.x + endPoint.x) * 0.5,
    z: (startPoint.z + endPoint.z) * 0.5
  });
  const worldMidPoint = applyYawToPlanarPoint(midPoint, surface.rotationYRadians);

  return Object.freeze({
    center: freezeVector3(
      surface.center.x + worldMidPoint.x,
      surface.elevation + edge.heightMeters * 0.5,
      surface.center.z + worldMidPoint.z
    ),
    lengthMeters: Math.max(0.5, Math.hypot(deltaX, deltaZ)),
    rotationYRadians:
      surface.rotationYRadians + Math.atan2(deltaX, deltaZ) - Math.PI * 0.5
  });
}

function createCollisionBoxSnapshot(
  ownerId: string,
  ownerKind: MetaverseMapBundleCompiledCollisionBoxSnapshot["ownerKind"],
  center: MetaverseWorldSurfaceVector3Snapshot,
  size: MetaverseWorldSurfaceVector3Snapshot,
  rotationYRadians: number,
  traversalAffordance: MetaverseMapBundleCompiledCollisionBoxSnapshot["traversalAffordance"]
): MetaverseMapBundleCompiledCollisionBoxSnapshot {
  return Object.freeze({
    center,
    ownerId,
    ownerKind,
    rotationYRadians,
    size,
    traversalAffordance
  });
}

function buildRegionCompatibilityPlacements(
  region: MetaverseMapBundleSemanticRegionSnapshot,
  surface: MetaverseMapBundleSemanticSurfaceSnapshot,
  compatibilityAssetId: string | null
): {
  readonly collisionBoxes: readonly MetaverseMapBundleCompiledCollisionBoxSnapshot[];
  readonly environmentAsset: MetaverseMapBundleEnvironmentAssetSnapshot | null;
  readonly chunkId: string;
} {
  const bounds = resolveLoopBounds(region, surface);
  const placementScale = Object.freeze({
    x: Math.max(0.25, bounds.size.x / semanticFloorFootprint.x),
    y: 1,
    z: Math.max(0.25, bounds.size.z / semanticFloorFootprint.z)
  });
  const chunkId = createChunkId(
    bounds.center.x,
    bounds.center.z,
    defaultCompiledChunkSizeMeters
  );

  if (compatibilityAssetId === null) {
    return Object.freeze({
      chunkId,
      collisionBoxes: Object.freeze([
        createCollisionBoxSnapshot(
          region.regionId,
          "region",
          bounds.center,
          freezeVector3(bounds.size.x, 0.5, bounds.size.z),
          surface.rotationYRadians,
          "support"
        )
      ]),
      environmentAsset: null
    });
  }

  return Object.freeze({
    chunkId,
    collisionBoxes: Object.freeze([
      createCollisionBoxSnapshot(
        region.regionId,
        "region",
        bounds.center,
        freezeVector3(bounds.size.x, 0.5, bounds.size.z),
        surface.rotationYRadians,
        "support"
      )
    ]),
    environmentAsset: Object.freeze({
      assetId: compatibilityAssetId,
      collisionPath: null,
      collider: null,
      dynamicBody: null,
      entries: null,
      placementMode: "instanced",
      placements: Object.freeze([
        createEnvironmentPlacement(
          `region:${region.regionId}`,
          bounds.center,
          surface.rotationYRadians,
          placementScale,
          "",
          region.materialReferenceId
        )
      ]),
      seats: null,
      surfaceColliders: Object.freeze([
        Object.freeze({
          center: freezeVector3(0, semanticFloorFootprint.y * 0.5, 0),
          size: freezeVector3(
            semanticFloorFootprint.x,
            semanticFloorFootprint.y,
            semanticFloorFootprint.z
          ),
          traversalAffordance: "support"
        })
      ]),
      traversalAffordance: "support"
    })
  });
}

function buildEdgeCompatibilityPlacements(
  edge: MetaverseMapBundleSemanticEdgeSnapshot,
  surface: MetaverseMapBundleSemanticSurfaceSnapshot,
  compatibilityAssetId: string | null
): {
  readonly collisionBoxes: readonly MetaverseMapBundleCompiledCollisionBoxSnapshot[];
  readonly environmentAsset: MetaverseMapBundleEnvironmentAssetSnapshot | null;
  readonly chunkId: string;
} {
  const bounds = resolveEdgeBounds(edge, surface);
  const placementScale = Object.freeze({
    x: Math.max(0.25, bounds.lengthMeters / semanticWallFootprint.x),
    y: Math.max(0.25, edge.heightMeters / semanticWallFootprint.y),
    z: Math.max(0.25, edge.thicknessMeters / semanticWallFootprint.z)
  });
  const chunkId = createChunkId(
    bounds.center.x,
    bounds.center.z,
    defaultCompiledChunkSizeMeters
  );

  if (compatibilityAssetId === null) {
    return Object.freeze({
      chunkId,
      collisionBoxes: Object.freeze([
        createCollisionBoxSnapshot(
          edge.edgeId,
          "edge",
          bounds.center,
          freezeVector3(
            bounds.lengthMeters,
            Math.max(0.5, edge.heightMeters),
            Math.max(0.25, edge.thicknessMeters)
          ),
          bounds.rotationYRadians,
          edge.edgeKind === "curb" || edge.edgeKind === "rail"
            ? "support"
            : "blocker"
        )
      ]),
      environmentAsset: null
    });
  }

  return Object.freeze({
    chunkId,
    collisionBoxes: Object.freeze([
      createCollisionBoxSnapshot(
        edge.edgeId,
        "edge",
        bounds.center,
        freezeVector3(
          bounds.lengthMeters,
          Math.max(0.5, edge.heightMeters),
          Math.max(0.25, edge.thicknessMeters)
        ),
        bounds.rotationYRadians,
        edge.edgeKind === "curb" || edge.edgeKind === "rail"
          ? "support"
          : "blocker"
      )
    ]),
    environmentAsset: Object.freeze({
      assetId: compatibilityAssetId,
      collisionPath: null,
      collider: null,
      dynamicBody: null,
      entries: null,
      placementMode: "instanced",
      placements: Object.freeze([
        createEnvironmentPlacement(
          `edge:${edge.edgeId}`,
          bounds.center,
          bounds.rotationYRadians,
          placementScale
        )
      ]),
      seats: null,
      surfaceColliders: Object.freeze([
        Object.freeze({
          center: freezeVector3(0, semanticWallFootprint.y * 0.5, 0),
          size: freezeVector3(
            semanticWallFootprint.x,
            semanticWallFootprint.y,
            semanticWallFootprint.z
          ),
          traversalAffordance: "support"
        })
      ]),
      traversalAffordance: "support"
    })
  });
}

function buildConnectorCompatibilityPlacements(
  connector: MetaverseMapBundleSemanticConnectorSnapshot,
  compatibilityAssetId: string | null
): {
  readonly collisionBoxes: readonly MetaverseMapBundleCompiledCollisionBoxSnapshot[];
  readonly environmentAsset: MetaverseMapBundleEnvironmentAssetSnapshot | null;
  readonly chunkId: string;
} {
  const chunkId = createChunkId(
    connector.center.x,
    connector.center.z,
    defaultCompiledChunkSizeMeters
  );
  const size = freezeVector3(
    Math.max(0.5, connector.size.x),
    Math.max(0.5, connector.size.y),
    Math.max(0.5, connector.size.z)
  );

  if (compatibilityAssetId === null) {
    return Object.freeze({
      chunkId,
      collisionBoxes: Object.freeze([
        createCollisionBoxSnapshot(
          connector.connectorId,
          "connector",
          connector.center,
          size,
          connector.rotationYRadians,
          "support"
        )
      ]),
      environmentAsset: null
    });
  }

  return Object.freeze({
    chunkId,
    collisionBoxes: Object.freeze([
      createCollisionBoxSnapshot(
        connector.connectorId,
        "connector",
        connector.center,
        size,
        connector.rotationYRadians,
        "support"
      )
    ]),
    environmentAsset: Object.freeze({
      assetId: compatibilityAssetId,
      collisionPath: null,
      collider: null,
      dynamicBody: null,
      entries: null,
      placementMode: "instanced",
      placements: Object.freeze([
        createEnvironmentPlacement(
          `connector:${connector.connectorId}`,
          connector.center,
          connector.rotationYRadians,
          Object.freeze({
            x: Math.max(0.25, connector.size.x / semanticConnectorFootprint.x),
            y: Math.max(0.25, connector.size.y / semanticConnectorFootprint.y),
            z: Math.max(0.25, connector.size.z / semanticConnectorFootprint.z)
          })
        )
      ]),
      seats: null,
      surfaceColliders: Object.freeze([
        Object.freeze({
          center: freezeVector3(0, semanticConnectorFootprint.y * 0.5, 0),
          size: freezeVector3(
            semanticConnectorFootprint.x,
            semanticConnectorFootprint.y,
            semanticConnectorFootprint.z
          ),
          traversalAffordance: "support"
        })
      ]),
      traversalAffordance: "support"
    })
  });
}

function buildModuleCompatibilityAsset(
  module: MetaverseMapBundleSemanticModuleSnapshot
): MetaverseMapBundleEnvironmentAssetSnapshot {
  return Object.freeze({
    assetId: module.assetId,
    collisionPath: module.collisionPath,
    collider: module.collider,
    dynamicBody: module.dynamicBody,
    entries: module.entries,
    placementMode: module.placementMode,
    placements: Object.freeze([
      Object.freeze({
        collisionEnabled: module.collisionEnabled,
        isVisible: module.isVisible,
        materialReferenceId: module.materialReferenceId,
        notes: module.notes,
        placementId: module.moduleId,
        position: freezeVector3(
          module.position.x,
          module.position.y,
          module.position.z
        ),
        rotationYRadians: module.rotationYRadians,
        scale: freezePlacementScale(module.scale)
      } satisfies MetaverseMapBundlePlacementSnapshot)
    ]),
    seats: module.seats,
    surfaceColliders: module.surfaceColliders,
    traversalAffordance: module.traversalAffordance
  });
}

interface MutableCompiledChunkRecord {
  readonly chunkId: string;
  readonly collisionBoxes: MetaverseMapBundleCompiledCollisionBoxSnapshot[];
  readonly connectorIds: Set<string>;
  readonly edgeIds: Set<string>;
  readonly instancedModuleAssetIds: Set<string>;
  readonly regionIds: Set<string>;
  readonly surfaceIds: Set<string>;
  readonly terrainChunkIds: Set<string>;
  readonly transparentEntityIds: Set<string>;
}

function ensureChunkRecord(
  chunksById: Map<string, MutableCompiledChunkRecord>,
  chunkId: string
): MutableCompiledChunkRecord {
  const existingRecord = chunksById.get(chunkId);

  if (existingRecord !== undefined) {
    return existingRecord;
  }

  const nextRecord = {
    chunkId,
    collisionBoxes: [],
    connectorIds: new Set<string>(),
    edgeIds: new Set<string>(),
    instancedModuleAssetIds: new Set<string>(),
    regionIds: new Set<string>(),
    surfaceIds: new Set<string>(),
    terrainChunkIds: new Set<string>(),
    transparentEntityIds: new Set<string>()
  } satisfies MutableCompiledChunkRecord;

  chunksById.set(chunkId, nextRecord);

  return nextRecord;
}

export function createDefaultMetaverseMapBundleCompiledWorld(
  environmentAssets: readonly MetaverseMapBundleEnvironmentAssetSnapshot[],
  chunkSizeMeters = defaultCompiledChunkSizeMeters
): MetaverseMapBundleCompiledWorldSnapshot {
  const chunksById = new Map<string, MutableCompiledChunkRecord>();

  for (const environmentAsset of environmentAssets) {
    for (const placement of environmentAsset.placements) {
      const chunkRecord = ensureChunkRecord(
        chunksById,
        createChunkId(placement.position.x, placement.position.z, chunkSizeMeters)
      );

      chunkRecord.instancedModuleAssetIds.add(environmentAsset.assetId);
      for (const collider of environmentAsset.surfaceColliders) {
        chunkRecord.collisionBoxes.push(
          createCollisionBoxSnapshot(
            placement.placementId,
            "module",
            freezeVector3(
              placement.position.x + collider.center.x,
              placement.position.y + collider.center.y,
              placement.position.z + collider.center.z
            ),
            freezeVector3(
              Math.max(0.5, collider.size.x),
              Math.max(0.5, collider.size.y),
              Math.max(0.5, collider.size.z)
            ),
            placement.rotationYRadians,
            collider.traversalAffordance
          )
        );
      }
    }
  }

  return Object.freeze({
    chunkSizeMeters,
    chunks: Object.freeze(
      [...chunksById.values()].map((chunkRecord) =>
        Object.freeze({
          bounds: createChunkBounds(chunkRecord.chunkId, chunkSizeMeters),
          chunkId: chunkRecord.chunkId,
          collision: Object.freeze({
            boxes: Object.freeze([...chunkRecord.collisionBoxes])
          }),
          navigation: Object.freeze({
            connectorIds: Object.freeze([...chunkRecord.connectorIds]),
            regionIds: Object.freeze([...chunkRecord.regionIds]),
            surfaceIds: Object.freeze([...chunkRecord.surfaceIds])
          }),
          render: Object.freeze({
            edgeIds: Object.freeze([...chunkRecord.edgeIds]),
            instancedModuleAssetIds: Object.freeze([
              ...chunkRecord.instancedModuleAssetIds
            ]),
            regionIds: Object.freeze([...chunkRecord.regionIds]),
            terrainChunkIds: Object.freeze([...chunkRecord.terrainChunkIds]),
            transparentEntityIds: Object.freeze([
              ...chunkRecord.transparentEntityIds
            ])
          })
        } satisfies MetaverseMapBundleCompiledWorldChunkSnapshot)
      )
    ),
    compatibilityEnvironmentAssets: Object.freeze([...environmentAssets])
  });
}

export function compileMetaverseMapBundleSemanticWorld(
  semanticWorld: MetaverseMapBundleSemanticWorldSnapshot,
  chunkSizeMeters = defaultCompiledChunkSizeMeters
): MetaverseMapBundleCompiledWorldSnapshot {
  const chunksById = new Map<string, MutableCompiledChunkRecord>();
  const environmentAssetsById = new Map<
    string,
    MetaverseMapBundleEnvironmentAssetSnapshot
  >();
  const surfacesById = new Map(
    semanticWorld.surfaces.map((surface) => [surface.surfaceId, surface] as const)
  );

  for (const terrainChunk of semanticWorld.terrainChunks) {
    const chunkRecord = ensureChunkRecord(
      chunksById,
      createChunkId(terrainChunk.origin.x, terrainChunk.origin.z, chunkSizeMeters)
    );

    chunkRecord.terrainChunkIds.add(terrainChunk.chunkId);
    chunkRecord.collisionBoxes.push(
      createCollisionBoxSnapshot(
        terrainChunk.chunkId,
        "terrain-chunk",
        freezeVector3(
          terrainChunk.origin.x,
          terrainChunk.origin.y,
          terrainChunk.origin.z
        ),
        freezeVector3(
          Math.max(0.5, terrainChunk.sampleStrideMeters * terrainChunk.sampleCountX),
          0.5,
          Math.max(0.5, terrainChunk.sampleStrideMeters * terrainChunk.sampleCountZ)
        ),
        0,
        "support"
      )
    );
  }

  for (const region of semanticWorld.regions) {
    const surface = surfacesById.get(region.surfaceId) ?? null;

    if (surface === null) {
      continue;
    }

    const compatibilityPlacement = buildRegionCompatibilityPlacements(
      region,
      surface,
      semanticWorld.compatibilityAssetIds.floorAssetId
    );
    const chunkRecord = ensureChunkRecord(chunksById, compatibilityPlacement.chunkId);

    chunkRecord.regionIds.add(region.regionId);
    chunkRecord.surfaceIds.add(surface.surfaceId);
    chunkRecord.collisionBoxes.push(...compatibilityPlacement.collisionBoxes);

    if (compatibilityPlacement.environmentAsset !== null) {
      const { placements, ...environmentAssetSeed } =
        compatibilityPlacement.environmentAsset;

      ensureEnvironmentAssetGroup(
        environmentAssetsById,
        environmentAssetSeed,
        placements
      );
    }
  }

  for (const edge of semanticWorld.edges) {
    const surface = surfacesById.get(edge.surfaceId) ?? null;

    if (surface === null) {
      continue;
    }

    const compatibilityPlacement = buildEdgeCompatibilityPlacements(
      edge,
      surface,
      semanticWorld.compatibilityAssetIds.wallAssetId
    );
    const chunkRecord = ensureChunkRecord(chunksById, compatibilityPlacement.chunkId);

    chunkRecord.edgeIds.add(edge.edgeId);
    chunkRecord.surfaceIds.add(surface.surfaceId);
    chunkRecord.collisionBoxes.push(...compatibilityPlacement.collisionBoxes);

    if (compatibilityPlacement.environmentAsset !== null) {
      const { placements, ...environmentAssetSeed } =
        compatibilityPlacement.environmentAsset;

      ensureEnvironmentAssetGroup(
        environmentAssetsById,
        environmentAssetSeed,
        placements
      );
    }
  }

  for (const connector of semanticWorld.connectors) {
    const compatibilityPlacement = buildConnectorCompatibilityPlacements(
      connector,
      semanticWorld.compatibilityAssetIds.connectorAssetId
    );
    const chunkRecord = ensureChunkRecord(chunksById, compatibilityPlacement.chunkId);

    chunkRecord.connectorIds.add(connector.connectorId);
    chunkRecord.surfaceIds.add(connector.fromSurfaceId);
    chunkRecord.surfaceIds.add(connector.toSurfaceId);
    chunkRecord.collisionBoxes.push(...compatibilityPlacement.collisionBoxes);

    if (compatibilityPlacement.environmentAsset !== null) {
      const { placements, ...environmentAssetSeed } =
        compatibilityPlacement.environmentAsset;

      ensureEnvironmentAssetGroup(
        environmentAssetsById,
        environmentAssetSeed,
        placements
      );
    }
  }

  for (const module of semanticWorld.modules) {
    const environmentAsset = buildModuleCompatibilityAsset(module);
    const chunkRecord = ensureChunkRecord(
      chunksById,
      createChunkId(module.position.x, module.position.z, chunkSizeMeters)
    );

    chunkRecord.instancedModuleAssetIds.add(module.assetId);
    for (const collider of module.surfaceColliders) {
      chunkRecord.collisionBoxes.push(
        createCollisionBoxSnapshot(
          module.moduleId,
          "module",
          freezeVector3(
            module.position.x + collider.center.x,
            module.position.y + collider.center.y,
            module.position.z + collider.center.z
          ),
          freezeVector3(
            Math.max(0.5, collider.size.x),
            Math.max(0.5, collider.size.y),
            Math.max(0.5, collider.size.z)
          ),
          module.rotationYRadians,
          collider.traversalAffordance
        )
      );
    }

    ensureEnvironmentAssetGroup(
      environmentAssetsById,
      (({ placements, ...environmentAssetSeed }) => environmentAssetSeed)(
        environmentAsset
      ),
      environmentAsset.placements
    );
  }

  return Object.freeze({
    chunkSizeMeters,
    chunks: Object.freeze(
      [...chunksById.values()]
        .sort((leftChunk, rightChunk) =>
          leftChunk.chunkId.localeCompare(rightChunk.chunkId)
        )
        .map((chunkRecord) =>
          Object.freeze({
            bounds: createChunkBounds(chunkRecord.chunkId, chunkSizeMeters),
            chunkId: chunkRecord.chunkId,
            collision: Object.freeze({
              boxes: Object.freeze([...chunkRecord.collisionBoxes])
            }),
            navigation: Object.freeze({
              connectorIds: Object.freeze([...chunkRecord.connectorIds]),
              regionIds: Object.freeze([...chunkRecord.regionIds]),
              surfaceIds: Object.freeze([...chunkRecord.surfaceIds])
            }),
            render: Object.freeze({
              edgeIds: Object.freeze([...chunkRecord.edgeIds]),
              instancedModuleAssetIds: Object.freeze([
                ...chunkRecord.instancedModuleAssetIds
              ]),
              regionIds: Object.freeze([...chunkRecord.regionIds]),
              terrainChunkIds: Object.freeze([...chunkRecord.terrainChunkIds]),
              transparentEntityIds: Object.freeze([
                ...chunkRecord.transparentEntityIds
              ])
            })
          } satisfies MetaverseMapBundleCompiledWorldChunkSnapshot)
        )
    ),
    compatibilityEnvironmentAssets: Object.freeze(
      [...environmentAssetsById.values()]
    )
  });
}
