import type { MetaverseMatchModeId } from "@webgpu-metaverse/shared";
import type {
  MetaverseMapBundleLaunchVariationSnapshot
} from "@webgpu-metaverse/shared/metaverse/world";

import {
  listMetaverseWorldBundleRegistryEntries,
  readMetaverseWorldBundleRegistryEntry,
  resolveDefaultMetaverseWorldBundleId,
  type MetaverseWorldBundleRegistryEntry
} from "../bundle-registry";

export interface MetaverseMapLaunchPlaylistSnapshot {
  readonly metaverseDefaultBundleId: string | null;
  readonly teamDeathmatchBundleIds: readonly string[];
}

export interface MetaverseMapLaunchSelectionSnapshot {
  readonly bundleId: string;
  readonly launchVariationId: string;
}

const metaverseMapLaunchPlaylistStorageKey =
  "webgpu-metaverse.map-launch-playlists.v1" as const;
const defaultMetaverseBundleId = "vibe-highlands" as const;
const defaultFreeRoamLaunchVariationId =
  "vibe-highlands:scene-default" as const;
const defaultTeamDeathmatchBundleId = defaultMetaverseBundleId;
const defaultTeamDeathmatchLaunchVariationId =
  "vibe-highlands:variation:2" as const;

export const defaultMetaverseMapLaunchPlaylistSnapshot =
  Object.freeze({
    metaverseDefaultBundleId: defaultMetaverseBundleId,
    teamDeathmatchBundleIds: Object.freeze([defaultTeamDeathmatchBundleId])
  } satisfies MetaverseMapLaunchPlaylistSnapshot);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeMetaverseDefaultBundleId(_value: unknown): string | null {
  return defaultMetaverseMapLaunchPlaylistSnapshot.metaverseDefaultBundleId;
}

function normalizeTeamDeathmatchBundleIds(_value: unknown): readonly string[] {
  return defaultMetaverseMapLaunchPlaylistSnapshot.teamDeathmatchBundleIds;
}

export function normalizeMetaverseMapLaunchPlaylistSnapshot(
  value: unknown
): MetaverseMapLaunchPlaylistSnapshot {
  if (!isRecord(value)) {
    return defaultMetaverseMapLaunchPlaylistSnapshot;
  }

  return Object.freeze({
    metaverseDefaultBundleId: normalizeMetaverseDefaultBundleId(
      value.metaverseDefaultBundleId
    ),
    teamDeathmatchBundleIds: normalizeTeamDeathmatchBundleIds(
      value.teamDeathmatchBundleIds
    )
  });
}

export function readMetaverseMapLaunchPlaylistSnapshot(
  storage: Storage | null
): MetaverseMapLaunchPlaylistSnapshot {
  if (storage === null) {
    return defaultMetaverseMapLaunchPlaylistSnapshot;
  }

  const storedValue = storage.getItem(metaverseMapLaunchPlaylistStorageKey);

  if (storedValue === null) {
    return defaultMetaverseMapLaunchPlaylistSnapshot;
  }

  try {
    return normalizeMetaverseMapLaunchPlaylistSnapshot(JSON.parse(storedValue));
  } catch {
    return defaultMetaverseMapLaunchPlaylistSnapshot;
  }
}

export function saveMetaverseMapLaunchPlaylistSnapshot(
  storage: Storage | null,
  playlist: MetaverseMapLaunchPlaylistSnapshot
): void {
  if (storage === null) {
    return;
  }

  const normalizedPlaylist = normalizeMetaverseMapLaunchPlaylistSnapshot(playlist);

  storage.setItem(
    metaverseMapLaunchPlaylistStorageKey,
    JSON.stringify({
      metaverseDefaultBundleId: normalizedPlaylist.metaverseDefaultBundleId,
      teamDeathmatchBundleIds: [...normalizedPlaylist.teamDeathmatchBundleIds]
    })
  );
}

function readBundleRegistryEntry(
  bundleId: string
): MetaverseWorldBundleRegistryEntry | null {
  return (
    readMetaverseWorldBundleRegistryEntry(bundleId) ??
    listMetaverseWorldBundleRegistryEntries().find(
      (entry) => entry.bundleId === bundleId
    ) ??
    null
  );
}

