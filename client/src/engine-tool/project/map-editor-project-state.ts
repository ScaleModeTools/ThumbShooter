import type { LoadedMetaverseMapBundleSnapshot } from "@/metaverse/world/map-bundles";
import type { EnvironmentAssetDescriptor } from "@/assets/types/environment-asset-manifest";
import {
  environmentPropManifest,
  metaverseBuilderFloorTileEnvironmentAssetId,
  metaverseBuilderStepTileEnvironmentAssetId,
  metaverseBuilderWallTileEnvironmentAssetId
} from "@/assets/config/environment-prop-manifest";
import {
  mapEditorBuildGridUnitMeters,
  snapMapEditorBuildCoordinateToGrid,
  type MapEditorBuildPlacementPositionSnapshot
} from "@/engine-tool/build/map-editor-build-placement";
import { readMapEditorBuildPrimitiveCatalogEntry } from "@/engine-tool/build/map-editor-build-primitives";
import {
  createLaunchVariationDrafts,
  freezeLaunchVariationDraft,
  type MapEditorLaunchVariationDraftSnapshot
} from "@/engine-tool/project/map-editor-project-launch-variations";
import {
  createPlayerSpawnSelectionDraft,
  freezePlayerSpawnSelectionDraft,
  type MapEditorPlayerSpawnSelectionDraftSnapshot
} from "@/engine-tool/project/map-editor-project-player-spawn-selection";
import {
  createMapEditorConnectorDrafts,
  createMapEditorEdgeDrafts,
  createMapEditorRegionDrafts,
  createMapEditorSurfaceDrafts,
  createMapEditorTerrainChunkDrafts,
  createSemanticConnectorSnapshotFromDraft,
  createSemanticEdgeSnapshotFromDraft,
  createSemanticRegionSnapshotFromDraft,
  createSemanticSurfaceSnapshotFromDraft,
  createSemanticTerrainChunkSnapshotFromDraft,
  freezeConnectorDraft,
  freezeEdgeDraft,
  freezeRegionDraft,
  freezeSurfaceDraft,
  type MapEditorConnectorDraftSnapshot,
  type MapEditorEdgeDraftSnapshot,
  type MapEditorRegionDraftSnapshot,
  type MapEditorSurfaceDraftSnapshot,
  type MapEditorTerrainChunkDraftSnapshot
} from "@/engine-tool/project/map-editor-project-semantic-drafts";
import {
  createPlayerSpawnDrafts,
  createSceneObjectDrafts,
  createWaterRegionDrafts,
  freezePlayerSpawnDraft,
  freezeSceneObjectDraft,
  freezeWaterRegionDraft,
  resolveMapEditorWaterRegionCenter,
  resolveMapEditorWaterRegionTopCenter,
  type MapEditorPlayerSpawnDraftSnapshot,
  type MapEditorSceneObjectDraftSnapshot,
  type MapEditorWaterRegionDraftSnapshot
} from "@/engine-tool/project/map-editor-project-scene-drafts";
import {
  type MetaverseMapBundleSemanticCompatibilityAssetIdsSnapshot,
  type MetaverseMapBundleSemanticModuleSnapshot,
  type MetaverseWorldEnvironmentColliderAuthoring,
  type MetaverseWorldEnvironmentDynamicBodyAuthoring,
  type MetaverseWorldEnvironmentTraversalAffordanceId,
  type MetaverseWorldMountedEntryAuthoring,
  type MetaverseWorldMountedSeatAuthoring,
  type MetaverseWorldSurfaceColliderAuthoring,
  type MetaverseWorldSurfacePlacementId,
  type MetaverseWorldSurfaceScaleSnapshot,
  type MetaverseWorldSurfaceVector3Snapshot,
  resolveMetaverseWorldSurfaceScaleVector
} from "@webgpu-metaverse/shared/metaverse/world";
import type {
  MapEditorTerrainBrushMode,
  MapEditorTerrainBrushSizeCells
} from "@/engine-tool/types/map-editor";

export type {
  MapEditorConnectorDraftSnapshot,
  MapEditorEdgeDraftSnapshot,
  MapEditorRegionDraftSnapshot,
  MapEditorSurfaceDraftSnapshot,
  MapEditorTerrainChunkDraftSnapshot
} from "@/engine-tool/project/map-editor-project-semantic-drafts";
export type {
  MapEditorPlayerSpawnDraftSnapshot,
  MapEditorSceneObjectDraftSnapshot,
  MapEditorWaterRegionDraftSnapshot
} from "@/engine-tool/project/map-editor-project-scene-drafts";
export type {
  MapEditorPlayerSpawnSelectionDraftSnapshot
} from "@/engine-tool/project/map-editor-project-player-spawn-selection";

export interface MapEditorPlacementDraftSnapshot {
  readonly assetId: string;
  readonly colliderCount: number;
  readonly collisionEnabled: boolean;
  readonly collisionPath: string | null;
  readonly collider: MetaverseWorldEnvironmentColliderAuthoring | null;
  readonly dynamicBody: MetaverseWorldEnvironmentDynamicBodyAuthoring | null;
  readonly entries: readonly MetaverseWorldMountedEntryAuthoring[] | null;
  readonly isVisible: boolean;
  readonly materialReferenceId: string | null;
  readonly moduleId: string;
  readonly notes: string;
  readonly placementId: string;
  readonly placementMode: MetaverseWorldSurfacePlacementId;
  readonly position: MetaverseWorldSurfaceVector3Snapshot;
  readonly rotationYRadians: number;
  readonly scale: MetaverseWorldSurfaceVector3Snapshot;
  readonly seats: readonly MetaverseWorldMountedSeatAuthoring[] | null;
  readonly surfaceColliders: readonly MetaverseWorldSurfaceColliderAuthoring[];
  readonly traversalAffordance: MetaverseWorldEnvironmentTraversalAffordanceId;
}

export type MapEditorEntityKind =
  | "connector"
  | "edge"
  | "module"
  | "player-spawn"
  | "region"
  | "scene-object"
  | "surface"
  | "terrain-chunk"
  | "water-region";

export interface MapEditorSelectedEntityRef {
  readonly id: string;
  readonly kind: MapEditorEntityKind;
}

export interface MapEditorProjectSnapshot {
  readonly bundleId: string;
  readonly bundleLabel: string;
  readonly cameraProfileId: string | null;
  readonly characterPresentationProfileId: string | null;
  readonly connectorDrafts: readonly MapEditorConnectorDraftSnapshot[];
  readonly description: string;
  readonly edgeDrafts: readonly MapEditorEdgeDraftSnapshot[];
  readonly environmentPresentationProfileId: string | null;
  readonly gameplayProfileId: string;
  readonly hudProfileId: string | null;
  readonly launchVariationDrafts: readonly MapEditorLaunchVariationDraftSnapshot[];
  readonly placementDrafts: readonly MapEditorPlacementDraftSnapshot[];
  readonly playerSpawnDrafts: readonly MapEditorPlayerSpawnDraftSnapshot[];
  readonly playerSpawnSelectionDraft: MapEditorPlayerSpawnSelectionDraftSnapshot;
  readonly regionDrafts: readonly MapEditorRegionDraftSnapshot[];
  readonly sceneObjectDrafts: readonly MapEditorSceneObjectDraftSnapshot[];
  readonly selectedEntityRef: MapEditorSelectedEntityRef | null;
  readonly selectedLaunchVariationId: string | null;
  readonly selectedPlacementId: string | null;
  readonly semanticCompatibilityAssetIds:
    MetaverseMapBundleSemanticCompatibilityAssetIdsSnapshot;
  readonly surfaceDrafts: readonly MapEditorSurfaceDraftSnapshot[];
  readonly terrainChunkDrafts: readonly MapEditorTerrainChunkDraftSnapshot[];
  readonly waterRegionDrafts: readonly MapEditorWaterRegionDraftSnapshot[];
}

function freezePlacementScale(
  scale: MetaverseWorldSurfaceScaleSnapshot
): MetaverseWorldSurfaceVector3Snapshot {
  const resolvedScale = resolveMetaverseWorldSurfaceScaleVector(scale);

  return Object.freeze({
    x: Math.max(0.1, resolvedScale.x),
    y: Math.max(0.1, resolvedScale.y),
    z: Math.max(0.1, resolvedScale.z)
  });
}

function freezePlacementDraft(
  draft: MapEditorPlacementDraftSnapshot
): MapEditorPlacementDraftSnapshot {
  return Object.freeze({
    ...draft,
    collider:
      draft.collider === null
        ? null
        : Object.freeze({
            center: Object.freeze({
              x: draft.collider.center.x,
              y: draft.collider.center.y,
              z: draft.collider.center.z
            }),
            size: Object.freeze({
              x: draft.collider.size.x,
              y: draft.collider.size.y,
              z: draft.collider.size.z
            })
          }),
    dynamicBody:
      draft.dynamicBody === null
        ? null
        : Object.freeze({
            ...draft.dynamicBody
          }),
    entries:
      draft.entries === null ? null : Object.freeze([...draft.entries]),
    position: Object.freeze({
      x: draft.position.x,
      y: draft.position.y,
      z: draft.position.z
    }),
    scale: freezePlacementScale(draft.scale),
    seats: draft.seats === null ? null : Object.freeze([...draft.seats]),
    surfaceColliders: Object.freeze([...draft.surfaceColliders])
  });
}

function resolveModuleColliderCount(
  surfaceColliders: readonly MetaverseWorldSurfaceColliderAuthoring[],
  collider: MetaverseWorldEnvironmentColliderAuthoring | null
): number {
  return surfaceColliders.length + (collider === null ? 0 : 1);
}

function createModuleDraftFromSemanticModule(
  module: MetaverseMapBundleSemanticModuleSnapshot
): MapEditorPlacementDraftSnapshot {
  return freezePlacementDraft({
    assetId: module.assetId,
    colliderCount: resolveModuleColliderCount(module.surfaceColliders, module.collider),
    collisionEnabled: module.collisionEnabled,
    collisionPath: module.collisionPath,
    collider: module.collider,
    dynamicBody: module.dynamicBody,
    entries: module.entries,
    isVisible: module.isVisible,
    materialReferenceId: module.materialReferenceId,
    moduleId: module.moduleId,
    notes: module.notes,
    placementId: module.moduleId,
    placementMode: module.placementMode,
    position: module.position,
    rotationYRadians: module.rotationYRadians,
    scale: freezePlacementScale(module.scale),
    seats: module.seats,
    surfaceColliders: module.surfaceColliders,
    traversalAffordance: module.traversalAffordance
  });
}

