import type { MapEditorMaterialOption } from "../types/map-editor";
import type {
  MetaverseMapBundleSemanticMaterialId
} from "@webgpu-metaverse/shared/metaverse/world";

export interface MapEditorSemanticMaterialOption {
  readonly label: string;
  readonly value: MetaverseMapBundleSemanticMaterialId;
}

export const mapEditorSemanticMaterialOptions = Object.freeze(
  [
    Object.freeze({
      label: "Concrete",
      value: "concrete"
    }),
    Object.freeze({
      label: "Metal",
      value: "metal"
    }),
    Object.freeze({
      label: "Warning",
      value: "warning"
    }),
    Object.freeze({
      label: "Glass",
      value: "glass"
    }),
    Object.freeze({
      label: "Team Blue",
      value: "team-blue"
    }),
    Object.freeze({
      label: "Team Red",
      value: "team-red"
    }),
    Object.freeze({
      label: "Alien Rock",
      value: "alien-rock"
    }),
    Object.freeze({
      label: "Terrain Rock",
      value: "terrain-rock"
    }),
    Object.freeze({
      label: "Terrain Cliff",
      value: "terrain-cliff"
    }),
    Object.freeze({
      label: "Terrain Basalt",
      value: "terrain-basalt"
    }),
    Object.freeze({
      label: "Terrain Gravel",
      value: "terrain-gravel"
    }),
    Object.freeze({
      label: "Terrain Dirt",
      value: "terrain-dirt"
    }),
    Object.freeze({
      label: "Terrain Sand",
      value: "terrain-sand"
    }),
    Object.freeze({
      label: "Terrain Moss",
      value: "terrain-moss"
    }),
    Object.freeze({
      label: "Terrain Snow",
      value: "terrain-snow"
    }),
    Object.freeze({
      label: "Terrain Ash",
      value: "terrain-ash"
    }),
    Object.freeze({
      label: "Terrain Grass",
      value: "terrain-grass"
    })
  ] satisfies readonly MapEditorSemanticMaterialOption[]
);

export const mapEditorTerrainMaterialOptions = Object.freeze(
  mapEditorSemanticMaterialOptions.filter(
    (option) => option.value.startsWith("terrain-")
  )
);

export const mapEditorMaterialOptions = Object.freeze(
  [
    Object.freeze({
      label: "Default authored material",
      value: "__default__"
    }),
    Object.freeze({
      label: "Shell floor grid",
      value: "shell-floor-grid"
    }),
    Object.freeze({
      label: "Metal panel",
      value: "shell-metal-panel"
    }),
    Object.freeze({
      label: "Painted trim",
      value: "shell-painted-trim"
    })
  ] satisfies readonly MapEditorMaterialOption[]
);
