import type {
  MetaverseRealtimeWorldWebTransportClientMessage,
  MetaverseRealtimeWorldWebTransportServerMessage
} from "@webgpu-metaverse/shared";
import {
  createMetaverseRealtimeWorldWebTransportErrorMessage,
  createMetaverseRealtimeWorldWebTransportServerEventMessage
} from "@webgpu-metaverse/shared";

import { MetaverseAuthoritativeWorldRuntime } from "../classes/metaverse-authoritative-world-runtime.js";

export class MetaverseWorldWebTransportSession {
  readonly #runtime: MetaverseAuthoritativeWorldRuntime;

  #disposed = false;

  constructor(runtime: MetaverseAuthoritativeWorldRuntime) {
    this.#runtime = runtime;
  }

  receiveClientMessage(
    message: MetaverseRealtimeWorldWebTransportClientMessage,
    nowMs: number
  ): MetaverseRealtimeWorldWebTransportServerMessage {
    this.#assertNotDisposed();

    try {
      switch (message.type) {
        case "world-snapshot-request":
          return createMetaverseRealtimeWorldWebTransportServerEventMessage({
            event: this.#runtime.readWorldEvent(nowMs, message.observerPlayerId)
          });
        case "world-command-request":
          return createMetaverseRealtimeWorldWebTransportServerEventMessage({
            event: this.#runtime.acceptWorldCommand(message.command, nowMs)
          });
        default: {
          const exhaustiveMessage: never = message;

          throw new Error(
            `Unsupported metaverse world WebTransport request type: ${exhaustiveMessage}`
          );
        }
      }
    } catch (error) {
      return createMetaverseRealtimeWorldWebTransportErrorMessage({
        message:
          error instanceof Error
            ? error.message
            : "Metaverse world WebTransport request failed."
      });
    }
  }

  dispose(): void {
    this.#disposed = true;
  }

  #assertNotDisposed(): void {
    if (this.#disposed) {
      throw new Error(
        "Metaverse world WebTransport session has already been disposed."
      );
    }
  }
}

export class MetaverseWorldWebTransportAdapter {
  readonly #runtime: MetaverseAuthoritativeWorldRuntime;

  constructor(runtime: MetaverseAuthoritativeWorldRuntime) {
    this.#runtime = runtime;
  }

  openSession(): MetaverseWorldWebTransportSession {
    return new MetaverseWorldWebTransportSession(this.#runtime);
  }
}
