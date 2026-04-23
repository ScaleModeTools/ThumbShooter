import type {
  ExperienceId,
  MetaverseMatchModeId
} from "@webgpu-metaverse/shared";

import type { LoadedMetaverseMapBundleSnapshot } from "@/metaverse/world/map-bundles";

export interface MapEditorLaunchVariationDraftSnapshot {
  readonly description: string;
  readonly experienceId: ExperienceId | null;
  readonly gameplayVariationId: string | null;
  readonly label: string;
  readonly matchMode: MetaverseMatchModeId | null;
  readonly variationId: string;
  readonly vehicleLayoutId: string | null;
  readonly weaponLayoutId: string | null;
}

export function freezeLaunchVariationDraft(
  draft: MapEditorLaunchVariationDraftSnapshot
): MapEditorLaunchVariationDraftSnapshot {
  return Object.freeze({
    description: draft.description,
    experienceId: draft.experienceId,
    gameplayVariationId: draft.gameplayVariationId,
    label: draft.label,
    matchMode: draft.matchMode,
    variationId: draft.variationId,
    vehicleLayoutId: draft.vehicleLayoutId,
    weaponLayoutId: draft.weaponLayoutId
  });
}

export function createLaunchVariationDrafts(
  loadedBundle: LoadedMetaverseMapBundleSnapshot
): readonly MapEditorLaunchVariationDraftSnapshot[] {
  return Object.freeze(
    loadedBundle.bundle.launchVariations.map((launchVariation) =>
      freezeLaunchVariationDraft({
        description: launchVariation.description,
        experienceId: launchVariation.experienceId,
        gameplayVariationId: launchVariation.gameplayVariationId,
        label: launchVariation.label,
        matchMode: launchVariation.matchMode,
        variationId: launchVariation.variationId,
        vehicleLayoutId: launchVariation.vehicleLayoutId,
        weaponLayoutId: launchVariation.weaponLayoutId
      })
    )
  );
}
