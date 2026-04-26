import type { MetaverseMapBundleSemanticMaterialId } from "@webgpu-metaverse/shared/metaverse/world";
import {
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NearestFilter,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  UnsignedByteType
} from "three/webgpu";

export type MetaverseSceneSemanticPreviewTextureId =
  | MetaverseMapBundleSemanticMaterialId
  | "__default__"
  | "shell-floor-grid"
  | "shell-metal-panel"
  | "shell-painted-trim";

export interface MetaverseSceneSemanticTerrainPatchTextureInput {
  readonly heightSamples: readonly number[];
  readonly materialLayers: readonly {
    readonly materialId: MetaverseMapBundleSemanticMaterialId;
    readonly weightSamples: readonly number[];
  }[];
  readonly origin: {
    readonly x: number;
    readonly z: number;
  };
  readonly sampleCountX: number;
  readonly sampleCountZ: number;
  readonly sampleSpacingMeters: number;
}

export interface MetaverseSceneSemanticSurfaceTextureInput {
  readonly materialReferenceId: string | null;
  readonly regionKind: "arena" | "floor" | "path" | "roof";
}

interface MetaverseSceneSemanticPreviewPalette {
  readonly accent: readonly [number, number, number];
  readonly alpha: number;
  readonly base: readonly [number, number, number];
  readonly dark: readonly [number, number, number];
}

export interface MetaverseSceneSemanticPreviewPaletteOverride {
  readonly accentColorHex?: string | null;
  readonly baseColorHex?: string | null;
  readonly opacity?: number | null;
  readonly textureBrightness?: number | null;
  readonly textureContrast?: number | null;
  readonly texturePatternStrength?: number | null;
}

