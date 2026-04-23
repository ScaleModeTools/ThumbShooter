import type {
  ExperienceId
} from "../../experience-catalog.js";
import type {
  MetaverseWorldEnvironmentDynamicBodyAuthoring,
  MetaverseWorldEnvironmentTraversalAffordanceId,
  MetaverseWorldMountedEntryAuthoring,
  MetaverseWorldMountedSeatAuthoring,
  MetaverseWorldEnvironmentColliderAuthoring,
  MetaverseWorldSurfaceScaleSnapshot,
  MetaverseWorldSurfaceColliderAuthoring,
  MetaverseWorldSurfacePlacementId,
  MetaverseWorldSurfaceVector3Snapshot,
  MetaverseWorldWaterRegionAuthoring
} from "../../metaverse-world-surface-query.js";
import type { MetaversePlayerTeamId } from "../../metaverse-player-team.js";
import { metaversePlayerTeamIds } from "../../metaverse-player-team.js";
import type { MetaverseMatchModeId } from "../../metaverse-match-mode.js";

export interface MetaverseMapBundlePlacementSnapshot {
  readonly collisionEnabled: boolean;
  readonly isVisible: boolean;
  readonly materialReferenceId: string | null;
  readonly notes: string;
  readonly placementId: string;
  readonly position: MetaverseWorldSurfaceVector3Snapshot;
  readonly rotationYRadians: number;
  readonly scale: MetaverseWorldSurfaceScaleSnapshot;
}

export interface MetaverseMapBundleEnvironmentAssetSnapshot {
  readonly assetId: string;
  readonly collisionPath: string | null;
  readonly collider: MetaverseWorldEnvironmentColliderAuthoring | null;
  readonly dynamicBody: MetaverseWorldEnvironmentDynamicBodyAuthoring | null;
  readonly entries: readonly MetaverseWorldMountedEntryAuthoring[] | null;
  readonly placementMode: MetaverseWorldSurfacePlacementId;
  readonly placements: readonly MetaverseMapBundlePlacementSnapshot[];
  readonly seats: readonly MetaverseWorldMountedSeatAuthoring[] | null;
  readonly surfaceColliders: readonly MetaverseWorldSurfaceColliderAuthoring[];
  readonly traversalAffordance: MetaverseWorldEnvironmentTraversalAffordanceId;
}

export const metaverseMapPlayerSpawnTeamIds = [
  "neutral",
  ...metaversePlayerTeamIds
] as const;

export type MetaverseMapPlayerSpawnTeamId =
  (typeof metaverseMapPlayerSpawnTeamIds)[number];
export type MetaverseMapPlayerTeamId = MetaversePlayerTeamId;

export interface MetaverseMapBundlePlayerSpawnSelectionSnapshot {
  readonly enemyAvoidanceRadiusMeters: number;
  readonly homeTeamBiasMeters: number;
}

export const defaultMetaverseMapBundlePlayerSpawnSelection = Object.freeze({
  enemyAvoidanceRadiusMeters: 18,
  homeTeamBiasMeters: 12
} satisfies MetaverseMapBundlePlayerSpawnSelectionSnapshot);

export interface MetaverseMapBundleSpawnNodeSnapshot {
  readonly label: string;
  readonly position: MetaverseWorldSurfaceVector3Snapshot;
  readonly spawnId: string;
  readonly teamId: MetaverseMapPlayerSpawnTeamId;
  readonly yawRadians: number;
}

export interface MetaverseMapBundleResourceSpawnSnapshot {
  readonly assetId: string | null;
  readonly label: string;
  readonly modeTags: readonly string[];
  readonly position: MetaverseWorldSurfaceVector3Snapshot;
  readonly resourceKind: string;
  readonly respawnCooldownMs: number | null;
  readonly spawnId: string;
  readonly yawRadians: number;
}

export interface MetaverseMapBundlePresentationProfileIds {
  readonly cameraProfileId: string | null;
  readonly characterPresentationProfileId: string | null;
  readonly environmentPresentationProfileId: string | null;
  readonly hudProfileId: string | null;
}

export interface MetaverseMapBundleSceneObjectLaunchTargetCapabilitySnapshot {
  readonly beamColor: readonly [number, number, number];
  readonly experienceId: ExperienceId;
  readonly highlightRadius: number;
  readonly interactionRadius: number;
  readonly kind: "launch-target";
  readonly ringColor: readonly [number, number, number];
}