function createModuleDraftFromLegacyPlacement(
  environmentAsset: LoadedMetaverseMapBundleSnapshot["bundle"]["environmentAssets"][number],
  placement: LoadedMetaverseMapBundleSnapshot["bundle"]["environmentAssets"][number]["placements"][number]
): MapEditorPlacementDraftSnapshot {
  return freezePlacementDraft({
    assetId: environmentAsset.assetId,
    colliderCount: resolveModuleColliderCount(
      environmentAsset.surfaceColliders,
      environmentAsset.collider
    ),
    collisionEnabled: placement.collisionEnabled,
    collisionPath: environmentAsset.collisionPath,
    collider: environmentAsset.collider,
    dynamicBody: environmentAsset.dynamicBody,
    entries: environmentAsset.entries,
    isVisible: placement.isVisible,
    materialReferenceId: placement.materialReferenceId,
    moduleId: placement.placementId,
    notes: placement.notes,
    placementId: placement.placementId,
    placementMode: environmentAsset.placementMode,
    position: placement.position,
    rotationYRadians: placement.rotationYRadians,
    scale: freezePlacementScale(placement.scale),
    seats: environmentAsset.seats,
    surfaceColliders: environmentAsset.surfaceColliders,
    traversalAffordance: environmentAsset.traversalAffordance
  });
}

function createLegacySemanticDrafts(
  loadedBundle: LoadedMetaverseMapBundleSnapshot
): Pick<
  MapEditorProjectSnapshot,
  | "connectorDrafts"
  | "edgeDrafts"
  | "placementDrafts"
  | "regionDrafts"
  | "semanticCompatibilityAssetIds"
  | "surfaceDrafts"
  | "terrainChunkDrafts"
> {
  const surfaces: MapEditorSurfaceDraftSnapshot[] = [];
  const regions: MapEditorRegionDraftSnapshot[] = [];
  const edges: MapEditorEdgeDraftSnapshot[] = [];
  const modules: MapEditorPlacementDraftSnapshot[] = [];

  for (const environmentAsset of loadedBundle.bundle.environmentAssets) {
    for (const placement of environmentAsset.placements) {
      if (environmentAsset.assetId === metaverseBuilderFloorTileEnvironmentAssetId) {
        const surfaceId = `surface:${placement.placementId}`;
        const scale = freezePlacementScale(placement.scale);
        const size = Object.freeze({
          x: 4 * scale.x,
          y: 0.5 * scale.y,
          z: 4 * scale.z
        });

        surfaces.push(
          freezeSurfaceDraft({
            center: placement.position,
            elevation: placement.position.y,
            kind: "flat-slab",
            label: environmentAsset.assetId,
            rotationYRadians: placement.rotationYRadians,
            size,
            surfaceId,
            terrainChunkId: null
          })
        );
        regions.push(
          freezeRegionDraft({
            center: placement.position,
            label: environmentAsset.assetId,
            materialReferenceId: placement.materialReferenceId,
            regionId: `region:${placement.placementId}`,
            regionKind: "floor",
            rotationYRadians: placement.rotationYRadians,
            size,
            surfaceId
          })
        );
        continue;
      }

      if (environmentAsset.assetId === metaverseBuilderWallTileEnvironmentAssetId) {
        const surfaceId = `surface:${placement.placementId}`;
        const scale = freezePlacementScale(placement.scale);
        const size = Object.freeze({
          x: 4 * scale.x,
          y: 4 * scale.y,
          z: 0.5 * scale.z
        });

        surfaces.push(
          freezeSurfaceDraft({
            center: placement.position,
            elevation: placement.position.y,
            kind: "flat-slab",
            label: environmentAsset.assetId,
            rotationYRadians: placement.rotationYRadians,
            size,
            surfaceId,
            terrainChunkId: null
          })
        );
        edges.push(
          freezeEdgeDraft({
            center: Object.freeze({
              x: placement.position.x,
              y: placement.position.y + size.y * 0.5,
              z: placement.position.z
            }),
            edgeId: `edge:${placement.placementId}`,
            edgeKind: "wall",
            heightMeters: size.y,
            label: environmentAsset.assetId,
            lengthMeters: size.x,
            rotationYRadians: placement.rotationYRadians,
            surfaceId,
            thicknessMeters: size.z
          })
        );
        continue;
      }

      modules.push(createModuleDraftFromLegacyPlacement(environmentAsset, placement));
    }
  }

  return Object.freeze({
    connectorDrafts: Object.freeze([]),
    edgeDrafts: Object.freeze(edges),
    placementDrafts: Object.freeze(modules),
    regionDrafts: Object.freeze(regions),
    semanticCompatibilityAssetIds: Object.freeze({
      connectorAssetId: metaverseBuilderStepTileEnvironmentAssetId,
      floorAssetId: metaverseBuilderFloorTileEnvironmentAssetId,
      wallAssetId: metaverseBuilderWallTileEnvironmentAssetId
    }),
    surfaceDrafts: Object.freeze(surfaces),
    terrainChunkDrafts: Object.freeze([])
  });
}

function createSemanticDraftsFromBundle(
  loadedBundle: LoadedMetaverseMapBundleSnapshot
): Pick<
  MapEditorProjectSnapshot,
  | "connectorDrafts"
  | "edgeDrafts"
  | "placementDrafts"
  | "regionDrafts"
  | "semanticCompatibilityAssetIds"
  | "surfaceDrafts"
  | "terrainChunkDrafts"
> {
  const semanticWorld = loadedBundle.bundle.semanticWorld;

  if (
    semanticWorld.terrainChunks.length === 0 &&
    semanticWorld.surfaces.length === 0 &&
    semanticWorld.regions.length === 0 &&
    semanticWorld.edges.length === 0 &&
    semanticWorld.connectors.length === 0 &&
    semanticWorld.modules.length === 0
  ) {
    return createLegacySemanticDrafts(loadedBundle);
  }

  const surfaceDrafts = createMapEditorSurfaceDrafts(semanticWorld);

  return Object.freeze({
    connectorDrafts: createMapEditorConnectorDrafts(semanticWorld),
    edgeDrafts: createMapEditorEdgeDrafts(semanticWorld, surfaceDrafts),
    placementDrafts: Object.freeze(
      semanticWorld.modules.map(createModuleDraftFromSemanticModule)
    ),
    regionDrafts: createMapEditorRegionDrafts(semanticWorld, surfaceDrafts),
    semanticCompatibilityAssetIds: semanticWorld.compatibilityAssetIds,
    surfaceDrafts,
    terrainChunkDrafts: createMapEditorTerrainChunkDrafts(semanticWorld)
  });
}

function createSelectedPlacementId(
  selectedEntityRef: MapEditorSelectedEntityRef | null
): string | null {
  return selectedEntityRef?.kind === "module" ? selectedEntityRef.id : null;
}

function resolveInitialSelectedEntityRef(
  semanticDrafts: Pick<
    MapEditorProjectSnapshot,
    | "connectorDrafts"
    | "edgeDrafts"
    | "placementDrafts"
    | "regionDrafts"
    | "surfaceDrafts"
    | "terrainChunkDrafts"
  >
): MapEditorSelectedEntityRef | null {
  return (
    semanticDrafts.regionDrafts[0] !== undefined
      ? Object.freeze({
          id: semanticDrafts.regionDrafts[0].regionId,
          kind: "region" as const
        })
      : semanticDrafts.edgeDrafts[0] !== undefined
        ? Object.freeze({
            id: semanticDrafts.edgeDrafts[0].edgeId,
            kind: "edge" as const
          })
        : semanticDrafts.placementDrafts[0] !== undefined
          ? Object.freeze({
              id: semanticDrafts.placementDrafts[0].placementId,
              kind: "module" as const
            })
          : semanticDrafts.surfaceDrafts[0] !== undefined
            ? Object.freeze({
                id: semanticDrafts.surfaceDrafts[0].surfaceId,
                kind: "surface" as const
              })
            : semanticDrafts.terrainChunkDrafts[0] !== undefined
              ? Object.freeze({
                  id: semanticDrafts.terrainChunkDrafts[0].chunkId,
                  kind: "terrain-chunk" as const
                })
              : semanticDrafts.connectorDrafts[0] !== undefined
                ? Object.freeze({
                    id: semanticDrafts.connectorDrafts[0].connectorId,
                    kind: "connector" as const
                  })
                : null
  );
}

function createMapEditorPlacementId(
  project: MapEditorProjectSnapshot,
  assetId: string
): string {
  const prefix = `${assetId}:module:`;
  let nextNumber = 1;

  for (const placement of project.placementDrafts) {
    if (!placement.placementId.startsWith(prefix)) {
      continue;
    }

    const numericSuffix = Number(placement.placementId.slice(prefix.length));

    if (Number.isFinite(numericSuffix)) {
      nextNumber = Math.max(nextNumber, numericSuffix + 1);
    }
  }

  return `${prefix}${nextNumber}`;
}

function createMapEditorSurfaceId(project: MapEditorProjectSnapshot): string {
  return `${project.bundleId}:surface:${project.surfaceDrafts.length + 1}`;
}

function createMapEditorRegionId(project: MapEditorProjectSnapshot): string {
  return `${project.bundleId}:region:${project.regionDrafts.length + 1}`;
}

function createMapEditorEdgeId(project: MapEditorProjectSnapshot): string {
  return `${project.bundleId}:edge:${project.edgeDrafts.length + 1}`;
}

function createMapEditorConnectorId(project: MapEditorProjectSnapshot): string {
  return `${project.bundleId}:connector:${project.connectorDrafts.length + 1}`;
}

function createMapEditorTerrainChunkId(project: MapEditorProjectSnapshot): string {
  return `${project.bundleId}:terrain:${project.terrainChunkDrafts.length + 1}`;
}

function createMapEditorPlayerSpawnId(project: MapEditorProjectSnapshot): string {
  return `${project.bundleId}:spawn:${project.playerSpawnDrafts.length + 1}`;
}

function createMapEditorSceneObjectId(project: MapEditorProjectSnapshot): string {
  return `${project.bundleId}:scene-object:${project.sceneObjectDrafts.length + 1}`;
}

function createMapEditorWaterRegionId(project: MapEditorProjectSnapshot): string {
  return `${project.bundleId}:water-region:${project.waterRegionDrafts.length + 1}`;
}

function createMapEditorLaunchVariationId(project: MapEditorProjectSnapshot): string {
  return `${project.bundleId}:variation:${project.launchVariationDrafts.length + 1}`;
}

