import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial
} from "three/webgpu";

import type {
  MapEditorConnectorDraftSnapshot,
  MapEditorEdgeDraftSnapshot,
  MapEditorRegionDraftSnapshot,
  MapEditorSurfaceDraftSnapshot,
  MapEditorTerrainChunkDraftSnapshot
} from "@/engine-tool/project/map-editor-project-state";
import { resolveMapEditorTerrainCellPosition } from "@/engine-tool/project/map-editor-project-state";

interface SemanticDraftMeshUserData {
  connectorId?: string;
  edgeId?: string;
  mapEditorOwnsGeometry?: boolean;
  mapEditorOwnsMaterial?: boolean;
  regionId?: string;
  surfaceId?: string;
  terrainChunkId?: string;
}

function createOwnedMesh(
  geometry: BoxGeometry,
  material: MeshStandardMaterial
): Mesh {
  const mesh = new Mesh(geometry, material);
  const userData = mesh.userData as SemanticDraftMeshUserData;

  userData.mapEditorOwnsGeometry = true;
  userData.mapEditorOwnsMaterial = true;

  return mesh;
}

function disposeOwnedGroup(group: Group): void {
  group.traverse((node) => {
    if (!("isMesh" in node) || node.isMesh !== true) {
      return;
    }

    const mesh = node as Mesh;
    const userData = mesh.userData as SemanticDraftMeshUserData;

    if (userData.mapEditorOwnsGeometry === true) {
      mesh.geometry.dispose();
    }

    if (userData.mapEditorOwnsMaterial === true) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      for (const material of materials) {
        material.dispose();
      }
    }
  });
}

function createTerrainChunkGroup(
  terrainChunk: MapEditorTerrainChunkDraftSnapshot
): Group {
  const root = new Group();
  const userData = root.userData as SemanticDraftMeshUserData;
  const cellSize = Math.max(0.5, terrainChunk.sampleStrideMeters * 0.92);

  root.name = `map_editor_semantic/terrain/${terrainChunk.chunkId}`;
  userData.terrainChunkId = terrainChunk.chunkId;

  for (let cellZ = 0; cellZ < terrainChunk.sampleCountZ; cellZ += 1) {
    for (let cellX = 0; cellX < terrainChunk.sampleCountX; cellX += 1) {
      const heightIndex = cellZ * terrainChunk.sampleCountX + cellX;
      const heightOffset = terrainChunk.heights[heightIndex] ?? 0;
      const cellPosition = resolveMapEditorTerrainCellPosition(
        terrainChunk,
        cellX,
        cellZ
      );
      const cellHeight = Math.max(0.18, Math.abs(heightOffset) + 0.18);
      const cellMaterial = new MeshStandardMaterial({
        color: heightOffset >= 0 ? "#2f855a" : "#1f5f46",
        emissive: "#10261d",
        metalness: 0.02,
        roughness: 0.92
      });
      const mesh = createOwnedMesh(
        new BoxGeometry(cellSize, cellHeight, cellSize),
        cellMaterial
      );

      mesh.position.set(
        cellPosition.x - terrainChunk.origin.x,
        heightOffset >= 0
          ? heightOffset * 0.5 + 0.09
          : heightOffset * 0.5 - 0.09,
        cellPosition.z - terrainChunk.origin.z
      );
      root.add(mesh);
    }
  }

  root.position.set(terrainChunk.origin.x, terrainChunk.origin.y, terrainChunk.origin.z);

  return root;
}

function createSurfaceGroup(surface: MapEditorSurfaceDraftSnapshot): Group {
  const root = new Group();
  const userData = root.userData as SemanticDraftMeshUserData;
  const mesh = createOwnedMesh(
    new BoxGeometry(surface.size.x, Math.max(0.12, surface.size.y), surface.size.z),
    new MeshStandardMaterial({
      color: "#1e3a5f",
      emissive: "#07111b",
      metalness: 0.02,
      opacity: 0.45,
      roughness: 0.88,
      transparent: true
    })
  );

  root.name = `map_editor_semantic/surface/${surface.surfaceId}`;
  userData.surfaceId = surface.surfaceId;
  root.add(mesh);
  root.position.set(surface.center.x, surface.center.y, surface.center.z);
  root.rotation.y = surface.rotationYRadians;

  return root;
}

function createRegionGroup(region: MapEditorRegionDraftSnapshot): Group {
  const root = new Group();
  const userData = root.userData as SemanticDraftMeshUserData;
  const mesh = createOwnedMesh(
    new BoxGeometry(region.size.x, Math.max(0.08, region.size.y * 0.35), region.size.z),
    new MeshStandardMaterial({
      color:
        region.regionKind === "path"
          ? "#f59e0b"
          : region.regionKind === "arena"
            ? "#fb7185"
            : "#0ea5e9",
      emissive: "#0f172a",
      metalness: 0,
      opacity: 0.72,
      roughness: 0.74,
      transparent: true
    })
  );

  root.name = `map_editor_semantic/region/${region.regionId}`;
  userData.regionId = region.regionId;
  root.add(mesh);
  root.position.set(region.center.x, region.center.y + 0.06, region.center.z);
  root.rotation.y = region.rotationYRadians;

  return root;
}

