import type {
  MetaversePlayerId,
  MetaversePresenceCommand,
  MetaversePresenceRosterEvent,
  MetaverseRoomId,
  MetaversePresenceWebTransportClientMessage,
  MetaversePresenceWebTransportServerMessage
} from "@webgpu-metaverse/shared";
import {
  createMetaversePresenceRosterEvent,
  createMetaversePresenceWebTransportCommandRequest,
  createMetaversePresenceWebTransportErrorMessage,
  createMetaversePresenceWebTransportRosterRequest,
  createMetaversePresenceWebTransportServerEventMessage
} from "@webgpu-metaverse/shared";

import { ReliableWebTransportJsonRequestChannel } from "./reliable-webtransport-json-request-channel";
import type { MetaversePresenceTransport } from "../types/metaverse-presence-transport";
import type { NetworkCommandTransportOptions } from "../types/transport-command-options";

interface MetaversePresenceWebTransportDependencies {
  readonly channel?: ReliableWebTransportJsonRequestChannel<
    MetaversePresenceWebTransportClientMessage,
    MetaversePresenceWebTransportServerMessage
  >;
  readonly webTransportFactory?: (url: string) => {
    readonly closed?: Promise<unknown>;
    readonly ready?: Promise<unknown>;
    createBidirectionalStream(): Promise<{
      readonly readable: ReadableStream<Uint8Array>;
      readonly writable: WritableStream<Uint8Array>;
    }>;
    close(closeInfo?: {
      readonly closeCode?: number;
      readonly reason?: string;
    }): void;
  };
}

function resolveMetaversePresenceTransportRoomId(
  roomId: MetaverseRoomId | undefined
): MetaverseRoomId {
  return (roomId ?? "metaverse-shell-local") as MetaverseRoomId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readStringField(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new Error(`Expected string field: ${fieldName}`);
  }

  return value;
}

function parsePresenceServerMessage(
  payload: unknown
): MetaversePresenceWebTransportServerMessage {
  if (!isRecord(payload)) {
    throw new Error(
      "Metaverse presence WebTransport response must be a JSON object."
    );
  }

  const messageType = readStringField(payload.type, "type");

  if (messageType === "presence-error") {
    return createMetaversePresenceWebTransportErrorMessage({
      message: readStringField(payload.message, "message")
    });
  }

  if (messageType === "presence-server-event") {
    if (!isRecord(payload.event)) {
      throw new Error("Expected object field: event");
    }

    if (!isRecord(payload.event.roster)) {
      throw new Error("Expected object field: event.roster");
    }

    return createMetaversePresenceWebTransportServerEventMessage({
      event: createMetaversePresenceRosterEvent(
        payload.event.roster as unknown as Parameters<
          typeof createMetaversePresenceRosterEvent
        >[0]
      )
    });
  }

  throw new Error(
    `Unsupported metaverse presence WebTransport response type: ${messageType}`
  );
}

export function createMetaversePresenceWebTransportTransport(config: {
  readonly roomId?: MetaverseRoomId;
  readonly webTransportUrl: string;
}, dependencies: MetaversePresenceWebTransportDependencies = {}): MetaversePresenceTransport {
  const roomId = resolveMetaversePresenceTransportRoomId(config.roomId);
  const channel =
    dependencies.channel ??
    new ReliableWebTransportJsonRequestChannel<
      MetaversePresenceWebTransportClientMessage,
      MetaversePresenceWebTransportServerMessage
    >(
      {
        parseResponse: parsePresenceServerMessage,
        url: config.webTransportUrl
      },
      dependencies.webTransportFactory === undefined
        ? {}
        : {
            webTransportFactory: dependencies.webTransportFactory
          }
    );

  async function sendRequest(
    request: MetaversePresenceWebTransportClientMessage
  ): Promise<MetaversePresenceRosterEvent> {
    const response = await channel.sendRequest(request);

    if (response.type === "presence-error") {
      throw new Error(response.message);
    }

    return response.event;
  }

  return Object.freeze({
    dispose() {
      channel.dispose();
    },
    pollRosterSnapshot(playerId: MetaversePlayerId) {
      return sendRequest(
        createMetaversePresenceWebTransportRosterRequest({
          observerPlayerId: playerId,
          roomId
        })
      );
    },
    sendCommand(
      command: MetaversePresenceCommand,
      _options: NetworkCommandTransportOptions = {}
    ) {
      return sendRequest(
        createMetaversePresenceWebTransportCommandRequest({
          command,
          roomId
        })
      );
    }
  });
}
