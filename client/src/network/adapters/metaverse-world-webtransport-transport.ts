import type {
  MetaversePlayerId,
  MetaverseRealtimeWorldClientCommand,
  MetaverseRealtimeWorldEvent,
  MetaverseRoomId,
  MetaverseRealtimeWorldWebTransportClientMessage,
  MetaverseRealtimeWorldWebTransportServerMessage
} from "@webgpu-metaverse/shared";
import {
  createMetaverseRealtimeWorldEvent,
  createMetaverseRealtimeWorldWebTransportCommandRequest,
  createMetaverseRealtimeWorldWebTransportErrorMessage,
  createMetaverseRealtimeWorldWebTransportServerEventMessage,
  createMetaverseRealtimeWorldWebTransportSnapshotRequest
} from "@webgpu-metaverse/shared";

import { ReliableWebTransportJsonRequestChannel } from "./reliable-webtransport-json-request-channel";
import type { MetaverseWorldTransport } from "../types/metaverse-world-transport";

interface MetaverseWorldWebTransportDependencies {
  readonly channel?: ReliableWebTransportJsonRequestChannel<
    MetaverseRealtimeWorldWebTransportClientMessage,
    MetaverseRealtimeWorldWebTransportServerMessage
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

function resolveMetaverseWorldTransportRoomId(
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

function parseMetaverseWorldServerMessage(
  payload: unknown
): MetaverseRealtimeWorldWebTransportServerMessage {
  if (!isRecord(payload)) {
    throw new Error("Metaverse world WebTransport response must be a JSON object.");
  }

  const messageType = readStringField(payload.type, "type");

  if (messageType === "world-error") {
    return createMetaverseRealtimeWorldWebTransportErrorMessage({
      message: readStringField(payload.message, "message")
    });
  }

  if (messageType === "world-server-event") {
    if (!isRecord(payload.event)) {
      throw new Error("Expected object field: event");
    }

    if (!isRecord(payload.event.world)) {
      throw new Error("Expected object field: event.world");
    }

    return createMetaverseRealtimeWorldWebTransportServerEventMessage({
      event: createMetaverseRealtimeWorldEvent({
        world: payload.event.world as unknown as Parameters<
          typeof createMetaverseRealtimeWorldEvent
        >[0]["world"]
      })
    });
  }

  throw new Error(
    `Unsupported metaverse world WebTransport response type: ${messageType}`
  );
}

export function createMetaverseWorldWebTransportTransport(config: {
  readonly roomId?: MetaverseRoomId;
  readonly webTransportUrl: string;
}, dependencies: MetaverseWorldWebTransportDependencies = {}): MetaverseWorldTransport {
  const roomId = resolveMetaverseWorldTransportRoomId(config.roomId);
  const channel =
    dependencies.channel ??
    new ReliableWebTransportJsonRequestChannel<
      MetaverseRealtimeWorldWebTransportClientMessage,
      MetaverseRealtimeWorldWebTransportServerMessage
    >(
      {
        parseResponse: parseMetaverseWorldServerMessage,
        url: config.webTransportUrl
      },
      dependencies.webTransportFactory === undefined
        ? {}
        : {
            webTransportFactory: dependencies.webTransportFactory
          }
    );

  return Object.freeze({
    dispose() {
      channel.dispose();
    },
    async pollWorldSnapshot(playerId: MetaversePlayerId): Promise<MetaverseRealtimeWorldEvent> {
      const response = await channel.sendRequest(
        createMetaverseRealtimeWorldWebTransportSnapshotRequest({
          observerPlayerId: playerId,
          roomId
        })
      );

      if (response.type === "world-error") {
        throw new Error(response.message);
      }

      return response.event;
    },
    async sendCommand(
      command: MetaverseRealtimeWorldClientCommand
    ): Promise<MetaverseRealtimeWorldEvent> {
      const response = await channel.sendRequest(
        createMetaverseRealtimeWorldWebTransportCommandRequest({
          command,
          roomId
        })
      );

      if (response.type === "world-error") {
        throw new Error(response.message);
      }

      return response.event;
    }
  });
}