function readSelectedEntityPosition(
  project: MapEditorProjectSnapshot
): MetaverseWorldSurfaceVector3Snapshot | null {
  const selectedEntityRef = project.selectedEntityRef;

  if (selectedEntityRef === null) {
    return null;
  }

  switch (selectedEntityRef.kind) {
    case "module":
      return (
        project.placementDrafts.find(
          (placement) => placement.placementId === selectedEntityRef.id
        )?.position ?? null
      );
    case "region":
      return (
        project.regionDrafts.find((region) => region.regionId === selectedEntityRef.id)
          ?.center ?? null
      );
    case "edge":
      return (
        project.edgeDrafts.find((edge) => edge.edgeId === selectedEntityRef.id)?.center ??
        null
      );
    case "connector":
      return (
        project.connectorDrafts.find(
          (connector) => connector.connectorId === selectedEntityRef.id
        )?.center ?? null
      );
    case "surface":
      return (
        project.surfaceDrafts.find((surface) => surface.surfaceId === selectedEntityRef.id)
          ?.center ?? null
      );
    case "terrain-chunk":
      return (
        project.terrainChunkDrafts.find(
          (terrainChunk) => terrainChunk.chunkId === selectedEntityRef.id
        )?.origin ?? null
      );
    case "player-spawn":
      return (
        project.playerSpawnDrafts.find(
          (spawnDraft) => spawnDraft.spawnId === selectedEntityRef.id
        )?.position ?? null
      );
    case "scene-object":
      return (
        project.sceneObjectDrafts.find(
          (sceneObjectDraft) => sceneObjectDraft.objectId === selectedEntityRef.id
        )?.position ?? null
      );
    case "water-region": {
      const waterRegionDraft =
        project.waterRegionDrafts.find(
          (candidateWaterRegionDraft) =>
            candidateWaterRegionDraft.waterRegionId === selectedEntityRef.id
        ) ?? null;

      return waterRegionDraft === null
        ? null
        : resolveMapEditorWaterRegionTopCenter(waterRegionDraft);
    }
  }
}

function createMapEditorSceneDraftPosition(
  project: MapEditorProjectSnapshot,
  offset: MetaverseWorldSurfaceVector3Snapshot
): MapEditorBuildPlacementPositionSnapshot {
  const selectedPosition = readSelectedEntityPosition(project);

  if (selectedPosition !== null) {
    return Object.freeze({
      x: selectedPosition.x + offset.x,
      y: selectedPosition.y + offset.y,
      z: selectedPosition.z + offset.z
    });
  }

  const lastModule = project.placementDrafts[project.placementDrafts.length - 1] ?? null;

  if (lastModule !== null) {
    return Object.freeze({
      x: lastModule.position.x + offset.x,
      y: lastModule.position.y + offset.y,
      z: lastModule.position.z + offset.z
    });
  }

  return Object.freeze({
    x: offset.x,
    y: offset.y,
    z: offset.z
  });
}

function resolveNewPlacementPosition(
  project: MapEditorProjectSnapshot,
  assetId: string
): MetaverseWorldSurfaceVector3Snapshot {
  const existingPlacements = project.placementDrafts.filter(
    (placement) => placement.assetId === assetId
  );
  const selectedPlacement = readSelectedMapEditorPlacement(project);
  const lastPlacement = existingPlacements[existingPlacements.length - 1] ?? null;
  const buildPrimitiveCatalogEntry = readMapEditorBuildPrimitiveCatalogEntry(assetId);

  if (buildPrimitiveCatalogEntry !== null && (selectedPlacement ?? lastPlacement) !== null) {
    const anchor = selectedPlacement ?? lastPlacement!;

    return Object.freeze({
      x: anchor.position.x + buildPrimitiveCatalogEntry.footprint.x,
      y: anchor.position.y,
      z: anchor.position.z
    });
  }

  if (lastPlacement !== null) {
    return Object.freeze({
      x: lastPlacement.position.x + 4,
      y: lastPlacement.position.y,
      z: lastPlacement.position.z
    });
  }

  const placementIndex = project.placementDrafts.length;
  const column = placementIndex % 4;
  const row = Math.floor(placementIndex / 4);

  return Object.freeze({
    x: (column - 1.5) * 6,
    y: 0,
    z: row * 6
  });
}

function withSelectedEntity(
  project: MapEditorProjectSnapshot,
  selectedEntityRef: MapEditorSelectedEntityRef | null
): MapEditorProjectSnapshot {
  return Object.freeze({
    ...project,
    selectedEntityRef,
    selectedPlacementId: createSelectedPlacementId(selectedEntityRef)
  });
}

type MapEditorOutlinerGroupId =
  | "advanced-semantics"
  | "connectors"
  | "floors-paths"
  | "gameplay-anchors"
  | "modules"
  | "terrain"
  | "walls-boundaries"
  | "water";

const defaultTerrainChunkSampleCount = 9;
const defaultTerrainBrushHeightDeltaMeters = 1;
const defaultPathSurfaceSize = Object.freeze({
  x: mapEditorBuildGridUnitMeters,
  y: 0.5,
  z: mapEditorBuildGridUnitMeters
});
const defaultWallThicknessMeters = 0.5;
const defaultWallHeightMeters = 4;

function freezeBuildPosition(
  position: MetaverseWorldSurfaceVector3Snapshot
): MetaverseWorldSurfaceVector3Snapshot {
  return Object.freeze({
    x: position.x,
    y: position.y,
    z: position.z
  });
}

function snapMapEditorPositionToGrid(
  position: MetaverseWorldSurfaceVector3Snapshot
): MetaverseWorldSurfaceVector3Snapshot {
  return Object.freeze({
    x: snapMapEditorBuildCoordinateToGrid(position.x),
    y: position.y,
    z: snapMapEditorBuildCoordinateToGrid(position.z)
  });
}

function findSurfaceDraftById(
  project: MapEditorProjectSnapshot,
  surfaceId: string
): MapEditorSurfaceDraftSnapshot | null {
  return project.surfaceDrafts.find((surface) => surface.surfaceId === surfaceId) ?? null;
}

function findSurfaceDraftAtPosition(
  project: MapEditorProjectSnapshot,
  position: MetaverseWorldSurfaceVector3Snapshot,
  elevation: number,
  toleranceMeters = 0.01
): MapEditorSurfaceDraftSnapshot | null {
  return (
    project.surfaceDrafts.find(
      (surface) =>
        Math.abs(surface.center.x - position.x) <= toleranceMeters &&
        Math.abs(surface.center.z - position.z) <= toleranceMeters &&
        Math.abs(surface.elevation - elevation) <= toleranceMeters
    ) ?? null
  );
}

function findPathRegionDraftAtPosition(
  project: MapEditorProjectSnapshot,
  position: MetaverseWorldSurfaceVector3Snapshot,
  elevation: number,
  toleranceMeters = 0.01
): MapEditorRegionDraftSnapshot | null {
  return (
    project.regionDrafts.find((region) => {
      if (region.regionKind !== "path") {
        return false;
      }

      const surface = findSurfaceDraftById(project, region.surfaceId);

      return (
        surface !== null &&
        Math.abs(region.center.x - position.x) <= toleranceMeters &&
        Math.abs(region.center.z - position.z) <= toleranceMeters &&
        Math.abs(surface.elevation - elevation) <= toleranceMeters
      );
    }) ?? null
  );
}

export function readNearestMapEditorPathAnchor(
  project: MapEditorProjectSnapshot,
  position: MetaverseWorldSurfaceVector3Snapshot,
  horizontalToleranceMeters = mapEditorBuildGridUnitMeters,
  verticalToleranceMeters = defaultWallHeightMeters
): {
  readonly center: MetaverseWorldSurfaceVector3Snapshot;
  readonly elevation: number;
} | null {
  let nearestAnchor:
    | {
        readonly center: MetaverseWorldSurfaceVector3Snapshot;
        readonly distanceSquared: number;
        readonly elevation: number;
      }
    | null = null;

  for (const region of project.regionDrafts) {
    if (region.regionKind !== "path") {
      continue;
    }

    const surface = findSurfaceDraftById(project, region.surfaceId);

    if (surface === null) {
      continue;
    }

    const deltaX = region.center.x - position.x;
    const deltaZ = region.center.z - position.z;
    const distanceSquared = deltaX * deltaX + deltaZ * deltaZ;

    if (
      distanceSquared > horizontalToleranceMeters * horizontalToleranceMeters ||
      Math.abs(surface.elevation - position.y) > verticalToleranceMeters
    ) {
      continue;
    }

    if (
      nearestAnchor === null ||
      distanceSquared < nearestAnchor.distanceSquared
    ) {
      nearestAnchor = Object.freeze({
        center: freezeBuildPosition(region.center),
        distanceSquared,
        elevation: surface.elevation
      });
    }
  }

  return nearestAnchor === null
    ? null
    : Object.freeze({
        center: nearestAnchor.center,
        elevation: nearestAnchor.elevation
      });
}

function createTerrainChunkHeights(
  sampleCountX: number,
  sampleCountZ: number
): readonly number[] {
  return Object.freeze(
    Array.from({ length: sampleCountX * sampleCountZ }, () => 0)
  );
}

function resolveTerrainHalfSpanMeters(
  sampleCount: number,
  sampleStrideMeters: number
): number {
  return sampleCount * sampleStrideMeters * 0.5;
}

function isPointInsideTerrainChunk(
  terrainChunk: MapEditorTerrainChunkDraftSnapshot,
  position: MetaverseWorldSurfaceVector3Snapshot
): boolean {
  return (
    Math.abs(position.x - terrainChunk.origin.x) <=
      resolveTerrainHalfSpanMeters(
        terrainChunk.sampleCountX,
        terrainChunk.sampleStrideMeters
      ) &&
    Math.abs(position.z - terrainChunk.origin.z) <=
      resolveTerrainHalfSpanMeters(
        terrainChunk.sampleCountZ,
        terrainChunk.sampleStrideMeters
      )
  );
}

function findTerrainChunkAtPosition(
  project: MapEditorProjectSnapshot,
  position: MetaverseWorldSurfaceVector3Snapshot
): MapEditorTerrainChunkDraftSnapshot | null {
  return (
    project.terrainChunkDrafts.find((terrainChunk) =>
      isPointInsideTerrainChunk(terrainChunk, position)
    ) ?? null
  );
}

function resolveTerrainCellIndex(
  coordinate: number,
  centerCoordinate: number,
  sampleCount: number,
  sampleStrideMeters: number
): number | null {
  const halfSpan = (sampleCount - 1) * 0.5;
  const localCoordinate =
    (coordinate - centerCoordinate) / sampleStrideMeters + halfSpan;
  const snappedIndex = Math.round(localCoordinate);

  return snappedIndex >= 0 && snappedIndex < sampleCount ? snappedIndex : null;
}

