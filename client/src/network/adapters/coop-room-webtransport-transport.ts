import type {
  CoopPlayerId,
  CoopRoomClientCommand,
  CoopRoomServerEvent,
  DuckHuntCoopRoomWebTransportClientMessage,
  DuckHuntCoopRoomWebTransportServerMessage
} from "@webgpu-metaverse/shared";
import {
  createCoopRoomSnapshotEvent,
  createDuckHuntCoopRoomWebTransportCommandRequest,
  createDuckHuntCoopRoomWebTransportErrorMessage,
  createDuckHuntCoopRoomWebTransportServerEventMessage,
  createDuckHuntCoopRoomWebTransportSnapshotRequest
} from "@webgpu-metaverse/shared";

import { ReliableWebTransportJsonRequestChannel } from "./reliable-webtransport-json-request-channel";
import type { CoopRoomTransport } from "../types/coop-room-transport";
import type { NetworkCommandTransportOptions } from "../types/transport-command-options";

interface CoopRoomWebTransportDependencies {
  readonly channel?: ReliableWebTransportJsonRequestChannel<
    DuckHuntCoopRoomWebTransportClientMessage,
    DuckHuntCoopRoomWebTransportServerMessage
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readStringField(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new Error(`Expected string field: ${fieldName}`);
  }

  return value;
}

function parseCoopRoomServerMessage(
  payload: unknown
): DuckHuntCoopRoomWebTransportServerMessage {
  if (!isRecord(payload)) {
    throw new Error("Duck Hunt co-op WebTransport response must be a JSON object.");
  }

  const messageType = readStringField(payload.type, "type");

  if (messageType === "coop-room-error") {
    return createDuckHuntCoopRoomWebTransportErrorMessage({
      message: readStringField(payload.message, "message")
    });
  }

  if (messageType === "coop-room-server-event") {
    if (!isRecord(payload.event)) {
      throw new Error("Expected object field: event");
    }

    if (!isRecord(payload.event.room)) {
      throw new Error("Expected object field: event.room");
    }

    return createDuckHuntCoopRoomWebTransportServerEventMessage({
      event: createCoopRoomSnapshotEvent(
        payload.event.room as unknown as Parameters<
          typeof createCoopRoomSnapshotEvent
        >[0]
      )
    });
  }

  throw new Error(
    `Unsupported Duck Hunt co-op WebTransport response type: ${messageType}`
  );
}

export function createCoopRoomWebTransportTransport(config: {
  readonly roomId: Parameters<typeof createDuckHuntCoopRoomWebTransportSnapshotRequest>[0]["roomId"];
  readonly webTransportUrl: string;
}, dependencies: CoopRoomWebTransportDependencies = {}): CoopRoomTransport {
  const channel =
    dependencies.channel ??
    new ReliableWebTransportJsonRequestChannel<
      DuckHuntCoopRoomWebTransportClientMessage,
      DuckHuntCoopRoomWebTransportServerMessage
    >(
      {
        parseResponse: parseCoopRoomServerMessage,
        url: config.webTransportUrl
      },
      dependencies.webTransportFactory === undefined
        ? {}
        : {
            webTransportFactory: dependencies.webTransportFactory
          }
    );

  async function sendRequest(
    request: DuckHuntCoopRoomWebTransportClientMessage
  ): Promise<CoopRoomServerEvent> {
    const response = await channel.sendRequest(request);

    if (response.type === "coop-room-error") {
      throw new Error(response.message);
    }

    return response.event;
  }

  return Object.freeze({
    dispose() {
      channel.dispose();
    },
    pollRoomSnapshot(playerId: CoopPlayerId) {
      return sendRequest(
        createDuckHuntCoopRoomWebTransportSnapshotRequest({
          observerPlayerId: playerId,
          roomId: config.roomId
        })
      );
    },
    sendCommand(
      command: CoopRoomClientCommand,
      _options: NetworkCommandTransportOptions = {}
    ) {
      return sendRequest(
        createDuckHuntCoopRoomWebTransportCommandRequest({
          command
        })
      );
    }
  });
}
