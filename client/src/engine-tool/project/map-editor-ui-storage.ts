import {
  defaultMapEditorBuilderToolState,
  type MapEditorBuilderToolStateSnapshot,
  type MapEditorTerrainBrushMode,
  type MapEditorTerrainBrushSizeCells,
  type MapEditorWallToolPresetId
} from "@/engine-tool/types/map-editor";

export interface MapEditorUiStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface MapEditorUiPrefsSnapshot {
  readonly builderToolState: MapEditorBuilderToolStateSnapshot;
  readonly sceneRailCollapsed: boolean;
  readonly sectionOpenState: Readonly<Record<string, boolean>>;
}

const storedMapEditorUiPrefsKey = "webgpu-metaverse:engine-tool:map-editor-ui";
const storedMapEditorUiPrefsVersion = 1 as const;

interface StoredMapEditorUiPrefsRecord {
  readonly builderToolState?: unknown;
  readonly sceneRailCollapsed?: unknown;
  readonly sectionOpenState?: unknown;
  readonly version: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function freezeSectionOpenState(
  value: Record<string, boolean>
): Readonly<Record<string, boolean>> {
  return Object.freeze({ ...value });
}

function readTerrainBrushMode(value: unknown): MapEditorTerrainBrushMode | null {
  return value === "lower" || value === "raise" || value === "smooth"
    ? value
    : null;
}

function readTerrainBrushSizeCells(
  value: unknown
): MapEditorTerrainBrushSizeCells | null {
  return value === 1 || value === 2 || value === 4 || value === 8 ? value : null;
}

function readWallPresetId(value: unknown): MapEditorWallToolPresetId | null {
  return value === "curb" ||
    value === "fence" ||
    value === "rail" ||
    value === "retaining-wall" ||
    value === "wall"
    ? value
    : null;
}

function readBuilderToolState(value: unknown): MapEditorBuilderToolStateSnapshot {
  if (!isRecord(value)) {
    return defaultMapEditorBuilderToolState;
  }

  return Object.freeze({
    terrainBrushMode:
      readTerrainBrushMode(value.terrainBrushMode) ??
      defaultMapEditorBuilderToolState.terrainBrushMode,
    terrainBrushSizeCells:
      readTerrainBrushSizeCells(value.terrainBrushSizeCells) ??
      defaultMapEditorBuilderToolState.terrainBrushSizeCells,
    terrainSmoothEdges:
      typeof value.terrainSmoothEdges === "boolean"
        ? value.terrainSmoothEdges
        : defaultMapEditorBuilderToolState.terrainSmoothEdges,
    wallPresetId:
      readWallPresetId(value.wallPresetId) ??
      defaultMapEditorBuilderToolState.wallPresetId,
    waterDepthMeters:
      typeof value.waterDepthMeters === "number" && Number.isFinite(value.waterDepthMeters)
        ? Math.max(0.5, value.waterDepthMeters)
        : defaultMapEditorBuilderToolState.waterDepthMeters,
    waterFootprintCellsX:
      typeof value.waterFootprintCellsX === "number" &&
      Number.isFinite(value.waterFootprintCellsX)
        ? Math.max(1, Math.round(value.waterFootprintCellsX))
        : defaultMapEditorBuilderToolState.waterFootprintCellsX,
    waterFootprintCellsZ:
      typeof value.waterFootprintCellsZ === "number" &&
      Number.isFinite(value.waterFootprintCellsZ)
        ? Math.max(1, Math.round(value.waterFootprintCellsZ))
        : defaultMapEditorBuilderToolState.waterFootprintCellsZ,
    waterTopElevationMeters:
      typeof value.waterTopElevationMeters === "number" &&
      Number.isFinite(value.waterTopElevationMeters)
        ? value.waterTopElevationMeters
        : defaultMapEditorBuilderToolState.waterTopElevationMeters
  });
}

function readSectionOpenState(value: unknown): Readonly<Record<string, boolean>> {
  if (!isRecord(value)) {
    return freezeSectionOpenState({});
  }

  const nextState: Record<string, boolean> = {};

  for (const [key, candidate] of Object.entries(value)) {
    if (typeof candidate === "boolean") {
      nextState[key] = candidate;
    }
  }

  return freezeSectionOpenState(nextState);
}

export const defaultMapEditorUiPrefs =
  Object.freeze<MapEditorUiPrefsSnapshot>({
    builderToolState: defaultMapEditorBuilderToolState,
    sceneRailCollapsed: false,
    sectionOpenState: freezeSectionOpenState({})
  });

export function loadMapEditorUiPrefs(
  storage: MapEditorUiStorageLike | null
): MapEditorUiPrefsSnapshot {
  if (storage === null) {
    return defaultMapEditorUiPrefs;
  }

  const rawValue = storage.getItem(storedMapEditorUiPrefsKey);

  if (rawValue === null) {
    return defaultMapEditorUiPrefs;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as StoredMapEditorUiPrefsRecord;

    if (
      !isRecord(parsedValue) ||
      parsedValue.version !== storedMapEditorUiPrefsVersion
    ) {
      return defaultMapEditorUiPrefs;
    }

    return Object.freeze({
      builderToolState: readBuilderToolState(parsedValue.builderToolState),
      sceneRailCollapsed:
        typeof parsedValue.sceneRailCollapsed === "boolean"
          ? parsedValue.sceneRailCollapsed
          : false,
      sectionOpenState: readSectionOpenState(parsedValue.sectionOpenState)
    });
  } catch {
    return defaultMapEditorUiPrefs;
  }
}

export function saveMapEditorUiPrefs(
  storage: MapEditorUiStorageLike | null,
  prefs: MapEditorUiPrefsSnapshot
): void {
  if (storage === null) {
    return;
  }

  storage.setItem(
    storedMapEditorUiPrefsKey,
    JSON.stringify(
      Object.freeze({
        builderToolState: prefs.builderToolState,
        sceneRailCollapsed: prefs.sceneRailCollapsed,
        sectionOpenState: prefs.sectionOpenState,
        version: storedMapEditorUiPrefsVersion
      })
    )
  );
}
