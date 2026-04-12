import type {
  CoopPlayerId,
  CoopRoomClientCommand
} from "@webgpu-metaverse/shared";

import {
  parseCoopRoomErrorMessage,
  parseCoopRoomServerEvent,
  resolveCoopRoomCommandUrl,
  resolveCoopRoomSnapshotUrl,
  serializeCoopRoomClientCommand
} from "../codecs/coop-room-client-http";
import type { CoopRoomClientConfig } from "../types/coop-room-client";
import type { CoopRoomTransport } from "../types/coop-room-transport";
import type { NetworkCommandTransportOptions } from "../types/transport-command-options";

interface CoopRoomHttpTransportDependencies {
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

  throw new Error("Fetch API is unavailable for the co-op room client.");
}

export function createCoopRoomHttpTransport(
  config: Pick<CoopRoomClientConfig, "roomCollectionPath" | "roomId" | "serverOrigin">,
  dependencies: CoopRoomHttpTransportDependencies = {}
): CoopRoomTransport {
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
    async pollRoomSnapshot(playerId: CoopPlayerId) {
      const response = await fetch(
        resolveCoopRoomSnapshotUrl(
          config.serverOrigin,
          config.roomCollectionPath,
          config.roomId,
          playerId
        ),
        {
          cache: "no-store"
        }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          parseCoopRoomErrorMessage(payload, "Co-op room snapshot poll failed.")
        );
      }

      return parseCoopRoomServerEvent(payload);
    },
    async sendCommand(
      command: CoopRoomClientCommand,
      options: NetworkCommandTransportOptions = {}
    ) {
      const response = await fetch(
        resolveCoopRoomCommandUrl(
          config.serverOrigin,
          config.roomCollectionPath,
          config.roomId
        ),
        {
          body: serializeCoopRoomClientCommand(command),
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
          parseCoopRoomErrorMessage(payload, "Co-op room command failed.")
        );
      }

      return parseCoopRoomServerEvent(payload);
    }
  });
}
