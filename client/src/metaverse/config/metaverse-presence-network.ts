import {
  createMetaversePlayerId,
  createMilliseconds,
  createUsername,
  type MetaversePlayerId,
  type Username
} from "@webgpu-metaverse/shared";

import {
  MetaversePresenceClient,
  createMetaversePresenceHttpTransport,
  createMetaversePresenceWebTransportTransport,
  type MetaversePresenceClientConfig
} from "@/network";
import { createWebTransportHttpFallbackInvoker } from "@/network/adapters/webtransport-http-fallback";

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

function resolveMetaverseRealtimeTransportMode():
  | "http"
  | "webtransport-preferred" {
  const configuredMode = import.meta.env?.VITE_METAVERSE_REALTIME_TRANSPORT?.trim();

  return configuredMode === "webtransport-preferred"
    ? "webtransport-preferred"
    : "http";
}

function resolveMetaversePresenceWebTransportUrl(): string | null {
  const configuredUrl =
    import.meta.env?.VITE_METAVERSE_PRESENCE_WEBTRANSPORT_URL?.trim();

  if (configuredUrl === undefined || configuredUrl.length === 0) {
    return null;
  }

  return configuredUrl;
}

export const metaversePresencePath = "/metaverse/presence" as const;

export const metaversePresenceClientConfig = {
  defaultPollIntervalMs: createMilliseconds(150),
  presencePath: metaversePresencePath,
  serverOrigin: resolveMetaverseServerOrigin()
} as const satisfies MetaversePresenceClientConfig;

export function createMetaversePresenceClient(): MetaversePresenceClient {
  const preferredTransportMode = resolveMetaverseRealtimeTransportMode();
  const webTransportUrl = resolveMetaversePresenceWebTransportUrl();
  const shouldUseWebTransport =
    preferredTransportMode === "webtransport-preferred" &&
    webTransportUrl !== null &&
    typeof (
      globalThis as typeof globalThis & {
        readonly WebTransport?: unknown;
      }
    ).WebTransport === "function";

  const httpTransport = createMetaversePresenceHttpTransport(
    metaversePresenceClientConfig
  );

  return new MetaversePresenceClient(metaversePresenceClientConfig, {
    transport: shouldUseWebTransport
      ? (() => {
          const transportFailover = createWebTransportHttpFallbackInvoker(
            createMetaversePresenceWebTransportTransport({
              webTransportUrl
            }),
            httpTransport
          );

          return Object.freeze({
            dispose() {
              transportFailover.dispose();
            },
            pollRosterSnapshot(
              playerId: Parameters<typeof httpTransport.pollRosterSnapshot>[0]
            ) {
              return transportFailover.invoke((transport) =>
                transport.pollRosterSnapshot(playerId)
              );
            },
            sendCommand(
              command: Parameters<typeof httpTransport.sendCommand>[0],
              options?: Parameters<typeof httpTransport.sendCommand>[1]
            ) {
              return transportFailover.invoke((transport) =>
                transport.sendCommand(command, options)
              );
            }
          });
        })()
      : httpTransport
  });
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