export interface MetaverseSceneSemanticMaterialProfile {
  readonly alphaHash: boolean;
  readonly bumpScale: number;
  readonly clearcoat: number;
  readonly emissiveColorHex: string;
  readonly emissiveIntensity: number;
  readonly ior: number;
  readonly metalness: number;
  readonly opacity: number;
  readonly roughness: number;
  readonly thickness: number;
  readonly transmission: number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampRange(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function applyMetaverseSceneSemanticTextureRepeat<TTexture extends Texture>(
  texture: TTexture,
  textureRepeat: number | null | undefined
): TTexture {
  const repeat = clampRange(textureRepeat ?? 1, 0.25, 32);

  texture.repeat.set(repeat, repeat);

  return texture;
}

function fract(value: number): number {
  return value - Math.floor(value);
}

function lerp(start: number, end: number, alpha: number): number {
  return start + (end - start) * alpha;
}

function mixColors(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  alpha: number
): readonly [number, number, number] {
  return [
    lerp(from[0], to[0], alpha),
    lerp(from[1], to[1], alpha),
    lerp(from[2], to[2], alpha)
  ] as const;
}

function scaleColor(
  color: readonly [number, number, number],
  scale: number
): readonly [number, number, number] {
  return [
    clamp01(color[0] * scale),
    clamp01(color[1] * scale),
    clamp01(color[2] * scale)
  ] as const;
}

function applyTextureTone(
  color: readonly [number, number, number],
  brightness: number,
  contrast: number
): readonly [number, number, number] {
  return scaleColor(
    [
      clamp01(0.5 + (color[0] - 0.5) * contrast),
      clamp01(0.5 + (color[1] - 0.5) * contrast),
      clamp01(0.5 + (color[2] - 0.5) * contrast)
    ] as const,
    brightness
  );
}

function parseHexColor(
  value: string | null | undefined
): readonly [number, number, number] | null {
  if (value === null || value === undefined || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    return null;
  }

  return [
    Number.parseInt(value.slice(1, 3), 16) / 255,
    Number.parseInt(value.slice(3, 5), 16) / 255,
    Number.parseInt(value.slice(5, 7), 16) / 255
  ] as const;
}

function hashNoise(x: number, y: number, seed: number): number {
  return fract(Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123);
}

function isSemanticMaterialId(
  value: string
): value is MetaverseMapBundleSemanticMaterialId {
  return (
    value === "alien-rock" ||
    value === "concrete" ||
    value === "glass" ||
    value === "metal" ||
    value === "terrain-ash" ||
    value === "terrain-basalt" ||
    value === "terrain-cliff" ||
    value === "terrain-dirt" ||
    value === "terrain-gravel" ||
    value === "terrain-grass" ||
    value === "terrain-moss" ||
    value === "terrain-rock" ||
    value === "terrain-sand" ||
    value === "terrain-snow" ||
    value === "team-blue" ||
    value === "team-red" ||
    value === "warning"
  );
}

function resolveBuiltInPreviewPalette(
  textureId: MetaverseSceneSemanticPreviewTextureId
): MetaverseSceneSemanticPreviewPalette {
  switch (textureId) {
    case "alien-rock":
      return {
        accent: [0.78, 0.66, 0.98],
        alpha: 1,
        base: [0.36, 0.2, 0.62],
        dark: [0.12, 0.05, 0.22]
      };
    case "glass":
      return {
        accent: [0.82, 0.98, 1],
        alpha: 0.72,
        base: [0.34, 0.78, 0.88],
        dark: [0.08, 0.2, 0.24]
      };
    case "metal":
    case "shell-metal-panel":
      return {
        accent: [0.82, 0.86, 0.9],
        alpha: 1,
        base: [0.46, 0.5, 0.56],
        dark: [0.18, 0.21, 0.25]
      };
    case "team-blue":
      return {
        accent: [0.72, 0.86, 1],
        alpha: 1,
        base: [0.15, 0.39, 0.92],
        dark: [0.04, 0.12, 0.3]
      };
    case "team-red":
      return {
        accent: [1, 0.8, 0.82],
        alpha: 1,
        base: [0.86, 0.15, 0.15],
        dark: [0.34, 0.05, 0.05]
      };
    case "warning":
      return {
        accent: [1, 0.92, 0.36],
        alpha: 1,
        base: [0.9, 0.69, 0.12],
        dark: [0.08, 0.08, 0.09]
      };
    case "terrain-ash":
      return {
        accent: [0.66, 0.71, 0.79],
        alpha: 1,
        base: [0.32, 0.36, 0.42],
        dark: [0.14, 0.16, 0.19]
      };
    case "terrain-basalt":
      return {
        accent: [0.48, 0.5, 0.54],
        alpha: 1,
        base: [0.18, 0.2, 0.23],
        dark: [0.05, 0.06, 0.08]
      };
    case "terrain-cliff":
      return {
        accent: [0.72, 0.68, 0.58],
        alpha: 1,
        base: [0.38, 0.34, 0.28],
        dark: [0.14, 0.12, 0.1]
      };
    case "terrain-dirt":
      return {
        accent: [0.62, 0.44, 0.26],
        alpha: 1,
        base: [0.35, 0.23, 0.13],
        dark: [0.13, 0.08, 0.04]
      };
    case "terrain-gravel":
      return {
        accent: [0.68, 0.68, 0.64],
        alpha: 1,
        base: [0.42, 0.41, 0.38],
        dark: [0.16, 0.16, 0.15]
      };
    case "terrain-grass":
      return {
        accent: [0.56, 0.78, 0.35],
        alpha: 1,
        base: [0.2, 0.55, 0.22],
        dark: [0.09, 0.22, 0.08]
      };
    case "terrain-moss":
      return {
        accent: [0.68, 0.82, 0.42],
        alpha: 1,
        base: [0.26, 0.42, 0.18],
        dark: [0.08, 0.15, 0.06]
      };
    case "terrain-rock":
      return {
        accent: [0.74, 0.71, 0.66],
        alpha: 1,
        base: [0.43, 0.4, 0.36],
        dark: [0.18, 0.16, 0.14]
      };
    case "terrain-sand":
      return {
        accent: [0.88, 0.78, 0.52],
        alpha: 1,
        base: [0.62, 0.5, 0.3],
        dark: [0.24, 0.18, 0.1]
      };
    case "terrain-snow":
      return {
        accent: [0.94, 0.98, 1],
        alpha: 1,
        base: [0.78, 0.84, 0.88],
        dark: [0.34, 0.4, 0.46]
      };
    case "shell-floor-grid":
      return {
        accent: [0.84, 0.88, 0.92],
        alpha: 1,
        base: [0.44, 0.46, 0.49],
        dark: [0.14, 0.15, 0.17]
      };
    case "shell-painted-trim":
      return {
        accent: [0.94, 0.96, 0.98],
        alpha: 1,
        base: [0.54, 0.56, 0.6],
        dark: [0.16, 0.18, 0.22]
      };
    case "concrete":
    case "__default__":
    default:
      return {
        accent: [0.82, 0.82, 0.78],
        alpha: 1,
        base: [0.58, 0.58, 0.55],
        dark: [0.22, 0.22, 0.2]
      };
  }
}

function resolvePreviewPalette(
  textureId: MetaverseSceneSemanticPreviewTextureId,
  override?: MetaverseSceneSemanticPreviewPaletteOverride
): MetaverseSceneSemanticPreviewPalette {
  const builtInPalette = resolveBuiltInPreviewPalette(textureId);
  const baseColor = parseHexColor(override?.baseColorHex) ?? builtInPalette.base;
  const accentColor =
    parseHexColor(override?.accentColorHex) ??
    mixColors(baseColor, builtInPalette.accent, 0.62);
  const darkColor = scaleColor(baseColor, 0.36);

  if (override === undefined) {
    return builtInPalette;
  }

  return {
    accent: accentColor,
    alpha: clamp01(override.opacity ?? builtInPalette.alpha),
    base: baseColor,
    dark: darkColor
  };
}

export function resolveMetaverseSceneSemanticMaterialProfile(
  textureId: MetaverseSceneSemanticPreviewTextureId
): MetaverseSceneSemanticMaterialProfile {
  switch (textureId) {
    case "alien-rock":
      return {
        alphaHash: false,
        bumpScale: 0.055,
        clearcoat: 0.08,
        emissiveColorHex: "#2c1452",
        emissiveIntensity: 0.055,
        ior: 1.5,
        metalness: 0.08,
        opacity: 1,
        roughness: 0.72,
        thickness: 0,
        transmission: 0
      };
    case "glass":
      return {
        alphaHash: true,
        bumpScale: 0.006,
        clearcoat: 0.85,
        emissiveColorHex: "#0a2530",
        emissiveIntensity: 0.025,
        ior: 1.45,
        metalness: 0,
        opacity: 0.58,
        roughness: 0.08,
        thickness: 0.08,
        transmission: 0.52
      };
    case "metal":
      return {
        alphaHash: false,
        bumpScale: 0.026,
        clearcoat: 0.16,
        emissiveColorHex: "#08090a",
        emissiveIntensity: 0.018,
        ior: 1.5,
        metalness: 0.72,
        opacity: 1,
        roughness: 0.34,
        thickness: 0,
        transmission: 0
      };
    case "shell-metal-panel":
      return {
        alphaHash: false,
        bumpScale: 0.022,
        clearcoat: 0.12,
        emissiveColorHex: "#090b0d",
        emissiveIntensity: 0.014,
        ior: 1.5,
        metalness: 0.54,
        opacity: 1,
        roughness: 0.38,
        thickness: 0,
        transmission: 0
      };
    case "warning":
      return {
        alphaHash: false,
        bumpScale: 0.018,
        clearcoat: 0.08,
        emissiveColorHex: "#2b2308",
        emissiveIntensity: 0.045,
        ior: 1.5,
        metalness: 0.14,
        opacity: 1,
        roughness: 0.52,
        thickness: 0,
        transmission: 0
      };
    case "terrain-grass":
    case "terrain-moss":
      return {
        alphaHash: false,
        bumpScale: 0.04,
        clearcoat: 0,
        emissiveColorHex: "#061307",
        emissiveIntensity: 0.015,
        ior: 1.5,
        metalness: 0.01,
        opacity: 1,
        roughness: 0.88,
        thickness: 0,
        transmission: 0
      };
    case "terrain-rock":
    case "terrain-basalt":
    case "terrain-cliff":
    case "terrain-gravel":
      return {
        alphaHash: false,
        bumpScale: 0.065,
        clearcoat: 0,
        emissiveColorHex: "#090807",
        emissiveIntensity: 0.01,
        ior: 1.5,
        metalness: 0.03,
        opacity: 1,
        roughness: 0.82,
        thickness: 0,
        transmission: 0
      };
    case "terrain-ash":
    case "terrain-dirt":
    case "terrain-sand":
    case "terrain-snow":
      return {
        alphaHash: false,
        bumpScale: 0.05,
        clearcoat: 0,
        emissiveColorHex: "#090a0c",
        emissiveIntensity: 0.012,
        ior: 1.5,
        metalness: 0.04,
        opacity: 1,
        roughness: 0.86,
        thickness: 0,
        transmission: 0
      };
    case "team-blue":
      return {
        alphaHash: false,
        bumpScale: 0.012,
        clearcoat: 0.32,
        emissiveColorHex: "#061a3d",
        emissiveIntensity: 0.075,
        ior: 1.5,
        metalness: 0.12,
        opacity: 1,
        roughness: 0.46,
        thickness: 0,
        transmission: 0
      };
    case "team-red":
      return {
        alphaHash: false,
        bumpScale: 0.012,
        clearcoat: 0.32,
        emissiveColorHex: "#3a0608",
        emissiveIntensity: 0.075,
        ior: 1.5,
        metalness: 0.12,
        opacity: 1,
        roughness: 0.46,
        thickness: 0,
        transmission: 0
      };
    case "shell-painted-trim":
      return {
        alphaHash: false,
        bumpScale: 0.014,
        clearcoat: 0.26,
        emissiveColorHex: "#0a0d12",
        emissiveIntensity: 0.014,
        ior: 1.5,
        metalness: 0.08,
        opacity: 1,
        roughness: 0.48,
        thickness: 0,
        transmission: 0
      };
    case "shell-floor-grid":
      return {
        alphaHash: false,
        bumpScale: 0.028,
        clearcoat: 0.06,
        emissiveColorHex: "#080a0d",
        emissiveIntensity: 0.012,
        ior: 1.5,
        metalness: 0.08,
        opacity: 1,
        roughness: 0.68,
        thickness: 0,
        transmission: 0
      };
    case "concrete":
    case "__default__":
    default:
      return {
        alphaHash: false,
        bumpScale: 0.04,
        clearcoat: 0.02,
        emissiveColorHex: "#090908",
        emissiveIntensity: 0.01,
        ior: 1.5,
        metalness: 0.03,
        opacity: 1,
        roughness: 0.78,
        thickness: 0,
        transmission: 0
      };
  }
}

export function resolveMetaverseSceneSemanticPreviewColorRgb(
  textureId: MetaverseSceneSemanticPreviewTextureId
): readonly [number, number, number] {
  return resolveBuiltInPreviewPalette(textureId).base;
}

export function resolveMetaverseSceneSemanticPreviewColorHex(
  textureId: MetaverseSceneSemanticPreviewTextureId
): string {
  const base = resolveMetaverseSceneSemanticPreviewColorRgb(textureId);

  return `rgb(${Math.round(base[0] * 255)} ${Math.round(base[1] * 255)} ${Math.round(
    base[2] * 255
  )})`;
}

function resolvePreviewColorSample(
  textureId: MetaverseSceneSemanticPreviewTextureId,
  u: number,
  v: number,
  paletteOverride?: MetaverseSceneSemanticPreviewPaletteOverride
): readonly [number, number, number, number] {
  const palette = resolvePreviewPalette(textureId, paletteOverride);
  const textureBrightness = clampRange(
    paletteOverride?.textureBrightness ?? 1,
    0,
    2
  );
  const textureContrast = clampRange(paletteOverride?.textureContrast ?? 1, 0, 2);
  const texturePatternStrength = clamp01(
    paletteOverride?.texturePatternStrength ?? 1
  );
  const tileU = fract(u);
  const tileV = fract(v);
  const fineNoise = hashNoise(u * 2.3, v * 2.3, 1);
  const coarseNoise = hashNoise(u * 0.7, v * 0.7, 2);
  let color = mixColors(
    palette.base,
    palette.accent,
    coarseNoise * 0.12 * texturePatternStrength
  );

  switch (textureId) {
    case "warning": {
      const stripe = (Math.floor((tileU + tileV) * 6) & 1) === 0 ? 1 : 0;
      const stripeColor =
        stripe === 1
          ? mixColors(palette.base, palette.dark, 0.05)
          : mixColors(palette.dark, palette.base, 0.08);
      color =
        texturePatternStrength <= 0
          ? palette.base
          : mixColors(palette.base, stripeColor, texturePatternStrength);

      break;
    }
    case "metal":
    case "shell-metal-panel": {
      const rib = Math.sin(tileU * Math.PI * 12) * 0.5 + 0.5;
      color = mixColors(
        palette.dark,
        palette.base,
        0.58 + rib * 0.26 * texturePatternStrength
      );

      break;
    }
    case "glass": {
      const glare =
        Math.max(
          0,
          Math.sin((tileU * 1.4 - tileV * 1.8) * Math.PI * 2) - 0.72
        ) * 2.2;
      color = mixColors(palette.base, palette.accent, fineNoise * 0.18);
      color = mixColors(color, palette.accent, glare * 0.18 * texturePatternStrength);

      break;
    }
    case "terrain-grass":
    case "terrain-moss": {
      const blades = Math.sin((tileU * 7 + tileV * 3) * Math.PI) * 0.5 + 0.5;
      color = mixColors(
        mixColors(
          palette.dark,
          palette.base,
          0.58 + blades * 0.18 * texturePatternStrength
        ),
        palette.accent,
        fineNoise * 0.18 * texturePatternStrength
      );
      break;
    }
    case "terrain-rock":
    case "terrain-basalt":
    case "terrain-cliff":
    case "terrain-gravel":
    case "terrain-ash":
    case "terrain-dirt":
    case "terrain-sand":
    case "terrain-snow":
    case "concrete": {
      const fracture =
        Math.max(
          0,
          Math.sin((u * 3.1 + v * 5.3 + coarseNoise) * Math.PI * 2) - 0.68
        ) * 1.8;
      color = mixColors(
        palette.dark,
        palette.base,
        0.62 + fineNoise * 0.2 * texturePatternStrength
      );
      color = mixColors(color, palette.dark, fracture * 0.22 * texturePatternStrength);

      break;
    }
    case "alien-rock": {
      const vein = Math.sin((tileU * 5 - tileV * 6) * Math.PI) * 0.5 + 0.5;
      color = mixColors(
        mixColors(palette.dark, palette.base, 0.42 + coarseNoise * 0.22),
        palette.accent,
        Math.max(0, vein - 0.72) * 1.6 * texturePatternStrength
      );
      break;
    }
    case "team-blue":
    case "team-red":
    case "shell-painted-trim": {
      const band = Math.abs(tileV - 0.5) < 0.08 ? 1 : 0;
      color = mixColors(
        palette.dark,
        palette.base,
        0.66 + fineNoise * 0.12 * texturePatternStrength
      );

      if (band === 1) {
        color = mixColors(color, palette.accent, 0.28 * texturePatternStrength);
      }

      break;
    }
    case "shell-floor-grid": {
      const lineU = tileU < 0.04 || tileU > 0.96 ? 1 : 0;
      const lineV = tileV < 0.04 || tileV > 0.96 ? 1 : 0;
      color = mixColors(palette.dark, palette.base, 0.52 + fineNoise * 0.2);

      if (lineU === 1 || lineV === 1) {
        color = mixColors(color, palette.accent, 0.5 * texturePatternStrength);
      }

      break;
    }
    default:
      color = mixColors(
        palette.dark,
        palette.base,
        0.62 + fineNoise * 0.16 * texturePatternStrength
      );
      break;
  }

  const lightingScale = 1 + (coarseNoise - 0.5) * 0.08 * texturePatternStrength;
  const litColor = applyTextureTone(
    scaleColor(color, lightingScale),
    textureBrightness,
    textureContrast
  );

  return [litColor[0], litColor[1], litColor[2], palette.alpha] as const;
}

function writePixel(
  data: Uint8Array,
  index: number,
  color: readonly [number, number, number, number]
): void {
  data[index] = Math.round(clamp01(color[0]) * 255);
  data[index + 1] = Math.round(clamp01(color[1]) * 255);
  data[index + 2] = Math.round(clamp01(color[2]) * 255);
  data[index + 3] = Math.round(clamp01(color[3]) * 255);
}

function finalizeTexture(
  width: number,
  height: number,
  data: Uint8Array,
  wrapping: "clamp" | "repeat"
): DataTexture {
  const texture = new DataTexture(data, width, height, RGBAFormat, UnsignedByteType);

  texture.colorSpace = SRGBColorSpace;
  texture.flipY = false;
  texture.generateMipmaps = true;
  texture.anisotropy = wrapping === "repeat" ? 4 : 2;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.wrapS = wrapping === "repeat" ? RepeatWrapping : ClampToEdgeWrapping;
  texture.wrapT = wrapping === "repeat" ? RepeatWrapping : ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return texture;
}

function sampleTerrainScalar(
  samples: readonly number[],
  sampleCountX: number,
  sampleCountZ: number,
  u: number,
  v: number
): number {
  const maxSampleX = Math.max(0, sampleCountX - 1);
  const maxSampleZ = Math.max(0, sampleCountZ - 1);
  const sampleX = clamp01(u) * maxSampleX;
  const sampleZ = clamp01(v) * maxSampleZ;
  const x0 = Math.floor(sampleX);
  const z0 = Math.floor(sampleZ);
  const x1 = Math.min(maxSampleX, x0 + 1);
  const z1 = Math.min(maxSampleZ, z0 + 1);
  const alphaX = sampleX - x0;
  const alphaZ = sampleZ - z0;
  const topLeft = samples[z0 * sampleCountX + x0] ?? 0;
  const topRight = samples[z0 * sampleCountX + x1] ?? topLeft;
  const bottomLeft = samples[z1 * sampleCountX + x0] ?? topLeft;
  const bottomRight = samples[z1 * sampleCountX + x1] ?? bottomLeft;
  const top = lerp(topLeft, topRight, alphaX);
  const bottom = lerp(bottomLeft, bottomRight, alphaX);

  return lerp(top, bottom, alphaZ);
}

function resolveTerrainFallbackTextureId(
  terrainPatch: MetaverseSceneSemanticTerrainPatchTextureInput
): MetaverseSceneSemanticPreviewTextureId {
  let selectedTextureId: MetaverseSceneSemanticPreviewTextureId = "terrain-grass";
  let selectedWeight = Number.NEGATIVE_INFINITY;

  for (const layer of terrainPatch.materialLayers) {
    const layerWeight = layer.weightSamples.reduce(
      (totalWeight, sampleWeight) => totalWeight + Math.max(0, sampleWeight),
      0
    );

    if (layerWeight > selectedWeight) {
      selectedWeight = layerWeight;
      selectedTextureId = layer.materialId;
    }
  }

  return selectedTextureId;
}

export function resolveMetaverseSceneSurfacePreviewTextureId(
  surface: MetaverseSceneSemanticSurfaceTextureInput
): MetaverseSceneSemanticPreviewTextureId {
  if (
    surface.materialReferenceId !== null &&
    (isSemanticMaterialId(surface.materialReferenceId) ||
      surface.materialReferenceId === "shell-floor-grid" ||
      surface.materialReferenceId === "shell-metal-panel" ||
      surface.materialReferenceId === "shell-painted-trim")
  ) {
    return surface.materialReferenceId;
  }

  switch (surface.regionKind) {
    case "path":
      return "warning";
    case "roof":
      return "shell-painted-trim";
    case "arena":
      return "team-red";
    case "floor":
    default:
      return "shell-floor-grid";
  }
}

export function createMetaverseSceneSemanticPreviewTexture(
  textureId: MetaverseSceneSemanticPreviewTextureId,
  resolution = 64,
  paletteOverride?: MetaverseSceneSemanticPreviewPaletteOverride
): DataTexture {
  const width = Math.max(8, Math.round(resolution));
  const height = width;
  const data = new Uint8Array(width * height * 4);

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const color = resolvePreviewColorSample(
        textureId,
        column / width,
        row / height,
        paletteOverride
      );

      writePixel(data, (row * width + column) * 4, color);
    }
  }