export function resolveMapEditorTerrainCellPosition(
  terrainChunk: MapEditorTerrainChunkDraftSnapshot,
  cellX: number,
  cellZ: number
): MetaverseWorldSurfaceVector3Snapshot {
  return Object.freeze({
    x:
      terrainChunk.origin.x +
      (cellX - (terrainChunk.sampleCountX - 1) * 0.5) *
        terrainChunk.sampleStrideMeters,
    y: terrainChunk.origin.y,
    z:
      terrainChunk.origin.z +
      (cellZ - (terrainChunk.sampleCountZ - 1) * 0.5) *
        terrainChunk.sampleStrideMeters
  });
}

function resolveTerrainCellIndices(
  terrainChunk: MapEditorTerrainChunkDraftSnapshot,
  position: MetaverseWorldSurfaceVector3Snapshot
): {
  readonly cellX: number;
  readonly cellZ: number;
} | null {
  const cellX = resolveTerrainCellIndex(
    position.x,
    terrainChunk.origin.x,
    terrainChunk.sampleCountX,
    terrainChunk.sampleStrideMeters
  );
  const cellZ = resolveTerrainCellIndex(
    position.z,
    terrainChunk.origin.z,
    terrainChunk.sampleCountZ,
    terrainChunk.sampleStrideMeters
  );

  return cellX === null || cellZ === null
    ? null
    : Object.freeze({
        cellX,
        cellZ
      });
}

function createTerrainHeightIndex(
  terrainChunk: MapEditorTerrainChunkDraftSnapshot,
  cellX: number,
  cellZ: number
): number {
  return cellZ * terrainChunk.sampleCountX + cellX;
}

function listEntityRefsForOutlinerGroup(
  project: MapEditorProjectSnapshot,
  groupId: MapEditorOutlinerGroupId
): readonly MapEditorSelectedEntityRef[] {
  switch (groupId) {
    case "terrain":
      return Object.freeze(
        project.terrainChunkDrafts.map((terrainChunk) =>
          Object.freeze({
            id: terrainChunk.chunkId,
            kind: "terrain-chunk" as const
          })
        )
      );
    case "floors-paths":
      return Object.freeze(
        project.regionDrafts
          .filter((region) => region.regionKind === "floor" || region.regionKind === "path")
          .map((region) =>
            Object.freeze({
              id: region.regionId,
              kind: "region" as const
            })
          )
      );
    case "walls-boundaries":
      return Object.freeze(
        project.edgeDrafts.map((edge) =>
          Object.freeze({
            id: edge.edgeId,
            kind: "edge" as const
          })
        )
      );
    case "connectors":
      return Object.freeze(
        project.connectorDrafts.map((connector) =>
          Object.freeze({
            id: connector.connectorId,
            kind: "connector" as const
          })
        )
      );
    case "modules":
      return Object.freeze(
        project.placementDrafts.map((placement) =>
          Object.freeze({
            id: placement.placementId,
            kind: "module" as const
          })
        )
      );
    case "gameplay-anchors":
      return Object.freeze([
        ...project.playerSpawnDrafts.map((spawnDraft) =>
          Object.freeze({
            id: spawnDraft.spawnId,
            kind: "player-spawn" as const
          })
        ),
        ...project.sceneObjectDrafts.map((sceneObjectDraft) =>
          Object.freeze({
            id: sceneObjectDraft.objectId,
            kind: "scene-object" as const
          })
        )
      ]);
    case "water":
      return Object.freeze(
        project.waterRegionDrafts.map((waterRegionDraft) =>
          Object.freeze({
            id: waterRegionDraft.waterRegionId,
            kind: "water-region" as const
          })
        )
      );
    case "advanced-semantics":
      return Object.freeze([
        ...project.surfaceDrafts.map((surface) =>
          Object.freeze({
            id: surface.surfaceId,
            kind: "surface" as const
          })
        ),
        ...project.regionDrafts
          .filter((region) => region.regionKind === "arena")
          .map((region) =>
            Object.freeze({
              id: region.regionId,
              kind: "region" as const
            })
          )
      ]);
  }
}

function resolveEntityOutlinerGroup(
  project: MapEditorProjectSnapshot,
  entityRef: MapEditorSelectedEntityRef
): MapEditorOutlinerGroupId {
  switch (entityRef.kind) {
    case "terrain-chunk":
      return "terrain";
    case "edge":
      return "walls-boundaries";
    case "connector":
      return "connectors";
    case "module":
      return "modules";
    case "player-spawn":
    case "scene-object":
      return "gameplay-anchors";
    case "water-region":
      return "water";
    case "surface":
      return "advanced-semantics";
    case "region":
      return (
        project.regionDrafts.find((region) => region.regionId === entityRef.id)?.regionKind ===
          "arena"
          ? "advanced-semantics"
          : "floors-paths"
      );
  }
}

function resolveNextSelectionAfterRemoval(
  previousProject: MapEditorProjectSnapshot,
  nextProject: MapEditorProjectSnapshot,
  removedEntityRef: MapEditorSelectedEntityRef
): MapEditorSelectedEntityRef | null {
  const groupId = resolveEntityOutlinerGroup(previousProject, removedEntityRef);
  const previousRefs = listEntityRefsForOutlinerGroup(previousProject, groupId);
  const removedIndex = previousRefs.findIndex(
    (entityRef) =>
      entityRef.kind === removedEntityRef.kind && entityRef.id === removedEntityRef.id
  );

  if (removedIndex < 0) {
    return nextProject.selectedEntityRef;
  }

  const nextRefs = listEntityRefsForOutlinerGroup(nextProject, groupId);

  return nextRefs[Math.min(removedIndex, nextRefs.length - 1)] ?? null;
}

function createSemanticSurfaceForPlacement(
  project: MapEditorProjectSnapshot,
  label: string,
  position: MetaverseWorldSurfaceVector3Snapshot,
  rotationYRadians: number,
  size: MetaverseWorldSurfaceVector3Snapshot
): {
  readonly project: MapEditorProjectSnapshot;
  readonly surfaceId: string;
} {
  const surfaceId = createMapEditorSurfaceId(project);
  const nextSurface = freezeSurfaceDraft({
    center: Object.freeze({
      x: position.x,
      y: position.y,
      z: position.z
    }),
    elevation: position.y,
    kind: "flat-slab",
    label,
    rotationYRadians,
    size,
    surfaceId,
    terrainChunkId: null
  });

  return Object.freeze({
    project: Object.freeze({
      ...project,
      surfaceDrafts: Object.freeze([...project.surfaceDrafts, nextSurface])
    }),
    surfaceId
  });
}

function ensurePathSurfaceAndRegion(
  project: MapEditorProjectSnapshot,
  center: MetaverseWorldSurfaceVector3Snapshot,
  elevation: number
): {
  readonly center: MetaverseWorldSurfaceVector3Snapshot;
  readonly project: MapEditorProjectSnapshot;
  readonly regionId: string;
  readonly surfaceId: string;
} {
  const snappedCenter = Object.freeze({
    x: snapMapEditorBuildCoordinateToGrid(center.x),
    y: elevation,
    z: snapMapEditorBuildCoordinateToGrid(center.z)
  });
  const existingSurface = findSurfaceDraftAtPosition(
    project,
    snappedCenter,
    elevation
  );
  const existingPathRegion = findPathRegionDraftAtPosition(
    project,
    snappedCenter,
    elevation
  );

  if (existingSurface !== null && existingPathRegion !== null) {
    return Object.freeze({
      center: snappedCenter,
      project,
      regionId: existingPathRegion.regionId,
      surfaceId: existingSurface.surfaceId
    });
  }

  const surfaceId = existingSurface?.surfaceId ?? createMapEditorSurfaceId(project);
  const nextSurface =
    existingSurface ??
    freezeSurfaceDraft({
      center: snappedCenter,
      elevation,
      kind: "flat-slab",
      label: `Path Surface ${project.surfaceDrafts.length + 1}`,
      rotationYRadians: 0,
      size: defaultPathSurfaceSize,
      surfaceId,
      terrainChunkId: null
    });
  const surfaceProject =
    existingSurface !== null
      ? project
      : Object.freeze({
          ...project,
          surfaceDrafts: Object.freeze([...project.surfaceDrafts, nextSurface])
        });
  const regionId = existingPathRegion?.regionId ?? createMapEditorRegionId(surfaceProject);
  const nextRegion =
    existingPathRegion ??
    freezeRegionDraft({
      center: snappedCenter,
      label: `Path ${surfaceProject.regionDrafts.length + 1}`,
      materialReferenceId: null,
      regionId,
      regionKind: "path",
      rotationYRadians: 0,
      size: defaultPathSurfaceSize,
      surfaceId
    });
  const nextProject =
    existingPathRegion !== null
      ? surfaceProject
      : Object.freeze({
          ...surfaceProject,
          regionDrafts: Object.freeze([...surfaceProject.regionDrafts, nextRegion])
        });

  return Object.freeze({
    center: snappedCenter,
    project: nextProject,
    regionId,
    surfaceId
  });
}

function createMapEditorWallDraftsForSegment(
  project: MapEditorProjectSnapshot,
  start: MetaverseWorldSurfaceVector3Snapshot,
  end: MetaverseWorldSurfaceVector3Snapshot,
  edgeKind: MapEditorEdgeDraftSnapshot["edgeKind"]
): {
  readonly edgeId: string;
  readonly project: MapEditorProjectSnapshot;
} | null {
  const deltaX = end.x - start.x;
  const deltaZ = end.z - start.z;
  const lengthMeters = Math.max(Math.abs(deltaX), Math.abs(deltaZ));

  if (lengthMeters < mapEditorBuildGridUnitMeters * 0.5) {
    return null;
  }

  const rotationYRadians =
    Math.abs(deltaX) >= Math.abs(deltaZ) ? 0 : Math.PI * 0.5;
  const center = Object.freeze({
    x: (start.x + end.x) * 0.5,
    y: start.y,
    z: (start.z + end.z) * 0.5
  });
  const surfaceSize = Object.freeze({
    x:
      rotationYRadians === 0
        ? Math.max(mapEditorBuildGridUnitMeters, lengthMeters)
        : defaultWallThicknessMeters,
    y: defaultWallHeightMeters,
    z:
      rotationYRadians === 0
        ? defaultWallThicknessMeters
        : Math.max(mapEditorBuildGridUnitMeters, lengthMeters)
  });
  const { project: projectWithSurface, surfaceId } = createSemanticSurfaceForPlacement(
    project,
    `Wall Surface ${project.surfaceDrafts.length + 1}`,
    center,
    rotationYRadians,
    surfaceSize
  );
  const nextEdge = freezeEdgeDraft({
    center: Object.freeze({
      x: center.x,
      y: center.y + defaultWallHeightMeters * 0.5,
      z: center.z
    }),
    edgeId: createMapEditorEdgeId(projectWithSurface),
    edgeKind,
    heightMeters: defaultWallHeightMeters,
    label: `${edgeKind[0]?.toUpperCase()}${edgeKind.slice(1)} ${project.edgeDrafts.length + 1}`,
    lengthMeters: Math.max(mapEditorBuildGridUnitMeters, lengthMeters),
    rotationYRadians,
    surfaceId,
    thicknessMeters: defaultWallThicknessMeters
  });

  return Object.freeze({
    edgeId: nextEdge.edgeId,
    project: Object.freeze({
      ...projectWithSurface,
      edgeDrafts: Object.freeze([...projectWithSurface.edgeDrafts, nextEdge])
    })
  });
}