export type MetaverseMapBundleSceneObjectCapabilitySnapshot =
  | MetaverseMapBundleSceneObjectLaunchTargetCapabilitySnapshot;

export interface MetaverseMapBundleSceneObjectSnapshot {
  readonly assetId: string | null;
  readonly capabilities: readonly MetaverseMapBundleSceneObjectCapabilitySnapshot[];
  readonly label: string;
  readonly objectId: string;
  readonly position: MetaverseWorldSurfaceVector3Snapshot;
  readonly rotationYRadians: number;
  readonly scale: number;
}

export interface MetaverseMapBundleLaunchVariationSnapshot {
  readonly description: string;
  readonly experienceId: ExperienceId | null;
  readonly gameplayVariationId: string | null;
  readonly label: string;
  readonly matchMode: MetaverseMatchModeId | null;
  readonly variationId: string;
  readonly vehicleLayoutId: string | null;
  readonly weaponLayoutId: string | null;
}

export interface MetaverseMapBundleSemanticPlanarPointSnapshot {
  readonly x: number;
  readonly z: number;
}

export interface MetaverseMapBundleSemanticPlanarLoopSnapshot {
  readonly points: readonly MetaverseMapBundleSemanticPlanarPointSnapshot[];
}

export interface MetaverseMapBundleSemanticTerrainChunkSnapshot {
  readonly chunkId: string;
  readonly heights: readonly number[];
  readonly origin: MetaverseWorldSurfaceVector3Snapshot;
  readonly sampleCountX: number;
  readonly sampleCountZ: number;
  readonly sampleStrideMeters: number;
  readonly waterLevelMeters: number | null;
}

export interface MetaverseMapBundleSemanticSurfaceSnapshot {
  readonly center: MetaverseWorldSurfaceVector3Snapshot;
  readonly elevation: number;
  readonly kind: "flat-slab" | "terrain-patch";
  readonly label: string;
  readonly rotationYRadians: number;
  readonly size: MetaverseWorldSurfaceVector3Snapshot;
  readonly surfaceId: string;
  readonly terrainChunkId: string | null;
}

export interface MetaverseMapBundleSemanticRegionSnapshot {
  readonly holes: readonly MetaverseMapBundleSemanticPlanarLoopSnapshot[];
  readonly label: string;
  readonly materialReferenceId: string | null;
  readonly outerLoop: MetaverseMapBundleSemanticPlanarLoopSnapshot;
  readonly regionId: string;
  readonly regionKind: "arena" | "floor" | "path";
  readonly surfaceId: string;
}

export interface MetaverseMapBundleSemanticEdgeSnapshot {
  readonly edgeId: string;
  readonly edgeKind:
    | "curb"
    | "fence"
    | "rail"
    | "retaining-wall"
    | "wall";
  readonly heightMeters: number;
  readonly label: string;
  readonly path: readonly MetaverseMapBundleSemanticPlanarPointSnapshot[];
  readonly surfaceId: string;
  readonly thicknessMeters: number;
}

export interface MetaverseMapBundleSemanticConnectorSnapshot {
  readonly center: MetaverseWorldSurfaceVector3Snapshot;
  readonly connectorId: string;
  readonly connectorKind: "door" | "gate" | "ramp" | "stairs";
  readonly fromSurfaceId: string;
  readonly label: string;
  readonly rotationYRadians: number;
  readonly size: MetaverseWorldSurfaceVector3Snapshot;
  readonly toSurfaceId: string;
}

export interface MetaverseMapBundleSemanticModuleSnapshot {
  readonly assetId: string;
  readonly collisionEnabled: boolean;
  readonly collisionPath: string | null;
  readonly collider: MetaverseWorldEnvironmentColliderAuthoring | null;
  readonly dynamicBody: MetaverseWorldEnvironmentDynamicBodyAuthoring | null;
  readonly entries: readonly MetaverseWorldMountedEntryAuthoring[] | null;
  readonly isVisible: boolean;
  readonly label: string;
  readonly materialReferenceId: string | null;
  readonly moduleId: string;
  readonly notes: string;
  readonly placementMode: MetaverseWorldSurfacePlacementId;
  readonly position: MetaverseWorldSurfaceVector3Snapshot;
  readonly rotationYRadians: number;
  readonly scale: MetaverseWorldSurfaceScaleSnapshot;
  readonly seats: readonly MetaverseWorldMountedSeatAuthoring[] | null;
  readonly surfaceColliders: readonly MetaverseWorldSurfaceColliderAuthoring[];
  readonly traversalAffordance: MetaverseWorldEnvironmentTraversalAffordanceId;
}

