import type { MetaverseMapBundleSnapshot } from "@webgpu-metaverse/shared/metaverse/world";

const storedMetaverseWorldBundleStorageKeyPrefix =
  "webgpu-metaverse:engine-tool:map-editor-project:";

export const storedMetaverseWorldBundleRecordVersion = 2 as const;

export interface StoredMetaverseWorldBundleStorageLike {
  getItem(key: string): string | null;
}

interface StoredMetaverseWorldBundleRecord {
  readonly bundle: MetaverseMapBundleSnapshot;
  readonly version: typeof storedMetaverseWorldBundleRecordVersion;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readStoredMetaverseWorldBundleStorageKey(bundleId: string): string {
  return `${storedMetaverseWorldBundleStorageKeyPrefix}${bundleId}`;
}

function isStoredMetaverseWorldBundleRecord(
  value: unknown,
  bundleId: string
): value is StoredMetaverseWorldBundleRecord {
  if (!isRecord(value) || !isRecord(value.bundle)) {
    return false;
  }

  const { bundle } = value;
  const presentationProfileIds = bundle.presentationProfileIds;

  return (
    value.version === storedMetaverseWorldBundleRecordVersion &&
    bundle.mapId === bundleId &&
    typeof bundle.description === "string" &&
    (bundle.gameplayProfileId === undefined ||
      typeof bundle.gameplayProfileId === "string") &&
    typeof bundle.label === "string" &&
    Array.isArray(bundle.environmentAssets) &&
    Array.isArray(bundle.launchVariations) &&
    Array.isArray(bundle.playerSpawnNodes) &&
    isRecord(bundle.playerSpawnSelection) &&
    Array.isArray(bundle.resourceSpawns) &&
    Array.isArray(bundle.sceneObjects) &&
    Array.isArray(bundle.waterRegions) &&
    isRecord(presentationProfileIds)
  );
}

export function loadStoredMetaverseWorldBundleSnapshot(
  storage: StoredMetaverseWorldBundleStorageLike | null,
  bundleId: string
): MetaverseMapBundleSnapshot | null {
  if (storage === null) {
    return null;
  }

  const rawValue = storage.getItem(readStoredMetaverseWorldBundleStorageKey(bundleId));

  if (rawValue === null) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    return isStoredMetaverseWorldBundleRecord(parsedValue, bundleId)
      ? parsedValue.bundle
      : null;
  } catch {
    return null;
  }
}
