import type { MetaverseWorldSurfaceVector3Snapshot } from "@webgpu-metaverse/shared/metaverse/world";

export type MapEditorViewportToolMode =
  | "module"
  | "move"
  | "path"
  | "rotate"
  | "scale"
  | "select"
  | "terrain"
  | "wall"
  | "water";

export type MapEditorTerrainBrushMode = "lower" | "raise" | "smooth";
export type MapEditorTerrainBrushSizeCells = 1 | 2 | 4 | 8;
export type MapEditorWallToolPresetId =
  | "curb"
  | "fence"
  | "rail"
  | "retaining-wall"
  | "wall";

export interface MapEditorBuilderToolStateSnapshot {
  readonly terrainBrushMode: MapEditorTerrainBrushMode;
  readonly terrainBrushSizeCells: MapEditorTerrainBrushSizeCells;
  readonly terrainSmoothEdges: boolean;
  readonly wallPresetId: MapEditorWallToolPresetId;
  readonly waterDepthMeters: number;
  readonly waterFootprintCellsX: number;
  readonly waterFootprintCellsZ: number;
  readonly waterTopElevationMeters: number;
}

export const defaultMapEditorBuilderToolState =
  Object.freeze<MapEditorBuilderToolStateSnapshot>({
    terrainBrushMode: "raise",
    terrainBrushSizeCells: 2,
    terrainSmoothEdges: true,
    wallPresetId: "wall",
    waterDepthMeters: 4,
    waterFootprintCellsX: 6,
    waterFootprintCellsZ: 6,
    waterTopElevationMeters: 0
  });
export type MapEditorViewportHelperId =
  | "axes"
  | "collisionBounds"
  | "grid"
  | "polarGrid"
  | "selectionBounds";

export interface MapEditorViewportHelperVisibilitySnapshot {
  readonly axes: boolean;
  readonly collisionBounds: boolean;
  readonly grid: boolean;
  readonly polarGrid: boolean;
  readonly selectionBounds: boolean;
}

export const defaultMapEditorViewportHelperVisibility =
  Object.freeze<MapEditorViewportHelperVisibilitySnapshot>({
    axes: true,
    collisionBounds: false,
    grid: true,
    polarGrid: false,
    selectionBounds: true
  });

export interface MapEditorMaterialOption {
  readonly label: string;
  readonly value: string;
}

export interface MapEditorPlacementUpdate {
  readonly collisionEnabled?: boolean;
  readonly isVisible?: boolean;
  readonly materialReferenceId?: string | null;
  readonly notes?: string;
  readonly position?: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  readonly rotationYRadians?: number;
  readonly scale?: MetaverseWorldSurfaceVector3Snapshot;
}

export interface MapEditorPlayerSpawnTransformUpdate {
  readonly position: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  readonly yawRadians: number;
}
