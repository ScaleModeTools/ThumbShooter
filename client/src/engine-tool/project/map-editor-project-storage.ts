import {
  defaultMetaverseGameplayProfileId,
  parseMetaverseMapBundleSnapshot,
  type MetaverseMapBundleSnapshot
} from "@webgpu-metaverse/shared/metaverse/world";

import type { LoadedMetaverseMapBundleSnapshot } from "@/metaverse/world/map-bundles";
import {
  createLoadedMetaverseMapBundleSnapshot
} from "@/metaverse/world/map-bundles";
import {
  readStoredMetaverseWorldBundleStorageKey,
  storedMetaverseWorldBundleRecordVersion
} from "@/metaverse/world/map-bundles/stored-metaverse-world-bundle";

import {
  createMapEditorProject,
  selectMapEditorEntity,
  selectMapEditorLaunchVariation,
  selectMapEditorPlacement,
  type MapEditorSelectedEntityRef
} from "./map-editor-project-state";
import type { MapEditorProjectSnapshot } from "./map-editor-project-state";
import { exportMapEditorProjectToMetaverseMapBundle } from "../run/export-map-editor-project-to-metaverse-map-bundle";

export interface MapEditorProjectStorageLike {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

export interface MapEditorProjectCatalogEntry {
  readonly bundleId: string;
  readonly label: string;
}

interface StoredMapEditorProjectRecord {
  readonly bundle: unknown;
  readonly selectedEntityRef?: unknown;
  readonly selectedLaunchVariationId?: unknown;
  readonly selectedPlacementId?: unknown;
  readonly version: number;
}

interface StoredMapEditorProjectCatalogRecord {
  readonly entries?: unknown;
  readonly version: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readStorageKey(bundleId: string): string {
  return readStoredMetaverseWorldBundleStorageKey(bundleId);
}

const storedMapEditorProjectCatalogKey =
  "webgpu-metaverse:engine-tool:map-editor-project-catalog";
const storedMapEditorProjectCatalogVersion = 1 as const;

function createLoadedMetaverseMapBundleFromBundle(
  bundle: MetaverseMapBundleSnapshot
): LoadedMetaverseMapBundleSnapshot {
  const bundleWithResolvedGameplayProfileId =
    bundle.gameplayProfileId === undefined
      ? Object.freeze({
          ...bundle,
          gameplayProfileId: defaultMetaverseGameplayProfileId
        })
      : bundle;

  return createLoadedMetaverseMapBundleSnapshot(bundleWithResolvedGameplayProfileId);
}

function readSelectedEntityRef(
  value: unknown
): MapEditorSelectedEntityRef | null {
  if (!isRecord(value)) {
    return null;
  }

  return typeof value.id === "string" && typeof value.kind === "string"
    ? Object.freeze({
        id: value.id,
        kind: value.kind as MapEditorSelectedEntityRef["kind"]
      })
    : null;
}

function parseStoredRecord(
  storage: MapEditorProjectStorageLike,
  bundleId: string
): {
  readonly bundle: MetaverseMapBundleSnapshot;
  readonly selectedEntityRef: MapEditorSelectedEntityRef | null;
  readonly selectedLaunchVariationId: string | null;
  readonly selectedPlacementId: string | null;
  readonly version: number;
} | null {
  const rawValue = storage.getItem(readStorageKey(bundleId));

  if (rawValue === null) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as StoredMapEditorProjectRecord;

    if (!isRecord(parsedValue) || typeof parsedValue.version !== "number") {
      return null;
    }

    const bundle = parseMetaverseMapBundleSnapshot(parsedValue.bundle);

    if (bundle.mapId !== bundleId || (parsedValue.version !== 2 && parsedValue.version !== 3)) {
      return null;
    }

    return Object.freeze({
      bundle,
      selectedEntityRef: readSelectedEntityRef(parsedValue.selectedEntityRef),
      selectedLaunchVariationId:
        typeof parsedValue.selectedLaunchVariationId === "string"
          ? parsedValue.selectedLaunchVariationId
          : null,
      selectedPlacementId:
        typeof parsedValue.selectedPlacementId === "string"
          ? parsedValue.selectedPlacementId
          : null,
      version: parsedValue.version
    });
  } catch {
    return null;
  }
}

function writeStoredProjectRecord(
  storage: MapEditorProjectStorageLike,
  project: MapEditorProjectSnapshot
): void {
  storage.setItem(
    readStorageKey(project.bundleId),
    JSON.stringify(
      Object.freeze({
        bundle: exportMapEditorProjectToMetaverseMapBundle(project),
        selectedEntityRef: project.selectedEntityRef,
        selectedLaunchVariationId: project.selectedLaunchVariationId,
        selectedPlacementId: project.selectedPlacementId,
        version: storedMetaverseWorldBundleRecordVersion
      })
    )
  );
}

function normalizeCatalogEntry(
  value: unknown
): MapEditorProjectCatalogEntry | null {
  if (!isRecord(value)) {
    return null;
  }

  const bundleId =
    typeof value.bundleId === "string" && value.bundleId.trim().length > 0
      ? value.bundleId.trim()
      : null;
  const label =
    typeof value.label === "string" && value.label.trim().length > 0
      ? value.label.trim()
      : null;

  return bundleId === null || label === null
    ? null
    : Object.freeze({
        bundleId,
        label
      });
}

function writeMapEditorProjectCatalogEntries(
  storage: MapEditorProjectStorageLike,
  entries: readonly MapEditorProjectCatalogEntry[]
): void {
  storage.setItem(
    storedMapEditorProjectCatalogKey,
    JSON.stringify(
      Object.freeze({
        entries: Object.freeze(
          entries.map((entry) =>
            Object.freeze({
              bundleId: entry.bundleId,
              label: entry.label
            })
          )
        ),
        version: storedMapEditorProjectCatalogVersion
      })
    )
  );
}

export function loadMapEditorProjectCatalogEntries(
  storage: MapEditorProjectStorageLike | null
): readonly MapEditorProjectCatalogEntry[] {
  if (storage === null) {
    return Object.freeze([]);
  }

  const rawValue = storage.getItem(storedMapEditorProjectCatalogKey);

  if (rawValue === null) {
    return Object.freeze([]);
  }

  try {
    const parsedValue = JSON.parse(
      rawValue
    ) as StoredMapEditorProjectCatalogRecord;

    if (
      !isRecord(parsedValue) ||
      parsedValue.version !== storedMapEditorProjectCatalogVersion ||
      !Array.isArray(parsedValue.entries)
    ) {
      return Object.freeze([]);
    }

    const entries: MapEditorProjectCatalogEntry[] = [];

    for (const candidate of parsedValue.entries) {
      const entry = normalizeCatalogEntry(candidate);

      if (
        entry !== null &&
        !entries.some((existingEntry) => existingEntry.bundleId === entry.bundleId)
      ) {
        entries.push(entry);
      }
    }

    return Object.freeze(entries);
  } catch {
    return Object.freeze([]);
  }
}

export function upsertMapEditorProjectCatalogEntry(
  storage: MapEditorProjectStorageLike | null,
  entry: MapEditorProjectCatalogEntry
): void {
  if (storage === null) {
    return;
  }

  const currentEntries = loadMapEditorProjectCatalogEntries(storage);
  const nextEntry = Object.freeze({
    bundleId: entry.bundleId.trim(),
    label: entry.label.trim()
  });

  if (nextEntry.bundleId.length === 0 || nextEntry.label.length === 0) {
    return;
  }

  writeMapEditorProjectCatalogEntries(
    storage,
    Object.freeze([
      ...currentEntries.filter(
        (currentEntry) => currentEntry.bundleId !== nextEntry.bundleId
      ),
      nextEntry
    ])
  );
}

export function loadStoredMapEditorProject(
  storage: MapEditorProjectStorageLike | null,
  bundleId: string
): MapEditorProjectSnapshot | null {
  if (storage === null) {
    return null;
  }

  const storedRecord = parseStoredRecord(storage, bundleId);

  if (storedRecord === null) {
    return null;
  }

  let project = createMapEditorProject(
    createLoadedMetaverseMapBundleFromBundle(storedRecord.bundle)
  );

  if (storedRecord.selectedEntityRef !== null) {
    project = selectMapEditorEntity(project, storedRecord.selectedEntityRef);
  } else if (storedRecord.selectedPlacementId !== null) {
    project = selectMapEditorPlacement(project, storedRecord.selectedPlacementId);
  }

  if (storedRecord.selectedLaunchVariationId !== null) {
    project = selectMapEditorLaunchVariation(
      project,
      storedRecord.selectedLaunchVariationId
    );
  }

  if (
    storedRecord.version !== storedMetaverseWorldBundleRecordVersion ||
    storedRecord.selectedEntityRef === null
  ) {
    writeStoredProjectRecord(storage, project);
  }

  return project;
}

export function saveMapEditorProject(
  storage: MapEditorProjectStorageLike | null,
  project: MapEditorProjectSnapshot
): void {
  if (storage === null) {
    return;
  }

  writeStoredProjectRecord(storage, project);
}

export function clearStoredMapEditorProject(
  storage: MapEditorProjectStorageLike | null,
  bundleId: string
): void {
  if (storage === null) {
    return;
  }

  storage.removeItem(readStorageKey(bundleId));
}