export interface MetaverseMapBundleSemanticCompatibilityAssetIdsSnapshot {
  readonly connectorAssetId: string | null;
  readonly floorAssetId: string | null;
  readonly wallAssetId: string | null;
}

export interface MetaverseMapBundleSemanticWorldSnapshot {
  readonly compatibilityAssetIds: MetaverseMapBundleSemanticCompatibilityAssetIdsSnapshot;
  readonly connectors: readonly MetaverseMapBundleSemanticConnectorSnapshot[];
  readonly edges: readonly MetaverseMapBundleSemanticEdgeSnapshot[];
  readonly modules: readonly MetaverseMapBundleSemanticModuleSnapshot[];
  readonly regions: readonly MetaverseMapBundleSemanticRegionSnapshot[];
  readonly surfaces: readonly MetaverseMapBundleSemanticSurfaceSnapshot[];
  readonly terrainChunks: readonly MetaverseMapBundleSemanticTerrainChunkSnapshot[];
}

export interface MetaverseMapBundleCompiledWorldChunkBoundsSnapshot {
  readonly center: MetaverseWorldSurfaceVector3Snapshot;
  readonly size: MetaverseWorldSurfaceVector3Snapshot;
}

export interface MetaverseMapBundleCompiledCollisionBoxSnapshot {
  readonly center: MetaverseWorldSurfaceVector3Snapshot;
  readonly ownerId: string;
  readonly ownerKind:
    | "connector"
    | "edge"
    | "module"
    | "region"
    | "terrain-chunk";
  readonly rotationYRadians: number;
  readonly size: MetaverseWorldSurfaceVector3Snapshot;
  readonly traversalAffordance: "blocker" | "support";
}

export interface MetaverseMapBundleCompiledWorldChunkSnapshot {
  readonly bounds: MetaverseMapBundleCompiledWorldChunkBoundsSnapshot;
  readonly chunkId: string;
  readonly collision: {
    readonly boxes: readonly MetaverseMapBundleCompiledCollisionBoxSnapshot[];
  };
  readonly navigation: {
    readonly connectorIds: readonly string[];
    readonly regionIds: readonly string[];
    readonly surfaceIds: readonly string[];
  };
  readonly render: {
    readonly edgeIds: readonly string[];
    readonly instancedModuleAssetIds: readonly string[];
    readonly regionIds: readonly string[];
    readonly terrainChunkIds: readonly string[];
    readonly transparentEntityIds: readonly string[];
  };
}

export interface MetaverseMapBundleCompiledWorldSnapshot {
  readonly chunkSizeMeters: number;
  readonly chunks: readonly MetaverseMapBundleCompiledWorldChunkSnapshot[];
  readonly compatibilityEnvironmentAssets:
    readonly MetaverseMapBundleEnvironmentAssetSnapshot[];
}

export interface MetaverseMapBundleSnapshot {
  readonly compiledWorld: MetaverseMapBundleCompiledWorldSnapshot;
  readonly description: string;
  readonly environmentAssets: readonly MetaverseMapBundleEnvironmentAssetSnapshot[];
  readonly gameplayProfileId: string;
  readonly launchVariations: readonly MetaverseMapBundleLaunchVariationSnapshot[];
  readonly mapId: string;
  readonly label: string;
  readonly playerSpawnNodes: readonly MetaverseMapBundleSpawnNodeSnapshot[];
  readonly playerSpawnSelection: MetaverseMapBundlePlayerSpawnSelectionSnapshot;
  readonly presentationProfileIds: MetaverseMapBundlePresentationProfileIds;
  readonly resourceSpawns: readonly MetaverseMapBundleResourceSpawnSnapshot[];
  readonly sceneObjects: readonly MetaverseMapBundleSceneObjectSnapshot[];
  readonly semanticWorld: MetaverseMapBundleSemanticWorldSnapshot;
  readonly waterRegions: readonly MetaverseWorldWaterRegionAuthoring[];
}
