import {
  parseMetaverseMapBundleSnapshot,
  type MetaverseMapBundleSnapshot
} from "@webgpu-metaverse/shared/metaverse/world";

const storedMetaverseWorldBundleStorageKeyPrefix =
  "webgpu-metaverse:engine-tool:map-editor-project:";

export const storedMetaverseWorldBundleRecordVersion = 3 as const;
const supportedStoredMetaverseWorldBundleRecordVersions = Object.freeze([2, 3]);

export interface StoredMetaverseWorldBundleStorageLike {
  getItem(key: string): string | null;
}

interface StoredMetaverseWorldBundleRecord {
  readonly bundle: unknown;
  readonly version: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readStoredMetaverseWorldBundleStorageKey(bundleId: string): string {
  return `${storedMetaverseWorldBundleStorageKeyPrefix}${bundleId}`;
}

function parseStoredBundleRecord(
  value: unknown,
  bundleId: string
): MetaverseMapBundleSnapshot | null {
  if (!isRecord(value) || !("bundle" in value)) {
    return null;
  }

  const version =
    typeof value.version === "number" && Number.isFinite(value.version)
      ? value.version
      : null;

  if (
    version === null ||
    !supportedStoredMetaverseWorldBundleRecordVersions.includes(version)
  ) {
    return null;
  }

  try {
    const bundle = parseMetaverseMapBundleSnapshot(value.bundle);

    return bundle.mapId === bundleId ? bundle : null;
  } catch {
    return null;
  }
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
    return parseStoredBundleRecord(JSON.parse(rawValue) as unknown, bundleId);
  } catch {
    return null;
  }
}