function readLaunchVariationForMatchMode(
  bundleId: string,
  matchMode: MetaverseMatchModeId
): MetaverseMapBundleLaunchVariationSnapshot | null {
  const registryEntry = readBundleRegistryEntry(bundleId);

  return (
    registryEntry?.bundle.launchVariations.find(
      (launchVariation) => launchVariation.matchMode === matchMode
    ) ?? null
  );
}

function resolveFallbackBundleId(matchMode: MetaverseMatchModeId): string {
  return matchMode === "team-deathmatch"
    ? defaultTeamDeathmatchBundleId
    : resolveDefaultMetaverseWorldBundleId();
}

function resolveFallbackLaunchVariationId(
  matchMode: MetaverseMatchModeId
): string {
  return matchMode === "team-deathmatch"
    ? defaultTeamDeathmatchLaunchVariationId
    : defaultFreeRoamLaunchVariationId;
}

function resolveFirstSupportedLaunchSelection(
  bundleIds: readonly string[],
  matchMode: MetaverseMatchModeId
): MetaverseMapLaunchSelectionSnapshot | null {
  for (const bundleId of bundleIds) {
    const launchVariation = readLaunchVariationForMatchMode(bundleId, matchMode);

    if (launchVariation !== null) {
      return Object.freeze({
        bundleId,
        launchVariationId: launchVariation.variationId
      });
    }
  }

  return null;
}

export function resolveMetaverseMapLaunchSelection(
  playlist: MetaverseMapLaunchPlaylistSnapshot,
  matchMode: MetaverseMatchModeId
): MetaverseMapLaunchSelectionSnapshot {
  const normalizedPlaylist =
    normalizeMetaverseMapLaunchPlaylistSnapshot(playlist);
  const configuredBundleIds =
    matchMode === "team-deathmatch"
      ? normalizedPlaylist.teamDeathmatchBundleIds
      : normalizedPlaylist.metaverseDefaultBundleId === null
        ? Object.freeze([])
        : Object.freeze([normalizedPlaylist.metaverseDefaultBundleId]);
  const configuredSelection = resolveFirstSupportedLaunchSelection(
    configuredBundleIds,
    matchMode
  );

  if (configuredSelection !== null) {
    return configuredSelection;
  }

  const fallbackBundleId = resolveFallbackBundleId(matchMode);
  const fallbackVariation =
    readLaunchVariationForMatchMode(fallbackBundleId, matchMode)?.variationId ??
    resolveFallbackLaunchVariationId(matchMode);

  return Object.freeze({
    bundleId: fallbackBundleId,
    launchVariationId: fallbackVariation
  });
}

export function replaceMetaverseDefaultMap(
  playlist: MetaverseMapLaunchPlaylistSnapshot,
  bundleId: string
): MetaverseMapLaunchPlaylistSnapshot {
  const normalizedPlaylist = normalizeMetaverseMapLaunchPlaylistSnapshot(playlist);

  return Object.freeze({
    ...normalizedPlaylist,
    metaverseDefaultBundleId:
      bundleId === defaultMetaverseBundleId
        ? defaultMetaverseBundleId
        : defaultMetaverseMapLaunchPlaylistSnapshot.metaverseDefaultBundleId
  });
}

export function toggleTeamDeathmatchMap(
  playlist: MetaverseMapLaunchPlaylistSnapshot,
  bundleId: string
): MetaverseMapLaunchPlaylistSnapshot {
  const normalizedPlaylist = normalizeMetaverseMapLaunchPlaylistSnapshot(playlist);

  if (bundleId !== defaultTeamDeathmatchBundleId) {
    return normalizedPlaylist;
  }

  return Object.freeze({
    ...normalizedPlaylist,
    teamDeathmatchBundleIds:
      defaultMetaverseMapLaunchPlaylistSnapshot.teamDeathmatchBundleIds
  });
}

export function prioritizeTeamDeathmatchMap(
  playlist: MetaverseMapLaunchPlaylistSnapshot,
  bundleId: string
): MetaverseMapLaunchPlaylistSnapshot {
  const normalizedPlaylist = normalizeMetaverseMapLaunchPlaylistSnapshot(playlist);

  if (bundleId !== defaultTeamDeathmatchBundleId) {
    return normalizedPlaylist;
  }

  return Object.freeze({
    ...normalizedPlaylist,
    teamDeathmatchBundleIds:
      defaultMetaverseMapLaunchPlaylistSnapshot.teamDeathmatchBundleIds
  });
}
