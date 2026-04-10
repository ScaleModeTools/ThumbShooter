import {
  createMetaversePlayerId,
  createMilliseconds,
  createUsername,
  type MetaversePlayerId,
  type Username
} from "@webgpu-metaverse/shared";

import {
  MetaversePresenceClient,
  type MetaversePresenceClientConfig
} from "@/network";

export interface MetaverseLocalPlayerIdentity {
  readonly characterId: string;
  readonly playerId: MetaversePlayerId;
  readonly username: Username;
}

function normalizePlayerIdSegment(rawValue: string): string {
  const normalizedValue = rawValue
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalizedValue.length === 0 ? "player" : normalizedValue;
}

function resolveMetaverseServerOrigin(): string {
  const configuredOrigin = import.meta.env?.VITE_SERVER_ORIGIN?.trim();

  if (configuredOrigin !== undefined && configuredOrigin.length > 0) {
    return configuredOrigin;
  }

  const browserOrigin = globalThis.window?.location.origin;

  if (browserOrigin === undefined) {
    return "http://127.0.0.1:3210";
  }

  return browserOrigin;
}

export const metaversePresencePath = "/metaverse/presence" as const;

export const metaversePresenceClientConfig = {
  defaultPollIntervalMs: createMilliseconds(150),
  presencePath: metaversePresencePath,
  serverOrigin: resolveMetaverseServerOrigin()
} as const satisfies MetaversePresenceClientConfig;

export function createMetaversePresenceClient(): MetaversePresenceClient {
  return new MetaversePresenceClient(metaversePresenceClientConfig);
}

export function createMetaverseLocalPlayerIdentity(
  username: string,
  characterId: string
): MetaverseLocalPlayerIdentity {
  const resolvedUsername = createUsername(username);

  if (resolvedUsername === null) {
    throw new Error("Metaverse local player identity requires a valid username.");
  }

  const randomSuffix =
    globalThis.crypto?.randomUUID?.().slice(0, 8) ??
    Math.random().toString(36).slice(2, 10);
  const playerId = createMetaversePlayerId(
    `${normalizePlayerIdSegment(username)}-${randomSuffix}`
  );

  if (playerId === null) {
    throw new Error("Unable to create a metaverse player id.");
  }

  const normalizedCharacterId = characterId.trim();

  if (normalizedCharacterId.length === 0) {
    throw new Error("Metaverse local player identity requires a character id.");
  }

  return Object.freeze({
    characterId: normalizedCharacterId,
    playerId,
    username: resolvedUsername
  });
}
