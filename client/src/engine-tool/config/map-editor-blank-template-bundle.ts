import {
  compileMetaverseMapBundleSemanticWorld,
  defaultMetaverseGameplayProfileId,
  defaultMetaverseMapBundlePlayerSpawnSelection,
  type MetaverseMapBundleSemanticWorldSnapshot,
  type MetaverseMapBundleSnapshot
} from "@webgpu-metaverse/shared/metaverse/world";

import {
  createLoadedMetaverseMapBundleSnapshot,
  type LoadedMetaverseMapBundleSnapshot
} from "@/metaverse/world/map-bundles";

export const mapEditorBlankTemplateBundleId = "blank-template";

const mapEditorBlankTemplateSemanticWorld = Object.freeze({
  compatibilityAssetIds: Object.freeze({
    connectorAssetId: null,
    floorAssetId: null,
    wallAssetId: null
  }),
  connectors: Object.freeze([]),
  edges: Object.freeze([]),
  gameplayVolumes: Object.freeze([]),
  lights: Object.freeze([]),
  materialDefinitions: Object.freeze([]),
  modules: Object.freeze([]),
  regions: Object.freeze([]),
  structures: Object.freeze([]),
  surfaces: Object.freeze([]),
  terrainPatches: Object.freeze([])
} satisfies MetaverseMapBundleSemanticWorldSnapshot);

const mapEditorBlankTemplateCompiledWorld = compileMetaverseMapBundleSemanticWorld(
  mapEditorBlankTemplateSemanticWorld
);

export const mapEditorBlankTemplateBundle = Object.freeze({
  compiledWorld: mapEditorBlankTemplateCompiledWorld,
  description:
    "Empty engine-tool seed bundle with no authored world content, scene objects, spawns, water, or launch variations.",
  environmentAssets:
    mapEditorBlankTemplateCompiledWorld.compatibilityEnvironmentAssets,
  gameplayProfileId: defaultMetaverseGameplayProfileId,
  label: "Blank Template",
  launchVariations: Object.freeze([]),
  mapId: mapEditorBlankTemplateBundleId,
  playerSpawnNodes: Object.freeze([]),
  playerSpawnSelection: defaultMetaverseMapBundlePlayerSpawnSelection,
  presentationProfileIds: Object.freeze({
    cameraProfileId: "shell-default-camera",
    characterPresentationProfileId: "shell-default-character-presentation",
    environmentPresentationProfileId: "shell-default-environment-presentation",
    hudProfileId: "shell-default-hud"
  }),
  resourceSpawns: Object.freeze([]),
  sceneObjects: Object.freeze([]),
  semanticWorld: mapEditorBlankTemplateSemanticWorld,
  waterRegions: Object.freeze([])
} satisfies MetaverseMapBundleSnapshot);

const loadedMapEditorBlankTemplateBundle = createLoadedMetaverseMapBundleSnapshot(
  mapEditorBlankTemplateBundle
);

export function createLoadedMapEditorBlankTemplateBundle(): LoadedMetaverseMapBundleSnapshot {
  return loadedMapEditorBlankTemplateBundle;
}