function createEdgeGroup(edge: MapEditorEdgeDraftSnapshot): Group {
  const root = new Group();
  const userData = root.userData as SemanticDraftMeshUserData;
  const mesh = createOwnedMesh(
    new BoxGeometry(
      Math.max(0.25, edge.lengthMeters),
      Math.max(0.25, edge.heightMeters),
      Math.max(0.1, edge.thicknessMeters)
    ),
    new MeshStandardMaterial({
      color: edge.edgeKind === "wall" ? "#f97316" : "#a78bfa",
      emissive: "#160d08",
      metalness: 0.06,
      roughness: 0.78
    })
  );

  root.name = `map_editor_semantic/edge/${edge.edgeId}`;
  userData.edgeId = edge.edgeId;
  root.add(mesh);
  root.position.set(edge.center.x, edge.center.y, edge.center.z);
  root.rotation.y = edge.rotationYRadians;

  return root;
}

function createConnectorGroup(
  connector: MapEditorConnectorDraftSnapshot
): Group {
  const root = new Group();
  const userData = root.userData as SemanticDraftMeshUserData;
  const mesh = createOwnedMesh(
    new BoxGeometry(
      Math.max(0.25, connector.size.x),
      Math.max(0.25, connector.size.y),
      Math.max(0.25, connector.size.z)
    ),
    new MeshStandardMaterial({
      color: "#8b5cf6",
      emissive: "#13091f",
      metalness: 0.04,
      roughness: 0.7
    })
  );

  root.name = `map_editor_semantic/connector/${connector.connectorId}`;
  userData.connectorId = connector.connectorId;
  root.add(mesh);
  root.position.set(connector.center.x, connector.center.y, connector.center.z);
  root.rotation.y = connector.rotationYRadians;

  return root;
}

export interface MapEditorViewportSemanticDraftHandles {
  readonly connectorGroupsById: Map<string, Group>;
  readonly edgeGroupsById: Map<string, Group>;
  readonly regionGroupsById: Map<string, Group>;
  readonly rootGroup: Group;
  readonly surfaceGroupsById: Map<string, Group>;
  readonly terrainChunkGroupsById: Map<string, Group>;
}

export function createMapEditorViewportSemanticDraftHandles(): MapEditorViewportSemanticDraftHandles {
  return Object.freeze({
    connectorGroupsById: new Map<string, Group>(),
    edgeGroupsById: new Map<string, Group>(),
    regionGroupsById: new Map<string, Group>(),
    rootGroup: new Group(),
    surfaceGroupsById: new Map<string, Group>(),
    terrainChunkGroupsById: new Map<string, Group>()
  });
}

export function disposeMapEditorViewportSemanticDraftHandles(
  handles: MapEditorViewportSemanticDraftHandles
): void {
  disposeOwnedGroup(handles.rootGroup);
}

export function syncMapEditorViewportSemanticDrafts(
  handles: MapEditorViewportSemanticDraftHandles,
  drafts: {
    readonly connectorDrafts: readonly MapEditorConnectorDraftSnapshot[];
    readonly edgeDrafts: readonly MapEditorEdgeDraftSnapshot[];
    readonly regionDrafts: readonly MapEditorRegionDraftSnapshot[];
    readonly surfaceDrafts: readonly MapEditorSurfaceDraftSnapshot[];
    readonly terrainChunkDrafts: readonly MapEditorTerrainChunkDraftSnapshot[];
  }
): void {
  disposeOwnedGroup(handles.rootGroup);
  handles.rootGroup.clear();
  handles.connectorGroupsById.clear();
  handles.edgeGroupsById.clear();
  handles.regionGroupsById.clear();
  handles.surfaceGroupsById.clear();
  handles.terrainChunkGroupsById.clear();

  for (const terrainChunk of drafts.terrainChunkDrafts) {
    const group = createTerrainChunkGroup(terrainChunk);

    handles.terrainChunkGroupsById.set(terrainChunk.chunkId, group);
    handles.rootGroup.add(group);
  }

  for (const surface of drafts.surfaceDrafts) {
    const group = createSurfaceGroup(surface);

    handles.surfaceGroupsById.set(surface.surfaceId, group);
    handles.rootGroup.add(group);
  }

  for (const region of drafts.regionDrafts) {
    const group = createRegionGroup(region);

    handles.regionGroupsById.set(region.regionId, group);
    handles.rootGroup.add(group);
  }

  for (const edge of drafts.edgeDrafts) {
    const group = createEdgeGroup(edge);

    handles.edgeGroupsById.set(edge.edgeId, group);
    handles.rootGroup.add(group);
  }

  for (const connector of drafts.connectorDrafts) {
    const group = createConnectorGroup(connector);

    handles.connectorGroupsById.set(connector.connectorId, group);
    handles.rootGroup.add(group);
  }
}
