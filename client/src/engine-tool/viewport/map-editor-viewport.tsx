import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  Plane,
  PlaneGeometry,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGPURenderer
} from "three/webgpu";

import { environmentPropManifest } from "@/assets/config/environment-prop-manifest";
import type {
  EnvironmentAssetDescriptor,
  EnvironmentRenderLodDescriptor
} from "@/assets/types/environment-asset-manifest";
import {
  mapEditorBuildGridUnitMeters,
  snapMapEditorBuildCoordinateToGrid
} from "@/engine-tool/build/map-editor-build-placement";
import { readMapEditorBuildPrimitiveCatalogEntry } from "@/engine-tool/build/map-editor-build-primitives";
import type {
  MapEditorPlayerSpawnDraftSnapshot,
  MapEditorSceneObjectDraftSnapshot,
  MapEditorWaterRegionDraftSnapshot
} from "@/engine-tool/project/map-editor-project-scene-drafts";
import {
  resolveMapEditorWaterRegionCenter,
  resolveMapEditorWaterRegionSize
} from "@/engine-tool/project/map-editor-project-scene-drafts";
import type {
  MapEditorConnectorDraftSnapshot,
  MapEditorEdgeDraftSnapshot,
  MapEditorPlacementDraftSnapshot,
  MapEditorRegionDraftSnapshot,
  MapEditorSelectedEntityRef,
  MapEditorSurfaceDraftSnapshot,
  MapEditorTerrainChunkDraftSnapshot,
  resolveMapEditorTerrainCellPosition
} from "@/engine-tool/project/map-editor-project-state";
import type {
  MapEditorBuilderToolStateSnapshot,
  MapEditorPlayerSpawnTransformUpdate,
  MapEditorPlacementUpdate,
  MapEditorViewportHelperVisibilitySnapshot,
  MapEditorViewportToolMode
} from "@/engine-tool/types/map-editor";

import type { MapEditorViewportHelperHandles } from "./map-editor-viewport-helpers";
import {
  createMapEditorViewportHelperHandles,
  disposeMapEditorViewportHelperHandles,
  replaceMapEditorViewportSelectionBoundsHelper,
  syncMapEditorViewportHelperVisibility
} from "./map-editor-viewport-helpers";
import { MapEditorViewportKeyboardFlightController } from "./map-editor-viewport-keyboard-flight";
import {
  createMapEditorViewportOrbitControls,
  frameMapEditorViewportCamera
} from "./map-editor-viewport-orbit-controls";
import {
  applyMapEditorViewportPreviewOpacity,
  createMapEditorViewportPlacementCollisionAnchor,
  disposeMapEditorViewportPreviewGroup,
  MapEditorViewportPreviewAssetLibrary,
  syncMapEditorViewportPlacementAnchorTransform,
  syncMapEditorViewportPlacementPreviewAnchor
} from "./map-editor-viewport-preview-assets";
import type { MapEditorViewportSceneDraftHandles } from "./map-editor-viewport-scene-drafts";
import {
  createMapEditorViewportSceneDraftHandles,
  disposeMapEditorViewportSceneDraftHandles,
  syncMapEditorViewportSceneDrafts
} from "./map-editor-viewport-scene-drafts";
import type { MapEditorViewportSemanticDraftHandles } from "./map-editor-viewport-semantic-drafts";
import {
  createMapEditorViewportSemanticDraftHandles,
  disposeMapEditorViewportSemanticDraftHandles,
  syncMapEditorViewportSemanticDrafts
} from "./map-editor-viewport-semantic-drafts";
import { MapEditorViewportTransformController } from "./map-editor-viewport-transform-controls";

interface MapEditorViewportProps {
  readonly activeModuleAssetId: string | null;
  readonly builderToolState: MapEditorBuilderToolStateSnapshot;
  readonly bundleId: string;
  readonly connectorDrafts: readonly MapEditorConnectorDraftSnapshot[];
  readonly edgeDrafts: readonly MapEditorEdgeDraftSnapshot[];
  readonly helperVisibility: MapEditorViewportHelperVisibilitySnapshot;
  readonly onApplyTerrainBrushAtPosition: (position: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  }) => void;
  readonly onCommitPathSegment: (
    targetPosition: {
      readonly x: number;
      readonly y: number;
      readonly z: number;
    },
    targetElevationMeters: number,
    fromAnchor: {
      readonly center: {
        readonly x: number;
        readonly y: number;
        readonly z: number;
      };
      readonly elevation: number;
    } | null
  ) => void;
  readonly onCreateModuleAtPosition: (
    assetId: string,
    position: {
      readonly x: number;
      readonly y: number;
      readonly z: number;
    }
  ) => void;
  readonly onCommitPlacementTransform: (
    placementId: string,
    update: MapEditorPlacementUpdate
  ) => void;
  readonly onCommitPlayerSpawnTransform: (
    spawnId: string,
    update: MapEditorPlayerSpawnTransformUpdate
  ) => void;
  readonly onCommitWallSegment: (
    startPosition: {
      readonly x: number;
      readonly y: number;
      readonly z: number;
    },
    endPosition: {
      readonly x: number;
      readonly y: number;
      readonly z: number;
    }
  ) => void;
  readonly onCreateWaterRegionAtPosition: (position: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  }) => void;
  readonly onSelectEntity: (entityRef: MapEditorSelectedEntityRef | null) => void;
  readonly placementDrafts: readonly MapEditorPlacementDraftSnapshot[];
  readonly playerSpawnDrafts: readonly MapEditorPlayerSpawnDraftSnapshot[];
  readonly regionDrafts: readonly MapEditorRegionDraftSnapshot[];
  readonly sceneObjectDrafts: readonly MapEditorSceneObjectDraftSnapshot[];
  readonly selectedEntityRef: MapEditorSelectedEntityRef | null;
  readonly surfaceDrafts: readonly MapEditorSurfaceDraftSnapshot[];
  readonly terrainChunkDrafts: readonly MapEditorTerrainChunkDraftSnapshot[];
  readonly waterRegionDrafts: readonly MapEditorWaterRegionDraftSnapshot[];
  readonly viewportToolMode: MapEditorViewportToolMode;
}

interface PlacementExtents {
  readonly maxX: number;
  readonly maxZ: number;
  readonly minX: number;
  readonly minZ: number;
}

type MapEditorViewportTransformTarget =
  | {
      readonly id: string;
      readonly kind: "placement";
    }
  | {
      readonly id: string;
      readonly kind: "player-spawn";
    };

interface MapEditorPathAnchorSnapshot {
  readonly center: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  readonly elevation: number;
}

function createTransformTargetFromSelectedEntity(
  selectedEntityRef: MapEditorSelectedEntityRef | null
): MapEditorViewportTransformTarget | null {
  if (selectedEntityRef?.kind === "module") {
    return Object.freeze({
      id: selectedEntityRef.id,
      kind: "placement"
    });
  }

  if (selectedEntityRef?.kind === "player-spawn") {
    return Object.freeze({
      id: selectedEntityRef.id,
      kind: "player-spawn"
    });
  }

  return null;
}

function disposeBuilderPreviewGroup(group: Group): void {
  group.traverse((node) => {
    if (!("isMesh" in node) || node.isMesh !== true) {
      return;
    }

    const mesh = node as Mesh;

    mesh.geometry.dispose();

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    for (const material of materials) {
      material.dispose();
    }
  });

  group.clear();
}

function createPreviewMesh(
  geometry: BoxGeometry | PlaneGeometry,
  material: MeshStandardMaterial
): Mesh {
  return new Mesh(geometry, material);
}

function createPreviewMaterial(
  color: string,
  opacity = 0.28
): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.08,
    opacity,
    roughness: 0.45,
    side: DoubleSide,
    transparent: true
  });
}

function resolveSnappedGroundPosition(point: {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}): {
  readonly x: number;
  readonly y: number;
  readonly z: number;
} {
  return Object.freeze({
    x: snapMapEditorBuildCoordinateToGrid(point.x),
    y: 0,
    z: snapMapEditorBuildCoordinateToGrid(point.z)
  });
}

function resolveWallSegmentEnd(
  startPosition: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  },
  hoverPosition: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  }
): {
  readonly x: number;
  readonly y: number;
  readonly z: number;
} {
  const deltaX = hoverPosition.x - startPosition.x;
  const deltaZ = hoverPosition.z - startPosition.z;

  return Math.abs(deltaX) >= Math.abs(deltaZ)
    ? Object.freeze({
        x: hoverPosition.x,
        y: startPosition.y,
        z: startPosition.z
      })
    : Object.freeze({
        x: startPosition.x,
        y: startPosition.y,
        z: hoverPosition.z
      });
}

function findTerrainChunkAtPosition(
  terrainChunkDrafts: readonly MapEditorTerrainChunkDraftSnapshot[],
  position: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  }
): MapEditorTerrainChunkDraftSnapshot | null {
  return (
    terrainChunkDrafts.find((terrainChunk) => {
      const halfWidth =
        ((terrainChunk.sampleCountX - 1) * terrainChunk.sampleStrideMeters) * 0.5;
      const halfDepth =
        ((terrainChunk.sampleCountZ - 1) * terrainChunk.sampleStrideMeters) * 0.5;

      return (
        Math.abs(position.x - terrainChunk.origin.x) <= halfWidth + 0.01 &&
        Math.abs(position.z - terrainChunk.origin.z) <= halfDepth + 0.01
      );
    }) ?? null
  );
}

