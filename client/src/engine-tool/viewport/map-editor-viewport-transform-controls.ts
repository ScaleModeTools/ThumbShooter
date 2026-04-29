import { normalizePlanarYawRadians } from "@webgpu-metaverse/shared";
import type { MetaverseWorldSurfaceVector3Snapshot } from "@webgpu-metaverse/shared/metaverse/world";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  TransformControls,
  type TransformControlsMode
} from "three/addons/controls/TransformControls.js";
import type { Group, PerspectiveCamera, Scene } from "three/webgpu";

import type {
  MapEditorEntityTransformUpdate,
  MapEditorPlayerSpawnTransformUpdate,
  MapEditorPlacementUpdate,
  MapEditorViewportTransformTargetRef,
  MapEditorViewportToolMode
} from "@/engine-tool/types/map-editor";

function resolveTransformControlsMode(
  viewportToolMode: MapEditorViewportToolMode
): TransformControlsMode {
  switch (viewportToolMode) {
    case "rotate":
      return "rotate";
    case "scale":
      return "scale";
    default:
      return "translate";
  }
}

function resolveScaleFromGroup(
  group: Group
): MetaverseWorldSurfaceVector3Snapshot {
  return Object.freeze({
    x: Math.max(0.1, Math.abs(group.scale.x)),
    y: Math.max(0.1, Math.abs(group.scale.y)),
    z: Math.max(0.1, Math.abs(group.scale.z))
  });
}

function readPlacementUpdateFromGroup(group: Group): MapEditorPlacementUpdate {
  return Object.freeze({
    position: Object.freeze({
      x: group.position.x,
      y: group.position.y,
      z: group.position.z
    }),
    rotationYRadians: normalizePlanarYawRadians(group.rotation.y),
    scale: resolveScaleFromGroup(group)
  });
}

function readPlayerSpawnTransformUpdateFromGroup(
  group: Group
): MapEditorPlayerSpawnTransformUpdate {
  return Object.freeze({
    position: Object.freeze({
      x: group.position.x,
      y: group.position.y,
      z: group.position.z
    }),
    yawRadians: normalizePlanarYawRadians(group.rotation.y)
  });
}

function readEntityTransformUpdateFromGroup(
  group: Group
): MapEditorEntityTransformUpdate {
  return Object.freeze({
    position: Object.freeze({
      x: group.position.x,
      y: group.position.y,
      z: group.position.z
    }),
    rotationYRadians: normalizePlanarYawRadians(group.rotation.y),
    scale: resolveScaleFromGroup(group)
  });
}

interface MapEditorViewportTransformControllerOptions {
  readonly camera: PerspectiveCamera;
  readonly canvasElement: HTMLCanvasElement;
  readonly orbitControls: OrbitControls;
  readonly scene: Scene;
  readonly onCommitPlacementTransform: (
    placementId: string,
    update: MapEditorPlacementUpdate
  ) => void;
  readonly onCommitPlayerSpawnTransform: (
    spawnId: string,
    update: MapEditorPlayerSpawnTransformUpdate
  ) => void;
  readonly onCommitEntityTransform: (
    target: MapEditorViewportTransformTargetRef,
    update: MapEditorEntityTransformUpdate
  ) => void;
}