function createModuleDraftFromAsset(
  project: MapEditorProjectSnapshot,
  asset: EnvironmentAssetDescriptor,
  position: MetaverseWorldSurfaceVector3Snapshot
): MapEditorPlacementDraftSnapshot {
  const placementId = createMapEditorPlacementId(project, asset.id);

  return freezePlacementDraft({
    assetId: asset.id,
    colliderCount: resolveModuleColliderCount(
      asset.physicsColliders ?? Object.freeze([]),
      asset.collider
    ),
    collisionEnabled: true,
    collisionPath: asset.collisionPath,
    collider: asset.collider,
    dynamicBody: asset.dynamicBody ?? null,
    entries: asset.entries,
    isVisible: true,
    materialReferenceId: null,
    moduleId: placementId,
    notes: "",
    placementId,
    placementMode: asset.placement,
    position,
    rotationYRadians: 0,
    scale: freezePlacementScale(1),
    seats: asset.seats,
    surfaceColliders:
      asset.physicsColliders === null
        ? Object.freeze([])
        : Object.freeze(
            asset.physicsColliders.map((collider) =>
              Object.freeze({
                center: Object.freeze({
                  x: collider.center.x,
                  y: collider.center.y,
                  z: collider.center.z
                }),
                size: Object.freeze({
                  x: collider.size.x,
                  y: collider.size.y,
                  z: collider.size.z
                }),
                traversalAffordance: collider.traversalAffordance
              })
            )
          ),
    traversalAffordance: asset.traversalAffordance
  });
}

export function createMapEditorProject(
  loadedBundle: LoadedMetaverseMapBundleSnapshot
): MapEditorProjectSnapshot {
  const semanticDrafts = createSemanticDraftsFromBundle(loadedBundle);
  const launchVariationDrafts = createLaunchVariationDrafts(loadedBundle);
  const selectedLaunchVariationId =
    launchVariationDrafts[0]?.variationId ?? null;
  const selectedEntityRef = resolveInitialSelectedEntityRef(semanticDrafts);

  return Object.freeze({
    bundleId: loadedBundle.bundle.mapId,
    bundleLabel: loadedBundle.bundle.label,
    cameraProfileId: loadedBundle.cameraProfile?.id ?? null,
    characterPresentationProfileId:
      loadedBundle.characterPresentationProfile?.id ?? null,
    connectorDrafts: semanticDrafts.connectorDrafts,
    description: loadedBundle.bundle.description,
    edgeDrafts: semanticDrafts.edgeDrafts,
    environmentPresentationProfileId:
      loadedBundle.environmentPresentationProfile?.id ?? null,
    gameplayProfileId: loadedBundle.gameplayProfile.id,
    hudProfileId: loadedBundle.hudProfile?.id ?? null,
    launchVariationDrafts,
    placementDrafts: semanticDrafts.placementDrafts,
    playerSpawnDrafts: createPlayerSpawnDrafts(loadedBundle),
    playerSpawnSelectionDraft: createPlayerSpawnSelectionDraft(loadedBundle),
    regionDrafts: semanticDrafts.regionDrafts,
    sceneObjectDrafts: createSceneObjectDrafts(loadedBundle),
    selectedEntityRef,
    selectedLaunchVariationId,
    selectedPlacementId: createSelectedPlacementId(selectedEntityRef),
    semanticCompatibilityAssetIds: semanticDrafts.semanticCompatibilityAssetIds,
    surfaceDrafts: semanticDrafts.surfaceDrafts,
    terrainChunkDrafts: semanticDrafts.terrainChunkDrafts,
    waterRegionDrafts: createWaterRegionDrafts(loadedBundle)
  });
}

export function readSelectedMapEditorLaunchVariation(
  project: MapEditorProjectSnapshot
): MapEditorLaunchVariationDraftSnapshot | null {
  if (project.selectedLaunchVariationId === null) {
    return null;
  }

  return (
    project.launchVariationDrafts.find(
      (variation) => variation.variationId === project.selectedLaunchVariationId
    ) ?? null
  );
}

export function readSelectedMapEditorPlacement(
  project: MapEditorProjectSnapshot
): MapEditorPlacementDraftSnapshot | null {
  if (project.selectedEntityRef?.kind !== "module") {
    return null;
  }

  return (
    project.placementDrafts.find(
      (placement) => placement.placementId === project.selectedEntityRef?.id
    ) ?? null
  );
}

export function selectMapEditorEntity(
  project: MapEditorProjectSnapshot,
  entityRef: MapEditorSelectedEntityRef | null
): MapEditorProjectSnapshot {
  if (entityRef === null) {
    return withSelectedEntity(project, null);
  }

  const exists =
    (entityRef.kind === "module" &&
      project.placementDrafts.some(
        (placement) => placement.placementId === entityRef.id
      )) ||
    (entityRef.kind === "surface" &&
      project.surfaceDrafts.some((surface) => surface.surfaceId === entityRef.id)) ||
    (entityRef.kind === "region" &&
      project.regionDrafts.some((region) => region.regionId === entityRef.id)) ||
    (entityRef.kind === "edge" &&
      project.edgeDrafts.some((edge) => edge.edgeId === entityRef.id)) ||
    (entityRef.kind === "connector" &&
      project.connectorDrafts.some(
        (connector) => connector.connectorId === entityRef.id
      )) ||
    (entityRef.kind === "terrain-chunk" &&
      project.terrainChunkDrafts.some(
        (terrainChunk) => terrainChunk.chunkId === entityRef.id
      )) ||
    (entityRef.kind === "player-spawn" &&
      project.playerSpawnDrafts.some((spawn) => spawn.spawnId === entityRef.id)) ||
    (entityRef.kind === "scene-object" &&
      project.sceneObjectDrafts.some((object) => object.objectId === entityRef.id)) ||
    (entityRef.kind === "water-region" &&
      project.waterRegionDrafts.some(
        (waterRegion) => waterRegion.waterRegionId === entityRef.id
      ));

  return exists ? withSelectedEntity(project, entityRef) : project;
}

export function selectMapEditorPlacement(
  project: MapEditorProjectSnapshot,
  placementId: string
): MapEditorProjectSnapshot {
  return selectMapEditorEntity(
    project,
    Object.freeze({
      id: placementId,
      kind: "module"
    })
  );
}

export function selectMapEditorLaunchVariation(
  project: MapEditorProjectSnapshot,
  variationId: string
): MapEditorProjectSnapshot {
  if (
    !project.launchVariationDrafts.some(
      (variation) => variation.variationId === variationId
    )
  ) {
    return project;
  }

  return Object.freeze({
    ...project,
    selectedLaunchVariationId: variationId
  });
}

export function updateMapEditorPlacement(
  project: MapEditorProjectSnapshot,
  placementId: string,
  update: (
    draft: MapEditorPlacementDraftSnapshot
  ) => MapEditorPlacementDraftSnapshot
): MapEditorProjectSnapshot {
  return Object.freeze({
    ...project,
    placementDrafts: Object.freeze(
      project.placementDrafts.map((placement) =>
        placement.placementId === placementId
          ? freezePlacementDraft(update(placement))
          : placement
      )
    )
  });
}

export function updateMapEditorRegionDraft(
  project: MapEditorProjectSnapshot,
  regionId: string,
  update: (
    draft: MapEditorRegionDraftSnapshot
  ) => MapEditorRegionDraftSnapshot
): MapEditorProjectSnapshot {
  return Object.freeze({
    ...project,
    regionDrafts: Object.freeze(
      project.regionDrafts.map((region) =>
        region.regionId === regionId ? freezeRegionDraft(update(region)) : region
      )
    )
  });
}

export function updateMapEditorEdgeDraft(
  project: MapEditorProjectSnapshot,
  edgeId: string,
  update: (draft: MapEditorEdgeDraftSnapshot) => MapEditorEdgeDraftSnapshot
): MapEditorProjectSnapshot {
  return Object.freeze({
    ...project,
    edgeDrafts: Object.freeze(
      project.edgeDrafts.map((edge) =>
        edge.edgeId === edgeId ? freezeEdgeDraft(update(edge)) : edge
      )
    )
  });
}

export function updateMapEditorSurfaceDraft(
  project: MapEditorProjectSnapshot,
  surfaceId: string,
  update: (
    draft: MapEditorSurfaceDraftSnapshot
  ) => MapEditorSurfaceDraftSnapshot
): MapEditorProjectSnapshot {
  return Object.freeze({
    ...project,
    surfaceDrafts: Object.freeze(
      project.surfaceDrafts.map((surface) =>
        surface.surfaceId === surfaceId ? freezeSurfaceDraft(update(surface)) : surface
      )
    )
  });
}

export function updateMapEditorConnectorDraft(
  project: MapEditorProjectSnapshot,
  connectorId: string,
  update: (
    draft: MapEditorConnectorDraftSnapshot
  ) => MapEditorConnectorDraftSnapshot
): MapEditorProjectSnapshot {
  return Object.freeze({
    ...project,
    connectorDrafts: Object.freeze(
      project.connectorDrafts.map((connector) =>
        connector.connectorId === connectorId
          ? freezeConnectorDraft(update(connector))
          : connector
      )
    )
  });
}

export function updateMapEditorTerrainChunkDraft(
  project: MapEditorProjectSnapshot,
  chunkId: string,
  update: (
    draft: MapEditorTerrainChunkDraftSnapshot
  ) => MapEditorTerrainChunkDraftSnapshot
): MapEditorProjectSnapshot {
  return Object.freeze({
    ...project,
    terrainChunkDrafts: Object.freeze(
      project.terrainChunkDrafts.map((terrainChunk) =>
        terrainChunk.chunkId === chunkId ? Object.freeze(update(terrainChunk)) : terrainChunk
      )
    )
  });
}