function resolveTerrainHeightAtPosition(
  terrainChunkDrafts: readonly MapEditorTerrainChunkDraftSnapshot[],
  position: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  }
): number {
  const terrainChunk = findTerrainChunkAtPosition(terrainChunkDrafts, position);

  if (terrainChunk === null) {
    return 0;
  }

  const halfCellCountX = (terrainChunk.sampleCountX - 1) * 0.5;
  const halfCellCountZ = (terrainChunk.sampleCountZ - 1) * 0.5;
  const cellX = Math.round(
    (position.x - terrainChunk.origin.x) / terrainChunk.sampleStrideMeters +
      halfCellCountX
  );
  const cellZ = Math.round(
    (position.z - terrainChunk.origin.z) / terrainChunk.sampleStrideMeters +
      halfCellCountZ
  );

  if (
    cellX < 0 ||
    cellX >= terrainChunk.sampleCountX ||
    cellZ < 0 ||
    cellZ >= terrainChunk.sampleCountZ
  ) {
    return terrainChunk.origin.y;
  }

  const heightIndex = cellZ * terrainChunk.sampleCountX + cellX;

  return terrainChunk.origin.y + (terrainChunk.heights[heightIndex] ?? 0);
}

function addTerrainBrushPreview(
  previewGroup: Group,
  terrainChunkDrafts: readonly MapEditorTerrainChunkDraftSnapshot[],
  position: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  },
  brushSizeCells: number,
  smoothEdges: boolean
): void {
  const brushOffset = Math.floor(brushSizeCells * 0.5);
  const minCellX = position.x - brushOffset * mapEditorBuildGridUnitMeters;
  const minCellZ = position.z - brushOffset * mapEditorBuildGridUnitMeters;

  for (let offsetZ = 0; offsetZ < brushSizeCells; offsetZ += 1) {
    for (let offsetX = 0; offsetX < brushSizeCells; offsetX += 1) {
      const cellPosition = Object.freeze({
        x: minCellX + offsetX * mapEditorBuildGridUnitMeters,
        y: 0,
        z: minCellZ + offsetZ * mapEditorBuildGridUnitMeters
      });
      const height = resolveTerrainHeightAtPosition(terrainChunkDrafts, cellPosition);
      const cellDistance = Math.max(
        Math.abs(offsetX - brushOffset),
        Math.abs(offsetZ - brushOffset)
      );
      const opacity =
        smoothEdges === true
          ? Math.max(0.18, 0.38 - cellDistance * 0.06)
          : 0.34;
      const mesh = createPreviewMesh(
        new BoxGeometry(
          mapEditorBuildGridUnitMeters * 0.96,
          0.24,
          mapEditorBuildGridUnitMeters * 0.96
        ),
        createPreviewMaterial("#7dd3fc", opacity)
      );

      mesh.position.set(cellPosition.x, height + 0.12, cellPosition.z);
      previewGroup.add(mesh);
    }
  }
}

function addWallSegmentPreview(
  previewGroup: Group,
  startPosition: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  },
  hoverPosition: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  }
): void {
  const endPosition = resolveWallSegmentEnd(startPosition, hoverPosition);
  const deltaX = endPosition.x - startPosition.x;
  const deltaZ = endPosition.z - startPosition.z;
  const length = Math.max(
    mapEditorBuildGridUnitMeters,
    Math.abs(deltaX) + Math.abs(deltaZ)
  );
  const center = Object.freeze({
    x: (startPosition.x + endPosition.x) * 0.5,
    y: startPosition.y + 2,
    z: (startPosition.z + endPosition.z) * 0.5
  });
  const mesh = createPreviewMesh(
    new BoxGeometry(length, 4, 0.5),
    createPreviewMaterial("#fb923c", 0.34)
  );

  mesh.position.set(center.x, center.y, center.z);
  mesh.rotation.y = Math.abs(deltaX) >= Math.abs(deltaZ) ? Math.PI * 0.5 : 0;
  previewGroup.add(mesh);
}

function addPathPreview(
  previewGroup: Group,
  targetPosition: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  },
  targetElevationMeters: number,
  fromAnchor: MapEditorPathAnchorSnapshot | null
): void {
  const topY = targetElevationMeters + 0.08;
  const targetMesh = createPreviewMesh(
    new BoxGeometry(mapEditorBuildGridUnitMeters, 0.18, mapEditorBuildGridUnitMeters),
    createPreviewMaterial("#fbbf24", 0.34)
  );

  targetMesh.position.set(targetPosition.x, topY, targetPosition.z);
  previewGroup.add(targetMesh);

  if (fromAnchor === null) {
    return;
  }

  if (Math.abs(fromAnchor.elevation - targetElevationMeters) <= 0.01) {
    return;
  }

  const deltaX = targetPosition.x - fromAnchor.center.x;
  const deltaZ = targetPosition.z - fromAnchor.center.z;
  const rampLength = Math.max(
    mapEditorBuildGridUnitMeters,
    Math.hypot(deltaX, deltaZ)
  );
  const rampMesh = createPreviewMesh(
    new BoxGeometry(
      mapEditorBuildGridUnitMeters * 0.7,
      Math.abs(targetElevationMeters - fromAnchor.elevation) + 0.4,
      rampLength
    ),
    createPreviewMaterial("#f59e0b", 0.22)
  );

  rampMesh.position.set(
    (fromAnchor.center.x + targetPosition.x) * 0.5,
    (fromAnchor.elevation + targetElevationMeters) * 0.5,
    (fromAnchor.center.z + targetPosition.z) * 0.5
  );
  rampMesh.rotation.y = Math.atan2(deltaX, deltaZ);
  previewGroup.add(rampMesh);
}

function addWaterPreview(
  previewGroup: Group,
  position: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  },
  builderToolState: MapEditorBuilderToolStateSnapshot
): void {
  const sizeX = builderToolState.waterFootprintCellsX * mapEditorBuildGridUnitMeters;
  const sizeZ = builderToolState.waterFootprintCellsZ * mapEditorBuildGridUnitMeters;
  const depth = Math.max(0.5, builderToolState.waterDepthMeters);
  const topElevation = builderToolState.waterTopElevationMeters;
  const volumeMesh = createPreviewMesh(
    new BoxGeometry(sizeX, depth, sizeZ),
    createPreviewMaterial("#38bdf8", 0.26)
  );
  const topPlane = createPreviewMesh(
    new PlaneGeometry(sizeX, sizeZ),
    createPreviewMaterial("#67e8f9", 0.32)
  );

  volumeMesh.position.set(position.x, topElevation - depth * 0.5, position.z);
  topPlane.position.set(position.x, topElevation + 0.02, position.z);
  topPlane.rotation.x = -Math.PI * 0.5;
  previewGroup.add(volumeMesh);
  previewGroup.add(topPlane);
}

function createEmptyPlacementExtents(): PlacementExtents {
  return Object.freeze({
    maxX: 0,
    maxZ: 0,
    minX: 0,
    minZ: 0
  });
}

interface PlacementFootprintHalfExtents {
  readonly x: number;
  readonly z: number;
}

function resolveDefaultEnvironmentRenderLod(
  asset: EnvironmentAssetDescriptor
): EnvironmentRenderLodDescriptor | null {
  return (
    asset.renderModel.lods.find(
      (lodDescriptor) => lodDescriptor.tier === asset.renderModel.defaultTier
    ) ??
    asset.renderModel.lods[0] ??
    null
  );
}

function resolveEnvironmentAssetFootprintHalfExtents(
  assetId: string
): PlacementFootprintHalfExtents | null {
  const asset =
    environmentPropManifest.environmentAssets.find(
      (environmentAsset) => environmentAsset.id === assetId
    ) ?? null;

  if (asset === null) {
    return null;
  }

  const defaultRenderLod = resolveDefaultEnvironmentRenderLod(asset);

  if (
    defaultRenderLod !== null &&
    "kind" in defaultRenderLod &&
    defaultRenderLod.kind === "procedural-box"
  ) {
    return Object.freeze({
      x: defaultRenderLod.size.x * 0.5,
      z: defaultRenderLod.size.z * 0.5
    });
  }

  let maxHalfExtentX = 0;
  let maxHalfExtentZ = 0;
  const colliderDescriptors = [
    ...(asset.collider === null ? [] : [asset.collider]),
    ...(asset.physicsColliders ?? [])
  ];

  for (const colliderDescriptor of colliderDescriptors) {
    maxHalfExtentX = Math.max(
      maxHalfExtentX,
      Math.abs(colliderDescriptor.center.x) + colliderDescriptor.size.x * 0.5
    );
    maxHalfExtentZ = Math.max(
      maxHalfExtentZ,
      Math.abs(colliderDescriptor.center.z) + colliderDescriptor.size.z * 0.5
    );
  }

  if (maxHalfExtentX > 0 || maxHalfExtentZ > 0) {
    return Object.freeze({
      x: maxHalfExtentX,
      z: maxHalfExtentZ
    });
  }

  return null;
}

