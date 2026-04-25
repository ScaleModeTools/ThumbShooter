import { readMetaverseWorldBundleRegistryEntry } from "../bundle-registry";
import {
  createLoadedMetaverseMapBundleSnapshot,
  type LoadedMetaverseMapBundleSnapshot
} from "./create-loaded-metaverse-map-bundle-snapshot";

export function loadMetaverseMapBundle(
  bundleId: string
): LoadedMetaverseMapBundleSnapshot {
  const registryEntry = readMetaverseWorldBundleRegistryEntry(bundleId);

  if (registryEntry === null) {
    throw new Error(`Metaverse map bundle ${bundleId} is not registered.`);
  }

  const { bundle } = registryEntry;

  return createLoadedMetaverseMapBundleSnapshot(bundle);
}