export function removeMapEditorPlacement(
  project: MapEditorProjectSnapshot,
  placementId: string
): MapEditorProjectSnapshot {
  const nextPlacements = Object.freeze(
    project.placementDrafts.filter((placement) => placement.placementId !== placementId)
  );

  return withSelectedEntity(
    Object.freeze({
      ...project,
      placementDrafts: nextPlacements
    }),
    project.selectedEntityRef?.kind === "module" &&
      project.selectedEntityRef.id === placementId
      ? (nextPlacements[0] === undefined
          ? null
          : Object.freeze({
              id: nextPlacements[0].placementId,
              kind: "module"
            }))
      : project.selectedEntityRef
  );
}

export function removeMapEditorPlacementsByAssetId(
  project: MapEditorProjectSnapshot,
  assetId: string
): MapEditorProjectSnapshot {
  const nextPlacements = Object.freeze(
    project.placementDrafts.filter((placement) => placement.assetId !== assetId)
  );

  return withSelectedEntity(
    Object.freeze({
      ...project,
      placementDrafts: nextPlacements
    }),
    project.selectedEntityRef?.kind === "module" &&
      !nextPlacements.some(
        (placement) => placement.placementId === project.selectedEntityRef?.id
      )
      ? (nextPlacements[0] === undefined
          ? null
          : Object.freeze({
              id: nextPlacements[0].placementId,
              kind: "module"
            }))
      : project.selectedEntityRef
  );
}

export function removeMapEditorEntity(
  project: MapEditorProjectSnapshot,
  entityRef = project.selectedEntityRef
): MapEditorProjectSnapshot {
  if (entityRef === null) {
    return project;
  }

  switch (entityRef.kind) {
    case "module":
      return removeMapEditorPlacement(project, entityRef.id);
    case "player-spawn": {
      const nextProject = Object.freeze({
        ...project,
        playerSpawnDrafts: Object.freeze(
          project.playerSpawnDrafts.filter((spawnDraft) => spawnDraft.spawnId !== entityRef.id)
        )
      });

      return withSelectedEntity(
        nextProject,
        resolveNextSelectionAfterRemoval(project, nextProject, entityRef)
      );
    }
    case "scene-object": {
      const nextProject = Object.freeze({
        ...project,
        sceneObjectDrafts: Object.freeze(
          project.sceneObjectDrafts.filter(
            (sceneObjectDraft) => sceneObjectDraft.objectId !== entityRef.id
          )
        )
      });

      return withSelectedEntity(
        nextProject,
        resolveNextSelectionAfterRemoval(project, nextProject, entityRef)
      );
    }
    case "water-region": {
      const nextProject = Object.freeze({
        ...project,
        waterRegionDrafts: Object.freeze(
          project.waterRegionDrafts.filter(
            (waterRegionDraft) => waterRegionDraft.waterRegionId !== entityRef.id
          )
        )
      });

      return withSelectedEntity(
        nextProject,
        resolveNextSelectionAfterRemoval(project, nextProject, entityRef)
      );
    }
    case "region": {
      const nextProject = Object.freeze({
        ...project,
        regionDrafts: Object.freeze(
          project.regionDrafts.filter((regionDraft) => regionDraft.regionId !== entityRef.id)
        )
      });

      return withSelectedEntity(
        nextProject,
        resolveNextSelectionAfterRemoval(project, nextProject, entityRef)
      );
    }
    case "edge": {
      const nextProject = Object.freeze({
        ...project,
        edgeDrafts: Object.freeze(
          project.edgeDrafts.filter((edgeDraft) => edgeDraft.edgeId !== entityRef.id)
        )
      });

      return withSelectedEntity(
        nextProject,
        resolveNextSelectionAfterRemoval(project, nextProject, entityRef)
      );
    }
    case "connector": {
      const nextProject = Object.freeze({
        ...project,
        connectorDrafts: Object.freeze(
          project.connectorDrafts.filter(
            (connectorDraft) => connectorDraft.connectorId !== entityRef.id
          )
        )
      });

      return withSelectedEntity(
        nextProject,
        resolveNextSelectionAfterRemoval(project, nextProject, entityRef)
      );
    }
    case "surface": {
      const removedSurfaceId = entityRef.id;
      const removedRegionIds = new Set(
        project.regionDrafts
          .filter((regionDraft) => regionDraft.surfaceId === removedSurfaceId)
          .map((regionDraft) => regionDraft.regionId)
      );
      const removedEdgeIds = new Set(
        project.edgeDrafts
          .filter((edgeDraft) => edgeDraft.surfaceId === removedSurfaceId)
          .map((edgeDraft) => edgeDraft.edgeId)
      );
      const removedConnectorIds = new Set(
        project.connectorDrafts
          .filter(
            (connectorDraft) =>
              connectorDraft.fromSurfaceId === removedSurfaceId ||
              connectorDraft.toSurfaceId === removedSurfaceId
          )
          .map((connectorDraft) => connectorDraft.connectorId)
      );
      const nextProject = Object.freeze({
        ...project,
        connectorDrafts: Object.freeze(
          project.connectorDrafts.filter(
            (connectorDraft) => !removedConnectorIds.has(connectorDraft.connectorId)
          )
        ),
        edgeDrafts: Object.freeze(
          project.edgeDrafts.filter((edgeDraft) => !removedEdgeIds.has(edgeDraft.edgeId))
        ),
        regionDrafts: Object.freeze(
          project.regionDrafts.filter(
            (regionDraft) => !removedRegionIds.has(regionDraft.regionId)
          )
        ),
        surfaceDrafts: Object.freeze(
          project.surfaceDrafts.filter((surfaceDraft) => surfaceDraft.surfaceId !== removedSurfaceId)
        )
      });

      return withSelectedEntity(
        nextProject,
        resolveNextSelectionAfterRemoval(project, nextProject, entityRef)
      );
    }
    case "terrain-chunk": {
      const removedChunkId = entityRef.id;
      const removedSurfaceIds = new Set(
        project.surfaceDrafts
          .filter((surfaceDraft) => surfaceDraft.terrainChunkId === removedChunkId)
          .map((surfaceDraft) => surfaceDraft.surfaceId)
      );
      const removedRegionIds = new Set(
        project.regionDrafts
          .filter((regionDraft) => removedSurfaceIds.has(regionDraft.surfaceId))
          .map((regionDraft) => regionDraft.regionId)
      );
      const removedEdgeIds = new Set(
        project.edgeDrafts
          .filter((edgeDraft) => removedSurfaceIds.has(edgeDraft.surfaceId))
          .map((edgeDraft) => edgeDraft.edgeId)
      );
      const removedConnectorIds = new Set(
        project.connectorDrafts
          .filter(
            (connectorDraft) =>
              removedSurfaceIds.has(connectorDraft.fromSurfaceId) ||
              removedSurfaceIds.has(connectorDraft.toSurfaceId)
          )
          .map((connectorDraft) => connectorDraft.connectorId)
      );
      const nextProject = Object.freeze({
        ...project,
        connectorDrafts: Object.freeze(
          project.connectorDrafts.filter(
            (connectorDraft) => !removedConnectorIds.has(connectorDraft.connectorId)
          )
        ),
        edgeDrafts: Object.freeze(
          project.edgeDrafts.filter((edgeDraft) => !removedEdgeIds.has(edgeDraft.edgeId))
        ),
        regionDrafts: Object.freeze(
          project.regionDrafts.filter(
            (regionDraft) => !removedRegionIds.has(regionDraft.regionId)
          )
        ),
        surfaceDrafts: Object.freeze(
          project.surfaceDrafts.filter(
            (surfaceDraft) => !removedSurfaceIds.has(surfaceDraft.surfaceId)
          )
        ),
        terrainChunkDrafts: Object.freeze(
          project.terrainChunkDrafts.filter(
            (terrainChunkDraft) => terrainChunkDraft.chunkId !== removedChunkId
          )
        )
      });

      return withSelectedEntity(
        nextProject,
        resolveNextSelectionAfterRemoval(project, nextProject, entityRef)
      );
    }
  }
}

export function addMapEditorLaunchVariationDraft(
  project: MapEditorProjectSnapshot
): MapEditorProjectSnapshot {
  const nextVariation = freezeLaunchVariationDraft({
    description: "",
    experienceId: null,
    gameplayVariationId: null,
    label: "New Variation",
    matchMode: "free-roam",
    variationId: createMapEditorLaunchVariationId(project),
    vehicleLayoutId: null,
    weaponLayoutId: null
  });

  return Object.freeze({
    ...project,
    launchVariationDrafts: Object.freeze([
      ...project.launchVariationDrafts,
      nextVariation
    ]),
    selectedLaunchVariationId: nextVariation.variationId
  });
}

export function addMapEditorPlayerSpawnDraft(
  project: MapEditorProjectSnapshot
): MapEditorProjectSnapshot {
  const nextSpawn = freezePlayerSpawnDraft({
    label: `Player Spawn ${project.playerSpawnDrafts.length + 1}`,
    position: createMapEditorSceneDraftPosition(project, Object.freeze({
      x: 4,
      y: 0,
      z: 0
    })),
    spawnId: createMapEditorPlayerSpawnId(project),
    teamId: "neutral",
    yawRadians: 0
  });

  return withSelectedEntity(
    Object.freeze({
      ...project,
      playerSpawnDrafts: Object.freeze([...project.playerSpawnDrafts, nextSpawn])
    }),
    Object.freeze({
      id: nextSpawn.spawnId,
      kind: "player-spawn"
    })
  );
}

export function addMapEditorSceneObjectDraft(
  project: MapEditorProjectSnapshot
): MapEditorProjectSnapshot {
  const nextSceneObject = freezeSceneObjectDraft({
    assetId: null,
    label: `Launch Object ${project.sceneObjectDrafts.length + 1}`,
    launchTarget: Object.freeze({
      beamColorHex: "#f4ba2b",
      experienceId: "duck-hunt",
      highlightRadius: 22,
      interactionRadius: 10,
      ringColorHex: "#f6d06a"
    }),
    objectId: createMapEditorSceneObjectId(project),
    position: createMapEditorSceneDraftPosition(project, Object.freeze({
      x: 0,
      y: 6,
      z: -12
    })),
    rotationYRadians: 0,
    scale: 1
  });

  return withSelectedEntity(
    Object.freeze({
      ...project,
      sceneObjectDrafts: Object.freeze([
        ...project.sceneObjectDrafts,
        nextSceneObject
      ])
    }),
    Object.freeze({
      id: nextSceneObject.objectId,
      kind: "scene-object"
    })
  );
}

