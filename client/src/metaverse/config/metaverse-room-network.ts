import { createMetaverseRoomId, type MetaverseRoomId } from "@webgpu-metaverse/shared";

import {
  MetaverseRoomDirectoryClient,
  type MetaverseRoomDirectoryClientConfig
} from "@/network";

import { metaverseServerOrigin } from "./metaverse-world-network";

export const metaverseRoomCollectionPath = "/metaverse/rooms" as const;
export const metaverseRoomDirectoryRefreshIntervalMs = 3_000;

export const metaverseRoomDirectoryClientConfig = {
  roomCollectionPath: metaverseRoomCollectionPath,
  serverOrigin: metaverseServerOrigin
} as const satisfies MetaverseRoomDirectoryClientConfig;

export function createMetaverseRoomDirectoryClient(): MetaverseRoomDirectoryClient {
  return new MetaverseRoomDirectoryClient(metaverseRoomDirectoryClientConfig);
}

export function createSuggestedMetaverseTeamDeathmatchRoomIdDraft(): string {
  const suffix =
    globalThis.crypto?.randomUUID?.().slice(0, 6) ??
    Math.random().toString(36).slice(2, 8);

  return `team-deathmatch-${suffix}`;
}

export function resolveMetaverseTeamDeathmatchRoomIdDraft(
  roomIdDraft: string
): MetaverseRoomId | null {
  return createMetaverseRoomId(roomIdDraft);
}
