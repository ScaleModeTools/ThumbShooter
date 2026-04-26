import {
  AxesHelper,
  BoxHelper,
  GridHelper,
  Object3D,
  PolarGridHelper,
  Scene
} from "three/webgpu";

import { mapEditorBuildGridUnitMeters } from "@/engine-tool/build/map-editor-build-placement";
import {
  normalizeMapEditorProjectHelperGridSizeMeters,
  type MapEditorViewportHelperVisibilitySnapshot
} from "@/engine-tool/types/map-editor";

export interface MapEditorViewportHelperHandles {
  axesHelper: AxesHelper;
  helperGridSizeMeters: number;
  gridHelper: GridHelper;
  polarGridHelper: PolarGridHelper;
  selectionBoundsHelper: BoxHelper | null;
}

function createGridHelper(
  helperGridSizeMeters: number
): GridHelper {
  return new GridHelper(
    helperGridSizeMeters,
    Math.max(1, Math.round(helperGridSizeMeters / mapEditorBuildGridUnitMeters)),
    "#1d4ed8",
    "#1f2937"
  );
}

function createPolarGridHelper(
  helperGridSizeMeters: number
): PolarGridHelper {
  return new PolarGridHelper(
    helperGridSizeMeters * 0.5,
    30,
    Math.max(
      1,
      Math.round(helperGridSizeMeters / (mapEditorBuildGridUnitMeters * 5))
    ),
    Math.max(1, Math.round(helperGridSizeMeters / mapEditorBuildGridUnitMeters)),
    "#0ea5e9",
    "#475569"
  );
}

function disposeHelperMaterial(
  material:
    | {
        dispose: () => void;
      }
    | readonly {
        dispose: () => void;
      }[]
    | undefined
): void {
  if (material === undefined) {
    return;
  }

  if (Array.isArray(material)) {
    for (const materialEntry of material) {
      materialEntry.dispose();
    }

    return;
  }

  (material as { dispose: () => void }).dispose();
}

function disposeHelperObject(
  object: Object3D & {
    geometry?: {
      dispose: () => void;
    };
    material?: {
      dispose: () => void;
    } | readonly {
      dispose: () => void;
    }[];
  }
): void {
  object.geometry?.dispose();
  disposeHelperMaterial(object.material);
}

export function createMapEditorViewportHelperHandles(
  scene: Scene,
  helperGridSizeMeters: number
): MapEditorViewportHelperHandles {
  const resolvedHelperGridSizeMeters =
    normalizeMapEditorProjectHelperGridSizeMeters(helperGridSizeMeters);
  const gridHelper = createGridHelper(resolvedHelperGridSizeMeters);
  scene.add(gridHelper);

  const polarGridHelper = createPolarGridHelper(resolvedHelperGridSizeMeters);
  scene.add(polarGridHelper);

  const axesHelper = new AxesHelper(32);
  scene.add(axesHelper);

  return {
    axesHelper,
    helperGridSizeMeters: resolvedHelperGridSizeMeters,
    gridHelper,
    polarGridHelper,
    selectionBoundsHelper: null
  };
}

export function syncMapEditorViewportHelperGridSize(
  scene: Scene | null,
  helperHandles: MapEditorViewportHelperHandles,
  helperGridSizeMeters: number
): void {
  if (scene === null) {
    return;
  }

  const resolvedHelperGridSizeMeters =
    normalizeMapEditorProjectHelperGridSizeMeters(helperGridSizeMeters);

  if (helperHandles.helperGridSizeMeters === resolvedHelperGridSizeMeters) {
    return;
  }

  scene.remove(helperHandles.gridHelper);
  scene.remove(helperHandles.polarGridHelper);
  disposeHelperObject(helperHandles.gridHelper);
  disposeHelperObject(helperHandles.polarGridHelper);

  helperHandles.gridHelper = createGridHelper(resolvedHelperGridSizeMeters);
  helperHandles.polarGridHelper = createPolarGridHelper(
    resolvedHelperGridSizeMeters
  );
  helperHandles.helperGridSizeMeters = resolvedHelperGridSizeMeters;

  scene.add(helperHandles.gridHelper);
  scene.add(helperHandles.polarGridHelper);
}

export function syncMapEditorViewportHelperVisibility(
  helperHandles: MapEditorViewportHelperHandles,
  helperVisibility: MapEditorViewportHelperVisibilitySnapshot
): void {
  helperHandles.axesHelper.visible = helperVisibility.axes;
  helperHandles.gridHelper.visible = helperVisibility.grid;
  helperHandles.polarGridHelper.visible = helperVisibility.polarGrid;

  if (helperHandles.selectionBoundsHelper !== null) {
    helperHandles.selectionBoundsHelper.visible =
      helperVisibility.selectionBounds;
  }
}

export function replaceMapEditorViewportSelectionBoundsHelper(
  scene: Scene,
  helperHandles: MapEditorViewportHelperHandles,
  selectedObject: Object3D | null,
  helperVisibility: MapEditorViewportHelperVisibilitySnapshot
): void {
  if (helperHandles.selectionBoundsHelper !== null) {
    scene.remove(helperHandles.selectionBoundsHelper);
    disposeHelperObject(helperHandles.selectionBoundsHelper);
    helperHandles.selectionBoundsHelper = null;
  }

  if (selectedObject === null) {
    return;
  }

  const selectionBoundsHelper = new BoxHelper(selectedObject, "#facc15");
  selectionBoundsHelper.visible = helperVisibility.selectionBounds;
  helperHandles.selectionBoundsHelper = selectionBoundsHelper;
  scene.add(selectionBoundsHelper);
}

export function disposeMapEditorViewportHelperHandles(
  scene: Scene,
  helperHandles: MapEditorViewportHelperHandles
): void {
  scene.remove(helperHandles.axesHelper);
  scene.remove(helperHandles.gridHelper);
  scene.remove(helperHandles.polarGridHelper);

  disposeHelperObject(helperHandles.axesHelper);
  disposeHelperObject(helperHandles.gridHelper);
  disposeHelperObject(helperHandles.polarGridHelper);

  if (helperHandles.selectionBoundsHelper !== null) {
    scene.remove(helperHandles.selectionBoundsHelper);
    disposeHelperObject(helperHandles.selectionBoundsHelper);
    helperHandles.selectionBoundsHelper = null;
  }
}