export function addMapEditorWaterRegionDraft(
  project: MapEditorProjectSnapshot,
  position = createMapEditorSceneDraftPosition(project, Object.freeze({
    x: 0,
    y: 0,
    z: 0
  })),
  options?: {
    readonly depthMeters?: number;
    readonly topElevationMeters?: number;
    readonly widthCells?: number;
    readonly zCells?: number;
  }
): MapEditorProjectSnapshot {
  const snappedPosition = snapMapEditorPositionToGrid(position);
  const nextWaterRegion = freezeWaterRegionDraft({
    depthMeters: Math.max(0.5, options?.depthMeters ?? 4),
    footprint: Object.freeze({
      centerX: snappedPosition.x,
      centerZ: snappedPosition.z,
      sizeCellsX: Math.max(1, options?.widthCells ?? 6),
      sizeCellsZ: Math.max(1, options?.zCells ?? 6)
    }),
    previewColorHex:
      project.waterRegionDrafts[project.waterRegionDrafts.length - 1]?.previewColorHex ??
      "#2f7f9c",
    previewOpacity: 0.58,
    topElevationMeters: options?.topElevationMeters ?? snappedPosition.y,
    waterRegionId: createMapEditorWaterRegionId(project)
  });

  return withSelectedEntity(
    Object.freeze({
      ...project,
      waterRegionDrafts: Object.freeze([
        ...project.waterRegionDrafts,
        nextWaterRegion
      ])
    }),
    Object.freeze({
      id: nextWaterRegion.waterRegionId,
      kind: "water-region"
    })
  );
}

export function addMapEditorTerrainChunkDraft(
  project: MapEditorProjectSnapshot,
  position = createMapEditorSceneDraftPosition(project, Object.freeze({
    x: 0,
    y: 0,
    z: 0
  }))
): MapEditorProjectSnapshot {
  const snappedPosition = snapMapEditorPositionToGrid(position);
  const nextTerrainChunk = Object.freeze({
    chunkId: createMapEditorTerrainChunkId(project),
    heights: createTerrainChunkHeights(
      defaultTerrainChunkSampleCount,
      defaultTerrainChunkSampleCount
    ),
    label: `Terrain Chunk ${project.terrainChunkDrafts.length + 1}`,
    origin: snappedPosition,
    sampleCountX: defaultTerrainChunkSampleCount,
    sampleCountZ: defaultTerrainChunkSampleCount,
    sampleStrideMeters: mapEditorBuildGridUnitMeters,
    waterLevelMeters: null
  } satisfies MapEditorTerrainChunkDraftSnapshot);

  return withSelectedEntity(
    Object.freeze({
      ...project,
      terrainChunkDrafts: Object.freeze([
        ...project.terrainChunkDrafts,
        nextTerrainChunk
      ])
    }),
    Object.freeze({
      id: nextTerrainChunk.chunkId,
      kind: "terrain-chunk"
    })
  );
}

export function addMapEditorSurfaceDraft(
  project: MapEditorProjectSnapshot
): MapEditorProjectSnapshot {
  const nextSurface = freezeSurfaceDraft({
    center: createMapEditorSceneDraftPosition(project, Object.freeze({
      x: 0,
      y: 0,
      z: 0
    })),
    elevation: 0,
    kind: "flat-slab",
    label: `Surface ${project.surfaceDrafts.length + 1}`,
    rotationYRadians: 0,
    size: Object.freeze({
      x: 8,
      y: 0.5,
      z: 8
    }),
    surfaceId: createMapEditorSurfaceId(project),
    terrainChunkId: null
  });

  return withSelectedEntity(
    Object.freeze({
      ...project,
      surfaceDrafts: Object.freeze([...project.surfaceDrafts, nextSurface])
    }),
    Object.freeze({
      id: nextSurface.surfaceId,
      kind: "surface"
    })
  );
}

export function addMapEditorRegionDraft(
  project: MapEditorProjectSnapshot,
  position = createMapEditorSceneDraftPosition(project, Object.freeze({
    x: 0,
    y: 0,
    z: 0
  }))
): MapEditorProjectSnapshot {
  const { project: projectWithSurface, surfaceId } = createSemanticSurfaceForPlacement(
    project,
    `Surface ${project.surfaceDrafts.length + 1}`,
    position,
    0,
    Object.freeze({
      x: 8,
      y: 0.5,
      z: 8
    })
  );
  const nextRegion = freezeRegionDraft({
    center: position,
    label: `Region ${project.regionDrafts.length + 1}`,
    materialReferenceId: null,
    regionId: createMapEditorRegionId(projectWithSurface),
    regionKind: "floor",
    rotationYRadians: 0,
    size: Object.freeze({
      x: 8,
      y: 0.5,
      z: 8
    }),
    surfaceId
  });

  return withSelectedEntity(
    Object.freeze({
      ...projectWithSurface,
      regionDrafts: Object.freeze([...projectWithSurface.regionDrafts, nextRegion])
    }),
    Object.freeze({
      id: nextRegion.regionId,
      kind: "region"
    })
  );
}

export function addMapEditorEdgeDraft(
  project: MapEditorProjectSnapshot,
  position = createMapEditorSceneDraftPosition(project, Object.freeze({
    x: 0,
    y: 0,
    z: 0
  }))
): MapEditorProjectSnapshot {
  const { project: projectWithSurface, surfaceId } = createSemanticSurfaceForPlacement(
    project,
    `Edge Surface ${project.surfaceDrafts.length + 1}`,
    position,
    0,
    Object.freeze({
      x: 8,
      y: 4,
      z: 0.5
    })
  );
  const nextEdge = freezeEdgeDraft({
    center: Object.freeze({
      x: position.x,
      y: position.y + 2,
      z: position.z
    }),
    edgeId: createMapEditorEdgeId(projectWithSurface),
    edgeKind: "wall",
    heightMeters: 4,
    label: `Edge ${project.edgeDrafts.length + 1}`,
    lengthMeters: 8,
    rotationYRadians: 0,
    surfaceId,
    thicknessMeters: 0.5
  });

  return withSelectedEntity(
    Object.freeze({
      ...projectWithSurface,
      edgeDrafts: Object.freeze([...projectWithSurface.edgeDrafts, nextEdge])
    }),
    Object.freeze({
      id: nextEdge.edgeId,
      kind: "edge"
    })
  );
}

export function addMapEditorConnectorDraft(
  project: MapEditorProjectSnapshot,
  position = createMapEditorSceneDraftPosition(project, Object.freeze({
    x: 0,
    y: 0.5,
    z: 0
  }))
): MapEditorProjectSnapshot {
  const fromSurfaceId = project.surfaceDrafts[0]?.surfaceId ?? createMapEditorSurfaceId(project);
  const toSurfaceId = project.surfaceDrafts[1]?.surfaceId ?? fromSurfaceId;
  const nextConnector = freezeConnectorDraft({
    center: position,
    connectorId: createMapEditorConnectorId(project),
    connectorKind: "stairs",
    fromSurfaceId,
    label: `Connector ${project.connectorDrafts.length + 1}`,
    rotationYRadians: 0,
    size: Object.freeze({
      x: 4,
      y: 1,
      z: 4
    }),
    toSurfaceId
  });

  return withSelectedEntity(
    Object.freeze({
      ...project,
      connectorDrafts: Object.freeze([
        ...project.connectorDrafts,
        nextConnector
      ])
    }),
    Object.freeze({
      id: nextConnector.connectorId,
      kind: "connector"
    })
  );
}

export function applyMapEditorTerrainBrush(
  project: MapEditorProjectSnapshot,
  position: MetaverseWorldSurfaceVector3Snapshot,
  brushMode: MapEditorTerrainBrushMode,
  brushSizeCells: MapEditorTerrainBrushSizeCells,
  smoothEdges: boolean
): MapEditorProjectSnapshot {
  const snappedPosition = snapMapEditorPositionToGrid(position);
  let nextProject = project;
  let terrainChunk = findTerrainChunkAtPosition(nextProject, snappedPosition);

  if (terrainChunk === null) {
    nextProject = addMapEditorTerrainChunkDraft(nextProject, snappedPosition);
    terrainChunk =
      nextProject.terrainChunkDrafts[nextProject.terrainChunkDrafts.length - 1] ?? null;
  }

  if (terrainChunk === null) {
    return nextProject;
  }

  const targetCell = resolveTerrainCellIndices(terrainChunk, snappedPosition);

  if (targetCell === null) {
    return nextProject;
  }

  const nextHeights = [...terrainChunk.heights];
  const brushOffsetX = Math.floor(brushSizeCells * 0.5);
  const brushOffsetZ = Math.floor(brushSizeCells * 0.5);
  const minCellX = targetCell.cellX - brushOffsetX;
  const minCellZ = targetCell.cellZ - brushOffsetZ;
  const maxCellX = minCellX + brushSizeCells - 1;
  const maxCellZ = minCellZ + brushSizeCells - 1;

  for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
    if (cellZ < 0 || cellZ >= terrainChunk.sampleCountZ) {
      continue;
    }

    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      if (cellX < 0 || cellX >= terrainChunk.sampleCountX) {
        continue;
      }

      const heightIndex = createTerrainHeightIndex(terrainChunk, cellX, cellZ);
      const currentHeight = nextHeights[heightIndex] ?? 0;
      const cellDistance = Math.max(
        Math.abs(cellX - targetCell.cellX),
        Math.abs(cellZ - targetCell.cellZ)
      );
      const falloffRadius = Math.max(1, brushSizeCells - 1);
      const weight =
        smoothEdges === true
          ? Math.max(0.2, 1 - cellDistance / falloffRadius)
          : 1;
      let nextHeight = currentHeight;

      switch (brushMode) {
        case "raise":
          nextHeight = currentHeight + defaultTerrainBrushHeightDeltaMeters * weight;
          break;
        case "lower":
          nextHeight = currentHeight - defaultTerrainBrushHeightDeltaMeters * weight;
          break;
        case "smooth": {
          let totalHeight = 0;
          let neighborCount = 0;

          for (let neighborZ = cellZ - 1; neighborZ <= cellZ + 1; neighborZ += 1) {
            if (neighborZ < 0 || neighborZ >= terrainChunk.sampleCountZ) {
              continue;
            }

            for (let neighborX = cellX - 1; neighborX <= cellX + 1; neighborX += 1) {
              if (neighborX < 0 || neighborX >= terrainChunk.sampleCountX) {
                continue;
              }

              totalHeight +=
                nextHeights[
                  createTerrainHeightIndex(terrainChunk, neighborX, neighborZ)
                ] ?? 0;
              neighborCount += 1;
            }
          }

          const averageHeight = neighborCount > 0 ? totalHeight / neighborCount : currentHeight;

          nextHeight = currentHeight + (averageHeight - currentHeight) * weight;
          break;
        }
      }

      nextHeights[heightIndex] = Math.round(nextHeight * 100) / 100;
    }
  }

  return withSelectedEntity(
    updateMapEditorTerrainChunkDraft(nextProject, terrainChunk.chunkId, (draft) => ({
      ...draft,
      heights: Object.freeze(nextHeights)
    })),
    Object.freeze({
      id: terrainChunk.chunkId,
      kind: "terrain-chunk"
    })
  );
}