export class MapEditorViewportTransformController {
  readonly #controls: TransformControls;
  readonly #helper;
  readonly #orbitControls: OrbitControls;
  readonly #onCommitPlacementTransform: (
    placementId: string,
    update: MapEditorPlacementUpdate
  ) => void;
  readonly #onCommitPlayerSpawnTransform: (
    spawnId: string,
    update: MapEditorPlayerSpawnTransformUpdate
  ) => void;
  readonly #onCommitEntityTransform: (
    target: MapEditorViewportTransformTargetRef,
    update: MapEditorEntityTransformUpdate
  ) => void;

  #attachedGroup: Group | null = null;
  #attachedTarget: MapEditorViewportTransformTargetRef | null = null;
  #dragging = false;
  #viewportToolMode: MapEditorViewportToolMode = "move";

  constructor({
    camera,
    canvasElement,
    orbitControls,
    scene,
    onCommitPlacementTransform,
    onCommitPlayerSpawnTransform,
    onCommitEntityTransform
  }: MapEditorViewportTransformControllerOptions) {
    this.#controls = new TransformControls(camera, canvasElement);
    this.#helper = this.#controls.getHelper();
    this.#orbitControls = orbitControls;
    this.#onCommitPlacementTransform = onCommitPlacementTransform;
    this.#onCommitPlayerSpawnTransform = onCommitPlayerSpawnTransform;
    this.#onCommitEntityTransform = onCommitEntityTransform;

    scene.add(this.#helper);
    this.#controls.size = 1.15;
    this.#controls.setSpace("world");
    this.#controls.setTranslationSnap(1);
    this.#controls.setRotationSnap(Math.PI * 0.5);
    this.#controls.setScaleSnap(0.25);
    this.#controls.addEventListener(
      "dragging-changed",
      this.#handleDraggingChanged
    );
    this.#controls.addEventListener("mouseUp", this.#handleMouseUp);
    this.#controls.addEventListener("objectChange", this.#handleObjectChange);
  }

  get dragging(): boolean {
    return this.#dragging;
  }

  syncToolMode(viewportToolMode: MapEditorViewportToolMode): void {
    this.#viewportToolMode = viewportToolMode;
    this.#controls.setMode(resolveTransformControlsMode(viewportToolMode));
    this.#controls.setSpace(
      viewportToolMode === "move"
        ? "world"
        : "local"
    );

    switch (viewportToolMode) {
      case "module":
      case "cover":
      case "delete":
      case "floor":
      case "lane":
      case "light":
      case "paint":
      case "path":
      case "player-spawn":
      case "portal":
      case "resource-spawn":
      case "select":
      case "terrain":
      case "vehicle-route":
      case "wall":
      case "zone":
      case "water":
        this.#controls.showX = false;
        this.#controls.showY = false;
        this.#controls.showZ = false;
        break;
      case "vertex":
        this.#controls.showX = false;
        this.#controls.showY = true;
        this.#controls.showZ = false;
        break;
      case "rotate":
        this.#controls.showX = false;
        this.#controls.showY = true;
        this.#controls.showZ = false;
        break;
      case "scale":
        this.#controls.showX = true;
        this.#controls.showY = true;
        this.#controls.showZ = true;
        break;
      default:
        this.#controls.showX = true;
        this.#controls.showY = true;
        this.#controls.showZ = true;
        break;
    }
  }

  syncAttachedGroup(
    group: Group | null,
    target: MapEditorViewportTransformTargetRef | null
  ): void {
    this.#attachedGroup = group;
    this.#attachedTarget = group === null ? null : target;

    if (group === null) {
      this.#controls.detach();
      return;
    }

    this.#controls.attach(group);
  }

  dispose(scene: Scene): void {
    this.#controls.removeEventListener(
      "dragging-changed",
      this.#handleDraggingChanged
    );
    this.#controls.removeEventListener("mouseUp", this.#handleMouseUp);
    this.#controls.removeEventListener("objectChange", this.#handleObjectChange);
    this.#controls.detach();
    scene.remove(this.#helper);
    this.#controls.dispose();
  }

  readonly #handleDraggingChanged = (event: { readonly value?: unknown }) => {
    this.#dragging = event.value === true;
    this.#orbitControls.enabled = !this.#dragging;
  };

  readonly #handleMouseUp = () => {
    const attachedGroup = this.#attachedGroup;
    const attachedTarget = this.#attachedTarget;

    if (attachedGroup === null || attachedTarget === null) {
      return;
    }

    if (attachedTarget.kind === "player-spawn") {
      this.#onCommitPlayerSpawnTransform(
        attachedTarget.id,
        readPlayerSpawnTransformUpdateFromGroup(attachedGroup)
      );
      return;
    }

    if (attachedTarget.kind === "placement") {
      this.#onCommitPlacementTransform(
        attachedTarget.id,
        readPlacementUpdateFromGroup(attachedGroup)
      );
      return;
    }

    this.#onCommitEntityTransform(
      attachedTarget,
      readEntityTransformUpdateFromGroup(attachedGroup)
    );
  };

  readonly #handleObjectChange = () => {
    const attachedGroup = this.#attachedGroup;

    if (attachedGroup === null) {
      return;
    }

    attachedGroup.rotation.x = 0;
    attachedGroup.rotation.z = 0;
    attachedGroup.rotation.y = normalizePlanarYawRadians(
      attachedGroup.rotation.y
    );

    if (this.#viewportToolMode === "scale") {
      const scaleVector = resolveScaleFromGroup(attachedGroup);

      attachedGroup.scale.set(scaleVector.x, scaleVector.y, scaleVector.z);
    }

    attachedGroup.updateMatrixWorld(true);
  };
}
