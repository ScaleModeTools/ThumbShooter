import {
  resolveMetaverseGameplayProfile,
  type MetaverseGameplayProfileSnapshot,
  type MetaverseMapBundleSnapshot
} from "@webgpu-metaverse/shared/metaverse/world";

import {
  readMetaverseCameraProfile,
  type MetaverseCameraProfileSnapshot
} from "../../render/camera/profiles";
import {
  readMetaverseCharacterPresentationProfile,
  type MetaverseCharacterPresentationProfileSnapshot
} from "../../render/characters/presentation-profiles";
import {
  createMetaverseEnvironmentPresentationSnapshotFromProfile,
  readMetaverseEnvironmentPresentationProfile,
  shellDefaultEnvironmentPresentationProfile,
  type MetaverseEnvironmentPresentationProfileSnapshot
} from "../../render/environment/profiles";
import {
  readMetaverseHudProfile,
  type MetaverseHudProfileSnapshot
} from "../../hud/profiles";

export interface LoadedMetaverseMapBundleSnapshot {
  readonly bundle: MetaverseMapBundleSnapshot;
  readonly cameraProfile: MetaverseCameraProfileSnapshot | null;
  readonly characterPresentationProfile:
    MetaverseCharacterPresentationProfileSnapshot | null;
  readonly environmentPresentation: NonNullable<
    MetaverseMapBundleSnapshot["environmentPresentation"]
  >;
  readonly environmentPresentationProfile:
    MetaverseEnvironmentPresentationProfileSnapshot | null;
  readonly gameplayProfile: MetaverseGameplayProfileSnapshot;
  readonly hudProfile: MetaverseHudProfileSnapshot | null;
}

export function createLoadedMetaverseMapBundleSnapshot(
  bundle: MetaverseMapBundleSnapshot
): LoadedMetaverseMapBundleSnapshot {
  const environmentPresentationProfile = readMetaverseEnvironmentPresentationProfile(
    bundle.presentationProfileIds.environmentPresentationProfileId
  );

  return Object.freeze({
    bundle,
    cameraProfile: readMetaverseCameraProfile(
      bundle.presentationProfileIds.cameraProfileId
    ),
    characterPresentationProfile: readMetaverseCharacterPresentationProfile(
      bundle.presentationProfileIds.characterPresentationProfileId
    ),
    environmentPresentation:
      bundle.environmentPresentation ??
      createMetaverseEnvironmentPresentationSnapshotFromProfile(
        environmentPresentationProfile ??
          shellDefaultEnvironmentPresentationProfile
      ),
    environmentPresentationProfile,
    gameplayProfile: resolveMetaverseGameplayProfile(bundle.gameplayProfileId),
    hudProfile: readMetaverseHudProfile(bundle.presentationProfileIds.hudProfileId)
  });
}
