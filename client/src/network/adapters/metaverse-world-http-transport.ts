import type {
  MetaversePlayerId,
  MetaverseRealtimeWorldClientCommand
} from "@webgpu-metaverse/shared";

import {
  parseMetaverseWorldErrorMessage,
  parseMetaverseWorldServerEvent,
  resolveMetaverseWorldCommandUrl,
  resolveMetaverseWorldSnapshotUrl
} from "../codecs/metaverse-world-client-http";
import { serializeMetaverseWorldCommand } from "../codecs/metaverse-world-client-http";
import type { MetaverseWorldClientConfig } from "../types/metaverse-world-client";
import type { MetaverseWorldTransport } from "../types/metaverse-world-transport";
import type { NetworkCommandTransportOptions } from "../types/transport-command-options";

interface MetaverseWorldHttpTransportDependencies {
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

  throw new Error("Fetch API is unavailable for the metaverse world client.");
}

export function createMetaverseWorldHttpTransport(
  config: Pick<
    MetaverseWorldClientConfig,
    "serverOrigin" | "worldCommandPath" | "worldPath"
  >,
  dependencies: MetaverseWorldHttpTransportDependencies = {}
): MetaverseWorldTransport {
  const fetch = resolveFetchDependency(dependencies.fetch);

  function resolveCommandRequestInit(
    _options: NetworkCommandTransportOptions = {}
  ): RequestInit {
    return {};
  }

  return Object.freeze({
    async pollWorldSnapshot(playerId: MetaversePlayerId) {
      const response = await fetch(
        resolveMetaverseWorldSnapshotUrl(
          config.serverOrigin,
          config.worldPath,
          playerId
        ),
        {
          cache: "no-store"
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          parseMetaverseWorldErrorMessage(
            payload,
            "Metaverse world poll failed."
          )
        );
      }

      return parseMetaverseWorldServerEvent(payload);
    },
    async sendCommand(
      command: MetaverseRealtimeWorldClientCommand,
      options: NetworkCommandTransportOptions = {}
    ) {
      const response = await fetch(
        resolveMetaverseWorldCommandUrl(
          config.serverOrigin,
          config.worldCommandPath
        ),
        {
          body: serializeMetaverseWorldCommand(command),
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
          parseMetaverseWorldErrorMessage(
            payload,
            "Metaverse world command failed."
          )
        );
      }

      return parseMetaverseWorldServerEvent(payload);
    }
  });
}
