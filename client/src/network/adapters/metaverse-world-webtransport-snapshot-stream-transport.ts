import type {
  MetaversePlayerId,
  MetaverseRealtimeWorldEvent,
  MetaverseRealtimeWorldWebTransportClientMessage,
  MetaverseRealtimeWorldWebTransportServerMessage
} from "@webgpu-metaverse/shared";
import {
  createMetaverseRealtimeWorldEvent,
  createMetaverseRealtimeWorldWebTransportErrorMessage,
  createMetaverseRealtimeWorldWebTransportServerEventMessage,
  createMetaverseRealtimeWorldWebTransportSnapshotSubscribeRequest
} from "@webgpu-metaverse/shared";

import { ReliableWebTransportJsonSubscriptionChannel } from "./reliable-webtransport-json-subscription-channel";
import type { MetaverseWorldSnapshotStreamTransport } from "../types/metaverse-world-snapshot-stream-transport";

interface MetaverseWorldWebTransportSnapshotStreamDependencies {
  readonly channel?: ReliableWebTransportJsonSubscriptionChannel<
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
    if (!isRecord(payload.event) || !isRecord(payload.event.world)) {
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

export function createMetaverseWorldWebTransportSnapshotStreamTransport(config: {
  readonly webTransportUrl: string;
}, dependencies: MetaverseWorldWebTransportSnapshotStreamDependencies = {}): MetaverseWorldSnapshotStreamTransport {
  const channel =
    dependencies.channel ??
    new ReliableWebTransportJsonSubscriptionChannel<
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
    subscribeWorldSnapshots(
      playerId: MetaversePlayerId,
      handlers: {
        readonly onClose?: (() => void) | undefined;
        readonly onError?: ((error: unknown) => void) | undefined;
        readonly onWorldEvent: (event: MetaverseRealtimeWorldEvent) => void;
      }
    ) {
      return channel.openSubscription(
        createMetaverseRealtimeWorldWebTransportSnapshotSubscribeRequest({
          observerPlayerId: playerId
        }),
        {
          onClose: handlers.onClose,
          onError: handlers.onError,
          onResponse(response) {
            if (response.type === "world-error") {
              throw new Error(response.message);
            }

            handlers.onWorldEvent(response.event);
          }
        }
      );
    }
  });
}
