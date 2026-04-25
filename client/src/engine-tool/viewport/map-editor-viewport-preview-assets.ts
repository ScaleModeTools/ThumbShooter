import type { Material } from "three";
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Object3D
} from "three/webgpu";

import { environmentPropManifest } from "@/assets/config/environment-prop-manifest";
import type {
  EnvironmentAssetDescriptor,
  EnvironmentPhysicsBoxColliderDescriptor,
  EnvironmentProceduralBoxLodDescriptor,
  EnvironmentRenderLodDescriptor
} from "@/assets/types/environment-asset-manifest";
import type { MapEditorPlacementDraftSnapshot } from "@/engine-tool/project/map-editor-project-state";
import {
  resolveMetaverseSceneSemanticPreviewColorHex,
  type MetaverseSceneSemanticPreviewTextureId
} from "@/metaverse/render/environment/metaverse-scene-semantic-material-textures";
import { createDefaultMetaverseSceneAssetLoader } from "@/metaverse/render/metaverse-scene-asset-loader";

interface PreviewMeshUserData {
  mapEditorOwnsGeometry?: boolean;
  mapEditorOwnsMaterial?: boolean;
  placementId?: string;
}

interface PreviewTintableMaterial extends Material {
  color?: {
    set: (value: string) => void;
  };
  emissive?: {
    set: (value: string) => void;
  };
  metalness?: number;
  roughness?: number;
}

function readSemanticPreviewTextureId(
  value: string | null
): MetaverseSceneSemanticPreviewTextureId | null {
  return value === "alien-rock" ||
    value === "concrete" ||
    value === "glass" ||
    value === "metal" ||
    value === "terrain-ash" ||
    value === "terrain-grass" ||
    value === "terrain-rock" ||
    value === "team-blue" ||
    value === "team-red" ||
    value === "warning" ||
    value === "shell-floor-grid" ||
    value === "shell-metal-panel" ||
    value === "shell-painted-trim"
    ? value
    : null;
}

function createProceduralPreviewMaterial(
  materialPreset: EnvironmentProceduralBoxLodDescriptor["materialPreset"]
): MeshStandardMaterial {
  switch (materialPreset) {
    case "training-range-accent":
      return new MeshStandardMaterial({
        color: "#c26b2e",
        emissive: "#140805",
        metalness: 0.08,
        roughness: 0.76
      });
    default:
      return new MeshStandardMaterial({
        color: "#8f8c80",
        emissive: "#040406",
        metalness: 0.02,
        roughness: 0.94
      });
  }
}

function createColliderPreviewMaterial(
  colliderDescriptor:
    | EnvironmentPhysicsBoxColliderDescriptor
    | EnvironmentAssetDescriptor["collider"]
): MeshStandardMaterial {
  const colliderColor =
    colliderDescriptor !== null &&
    "traversalAffordance" in colliderDescriptor
      ? colliderDescriptor.traversalAffordance === "support"
        ? "#38bdf8"
        : "#f97316"
      : "#e879f9";

  return new MeshStandardMaterial({
    color: colliderColor,
    emissive: colliderColor,
    metalness: 0,
    opacity: 0.28,
    roughness: 0.25,
    transparent: true,
    wireframe: true
  });
}

function createProceduralPreviewRoot(
  lodDescriptor: EnvironmentProceduralBoxLodDescriptor,
  assetId: string
): Group {
  const previewRoot = new Group();
  const geometry = new BoxGeometry(
    lodDescriptor.size.x,
    lodDescriptor.size.y,
    lodDescriptor.size.z
  );
  const material = createProceduralPreviewMaterial(lodDescriptor.materialPreset);
  const mesh = new Mesh(geometry, material);
  const userData = mesh.userData as PreviewMeshUserData;

  mesh.name = `map_editor_preview/${assetId}/${lodDescriptor.tier}`;
  mesh.position.y = lodDescriptor.size.y * 0.5;
  mesh.castShadow = lodDescriptor.materialPreset === "training-range-accent";
  mesh.receiveShadow = true;
  userData.mapEditorOwnsGeometry = true;
  userData.mapEditorOwnsMaterial = true;
  previewRoot.add(mesh);

  return previewRoot;
}

