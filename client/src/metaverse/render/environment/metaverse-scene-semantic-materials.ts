import type {
  MetaverseMapBundleSemanticMaterialDefinitionSnapshot
} from "@webgpu-metaverse/shared/metaverse/world";
import {
  DoubleSide,
  MeshPhysicalNodeMaterial,
  MeshStandardNodeMaterial,
  type Texture
} from "three/webgpu";
import { bumpMap, color, float, texture as textureNode } from "three/tsl";

import {
  applyMetaverseSceneSemanticTextureRepeat,
  createMetaverseSceneSemanticImagePatternTexture,
  createMetaverseSceneSemanticPreviewTexture,
  resolveMetaverseSceneSemanticMaterialProfile,
  type MetaverseSceneSemanticPreviewPaletteOverride,
  type MetaverseSceneSemanticPreviewTextureId
} from "./metaverse-scene-semantic-material-textures";

export type MetaverseSceneSemanticMaterialDefinition =
  MetaverseMapBundleSemanticMaterialDefinitionSnapshot;

export interface MetaverseSceneSemanticMaterialOptions {
  readonly diffuseTexture?: Texture;
  readonly emissive?: string;
  readonly metalness?: number;
  readonly opacity?: number;
  readonly roughness?: number;
  readonly transparent?: boolean;
}

export function resolveMetaverseSceneSemanticMaterialDefinition<
  TDefinition extends MetaverseSceneSemanticMaterialDefinition
>(
  materialDefinitions: readonly TDefinition[],
  materialReferenceId: string | null
): TDefinition | null {
  return (
    materialDefinitions.find(
      (candidateMaterialDefinition) =>
        candidateMaterialDefinition.materialId === materialReferenceId
    ) ?? null
  );
}

export function createMetaverseSceneSemanticMaterialPaletteOverride(
  materialDefinition: MetaverseSceneSemanticMaterialDefinition | null
): MetaverseSceneSemanticPreviewPaletteOverride | undefined {
  if (materialDefinition === null) {
    return undefined;
  }

  return {
    accentColorHex: materialDefinition.accentColorHex,
    baseColorHex: materialDefinition.baseColorHex,
    opacity: materialDefinition.opacity,
    textureBrightness: materialDefinition.textureBrightness,
    textureContrast: materialDefinition.textureContrast,
    texturePatternStrength: materialDefinition.texturePatternStrength
  };
}

function createMetaverseSceneSemanticDiffuseTexture(
  textureId: MetaverseSceneSemanticPreviewTextureId,
  materialDefinition: MetaverseSceneSemanticMaterialDefinition | null
): Texture {
  if (materialDefinition !== null && materialDefinition.textureImageDataUrl !== null) {
    return createMetaverseSceneSemanticImagePatternTexture(
      materialDefinition.textureImageDataUrl,
      materialDefinition.textureRepeat
    );
  }

  return applyMetaverseSceneSemanticTextureRepeat(
    createMetaverseSceneSemanticPreviewTexture(
      textureId,
      64,
      createMetaverseSceneSemanticMaterialPaletteOverride(materialDefinition)
    ),
    materialDefinition?.textureRepeat
  );
}

export function createMetaverseSceneSemanticRenderMaterial(
  textureId: MetaverseSceneSemanticPreviewTextureId,
  materialDefinition: MetaverseSceneSemanticMaterialDefinition | null,
  options?: MetaverseSceneSemanticMaterialOptions
): MeshStandardNodeMaterial {
  const profile = resolveMetaverseSceneSemanticMaterialProfile(textureId);
  const diffuseTexture =
    options?.diffuseTexture ??
    createMetaverseSceneSemanticDiffuseTexture(textureId, materialDefinition);
  const opacity = options?.opacity ?? materialDefinition?.opacity ?? profile.opacity;
  const material =
    profile.transmission > 0
      ? new MeshPhysicalNodeMaterial({
          color: "#ffffff",
          opacity,
          side: DoubleSide
        })
      : new MeshStandardNodeMaterial({
          color: "#ffffff",
          opacity,
          side: DoubleSide
        });

  material.map = diffuseTexture;
  material.roughnessNode = float(
    options?.roughness ?? materialDefinition?.roughness ?? profile.roughness
  );
  material.metalnessNode = float(
    options?.metalness ?? materialDefinition?.metalness ?? profile.metalness
  );
  material.emissiveNode = color(options?.emissive ?? profile.emissiveColorHex).mul(
    float(profile.emissiveIntensity)
  );
  const usesTransmission = profile.transmission > 0;
  const transparent = options?.transparent ?? usesTransmission;

  material.alphaHash =
    !usesTransmission && !transparent && (profile.alphaHash || opacity < 1);
  material.transparent = transparent;
  material.depthWrite = material.alphaHash || !transparent;

  if (profile.bumpScale > 0) {
    material.normalNode = bumpMap(textureNode(diffuseTexture), float(profile.bumpScale));
  }

  if (material instanceof MeshPhysicalNodeMaterial) {
    material.clearcoatNode = float(profile.clearcoat);
    material.iorNode = float(profile.ior);
    material.thicknessNode = float(profile.thickness);
    material.transmissionNode = float(profile.transmission);
  }

  return material;
}