function resolvePlacementFootprintHalfExtents(
  placement: MapEditorPlacementDraftSnapshot
): PlacementFootprintHalfExtents {
  const buildPrimitiveCatalogEntry = readMapEditorBuildPrimitiveCatalogEntry(
    placement.assetId
  );
  const baseHalfExtents =
    buildPrimitiveCatalogEntry === null
      ? (resolveEnvironmentAssetFootprintHalfExtents(placement.assetId) ??
        Object.freeze({
          x: 1,
          z: 1
        }))
      : Object.freeze({
          x: buildPrimitiveCatalogEntry.footprint.x * 0.5,
          z: buildPrimitiveCatalogEntry.footprint.z * 0.5
        });
  const scaledHalfExtentX = Math.max(0.5, baseHalfExtents.x * placement.scale.x);
  const scaledHalfExtentZ = Math.max(0.5, baseHalfExtents.z * placement.scale.z);
  const sinRotation = Math.abs(Math.sin(placement.rotationYRadians));
  const cosRotation = Math.abs(Math.cos(placement.rotationYRadians));

  return Object.freeze({
    x: scaledHalfExtentX * cosRotation + scaledHalfExtentZ * sinRotation,
    z: scaledHalfExtentX * sinRotation + scaledHalfExtentZ * cosRotation
  });
}

function resolvePlacementExtents(
  placementDrafts: readonly MapEditorPlacementDraftSnapshot[],
  sceneDrafts: {
    readonly playerSpawnDrafts: readonly MapEditorPlayerSpawnDraftSnapshot[];
    readonly connectorDrafts: readonly MapEditorConnectorDraftSnapshot[];
    readonly edgeDrafts: readonly MapEditorEdgeDraftSnapshot[];
    readonly regionDrafts: readonly MapEditorRegionDraftSnapshot[];
    readonly sceneObjectDrafts: readonly MapEditorSceneObjectDraftSnapshot[];
    readonly surfaceDrafts: readonly MapEditorSurfaceDraftSnapshot[];
    readonly terrainChunkDrafts: readonly MapEditorTerrainChunkDraftSnapshot[];
    readonly waterRegionDrafts: readonly MapEditorWaterRegionDraftSnapshot[];
  }
): PlacementExtents {
  if (
    placementDrafts.length === 0 &&
    sceneDrafts.playerSpawnDrafts.length === 0 &&
    sceneDrafts.connectorDrafts.length === 0 &&
    sceneDrafts.edgeDrafts.length === 0 &&
    sceneDrafts.regionDrafts.length === 0 &&
    sceneDrafts.sceneObjectDrafts.length === 0 &&
    sceneDrafts.surfaceDrafts.length === 0 &&
    sceneDrafts.terrainChunkDrafts.length === 0 &&
    sceneDrafts.waterRegionDrafts.length === 0
  ) {
    return createEmptyPlacementExtents();
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const placement of placementDrafts) {
    const placementHalfExtents = resolvePlacementFootprintHalfExtents(placement);

    minX = Math.min(minX, placement.position.x - placementHalfExtents.x);
    maxX = Math.max(maxX, placement.position.x + placementHalfExtents.x);
    minZ = Math.min(minZ, placement.position.z - placementHalfExtents.z);
    maxZ = Math.max(maxZ, placement.position.z + placementHalfExtents.z);
  }

  for (const spawnDraft of sceneDrafts.playerSpawnDrafts) {
    minX = Math.min(minX, spawnDraft.position.x);
    maxX = Math.max(maxX, spawnDraft.position.x);
    minZ = Math.min(minZ, spawnDraft.position.z);
    maxZ = Math.max(maxZ, spawnDraft.position.z);
  }

  for (const sceneObjectDraft of sceneDrafts.sceneObjectDrafts) {
    const highlightRadius = sceneObjectDraft.launchTarget?.highlightRadius ?? 2;

    minX = Math.min(minX, sceneObjectDraft.position.x - highlightRadius);
    maxX = Math.max(maxX, sceneObjectDraft.position.x + highlightRadius);
    minZ = Math.min(minZ, sceneObjectDraft.position.z - highlightRadius);
    maxZ = Math.max(maxZ, sceneObjectDraft.position.z + highlightRadius);
  }

  for (const waterRegionDraft of sceneDrafts.waterRegionDrafts) {
    const center = resolveMapEditorWaterRegionCenter(waterRegionDraft);
    const size = resolveMapEditorWaterRegionSize(waterRegionDraft);

    minX = Math.min(minX, center.x - size.x * 0.5);
    maxX = Math.max(maxX, center.x + size.x * 0.5);
    minZ = Math.min(minZ, center.z - size.z * 0.5);
    maxZ = Math.max(maxZ, center.z + size.z * 0.5);
  }

  for (const terrainChunk of sceneDrafts.terrainChunkDrafts) {
    const width = Math.max(1, terrainChunk.sampleCountX * terrainChunk.sampleStrideMeters);
    const depth = Math.max(1, terrainChunk.sampleCountZ * terrainChunk.sampleStrideMeters);

    minX = Math.min(minX, terrainChunk.origin.x - width * 0.5);
    maxX = Math.max(maxX, terrainChunk.origin.x + width * 0.5);
    minZ = Math.min(minZ, terrainChunk.origin.z - depth * 0.5);
    maxZ = Math.max(maxZ, terrainChunk.origin.z + depth * 0.5);
  }

  for (const surface of sceneDrafts.surfaceDrafts) {
    minX = Math.min(minX, surface.center.x - surface.size.x * 0.5);
    maxX = Math.max(maxX, surface.center.x + surface.size.x * 0.5);
    minZ = Math.min(minZ, surface.center.z - surface.size.z * 0.5);
    maxZ = Math.max(maxZ, surface.center.z + surface.size.z * 0.5);
  }

  for (const region of sceneDrafts.regionDrafts) {
    minX = Math.min(minX, region.center.x - region.size.x * 0.5);
    maxX = Math.max(maxX, region.center.x + region.size.x * 0.5);
    minZ = Math.min(minZ, region.center.z - region.size.z * 0.5);
    maxZ = Math.max(maxZ, region.center.z + region.size.z * 0.5);
  }

  for (const edge of sceneDrafts.edgeDrafts) {
    minX = Math.min(minX, edge.center.x - edge.lengthMeters * 0.5);
    maxX = Math.max(maxX, edge.center.x + edge.lengthMeters * 0.5);
    minZ = Math.min(minZ, edge.center.z - edge.lengthMeters * 0.5);
    maxZ = Math.max(maxZ, edge.center.z + edge.lengthMeters * 0.5);
  }

  for (const connector of sceneDrafts.connectorDrafts) {
    minX = Math.min(minX, connector.center.x - connector.size.x * 0.5);
    maxX = Math.max(maxX, connector.center.x + connector.size.x * 0.5);
    minZ = Math.min(minZ, connector.center.z - connector.size.z * 0.5);
    maxZ = Math.max(maxZ, connector.center.z + connector.size.z * 0.5);
  }

  return Object.freeze({
    maxX,
    maxZ,
    minX,
    minZ
  });
}

function createPlacementPreviewSignature(
  placementDrafts: readonly MapEditorPlacementDraftSnapshot[]
): string {
  return placementDrafts
    .map((placement) =>
      [
        placement.assetId,
        placement.collisionEnabled ? "1" : "0",
        placement.isVisible ? "1" : "0",
        placement.placementId,
        placement.position.x,
        placement.position.y,
        placement.position.z,
        placement.rotationYRadians,
        placement.scale.x,
        placement.scale.y,
        placement.scale.z
      ].join(":")
    )
    .join("|");
}

function createPlacementStructureSignature(
  placementDrafts: readonly MapEditorPlacementDraftSnapshot[]
): string {
  return placementDrafts
    .map((placement) => `${placement.placementId}:${placement.assetId}`)
    .join("|");
}