export function addMapEditorWallSegment(
  project: MapEditorProjectSnapshot,
  startPosition: MetaverseWorldSurfaceVector3Snapshot,
  endPosition: MetaverseWorldSurfaceVector3Snapshot,
  edgeKind: MapEditorEdgeDraftSnapshot["edgeKind"]
): MapEditorProjectSnapshot {
  const snappedStart = snapMapEditorPositionToGrid(startPosition);
  const snappedEnd = snapMapEditorPositionToGrid(endPosition);
  const deltaX = snappedEnd.x - snappedStart.x;
  const deltaZ = snappedEnd.z - snappedStart.z;
  const constrainedEnd =
    Math.abs(deltaX) >= Math.abs(deltaZ)
      ? Object.freeze({
          x: snappedEnd.x,
          y: snappedStart.y,
          z: snappedStart.z
        })
      : Object.freeze({
          x: snappedStart.x,
          y: snappedStart.y,
          z: snappedEnd.z
        });
  const nextDrafts = createMapEditorWallDraftsForSegment(
    project,
    snappedStart,
    constrainedEnd,
    edgeKind
  );

  return nextDrafts === null
    ? project
    : withSelectedEntity(
        nextDrafts.project,
        Object.freeze({
          id: nextDrafts.edgeId,
          kind: "edge"
        })
      );
}

export function addMapEditorPathSegment(
  project: MapEditorProjectSnapshot,
  targetPosition: MetaverseWorldSurfaceVector3Snapshot,
  targetElevationMeters: number,
  fromAnchor:
    | {
        readonly center: MetaverseWorldSurfaceVector3Snapshot;
        readonly elevation: number;
      }
    | null
): MapEditorProjectSnapshot {
  let nextProject = project;
  let fromSurfaceId: string | null = null;
  const target = ensurePathSurfaceAndRegion(
    nextProject,
    targetPosition,
    targetElevationMeters
  );

  nextProject = target.project;

  if (fromAnchor !== null) {
    const source = ensurePathSurfaceAndRegion(
      nextProject,
      fromAnchor.center,
      fromAnchor.elevation
    );

    nextProject = source.project;
    fromSurfaceId = source.surfaceId;

    if (
      source.surfaceId !== target.surfaceId &&
      Math.abs(fromAnchor.elevation - targetElevationMeters) > 0.01
    ) {
      const deltaX = target.center.x - source.center.x;
      const deltaZ = target.center.z - source.center.z;
      const connectorCenter = Object.freeze({
        x: (source.center.x + target.center.x) * 0.5,
        y: (fromAnchor.elevation + targetElevationMeters) * 0.5,
        z: (source.center.z + target.center.z) * 0.5
      });
      const connector = freezeConnectorDraft({
        center: connectorCenter,
        connectorId: createMapEditorConnectorId(nextProject),
        connectorKind: "ramp",
        fromSurfaceId,
        label: `Ramp ${nextProject.connectorDrafts.length + 1}`,
        rotationYRadians: Math.atan2(deltaX, deltaZ),
        size: Object.freeze({
          x: mapEditorBuildGridUnitMeters,
          y: Math.max(
            1,
            Math.abs(targetElevationMeters - fromAnchor.elevation) + 0.5
          ),
          z: Math.max(
            mapEditorBuildGridUnitMeters,
            Math.hypot(deltaX, deltaZ)
          )
        }),
        toSurfaceId: target.surfaceId
      });

      nextProject = Object.freeze({
        ...nextProject,
        connectorDrafts: Object.freeze([...nextProject.connectorDrafts, connector])
      });
    }
  }

  return withSelectedEntity(
    nextProject,
    Object.freeze({
      id: target.regionId,
      kind: "region"
    })
  );
}

export function addMapEditorPlacementFromAsset(
  project: MapEditorProjectSnapshot,
  asset: EnvironmentAssetDescriptor
): MapEditorProjectSnapshot {
  return addMapEditorPlacementAtPositionFromAsset(
    project,
    asset,
    resolveNewPlacementPosition(project, asset.id)
  );
}

export function addMapEditorPlacementAtPositionFromAsset(
  project: MapEditorProjectSnapshot,
  asset: EnvironmentAssetDescriptor,
  position: MapEditorBuildPlacementPositionSnapshot
): MapEditorProjectSnapshot {
  if (asset.id === metaverseBuilderFloorTileEnvironmentAssetId) {
    return addMapEditorRegionDraft(project, position);
  }

  if (asset.id === metaverseBuilderWallTileEnvironmentAssetId) {
    return addMapEditorEdgeDraft(project, position);
  }

  const nextModule = createModuleDraftFromAsset(project, asset, position);

  return withSelectedEntity(
    Object.freeze({
      ...project,
      placementDrafts: Object.freeze([...project.placementDrafts, nextModule])
    }),
    Object.freeze({
      id: nextModule.placementId,
      kind: "module"
    })
  );
}

export function updateMapEditorPlayerSpawnDraft(
  project: MapEditorProjectSnapshot,
  spawnId: string,
  update: (
    draft: MapEditorPlayerSpawnDraftSnapshot
  ) => MapEditorPlayerSpawnDraftSnapshot
): MapEditorProjectSnapshot {
  return Object.freeze({
    ...project,
    playerSpawnDrafts: Object.freeze(
      project.playerSpawnDrafts.map((spawnDraft) =>
        spawnDraft.spawnId === spawnId
          ? freezePlayerSpawnDraft(update(spawnDraft))
          : spawnDraft
      )
    )
  });
}

export function updateMapEditorPlayerSpawnSelectionDraft(
  project: MapEditorProjectSnapshot,
  update: (
    draft: MapEditorPlayerSpawnSelectionDraftSnapshot
  ) => MapEditorPlayerSpawnSelectionDraftSnapshot
): MapEditorProjectSnapshot {
  return Object.freeze({
    ...project,
    playerSpawnSelectionDraft: freezePlayerSpawnSelectionDraft(
      update(project.playerSpawnSelectionDraft)
    )
  });
}

export function updateMapEditorSceneObjectDraft(
  project: MapEditorProjectSnapshot,
  objectId: string,
  update: (
    draft: MapEditorSceneObjectDraftSnapshot
  ) => MapEditorSceneObjectDraftSnapshot
): MapEditorProjectSnapshot {
  return Object.freeze({
    ...project,
    sceneObjectDrafts: Object.freeze(
      project.sceneObjectDrafts.map((sceneObjectDraft) =>
        sceneObjectDraft.objectId === objectId
          ? freezeSceneObjectDraft(update(sceneObjectDraft))
          : sceneObjectDraft
      )
    )
  });
}

export function updateMapEditorWaterRegionDraft(
  project: MapEditorProjectSnapshot,
  waterRegionId: string,
  update: (
    draft: MapEditorWaterRegionDraftSnapshot
  ) => MapEditorWaterRegionDraftSnapshot
): MapEditorProjectSnapshot {
  return Object.freeze({
    ...project,
    waterRegionDrafts: Object.freeze(
      project.waterRegionDrafts.map((waterRegionDraft) =>
        waterRegionDraft.waterRegionId === waterRegionId
          ? freezeWaterRegionDraft(update(waterRegionDraft))
          : waterRegionDraft
      )
    )
  });
}

export function updateMapEditorEnvironmentPresentationProfileId(
  project: MapEditorProjectSnapshot,
  environmentPresentationProfileId: string | null
): MapEditorProjectSnapshot {
  if (
    project.environmentPresentationProfileId ===
    environmentPresentationProfileId
  ) {
    return project;
  }

  return Object.freeze({
    ...project,
    environmentPresentationProfileId
  });
}

export function updateMapEditorGameplayProfileId(
  project: MapEditorProjectSnapshot,
  gameplayProfileId: string
): MapEditorProjectSnapshot {
  if (project.gameplayProfileId === gameplayProfileId) {
    return project;
  }

  return Object.freeze({
    ...project,
    gameplayProfileId
  });
}

export function updateMapEditorLaunchVariationDraft(
  project: MapEditorProjectSnapshot,
  variationId: string,
  update: (
    draft: MapEditorLaunchVariationDraftSnapshot
  ) => MapEditorLaunchVariationDraftSnapshot
): MapEditorProjectSnapshot {
  return Object.freeze({
    ...project,
    launchVariationDrafts: Object.freeze(
      project.launchVariationDrafts.map((launchVariation) =>
        launchVariation.variationId === variationId
          ? freezeLaunchVariationDraft(update(launchVariation))
          : launchVariation
      )
    )
  });
}

export function createSemanticWorldFromProject(
  project: MapEditorProjectSnapshot
) {
  return Object.freeze({
    compatibilityAssetIds: project.semanticCompatibilityAssetIds,
    connectors: Object.freeze(
      project.connectorDrafts.map(createSemanticConnectorSnapshotFromDraft)
    ),
    edges: Object.freeze(project.edgeDrafts.map(createSemanticEdgeSnapshotFromDraft)),
    modules: Object.freeze(
      project.placementDrafts.map((placement) =>
        Object.freeze({
          assetId: placement.assetId,
          collisionEnabled: placement.collisionEnabled,
          collisionPath: placement.collisionPath,
          collider: placement.collider,
          dynamicBody: placement.dynamicBody,
          entries: placement.entries,
          isVisible: placement.isVisible,
          label: placement.assetId,
          materialReferenceId: placement.materialReferenceId,
          moduleId: placement.moduleId,
          notes: placement.notes,
          placementMode: placement.placementMode,
          position: placement.position,
          rotationYRadians: placement.rotationYRadians,
          scale: placement.scale,
          seats: placement.seats,
          surfaceColliders: placement.surfaceColliders,
          traversalAffordance: placement.traversalAffordance
        } satisfies MetaverseMapBundleSemanticModuleSnapshot)
      )
    ),
    regions: Object.freeze(
      project.regionDrafts.map(createSemanticRegionSnapshotFromDraft)
    ),
    surfaces: Object.freeze(
      project.surfaceDrafts.map(createSemanticSurfaceSnapshotFromDraft)
    ),
    terrainChunks: Object.freeze(
      project.terrainChunkDrafts.map(createSemanticTerrainChunkSnapshotFromDraft)
    )
  });
}