function resolveDefaultRenderLod(
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

function cloneMaterial(material: Material | readonly Material[]): Material | readonly Material[] {
  if (Array.isArray(material)) {
    return material.map((materialEntry) => materialEntry.clone());
  }

  return (material as Material).clone();
}

function isProceduralRenderLod(
  lodDescriptor: EnvironmentRenderLodDescriptor
): lodDescriptor is EnvironmentProceduralBoxLodDescriptor {
  return "kind" in lodDescriptor && lodDescriptor.kind === "procedural-box";
}

function readEnvironmentAssetDescriptor(
  assetId: string
): EnvironmentAssetDescriptor | null {
  return (
    environmentPropManifest.environmentAssets.find(
      (environmentAsset) => environmentAsset.id === assetId
    ) ?? null
  );
}

function mutateMaterialOpacity(
  material: Material | readonly Material[],
  opacity: number
): void {
  const materialEntries = Array.isArray(material) ? material : [material];

  for (const materialEntry of materialEntries) {
    materialEntry.transparent = opacity < 1;
    materialEntry.opacity = opacity;
    materialEntry.depthWrite = opacity >= 1;
  }
}

function ensureOwnedPreviewMaterial(mesh: Mesh): void {
  const userData = mesh.userData as PreviewMeshUserData;

  if (userData.mapEditorOwnsMaterial === true) {
    return;
  }

  mesh.material = cloneMaterial(
    mesh.material as Material | readonly Material[]
  ) as Mesh["material"];
  userData.mapEditorOwnsMaterial = true;
}

function applyPlacementPreviewAppearance(
  previewRoot: Group,
  placement: MapEditorPlacementDraftSnapshot
): void {
  const materialReferenceId = readSemanticPreviewTextureId(
    placement.materialReferenceId
  );
  const visibleOpacity = materialReferenceId === "glass" ? 0.72 : 1;

  applyMapEditorViewportPreviewOpacity(
    previewRoot,
    placement.isVisible ? visibleOpacity : 0.34
  );
}

function applyPlacementPreviewMaterialReference(
  previewRoot: Group,
  materialReferenceId: string | null
): void {
  const textureId = readSemanticPreviewTextureId(materialReferenceId);

  if (textureId === null) {
    return;
  }

  const materialColor = resolveMetaverseSceneSemanticPreviewColorHex(textureId);

  previewRoot.traverse((node) => {
    if (!("isMesh" in node) || node.isMesh !== true) {
      return;
    }

    const mesh = node as Mesh;

    ensureOwnedPreviewMaterial(mesh);

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    for (const material of materials) {
      const tintableMaterial = material as PreviewTintableMaterial;

      tintableMaterial.color?.set(materialColor);
      tintableMaterial.emissive?.set(textureId === "alien-rock" ? "#160c2f" : "#050609");
      tintableMaterial.metalness =
        textureId === "metal" || textureId === "shell-metal-panel" ? 0.32 : 0.04;
      tintableMaterial.roughness = textureId === "glass" ? 0.28 : 0.78;
      tintableMaterial.needsUpdate = true;
    }
  });
}

export function resolveMapEditorViewportPlacementRenderYawRadians(
  placement: Pick<MapEditorPlacementDraftSnapshot, "assetId" | "rotationYRadians">
): number {
  const asset = readEnvironmentAssetDescriptor(placement.assetId);
  const forwardModelYawRadians = asset?.orientation?.forwardModelYawRadians ?? null;

  return forwardModelYawRadians === null
    ? placement.rotationYRadians
    : forwardModelYawRadians - placement.rotationYRadians;
}

function resolvePlacementVisualYawOffsetRadians(
  placement: Pick<MapEditorPlacementDraftSnapshot, "assetId" | "rotationYRadians">
): number {
  return (
    resolveMapEditorViewportPlacementRenderYawRadians(placement) -
    placement.rotationYRadians
  );
}

function syncPlacementPreviewVisualFrame(
  previewAnchor: Group,
  placement: MapEditorPlacementDraftSnapshot
): void {
  const previewRoot = previewAnchor.children[0] ?? null;

  if (previewRoot === null) {
    return;
  }

  previewRoot.rotation.y = resolvePlacementVisualYawOffsetRadians(placement);
  previewRoot.updateMatrixWorld(true);
}

export function applyMapEditorViewportPreviewOpacity(
  previewRoot: Group,
  opacity: number
): void {
  previewRoot.traverse((node) => {
    if (!("isMesh" in node) || node.isMesh !== true) {
      return;
    }

    const mesh = node as Mesh;
    ensureOwnedPreviewMaterial(mesh);
    mutateMaterialOpacity(
      mesh.material as Material | readonly Material[],
      opacity
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
}

export function syncMapEditorViewportPlacementAnchorTransform(
  anchor: Group,
  placement: MapEditorPlacementDraftSnapshot
): void {
  anchor.position.set(
    placement.position.x,
    placement.position.y,
    placement.position.z
  );
  anchor.rotation.y = placement.rotationYRadians;
  anchor.scale.set(
    Math.max(0.1, placement.scale.x),
    Math.max(0.1, placement.scale.y),
    Math.max(0.1, placement.scale.z)
  );
  anchor.updateMatrixWorld(true);
}

export function syncMapEditorViewportPlacementPreviewAnchor(
  previewAnchor: Group,
  placement: MapEditorPlacementDraftSnapshot
): void {
  syncMapEditorViewportPlacementAnchorTransform(previewAnchor, placement);
  syncPlacementPreviewVisualFrame(previewAnchor, placement);
  applyPlacementPreviewMaterialReference(
    previewAnchor,
    placement.materialReferenceId
  );
  applyPlacementPreviewAppearance(previewAnchor, placement);
}

function tagPlacementNodes(root: Object3D, placementId: string): void {
  root.userData.placementId = placementId;

  root.traverse((node) => {
    node.userData.placementId = placementId;
  });
}

function createMissingAssetPreviewRoot(assetId: string): Group {
  const previewRoot = new Group();
  const geometry = new BoxGeometry(2, 2, 2);
  const material = new MeshStandardMaterial({
    color: "#ef4444",
    emissive: "#450a0a",
    metalness: 0.05,
    roughness: 0.8
  });
  const mesh = new Mesh(geometry, material);
  const userData = mesh.userData as PreviewMeshUserData;

  mesh.name = `map_editor_preview_missing/${assetId}`;
  mesh.position.y = 1;
  userData.mapEditorOwnsGeometry = true;
  userData.mapEditorOwnsMaterial = true;
  previewRoot.add(mesh);

  return previewRoot;
}

export function createMapEditorViewportPlacementCollisionAnchor(
  placement: MapEditorPlacementDraftSnapshot
): Group {
  const collisionAnchor = new Group();
  const asset = readEnvironmentAssetDescriptor(placement.assetId);
  const colliderDescriptors = [
    ...(asset?.physicsColliders ?? []),
    ...(asset?.collider === null || asset?.collider === undefined
      ? []
      : [asset.collider])
  ];

  collisionAnchor.name = `map_editor_collision/${placement.placementId}`;

  for (const [colliderIndex, colliderDescriptor] of colliderDescriptors.entries()) {
    const geometry = new BoxGeometry(
      colliderDescriptor.size.x,
      colliderDescriptor.size.y,
      colliderDescriptor.size.z
    );
    const material = createColliderPreviewMaterial(colliderDescriptor);
    const mesh = new Mesh(geometry, material);
    const userData = mesh.userData as PreviewMeshUserData;

    mesh.name = `${collisionAnchor.name}/${colliderIndex + 1}`;
    mesh.position.set(
      colliderDescriptor.center.x,
      colliderDescriptor.center.y,
      colliderDescriptor.center.z
    );
    userData.mapEditorOwnsGeometry = true;
    userData.mapEditorOwnsMaterial = true;
    collisionAnchor.add(mesh);
  }

  tagPlacementNodes(collisionAnchor, placement.placementId);
  syncMapEditorViewportPlacementAnchorTransform(collisionAnchor, placement);

  return collisionAnchor;
}

function disposePreviewMesh(mesh: Mesh): void {
  const userData = mesh.userData as PreviewMeshUserData;

  if (userData.mapEditorOwnsGeometry === true) {
    mesh.geometry.dispose();
  }

  if (userData.mapEditorOwnsMaterial !== true) {
    return;
  }

  const material = mesh.material as Material | readonly Material[];
  const materialEntries = Array.isArray(material) ? material : [material];

  for (const materialEntry of materialEntries) {
    materialEntry.dispose();
  }
}

export function disposeMapEditorViewportPreviewGroup(group: Group): void {
  for (const child of [...group.children]) {
    group.remove(child);

    child.traverse((node) => {
      if (!("isMesh" in node) || node.isMesh !== true) {
        return;
      }

      disposePreviewMesh(node as Mesh);
    });
  }
}

export class MapEditorViewportPreviewAssetLibrary {
  readonly #cachedPreviewRoots = new Map<string, Promise<Group>>();
  readonly #sceneAssetLoader = createDefaultMetaverseSceneAssetLoader();

  async createPlacementPreviewAnchor(
    placement: MapEditorPlacementDraftSnapshot
  ): Promise<Group> {
    const previewRoot = await this.#loadPreviewRoot(placement.assetId);
    const previewAnchor = new Group();

    previewAnchor.name = `map_editor_placement/${placement.placementId}`;
    previewAnchor.position.set(
      placement.position.x,
      placement.position.y,
      placement.position.z
    );
    previewAnchor.userData.placementId = placement.placementId;
    previewRoot.rotation.y = resolvePlacementVisualYawOffsetRadians(placement);
    tagPlacementNodes(previewAnchor, placement.placementId);
    tagPlacementNodes(previewRoot, placement.placementId);
    previewAnchor.add(previewRoot);
    syncMapEditorViewportPlacementPreviewAnchor(previewAnchor, placement);

    return previewAnchor;
  }

  async #loadPreviewRoot(assetId: string): Promise<Group> {
    const cachedPreviewRootPromise = this.#cachedPreviewRoots.get(assetId);

    if (cachedPreviewRootPromise !== undefined) {
      const cachedPreviewRoot = await cachedPreviewRootPromise;

      return this.#clonePreviewRoot(cachedPreviewRoot);
    }

    const previewRootPromise = this.#createPreviewRoot(assetId);
    this.#cachedPreviewRoots.set(assetId, previewRootPromise);

    try {
      const previewRoot = await previewRootPromise;

      return this.#clonePreviewRoot(previewRoot);
    } catch (error) {
      this.#cachedPreviewRoots.delete(assetId);
      throw error;
    }
  }

  async #createPreviewRoot(assetId: string): Promise<Group> {
    const asset = readEnvironmentAssetDescriptor(assetId);

    if (asset === null) {
      return createMissingAssetPreviewRoot(assetId);
    }

    const defaultRenderLod = resolveDefaultRenderLod(asset);

    if (defaultRenderLod === null) {
      return createMissingAssetPreviewRoot(assetId);
    }

    if (isProceduralRenderLod(defaultRenderLod)) {
      return createProceduralPreviewRoot(defaultRenderLod, assetId);
    }

    try {
      const loadedSceneAsset = await this.#sceneAssetLoader.loadAsync(
        defaultRenderLod.modelPath
      );

      return loadedSceneAsset.scene;
    } catch {
      return createMissingAssetPreviewRoot(assetId);
    }
  }

  #clonePreviewRoot(previewRoot: Group): Group {
    const previewClone = previewRoot.clone(true);

    previewClone.traverse((node) => {
      if (!("isMesh" in node) || node.isMesh !== true) {
        return;
      }

      const userData = node.userData as PreviewMeshUserData;

      userData.mapEditorOwnsGeometry = false;
      userData.mapEditorOwnsMaterial = false;
    });

    return previewClone;
  }
}