function createSceneDraftSignature(
  sceneDrafts: {
    readonly playerSpawnDrafts: readonly MapEditorPlayerSpawnDraftSnapshot[];
    readonly sceneObjectDrafts: readonly MapEditorSceneObjectDraftSnapshot[];
    readonly waterRegionDrafts: readonly MapEditorWaterRegionDraftSnapshot[];
  }
): string {
  return [
    ...sceneDrafts.playerSpawnDrafts.map((spawnDraft) =>
      [
        "spawn",
        spawnDraft.spawnId,
        spawnDraft.position.x,
        spawnDraft.position.y,
        spawnDraft.position.z,
        spawnDraft.yawRadians
      ].join(":")
    ),
    ...sceneDrafts.sceneObjectDrafts.map((sceneObjectDraft) =>
      [
        "scene-object",
        sceneObjectDraft.objectId,
        sceneObjectDraft.position.x,
        sceneObjectDraft.position.y,
        sceneObjectDraft.position.z,
        sceneObjectDraft.launchTarget?.experienceId ?? "none",
        sceneObjectDraft.launchTarget?.ringColorHex ?? "none",
        sceneObjectDraft.launchTarget?.beamColorHex ?? "none"
      ].join(":")
    ),
    ...sceneDrafts.waterRegionDrafts.map((waterRegionDraft) =>
      {
        const center = resolveMapEditorWaterRegionCenter(waterRegionDraft);
        const size = resolveMapEditorWaterRegionSize(waterRegionDraft);

        return [
          "water",
          waterRegionDraft.waterRegionId,
          center.x,
          center.y,
          center.z,
          size.x,
          size.y,
          size.z,
          waterRegionDraft.topElevationMeters,
          waterRegionDraft.depthMeters,
          waterRegionDraft.previewColorHex,
          waterRegionDraft.previewOpacity
        ].join(":");
      }
    )
  ].join("|");
}

