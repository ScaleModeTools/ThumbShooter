import type {
  MetaversePresenceCommand,
  MetaversePlayerId
} from "@webgpu-metaverse/shared";

import {
  parseMetaversePresenceErrorMessage,
  parseMetaversePresenceServerEvent,
  resolveMetaversePresenceCommandUrl,
  resolveMetaversePresenceSnapshotUrl,
  serializeMetaversePresenceCommand
} from "../codecs/metaverse-presence-client-http";
import type { MetaversePresenceClientConfig } from "../types/metaverse-presence-client";
import type { MetaversePresenceTransport } from "../types/metaverse-presence-transport";
import type { NetworkCommandTransportOptions } from "../types/transport-command-options";

interface MetaversePresenceHttpTransportDependencies {
  readonly fetch?: typeof globalThis.fetch;
}

function resolveFetchDependency(
  fetchDependency: typeof globalThis.fetch | undefined
): typeof globalThis.fetch {
  if (fetchDependency !== undefined) {
    return fetchDependency;
  }

  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch.bind(globalThis);
  }

  throw new Error("Fetch API is unavailable for the metaverse presence client.");
}

export function createMetaversePresenceHttpTransport(
  config: Pick<MetaversePresenceClientConfig, "presencePath" | "serverOrigin">,
  dependencies: MetaversePresenceHttpTransportDependencies = {}
): MetaversePresenceTransport {
  const fetch = resolveFetchDependency(dependencies.fetch);

  function resolveCommandRequestInit(
    options: NetworkCommandTransportOptions = {}
  ): RequestInit {
    if (options.deliveryHint === "best-effort-disconnect") {
      return {
        keepalive: true
      };
    }

    return {};
  }

  return Object.freeze({
    async pollRosterSnapshot(playerId: MetaversePlayerId) {
      const response = await fetch(
        resolveMetaversePresenceSnapshotUrl(
          config.serverOrigin,
          config.presencePath,
          playerId
        ),
        {
          cache: "no-store"
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          parseMetaversePresenceErrorMessage(
            payload,
            "Metaverse presence poll failed."
          )
        );
      }

      return parseMetaversePresenceServerEvent(payload);
    },
    async sendCommand(
      command: MetaversePresenceCommand,
      options: NetworkCommandTransportOptions = {}
    ) {
      const response = await fetch(
        resolveMetaversePresenceCommandUrl(
          config.serverOrigin,
          config.presencePath
        ),
        {
          body: serializeMetaversePresenceCommand(command),
          headers: {
            "content-type": "application/json"
          },
          method: "POST",
          ...resolveCommandRequestInit(options)
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          parseMetaversePresenceErrorMessage(
            payload,
            "Metaverse presence command failed."
          )
        );
      }

      return parseMetaversePresenceServerEvent(payload);
    }
  });
}