  return finalizeTexture(width, height, data, "repeat");
}

export function createMetaverseSceneSemanticImagePatternTexture(
  imageDataUrl: string,
  textureRepeat: number | null | undefined
): Texture {
  const texture = new TextureLoader().load(imageDataUrl);

  texture.colorSpace = SRGBColorSpace;
  texture.flipY = false;
  texture.generateMipmaps = false;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  applyMetaverseSceneSemanticTextureRepeat(texture, textureRepeat);
  texture.needsUpdate = true;

  return texture;
}

export function createMetaverseSceneTerrainPatchPreviewTexture(
  terrainPatch: MetaverseSceneSemanticTerrainPatchTextureInput
): DataTexture {
  const width = Math.max(
    32,
    Math.min(256, Math.max(terrainPatch.sampleCountX - 1, 1) * 16)
  );
  const height = Math.max(
    32,
    Math.min(256, Math.max(terrainPatch.sampleCountZ - 1, 1) * 16)
  );
  const data = new Uint8Array(width * height * 4);
  const fallbackTextureId = resolveTerrainFallbackTextureId(terrainPatch);
  const minHeight = terrainPatch.heightSamples.reduce(
    (lowestHeight, sampleHeight) => Math.min(lowestHeight, sampleHeight),
    Number.POSITIVE_INFINITY
  );
  const maxHeight = terrainPatch.heightSamples.reduce(
    (highestHeight, sampleHeight) => Math.max(highestHeight, sampleHeight),
    Number.NEGATIVE_INFINITY
  );
  const heightRange =
    Number.isFinite(minHeight) && Number.isFinite(maxHeight) && maxHeight > minHeight
      ? maxHeight - minHeight
      : 0;
  const halfSpanX =
    Math.max(terrainPatch.sampleCountX - 1, 0) * terrainPatch.sampleSpacingMeters * 0.5;
  const halfSpanZ =
    Math.max(terrainPatch.sampleCountZ - 1, 0) * terrainPatch.sampleSpacingMeters * 0.5;

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const u = width <= 1 ? 0 : column / (width - 1);
      const v = height <= 1 ? 0 : row / (height - 1);
      const worldX = terrainPatch.origin.x - halfSpanX + u * halfSpanX * 2;
      const worldZ = terrainPatch.origin.z - halfSpanZ + v * halfSpanZ * 2;
      const terrainHeight = sampleTerrainScalar(
        terrainPatch.heightSamples,
        terrainPatch.sampleCountX,
        terrainPatch.sampleCountZ,
        u,
        v
      );
      const heightAlpha =
        heightRange <= 0 ? 0.5 : clamp01((terrainHeight - minHeight) / heightRange);
      let blendedColor: readonly [number, number, number] = [0, 0, 0];
      let totalWeight = 0;

      for (const layer of terrainPatch.materialLayers) {
        const layerWeight = Math.max(
          0,
          sampleTerrainScalar(
            layer.weightSamples,
            terrainPatch.sampleCountX,
            terrainPatch.sampleCountZ,
            u,
            v
          )
        );

        if (layerWeight <= 0) {
          continue;
        }

        const layerColor = resolvePreviewColorSample(
          layer.materialId,
          worldX / 4,
          worldZ / 4
        );
        blendedColor = [
          blendedColor[0] + layerColor[0] * layerWeight,
          blendedColor[1] + layerColor[1] * layerWeight,
          blendedColor[2] + layerColor[2] * layerWeight
        ] as const;
        totalWeight += layerWeight;
      }

      if (totalWeight <= 0) {
        const fallbackColor = resolvePreviewColorSample(
          fallbackTextureId,
          worldX / 4,
          worldZ / 4
        );

        blendedColor = [fallbackColor[0], fallbackColor[1], fallbackColor[2]] as const;
      } else {
        blendedColor = [
          blendedColor[0] / totalWeight,
          blendedColor[1] / totalWeight,
          blendedColor[2] / totalWeight
        ] as const;
      }

      const shadedColor = scaleColor(
        mixColors(blendedColor, [1, 1, 1], Math.max(0, heightAlpha - 0.7) * 0.08),
        0.92 + heightAlpha * 0.1
      );

      writePixel(data, (row * width + column) * 4, [
        shadedColor[0],
        shadedColor[1],
        shadedColor[2],
        1
      ]);
    }
  }

  return finalizeTexture(width, height, data, "clamp");
}