function readNearestPathAnchorFromDrafts(
  position: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  },
  regionDrafts: readonly MapEditorRegionDraftSnapshot[],
  surfaceDrafts: readonly MapEditorSurfaceDraftSnapshot[]
): MapEditorPathAnchorSnapshot | null {
  const surfacesById = new Map(
    surfaceDrafts.map((surfaceDraft) => [surfaceDraft.surfaceId, surfaceDraft] as const)
  );
  let nearestAnchor:
    | {
        readonly center: {
          readonly x: number;
          readonly y: number;
          readonly z: number;
        };
        readonly distanceSquared: number;
        readonly elevation: number;
      }
    | null = null;

  for (const regionDraft of regionDrafts) {
    if (regionDraft.regionKind !== "path") {
      continue;
    }

    const surfaceDraft = surfacesById.get(regionDraft.surfaceId) ?? null;

    if (surfaceDraft === null) {
      continue;
    }

    const deltaX = regionDraft.center.x - position.x;
    const deltaZ = regionDraft.center.z - position.z;
    const distanceSquared = deltaX * deltaX + deltaZ * deltaZ;

    if (distanceSquared > mapEditorBuildGridUnitMeters * mapEditorBuildGridUnitMeters) {
      continue;
    }

    if (
      nearestAnchor === null ||
      distanceSquared < nearestAnchor.distanceSquared
    ) {
      nearestAnchor = Object.freeze({
        center: Object.freeze({
          x: regionDraft.center.x,
          y: surfaceDraft.elevation,
          z: regionDraft.center.z
        }),
        distanceSquared,
        elevation: surfaceDraft.elevation
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

function readSelectedEntityFromObject(
  object: {
    parent: unknown;
    userData?: {
      connectorId?: unknown;
      edgeId?: unknown;
      placementId?: unknown;
      playerSpawnId?: unknown;
      regionId?: unknown;
      sceneObjectId?: unknown;
      surfaceId?: unknown;
      terrainChunkId?: unknown;
      waterRegionId?: unknown;
    };
  } | null
): MapEditorSelectedEntityRef | null {
  let currentObject = object;

  while (currentObject !== null) {
    const candidateTerrainChunkId = currentObject.userData?.terrainChunkId;
    const candidateSurfaceId = currentObject.userData?.surfaceId;
    const candidateRegionId = currentObject.userData?.regionId;
    const candidateEdgeId = currentObject.userData?.edgeId;
    const candidateConnectorId = currentObject.userData?.connectorId;
    const candidatePlacementId = currentObject.userData?.placementId;
    const candidatePlayerSpawnId = currentObject.userData?.playerSpawnId;
    const candidateSceneObjectId = currentObject.userData?.sceneObjectId;
    const candidateWaterRegionId = currentObject.userData?.waterRegionId;

    if (typeof candidateTerrainChunkId === "string") {
      return Object.freeze({
        id: candidateTerrainChunkId,
        kind: "terrain-chunk"
      });
    }

    if (typeof candidateSurfaceId === "string") {
      return Object.freeze({
        id: candidateSurfaceId,
        kind: "surface"
      });
    }

    if (typeof candidateRegionId === "string") {
      return Object.freeze({
        id: candidateRegionId,
        kind: "region"
      });
    }

    if (typeof candidateEdgeId === "string") {
      return Object.freeze({
        id: candidateEdgeId,
        kind: "edge"
      });
    }

    if (typeof candidateConnectorId === "string") {
      return Object.freeze({
        id: candidateConnectorId,
        kind: "connector"
      });
    }

    if (typeof candidatePlacementId === "string") {
      return Object.freeze({
        id: candidatePlacementId,
        kind: "module"
      });
    }

    if (typeof candidatePlayerSpawnId === "string") {
      return Object.freeze({
        id: candidatePlayerSpawnId,
        kind: "player-spawn"
      });
    }

    if (typeof candidateSceneObjectId === "string") {
      return Object.freeze({
        id: candidateSceneObjectId,
        kind: "scene-object"
      });
    }

    if (typeof candidateWaterRegionId === "string") {
      return Object.freeze({
        id: candidateWaterRegionId,
        kind: "water-region"
      });
    }

    currentObject =
      currentObject.parent !== null &&
      typeof currentObject.parent === "object" &&
      "parent" in currentObject.parent
        ? (currentObject.parent as typeof object)
        : null;
  }

  return null;
}

function resolveViewportErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The map editor viewport could not initialize.";
}

function readCanvasPointer(
  canvasElement: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  pointer: Vector2
): Vector2 {
  const rect = canvasElement.getBoundingClientRect();

  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

  return pointer;
}

export function MapEditorViewport({
  activeModuleAssetId,
  builderToolState,
  bundleId,
  connectorDrafts,
  edgeDrafts,
  helperVisibility,
  onApplyTerrainBrushAtPosition,
  onCommitPathSegment,
  onCreateModuleAtPosition,
  onCommitWallSegment,
  onCreateWaterRegionAtPosition,
  onCommitPlacementTransform,
  onCommitPlayerSpawnTransform,
  onSelectEntity,
  placementDrafts,
  playerSpawnDrafts,
  regionDrafts,
  sceneObjectDrafts,
  selectedEntityRef,
  surfaceDrafts,
  terrainChunkDrafts,
  waterRegionDrafts,
  viewportToolMode
}: MapEditorViewportProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const rendererRef = useRef<WebGPURenderer | null>(null);
  const orbitControlsRef = useRef<OrbitControls | null>(null);
  const keyboardFlightControllerRef =
    useRef<MapEditorViewportKeyboardFlightController | null>(null);
  const placementGroupRef = useRef<Group | null>(null);
  const collisionGroupRef = useRef<Group | null>(null);
  const previewAssetLibraryRef =
    useRef<MapEditorViewportPreviewAssetLibrary | null>(null);
  const sceneDraftHandlesRef = useRef<MapEditorViewportSceneDraftHandles | null>(null);
  const semanticDraftHandlesRef =
    useRef<MapEditorViewportSemanticDraftHandles | null>(null);
  const placementAnchorByIdRef = useRef(new Map<string, Group>());
  const collisionAnchorByIdRef = useRef(new Map<string, Group>());
  const buildCursorAnchorRef = useRef<Group | null>(null);
  const buildCursorAssetIdRef = useRef<string | null>(null);
  const builderPreviewGroupRef = useRef<Group | null>(null);
  const activeModuleAssetIdRef = useRef(activeModuleAssetId);
  const builderToolStateRef = useRef(builderToolState);
  const placementDraftsRef = useRef(placementDrafts);
  const regionDraftsRef = useRef(regionDrafts);
  const surfaceDraftsRef = useRef(surfaceDrafts);
  const terrainChunkDraftsRef = useRef(terrainChunkDrafts);
  const viewportToolModeRef = useRef(viewportToolMode);
  const pendingWallAnchorRef = useRef<{
    readonly x: number;
    readonly y: number;
    readonly z: number;
  } | null>(null);
  const pendingPathAnchorRef = useRef<MapEditorPathAnchorSnapshot | null>(null);
  const pathAnchorPointerYRef = useRef<number | null>(null);
  const transformControllerRef =
    useRef<MapEditorViewportTransformController | null>(null);
  const helperHandlesRef = useRef<MapEditorViewportHelperHandles | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const raycasterRef = useRef(new Raycaster());
  const pointerRef = useRef(new Vector2());
  const buildPlacementPlaneRef = useRef(new Plane(new Vector3(0, 1, 0), 0));
  const buildPlacementPointRef = useRef(new Vector3());
  const buildCursorPositionRef = useRef<{
    readonly x: number;
    readonly y: number;
    readonly z: number;
  } | null>(null);
  const previewBuildVersionRef = useRef(0);
  const pointerDownPositionRef = useRef<{
    readonly x: number;
    readonly y: number;
  } | null>(null);
  const framedBundleIdRef = useRef<string | null>(null);
  const animationFrameRef = useRef(0);
  const lastFrameTimeRef = useRef<number | null>(null);
  const [selectedTransformTarget, setSelectedTransformTarget] =
    useState<MapEditorViewportTransformTarget | null>(() =>
      createTransformTargetFromSelectedEntity(selectedEntityRef)
    );
  const [viewportError, setViewportError] = useState<string | null>(null);
  const previewPlacementSignature = useMemo(
    () => createPlacementPreviewSignature(placementDrafts),
    [placementDrafts]
  );
  const previewStructureSignature = useMemo(
    () => createPlacementStructureSignature(placementDrafts),
    [placementDrafts]
  );
  const sceneDraftSignature = useMemo(
    () =>
      createSceneDraftSignature({
        playerSpawnDrafts,
        sceneObjectDrafts,
        waterRegionDrafts
      }),
    [playerSpawnDrafts, sceneObjectDrafts, waterRegionDrafts]
  );

  const handleEntitySelection = useEffectEvent(
    (entityRef: MapEditorSelectedEntityRef | null) => {
      onSelectEntity(entityRef);
    }
  );
  const handlePlacementTransformCommit = useEffectEvent(
    (placementId: string, update: MapEditorPlacementUpdate) => {
      onCommitPlacementTransform(placementId, update);
    }
  );
  const handlePlayerSpawnTransformCommit = useEffectEvent(
    (
      spawnId: string,
      update: MapEditorPlayerSpawnTransformUpdate
    ) => {
      onCommitPlayerSpawnTransform(spawnId, update);
    }
  );
  const handleCreateModulePlacement = useEffectEvent(
    (
      assetId: string,
      position: {
        readonly x: number;
        readonly y: number;
        readonly z: number;
      }
    ) => {
      onCreateModuleAtPosition(assetId, position);
    }
  );
  const handleApplyTerrainBrush = useEffectEvent(
    (position: {
      readonly x: number;
      readonly y: number;
      readonly z: number;
    }) => {
      onApplyTerrainBrushAtPosition(position);
    }
  );
  const handleCommitWall = useEffectEvent(
    (
      startPosition: {
        readonly x: number;
        readonly y: number;
        readonly z: number;
      },
      endPosition: {
        readonly x: number;
        readonly y: number;
        readonly z: number;
      }
    ) => {
      onCommitWallSegment(startPosition, endPosition);
    }
  );
  const handleCommitPath = useEffectEvent(
    (
      targetPosition: {
        readonly x: number;
        readonly y: number;
        readonly z: number;
      },
      targetElevationMeters: number,
      fromAnchor: MapEditorPathAnchorSnapshot | null
    ) => {
      onCommitPathSegment(targetPosition, targetElevationMeters, fromAnchor);
    }
  );
  const handleCreateWaterRegion = useEffectEvent(
    (position: {
      readonly x: number;
      readonly y: number;
      readonly z: number;
    }) => {
      onCreateWaterRegionAtPosition(position);
    }
  );
  const syncPlacementPreviewAnchors = useEffectEvent(
    (drafts: readonly MapEditorPlacementDraftSnapshot[]) => {
      for (const placement of drafts) {
        const placementAnchor =
          placementAnchorByIdRef.current.get(placement.placementId) ?? null;

        if (placementAnchor === null) {
          continue;
        }

        syncMapEditorViewportPlacementPreviewAnchor(placementAnchor, placement);
      }
    }
  );
  const syncSelectionPresentation = useEffectEvent(() => {
    const scene = sceneRef.current;
    const helperHandles = helperHandlesRef.current;
    const transformController = transformControllerRef.current;
    const sceneDraftHandles = sceneDraftHandlesRef.current;
    const semanticDraftHandles = semanticDraftHandlesRef.current;

    if (scene === null || helperHandles === null || transformController === null) {
      return;
    }

    transformController.syncToolMode(viewportToolMode);

    let selectedPresentationAnchor: Group | null = null;
    let selectedTransformAnchor: Group | null = null;

    if (selectedEntityRef !== null) {
      switch (selectedEntityRef.kind) {
        case "module":
          selectedPresentationAnchor =
            placementAnchorByIdRef.current.get(selectedEntityRef.id) ?? null;
          break;
        case "player-spawn":
          selectedPresentationAnchor =
            sceneDraftHandles?.playerSpawnGroupsById.get(selectedEntityRef.id) ?? null;
          break;
        case "scene-object":
          selectedPresentationAnchor =
            sceneDraftHandles?.sceneObjectGroupsById.get(selectedEntityRef.id) ?? null;
          break;
        case "water-region":
          selectedPresentationAnchor =
            sceneDraftHandles?.waterRegionGroupsById.get(selectedEntityRef.id) ?? null;
          break;
        case "terrain-chunk":
          selectedPresentationAnchor =
            semanticDraftHandles?.terrainChunkGroupsById.get(selectedEntityRef.id) ??
            null;
          break;
        case "surface":
          selectedPresentationAnchor =
            semanticDraftHandles?.surfaceGroupsById.get(selectedEntityRef.id) ?? null;
          break;
        case "region":
          selectedPresentationAnchor =
            semanticDraftHandles?.regionGroupsById.get(selectedEntityRef.id) ?? null;
          break;
        case "edge":
          selectedPresentationAnchor =
            semanticDraftHandles?.edgeGroupsById.get(selectedEntityRef.id) ?? null;
          break;
        case "connector":
          selectedPresentationAnchor =
            semanticDraftHandles?.connectorGroupsById.get(selectedEntityRef.id) ?? null;
          break;
      }
    }

    if (
      (viewportToolMode === "move" ||
        viewportToolMode === "rotate" ||
        viewportToolMode === "scale") &&
      selectedTransformTarget !== null
    ) {
      switch (selectedTransformTarget.kind) {
        case "placement":
          selectedTransformAnchor =
            placementAnchorByIdRef.current.get(selectedTransformTarget.id) ?? null;
          break;
        case "player-spawn":
          selectedTransformAnchor =
            viewportToolMode === "scale" || sceneDraftHandles === null
              ? null
              : sceneDraftHandles.playerSpawnGroupsById.get(
                  selectedTransformTarget.id
                ) ?? null;
          break;
      }
    }

    if (selectedTransformAnchor === null || selectedTransformTarget === null) {
      transformController.syncAttachedGroup(null);
    } else {
      transformController.syncAttachedGroup(
        selectedTransformAnchor,
        selectedTransformTarget.kind
      );
    }
    replaceMapEditorViewportSelectionBoundsHelper(
      scene,
      helperHandles,
      selectedPresentationAnchor,
      helperVisibility
    );
  });

  useEffect(() => {
    setSelectedTransformTarget(createTransformTargetFromSelectedEntity(selectedEntityRef));
  }, [bundleId, selectedEntityRef]);

  useEffect(() => {
    placementDraftsRef.current = placementDrafts;
  }, [placementDrafts]);

  useEffect(() => {
    builderToolStateRef.current = builderToolState;
  }, [builderToolState]);

  useEffect(() => {
    regionDraftsRef.current = regionDrafts;
  }, [regionDrafts]);

  useEffect(() => {
    surfaceDraftsRef.current = surfaceDrafts;
  }, [surfaceDrafts]);

  useEffect(() => {
    terrainChunkDraftsRef.current = terrainChunkDrafts;
  }, [terrainChunkDrafts]);

  useEffect(() => {
    activeModuleAssetIdRef.current = activeModuleAssetId;
  }, [activeModuleAssetId]);

  useEffect(() => {
    viewportToolModeRef.current = viewportToolMode;
  }, [viewportToolMode]);

  useEffect(() => {
    if (viewportToolMode !== "wall") {
      pendingWallAnchorRef.current = null;
    }

    if (viewportToolMode !== "path") {
      pendingPathAnchorRef.current = null;
      pathAnchorPointerYRef.current = null;
    }

    if (viewportToolMode === "module" || viewportToolMode === "select") {
      if (builderPreviewGroupRef.current !== null) {
        disposeBuilderPreviewGroup(builderPreviewGroupRef.current);
      }
    }
  }, [viewportToolMode]);

  useEffect(() => {
    const hostElement = hostRef.current;
    const canvasElement = canvasRef.current;

    if (hostElement === null || canvasElement === null) {
      return;
    }

    let disposed = false;

    const scene = new Scene();
    scene.background = new Color("#09111f");
    sceneRef.current = scene;

    const camera = new PerspectiveCamera(48, 1, 0.1, 500);
    cameraRef.current = camera;

    const renderer = new WebGPURenderer({
      alpha: true,
      antialias: true,
      canvas: canvasElement
    });
    rendererRef.current = renderer;
    setViewportError(null);
    const orbitControls = createMapEditorViewportOrbitControls(
      camera,
      canvasElement
    );
    orbitControlsRef.current = orbitControls;
    const keyboardFlightController =
      new MapEditorViewportKeyboardFlightController({
        camera,
        hostElement,
        orbitControls
      });
    keyboardFlightControllerRef.current = keyboardFlightController;

    const placementGroup = new Group();
    placementGroupRef.current = placementGroup;
    scene.add(placementGroup);
    const collisionGroup = new Group();
    collisionGroup.visible = helperVisibility.collisionBounds;
    collisionGroupRef.current = collisionGroup;
    scene.add(collisionGroup);
    const builderPreviewGroup = new Group();
    builderPreviewGroupRef.current = builderPreviewGroup;
    scene.add(builderPreviewGroup);
    const sceneDraftHandles = createMapEditorViewportSceneDraftHandles();
    sceneDraftHandlesRef.current = sceneDraftHandles;
    scene.add(sceneDraftHandles.rootGroup);
    const semanticDraftHandles = createMapEditorViewportSemanticDraftHandles();
    semanticDraftHandlesRef.current = semanticDraftHandles;
    scene.add(semanticDraftHandles.rootGroup);
    const previewAssetLibrary = new MapEditorViewportPreviewAssetLibrary();
    previewAssetLibraryRef.current = previewAssetLibrary;
    const helperHandles = createMapEditorViewportHelperHandles(scene);
    helperHandlesRef.current = helperHandles;
    scene.add(new AmbientLight("#ffffff", 0.85));

    const keyLight = new DirectionalLight("#ffffff", 2.2);
    keyLight.position.set(18, 32, 16);
    scene.add(keyLight);

    const fillLight = new DirectionalLight("#67e8f9", 0.9);
    fillLight.position.set(-14, 20, -12);
    scene.add(fillLight);

    const transformController = new MapEditorViewportTransformController({
      camera,
      canvasElement,
      orbitControls,
      onCommitPlayerSpawnTransform: handlePlayerSpawnTransformCommit,
      scene,
      onCommitPlacementTransform: handlePlacementTransformCommit
    });
    transformControllerRef.current = transformController;

    const syncSize = () => {
      const width = Math.max(1, hostElement.clientWidth);
      const height = Math.max(1, hostElement.clientHeight);

      renderer.setPixelRatio(globalThis.window?.devicePixelRatio ?? 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const renderFrame = (frameTimeMs: number) => {
      if (disposed) {
        return;
      }

      animationFrameRef.current = globalThis.window.requestAnimationFrame(
        renderFrame
      );

      try {
        const lastFrameTimeMs = lastFrameTimeRef.current ?? frameTimeMs;
        const deltaSeconds = Math.min(
          0.05,
          Math.max(0, (frameTimeMs - lastFrameTimeMs) / 1000)
        );

        lastFrameTimeRef.current = frameTimeMs;
        keyboardFlightController.update(deltaSeconds);
        orbitControls.update();
        helperHandles.selectionBoundsHelper?.update();
        renderer.render(scene, camera);
      } catch (error) {
        globalThis.window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;

        if (!disposed) {
          setViewportError(resolveViewportErrorMessage(error));
        }
      }
    };

    const readSelectedEntity = (
      clientX: number,
      clientY: number
    ): MapEditorSelectedEntityRef | null => {
      const pointer = readCanvasPointer(
        canvasElement,
        clientX,
        clientY,
        pointerRef.current
      );

      raycasterRef.current.setFromCamera(pointer, camera);

      const intersections = raycasterRef.current.intersectObjects(
        [
          ...placementGroup.children,
          ...(sceneDraftHandlesRef.current === null
            ? []
            : [sceneDraftHandlesRef.current.rootGroup]),
          ...(semanticDraftHandlesRef.current === null
            ? []
            : [semanticDraftHandlesRef.current.rootGroup])
        ],
        true
      );

      return readSelectedEntityFromObject(intersections[0]?.object ?? null);
    };
    const clearBuilderPreview = () => {
      if (builderPreviewGroupRef.current !== null) {
        disposeBuilderPreviewGroup(builderPreviewGroupRef.current);
      }
    };
    const readGroundPlacementPosition = (
      clientX: number,
      clientY: number
    ): {
      readonly x: number;
      readonly y: number;
      readonly z: number;
    } | null => {
      const pointer = readCanvasPointer(
        canvasElement,
        clientX,
        clientY,
        pointerRef.current
      );

      raycasterRef.current.setFromCamera(pointer, camera);

      const placementPoint = raycasterRef.current.ray.intersectPlane(
        buildPlacementPlaneRef.current,
        buildPlacementPointRef.current
      );

      if (placementPoint === null) {
        return null;
      }

      return resolveSnappedGroundPosition(
        Object.freeze({
          x: placementPoint.x,
          y: placementPoint.y,
          z: placementPoint.z
        })
      );
    };
    const syncBuildCursor = (clientX: number, clientY: number) => {
      const buildCursorAnchor = buildCursorAnchorRef.current;

      if (viewportToolModeRef.current !== "module") {
        buildCursorPositionRef.current = null;

        if (buildCursorAnchor !== null) {
          buildCursorAnchor.visible = false;
        }

        return;
      }

      const nextBuildCursorPosition = readGroundPlacementPosition(clientX, clientY);

      if (nextBuildCursorPosition === null) {
        buildCursorPositionRef.current = null;
        if (buildCursorAnchor !== null) {
          buildCursorAnchor.visible = false;
        }
        return;
      }

      buildCursorPositionRef.current = nextBuildCursorPosition;

      if (buildCursorAnchor === null) {
        return;
      }

      buildCursorAnchor.visible = true;
      buildCursorAnchor.position.set(
        nextBuildCursorPosition.x,
        nextBuildCursorPosition.y,
        nextBuildCursorPosition.z
      );
      buildCursorAnchor.updateMatrixWorld(true);
    };
    const syncBuilderPreview = (
      clientX: number,
      clientY: number,
      ctrlKey: boolean
    ) => {
      const builderPreviewGroup = builderPreviewGroupRef.current;

      if (builderPreviewGroup === null) {
        return;
      }

      clearBuilderPreview();

      if (
        viewportToolModeRef.current === "select" ||
        viewportToolModeRef.current === "move" ||
        viewportToolModeRef.current === "rotate" ||
        viewportToolModeRef.current === "scale" ||
        viewportToolModeRef.current === "module"
      ) {
        return;
      }

      const nextGroundPosition = readGroundPlacementPosition(clientX, clientY);

      if (nextGroundPosition === null) {
        return;
      }

      switch (viewportToolModeRef.current) {
        case "terrain":
          addTerrainBrushPreview(
            builderPreviewGroup,
            terrainChunkDraftsRef.current,
            nextGroundPosition,
            builderToolStateRef.current.terrainBrushSizeCells,
            builderToolStateRef.current.terrainSmoothEdges
          );
          return;
        case "wall":
          if (pendingWallAnchorRef.current === null) {
            const marker = createPreviewMesh(
              new BoxGeometry(
                mapEditorBuildGridUnitMeters * 0.45,
                0.5,
                mapEditorBuildGridUnitMeters * 0.45
              ),
              createPreviewMaterial("#fb923c", 0.38)
            );

            marker.position.set(nextGroundPosition.x, 0.25, nextGroundPosition.z);
            builderPreviewGroup.add(marker);
            return;
          }

          addWallSegmentPreview(
            builderPreviewGroup,
            pendingWallAnchorRef.current,
            nextGroundPosition
          );
          return;
        case "path": {
          const fallbackAnchor = readNearestPathAnchorFromDrafts(
            nextGroundPosition,
            regionDraftsRef.current,
            surfaceDraftsRef.current
          );
          const activeAnchor = pendingPathAnchorRef.current ?? fallbackAnchor;
          const elevationDelta =
            ctrlKey &&
            pendingPathAnchorRef.current !== null &&
            pathAnchorPointerYRef.current !== null
              ? Math.round((pathAnchorPointerYRef.current - clientY) / 24)
              : 0;
          const baseElevation =
            activeAnchor?.elevation ??
            resolveTerrainHeightAtPosition(
              terrainChunkDraftsRef.current,
              nextGroundPosition
            );
          const targetElevation = baseElevation + elevationDelta;

          addPathPreview(
            builderPreviewGroup,
            Object.freeze({
              x: nextGroundPosition.x,
              y: targetElevation,
              z: nextGroundPosition.z
            }),
            targetElevation,
            pendingPathAnchorRef.current
          );
          return;
        }
        case "water":
          addWaterPreview(
            builderPreviewGroup,
            nextGroundPosition,
            builderToolStateRef.current
          );
          return;
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      hostElement.focus({ preventScroll: true });

      if (event.button !== 0) {
        return;
      }

      pointerDownPositionRef.current = Object.freeze({
        x: event.clientX,
        y: event.clientY
      });
      syncBuildCursor(event.clientX, event.clientY);
      syncBuilderPreview(event.clientX, event.clientY, event.ctrlKey);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.button !== 0) {
        pointerDownPositionRef.current = null;
        return;
      }

      const pointerDownPosition = pointerDownPositionRef.current;
      pointerDownPositionRef.current = null;

      if (pointerDownPosition === null) {
        return;
      }

      const pointerTravelDistance = Math.hypot(
        event.clientX - pointerDownPosition.x,
        event.clientY - pointerDownPosition.y
      );

      if (pointerTravelDistance > 4) {
        return;
      }

      if (
        viewportToolModeRef.current === "module" &&
        activeModuleAssetIdRef.current !== null
      ) {
        const nextBuildPlacementPosition = readGroundPlacementPosition(
          event.clientX,
          event.clientY
        );

        if (nextBuildPlacementPosition !== null) {
          handleCreateModulePlacement(
            activeModuleAssetIdRef.current,
            nextBuildPlacementPosition
          );
        }

        return;
      }

      const nextScenePosition = readGroundPlacementPosition(event.clientX, event.clientY);

      if (nextScenePosition !== null) {
        switch (viewportToolModeRef.current) {
          case "terrain":
            handleApplyTerrainBrush(nextScenePosition);
            return;
          case "wall":
            if (pendingWallAnchorRef.current === null) {
              pendingWallAnchorRef.current = nextScenePosition;
              syncBuilderPreview(event.clientX, event.clientY, event.ctrlKey);
              return;
            }

            const nextWallEnd = resolveWallSegmentEnd(
              pendingWallAnchorRef.current,
              nextScenePosition
            );

            if (
              nextWallEnd.x === pendingWallAnchorRef.current.x &&
              nextWallEnd.z === pendingWallAnchorRef.current.z
            ) {
              return;
            }

            handleCommitWall(pendingWallAnchorRef.current, nextWallEnd);
            pendingWallAnchorRef.current = nextWallEnd;
            syncBuilderPreview(event.clientX, event.clientY, event.ctrlKey);
            return;
          case "path": {
            const existingAnchor = readNearestPathAnchorFromDrafts(
              nextScenePosition,
              regionDraftsRef.current,
              surfaceDraftsRef.current
            );
            const activeAnchor = pendingPathAnchorRef.current ?? existingAnchor;
            const elevationDelta =
              event.ctrlKey &&
              pendingPathAnchorRef.current !== null &&
              pathAnchorPointerYRef.current !== null
                ? Math.round((pathAnchorPointerYRef.current - event.clientY) / 24)
                : 0;
            const targetElevation =
              (activeAnchor?.elevation ??
                resolveTerrainHeightAtPosition(
                  terrainChunkDraftsRef.current,
                  nextScenePosition
                )) + elevationDelta;
            const nextPathAnchor = Object.freeze({
              center: Object.freeze({
                x: nextScenePosition.x,
                y: targetElevation,
                z: nextScenePosition.z
              }),
              elevation: targetElevation
            });

            if (
              activeAnchor !== null &&
              activeAnchor.center.x === nextScenePosition.x &&
              activeAnchor.center.z === nextScenePosition.z &&
              Math.abs(activeAnchor.elevation - targetElevation) <= 0.01
            ) {
              pendingPathAnchorRef.current = activeAnchor;
              pathAnchorPointerYRef.current = event.clientY;
              syncBuilderPreview(event.clientX, event.clientY, event.ctrlKey);
              return;
            }

            handleCommitPath(
              nextPathAnchor.center,
              targetElevation,
              activeAnchor
            );
            pendingPathAnchorRef.current = nextPathAnchor;
            pathAnchorPointerYRef.current = event.clientY;
            syncBuilderPreview(event.clientX, event.clientY, event.ctrlKey);
            return;
          }
          case "water":
            handleCreateWaterRegion(nextScenePosition);
            return;
        }
      }

      const nextSelectedEntity = readSelectedEntity(event.clientX, event.clientY);

      setSelectedTransformTarget(
        createTransformTargetFromSelectedEntity(nextSelectedEntity)
      );
      handleEntitySelection(nextSelectedEntity);
    };

    const handlePointerCancel = () => {
      pointerDownPositionRef.current = null;
    };
    const handlePointerMove = (event: PointerEvent) => {
      syncBuildCursor(event.clientX, event.clientY);
      syncBuilderPreview(event.clientX, event.clientY, event.ctrlKey);
    };
    const handlePointerLeave = () => {
      buildCursorPositionRef.current = null;

      if (buildCursorAnchorRef.current !== null) {
        buildCursorAnchorRef.current.visible = false;
      }

      clearBuilderPreview();
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      pendingWallAnchorRef.current = null;
      pendingPathAnchorRef.current = null;
      pathAnchorPointerYRef.current = null;
      clearBuilderPreview();
    };

    const initializeViewport = async () => {
      try {
        await renderer.init();

        if (disposed) {
          return;
        }

        syncSize();
        resizeObserverRef.current = new ResizeObserver(syncSize);
        resizeObserverRef.current.observe(hostElement);
        canvasElement.addEventListener("pointerdown", handlePointerDown);
        canvasElement.addEventListener("pointermove", handlePointerMove);
        canvasElement.addEventListener("pointerup", handlePointerUp);
        canvasElement.addEventListener("pointercancel", handlePointerCancel);
        canvasElement.addEventListener("pointerleave", handlePointerLeave);
        canvasElement.addEventListener("contextmenu", handleContextMenu);
        syncSelectionPresentation();
        animationFrameRef.current =
          globalThis.window.requestAnimationFrame(renderFrame);
      } catch (error) {
        if (disposed) {
          return;
        }

        setViewportError(resolveViewportErrorMessage(error));
      }
    };

    void initializeViewport();

    return () => {
      disposed = true;
      lastFrameTimeRef.current = null;
      globalThis.window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      canvasElement.removeEventListener("pointerdown", handlePointerDown);
      canvasElement.removeEventListener("pointermove", handlePointerMove);
      canvasElement.removeEventListener("pointerup", handlePointerUp);
      canvasElement.removeEventListener("pointercancel", handlePointerCancel);
      canvasElement.removeEventListener("pointerleave", handlePointerLeave);
      canvasElement.removeEventListener("contextmenu", handleContextMenu);
      disposeMapEditorViewportPreviewGroup(placementGroup);
      if (collisionGroupRef.current !== null) {
        scene.remove(collisionGroupRef.current);
        disposeMapEditorViewportPreviewGroup(collisionGroupRef.current);
        collisionGroupRef.current = null;
      }
      if (builderPreviewGroupRef.current !== null) {
        scene.remove(builderPreviewGroupRef.current);
        disposeBuilderPreviewGroup(builderPreviewGroupRef.current);
        builderPreviewGroupRef.current = null;
      }
      if (sceneDraftHandlesRef.current !== null) {
        scene.remove(sceneDraftHandlesRef.current.rootGroup);
        disposeMapEditorViewportSceneDraftHandles(sceneDraftHandlesRef.current);
        sceneDraftHandlesRef.current = null;
      }
      if (semanticDraftHandlesRef.current !== null) {
        scene.remove(semanticDraftHandlesRef.current.rootGroup);
        disposeMapEditorViewportSemanticDraftHandles(
          semanticDraftHandlesRef.current
        );
        semanticDraftHandlesRef.current = null;
      }
      if (buildCursorAnchorRef.current !== null) {
        const buildCursorDisposalGroup = new Group();

        buildCursorDisposalGroup.add(buildCursorAnchorRef.current);
        disposeMapEditorViewportPreviewGroup(buildCursorDisposalGroup);
        buildCursorAnchorRef.current = null;
      }
      placementAnchorByIdRef.current = new Map();
      collisionAnchorByIdRef.current = new Map();
      previewAssetLibraryRef.current = null;
      transformController.dispose(scene);
      transformControllerRef.current = null;
      keyboardFlightController.dispose();
      keyboardFlightControllerRef.current = null;
      orbitControls.dispose();
      orbitControlsRef.current = null;
      disposeMapEditorViewportHelperHandles(scene, helperHandles);
      helperHandlesRef.current = null;
      renderer.dispose();
      rendererRef.current = null;
      placementGroupRef.current = null;
      collisionGroupRef.current = null;
      cameraRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const placementGroup = placementGroupRef.current;
    const previewAssetLibrary = previewAssetLibraryRef.current;

    if (placementGroup === null || previewAssetLibrary === null) {
      return;
    }

    let cancelled = false;
    const previewBuildVersion = previewBuildVersionRef.current + 1;
    previewBuildVersionRef.current = previewBuildVersion;

    const rebuildPlacementPreviews = async () => {
      try {
        const placementAnchors = await Promise.all(
          placementDraftsRef.current.map((placement) =>
            previewAssetLibrary.createPlacementPreviewAnchor(placement)
          )
        );

        if (cancelled || previewBuildVersionRef.current !== previewBuildVersion) {
          const disposalGroup = new Group();

          for (const placementAnchor of placementAnchors) {
            disposalGroup.add(placementAnchor);
          }

          disposeMapEditorViewportPreviewGroup(disposalGroup);
          return;
        }

        disposeMapEditorViewportPreviewGroup(placementGroup);
        placementAnchorByIdRef.current = new Map(
          placementAnchors.map((placementAnchor) => [
            placementAnchor.userData.placementId as string,
            placementAnchor
          ])
        );

        for (const placementAnchor of placementAnchors) {
          placementGroup.add(placementAnchor);
        }

        syncPlacementPreviewAnchors(placementDraftsRef.current);
        syncSelectionPresentation();
      } catch (error) {
        if (!cancelled) {
          setViewportError(resolveViewportErrorMessage(error));
        }
      }
    };

    void rebuildPlacementPreviews();

    return () => {
      cancelled = true;
    };
  }, [previewStructureSignature, syncPlacementPreviewAnchors, syncSelectionPresentation]);

  useEffect(() => {
    const collisionGroup = collisionGroupRef.current;

    if (collisionGroup === null) {
      return;
    }

    const collisionAnchors = placementDrafts.map((placement) =>
      createMapEditorViewportPlacementCollisionAnchor(placement)
    );

    disposeMapEditorViewportPreviewGroup(collisionGroup);
    collisionAnchorByIdRef.current = new Map(
      collisionAnchors.map((collisionAnchor) => [
        collisionAnchor.userData.placementId as string,
        collisionAnchor
      ])
    );

    for (const collisionAnchor of collisionAnchors) {
      collisionGroup.add(collisionAnchor);
    }
  }, [previewStructureSignature]);

  useEffect(() => {
    syncPlacementPreviewAnchors(placementDrafts);
  }, [placementDrafts, previewPlacementSignature, syncPlacementPreviewAnchors]);

  useEffect(() => {
    for (const placement of placementDrafts) {
      const collisionAnchor =
        collisionAnchorByIdRef.current.get(placement.placementId) ?? null;

      if (collisionAnchor === null) {
        continue;
      }

      syncMapEditorViewportPlacementAnchorTransform(collisionAnchor, placement);
    }
  }, [placementDrafts, previewPlacementSignature]);

  useEffect(() => {
    const sceneDraftHandles = sceneDraftHandlesRef.current;

    if (sceneDraftHandles === null) {
      return;
    }

    syncMapEditorViewportSceneDrafts(sceneDraftHandles, {
      playerSpawnDrafts,
      sceneObjectDrafts,
      waterRegionDrafts
    });
    syncSelectionPresentation();
  }, [playerSpawnDrafts, sceneDraftSignature, sceneObjectDrafts, waterRegionDrafts]);

  useEffect(() => {
    const semanticDraftHandles = semanticDraftHandlesRef.current;

    if (semanticDraftHandles === null) {
      return;
    }

    syncMapEditorViewportSemanticDrafts(semanticDraftHandles, {
      connectorDrafts,
      edgeDrafts,
      regionDrafts,
      surfaceDrafts,
      terrainChunkDrafts
    });
    syncSelectionPresentation();
  }, [
    connectorDrafts,
    edgeDrafts,
    regionDrafts,
    surfaceDrafts,
    syncSelectionPresentation,
    terrainChunkDrafts
  ]);

  useEffect(() => {
    const scene = sceneRef.current;
    const previewAssetLibrary = previewAssetLibraryRef.current;

    if (scene === null || previewAssetLibrary === null) {
      return;
    }

    let cancelled = false;

    const removeBuildCursorAnchor = () => {
      if (buildCursorAnchorRef.current === null) {
        buildCursorAssetIdRef.current = null;
        return;
      }

      const buildCursorDisposalGroup = new Group();

      scene.remove(buildCursorAnchorRef.current);
      buildCursorDisposalGroup.add(buildCursorAnchorRef.current);
      disposeMapEditorViewportPreviewGroup(buildCursorDisposalGroup);
      buildCursorAnchorRef.current = null;
      buildCursorAssetIdRef.current = null;
      buildCursorPositionRef.current = null;
    };

    if (viewportToolMode !== "module" || activeModuleAssetId === null) {
      removeBuildCursorAnchor();
      return;
    }

    if (
      buildCursorAnchorRef.current !== null &&
      buildCursorAssetIdRef.current === activeModuleAssetId
    ) {
      buildCursorAnchorRef.current.visible = buildCursorPositionRef.current !== null;
      return;
    }

    removeBuildCursorAnchor();

    const createBuildCursorAnchor = async () => {
      const placement = {
        assetId: activeModuleAssetId,
        colliderCount: 0,
        collisionEnabled: true,
        collisionPath: null,
        collider: null,
        dynamicBody: null,
        entries: null,
        isVisible: true,
        materialReferenceId: null,
        moduleId: "__map-editor-build-cursor__",
        notes: "",
        placementId: "__map-editor-build-cursor__",
        placementMode: "instanced",
        position: Object.freeze({
          x: 0,
          y: 0,
          z: 0
        }),
        rotationYRadians: 0,
        scale: Object.freeze({
          x: 1,
          y: 1,
          z: 1
        }),
        seats: null,
        surfaceColliders: Object.freeze([]),
        traversalAffordance: "support"
      } satisfies MapEditorPlacementDraftSnapshot;
      const buildCursorAnchor =
        await previewAssetLibrary.createPlacementPreviewAnchor(placement);

      if (cancelled) {
        const disposalGroup = new Group();

        disposalGroup.add(buildCursorAnchor);
        disposeMapEditorViewportPreviewGroup(disposalGroup);
        return;
      }

      applyMapEditorViewportPreviewOpacity(buildCursorAnchor, 0.42);
      if (buildCursorPositionRef.current !== null) {
        buildCursorAnchor.position.set(
          buildCursorPositionRef.current.x,
          buildCursorPositionRef.current.y,
          buildCursorPositionRef.current.z
        );
        buildCursorAnchor.visible = true;
      } else {
        buildCursorAnchor.visible = false;
      }
      buildCursorAnchorRef.current = buildCursorAnchor;
      buildCursorAssetIdRef.current = activeModuleAssetId;
      scene.add(buildCursorAnchor);
    };

    void createBuildCursorAnchor();

    return () => {
      cancelled = true;
    };
  }, [activeModuleAssetId, viewportToolMode]);

  useEffect(() => {
    const helperHandles = helperHandlesRef.current;
    const collisionGroup = collisionGroupRef.current;

    if (helperHandles === null) {
      return;
    }

    syncMapEditorViewportHelperVisibility(helperHandles, helperVisibility);

    if (collisionGroup !== null) {
      collisionGroup.visible = helperVisibility.collisionBounds;
    }
  }, [helperVisibility]);

  useEffect(() => {
    syncSelectionPresentation();
  }, [
    selectedEntityRef,
    selectedTransformTarget,
    syncSelectionPresentation,
    viewportToolMode
  ]);

  useEffect(() => {
    const camera = cameraRef.current;
    const orbitControls = orbitControlsRef.current;
    const hostElement = hostRef.current;

    if (camera === null || orbitControls === null) {
      return;
    }

    if (framedBundleIdRef.current === bundleId) {
      return;
    }

    if (hostElement !== null) {
      camera.aspect = Math.max(1, hostElement.clientWidth) / Math.max(1, hostElement.clientHeight);
      camera.updateProjectionMatrix();
    }

    const extents = resolvePlacementExtents(placementDrafts, {
      connectorDrafts,
      edgeDrafts,
      playerSpawnDrafts,
      regionDrafts,
      sceneObjectDrafts,
      surfaceDrafts,
      terrainChunkDrafts,
      waterRegionDrafts
    });
    const centerX = (extents.minX + extents.maxX) * 0.5;
    const centerZ = (extents.minZ + extents.maxZ) * 0.5;
    const span = Math.max(
      14,
      extents.maxX - extents.minX,
      extents.maxZ - extents.minZ
    );

    frameMapEditorViewportCamera(camera, orbitControls, centerX, centerZ, span);
    framedBundleIdRef.current = bundleId;
  }, [
    bundleId,
    connectorDrafts,
    edgeDrafts,
    placementDrafts,
    playerSpawnDrafts,
    regionDrafts,
    sceneObjectDrafts,
    surfaceDrafts,
    terrainChunkDrafts,
    waterRegionDrafts
  ]);

  return (
    <div className="relative flex h-full min-h-[420px] flex-col overflow-hidden rounded-xl border border-border/70 bg-[radial-gradient(circle_at_top,rgb(56_189_248/0.08),transparent_32%),linear-gradient(180deg,rgb(15_23_42/0.18),rgb(2_6_23/0.6))]">
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-border/70 bg-background/78 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
        {viewportToolMode === "module" && activeModuleAssetId !== null
          ? `Module tool: click to place ${activeModuleAssetId} on the snapped plane.`
          : viewportToolMode === "terrain"
            ? "Terrain tool: paint stepped terrain on the snapped grid. Brush size and smooth falloff come from the toolbar."
            : viewportToolMode === "wall"
              ? "Wall tool: click once to anchor, hover the next edge, then click again to commit and keep chaining."
              : viewportToolMode === "path"
                ? "Path tool: click to start or continue. Hold Ctrl and move vertically before commit to preview elevation changes."
                : viewportToolMode === "water"
                  ? "Water tool: place a snapped rectangular footprint using top elevation and depth."
                  : "Click to focus. Drag to orbit. Right-drag to pan. Scroll to zoom. Use WASD to fly, Q/E for height, and Shift to move faster."}
      </div>
      {viewportError !== null ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/92 p-6 text-center text-sm text-muted-foreground">
          {viewportError}
        </div>
      ) : null}
      <div
        className="h-full w-full outline-none"
        ref={hostRef}
        tabIndex={0}
      >
        <canvas className="h-full w-full" ref={canvasRef} />
      </div>
    </div>
  );
}
