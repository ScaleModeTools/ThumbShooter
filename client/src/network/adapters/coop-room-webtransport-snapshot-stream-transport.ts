import type {
  CoopPlayerId,
  CoopRoomServerEvent,
  DuckHuntCoopRoomWebTransportClientMessage,
  DuckHuntCoopRoomWebTransportServerMessage
} from "@webgpu-metaverse/shared";
import {
  createCoopRoomSnapshotEvent,
  createDuckHuntCoopRoomWebTransportErrorMessage,
  createDuckHuntCoopRoomWebTransportServerEventMessage,
  createDuckHuntCoopRoomWebTransportSnapshotSubscribeRequest
} from "@webgpu-metaverse/shared";

import { ReliableWebTransportJsonSubscriptionChannel } from "./reliable-webtransport-json-subscription-channel";
import type { CoopRoomSnapshotStreamTransport } from "../types/coop-room-snapshot-stream-transport";

interface CoopRoomWebTransportSnapshotStreamDependencies {
  readonly channel?: ReliableWebTransportJsonSubscriptionChannel<
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
    if (!isRecord(payload.event) || !isRecord(payload.event.room)) {
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

export function createCoopRoomWebTransportSnapshotStreamTransport(config: {
  readonly roomId: Parameters<typeof createDuckHuntCoopRoomWebTransportSnapshotSubscribeRequest>[0]["roomId"];
  readonly webTransportUrl: string;
}, dependencies: CoopRoomWebTransportSnapshotStreamDependencies = {}): CoopRoomSnapshotStreamTransport {
  const channel =
    dependencies.channel ??
    new ReliableWebTransportJsonSubscriptionChannel<
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

  return Object.freeze({
    dispose() {
      channel.dispose();
    },
    subscribeRoomSnapshots(
      playerId: CoopPlayerId,
      handlers: {
        readonly onClose?: (() => void) | undefined;
        readonly onError?: ((error: unknown) => void) | undefined;
        readonly onRoomEvent: (event: CoopRoomServerEvent) => void;
      }
    ) {
      return channel.openSubscription(
        createDuckHuntCoopRoomWebTransportSnapshotSubscribeRequest({
          observerPlayerId: playerId,
          roomId: config.roomId
        }),
        {
          onClose: handlers.onClose,
          onError: handlers.onError,
          onResponse(response) {
            if (response.type === "coop-room-error") {
              throw new Error(response.message);
            }

            handlers.onRoomEvent(response.event);
          }
        }
      );
    }
  });
}
