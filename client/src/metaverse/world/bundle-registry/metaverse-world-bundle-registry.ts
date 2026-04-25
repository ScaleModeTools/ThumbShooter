import {
  deathmatchMapBundle,
  stagingGroundMapBundle,
  type MetaverseMapBundleSnapshot
} from "@webgpu-metaverse/shared/metaverse/world";

import {
  loadStoredMetaverseWorldBundleSnapshot,
  type StoredMetaverseWorldBundleStorageLike
} from "../map-bundles/stored-metaverse-world-bundle";
import {
  createLoadedMetaverseMapBundleSnapshot
} from "../map-bundles/create-loaded-metaverse-map-bundle-snapshot";
import {
  createMetaverseEnvironmentProofConfig
} from "../proof/create-metaverse-environment-proof-config";

export interface MetaverseWorldBundleRegistryEntry {
  readonly bundle: MetaverseMapBundleSnapshot;
  readonly bundleId: string;
  readonly label: string;
  readonly sourceBundleId: string;
}

const metaverseWorldBundleRegistryEntries = Object.freeze([
  Object.freeze({
    bundle: stagingGroundMapBundle,
    bundleId: stagingGroundMapBundle.mapId,
    label: stagingGroundMapBundle.label,
    sourceBundleId: stagingGroundMapBundle.mapId
  } satisfies MetaverseWorldBundleRegistryEntry),
  Object.freeze({
    bundle: deathmatchMapBundle,
    bundleId: deathmatchMapBundle.mapId,
    label: deathmatchMapBundle.label,
    sourceBundleId: deathmatchMapBundle.mapId
  } satisfies MetaverseWorldBundleRegistryEntry)
]);
const metaverseWorldBundlePreviewEntriesById = new Map<
  string,
  MetaverseWorldBundleRegistryEntry
>();

const metaverseWorldBundleRegistryEntriesById = new Map<
  string,
  MetaverseWorldBundleRegistryEntry
>(metaverseWorldBundleRegistryEntries.map((entry) => [entry.bundleId, entry]));

function freezeRegistryEntry(
  entry: MetaverseWorldBundleRegistryEntry
): MetaverseWorldBundleRegistryEntry {
  return Object.freeze({
    bundle: entry.bundle,
    bundleId: entry.bundleId,
    label: entry.label,
    sourceBundleId: entry.sourceBundleId
  });
}

export function listMetaverseWorldBundleRegistryEntries(): readonly MetaverseWorldBundleRegistryEntry[] {
  return metaverseWorldBundleRegistryEntries;
}

export function resolveDefaultMetaverseWorldBundleRegistryEntry(): MetaverseWorldBundleRegistryEntry {
  const defaultEntry = metaverseWorldBundleRegistryEntries[0] ?? null;

  if (defaultEntry === null) {
    throw new Error("Metaverse world bundle registry requires at least one bundle.");
  }

  return metaverseWorldBundlePreviewEntriesById.get(defaultEntry.bundleId) ?? defaultEntry;
}

export function resolveDefaultMetaverseWorldBundleId(): string {
  return resolveDefaultMetaverseWorldBundleRegistryEntry().bundleId;
}

export function readMetaverseWorldBundleRegistryEntry(
  bundleId: string
): MetaverseWorldBundleRegistryEntry | null {
  return (
    metaverseWorldBundlePreviewEntriesById.get(bundleId) ??
    metaverseWorldBundleRegistryEntriesById.get(bundleId) ??
    null
  );
}

export function registerMetaverseWorldBundlePreviewEntry(
  entry: MetaverseWorldBundleRegistryEntry
): void {
  metaverseWorldBundlePreviewEntriesById.set(entry.bundleId, freezeRegistryEntry(entry));
}

function supportsRuntimeMetaverseEnvironmentProof(
  bundle: MetaverseMapBundleSnapshot
): boolean {
  try {
    createMetaverseEnvironmentProofConfig(
      createLoadedMetaverseMapBundleSnapshot(bundle)
    );
    return true;
  } catch {
    return false;
  }
}

export function applyStoredMetaverseWorldBundleOverride(
  storage: StoredMetaverseWorldBundleStorageLike | null,
  bundleId: string
): boolean {
  const storedBundle = loadStoredMetaverseWorldBundleSnapshot(storage, bundleId);

  if (
    storedBundle === null ||
    !supportsRuntimeMetaverseEnvironmentProof(storedBundle)
  ) {
    clearMetaverseWorldBundlePreviewEntry(bundleId);
    return false;
  }

  registerMetaverseWorldBundlePreviewEntry(
    Object.freeze({
      bundle: storedBundle,
      bundleId,
      label: storedBundle.label,
      sourceBundleId: bundleId
    })
  );

  return true;
}

export function applyStoredMetaverseWorldBundleOverrides(
  storage: StoredMetaverseWorldBundleStorageLike | null
): void {
  for (const entry of metaverseWorldBundleRegistryEntries) {
    applyStoredMetaverseWorldBundleOverride(storage, entry.bundleId);
  }
}

export function clearMetaverseWorldBundlePreviewEntry(bundleId: string): void {
  metaverseWorldBundlePreviewEntriesById.delete(bundleId);
}

export function resolveMetaverseWorldBundleSourceBundleId(bundleId: string): string {
  return readMetaverseWorldBundleRegistryEntry(bundleId)?.sourceBundleId ?? bundleId;
}
