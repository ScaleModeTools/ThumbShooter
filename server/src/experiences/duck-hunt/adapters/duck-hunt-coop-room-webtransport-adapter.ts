import type {
  DuckHuntCoopRoomWebTransportClientMessage,
  DuckHuntCoopRoomWebTransportServerMessage
} from "@webgpu-metaverse/shared";
import {
  createCoopRoomSnapshotEvent,
  createDuckHuntCoopRoomWebTransportErrorMessage,
  createDuckHuntCoopRoomWebTransportServerEventMessage
} from "@webgpu-metaverse/shared";

import { CoopRoomDirectory } from "../classes/coop-room-directory.js";

export class DuckHuntCoopRoomWebTransportSession {
  readonly #roomDirectory: CoopRoomDirectory;

  #disposed = false;

  constructor(roomDirectory: CoopRoomDirectory) {
    this.#roomDirectory = roomDirectory;
  }

  receiveClientMessage(
    message: DuckHuntCoopRoomWebTransportClientMessage,
    nowMs: number
  ): DuckHuntCoopRoomWebTransportServerMessage {
    this.#assertNotDisposed();

    try {
      switch (message.type) {
        case "coop-room-command-request":
          return createDuckHuntCoopRoomWebTransportServerEventMessage({
            event: this.#roomDirectory.acceptCommand(message.command, nowMs)
          });
        case "coop-room-snapshot-request":
          return createDuckHuntCoopRoomWebTransportServerEventMessage({
            event: createCoopRoomSnapshotEvent(
              this.#roomDirectory.advanceRoom(
                message.roomId,
                nowMs,
                message.observerPlayerId
              )
            )
          });
        default: {
          const exhaustiveCheck: never = message;
          throw new Error(
            `Unsupported Duck Hunt co-op WebTransport message: ${exhaustiveCheck}`
          );
        }
      }
    } catch (error) {
      return createDuckHuntCoopRoomWebTransportErrorMessage({
        message:
          error instanceof Error
            ? error.message
            : "Duck Hunt co-op room WebTransport request failed."
      });
    }
  }

  dispose(): void {
    this.#disposed = true;
  }

  #assertNotDisposed(): void {
    if (this.#disposed) {
      throw new Error(
        "Duck Hunt co-op room WebTransport session has already been disposed."
      );
    }
  }
}

export class DuckHuntCoopRoomWebTransportAdapter {
  readonly #roomDirectory: CoopRoomDirectory;

  constructor(roomDirectory: CoopRoomDirectory) {
    this.#roomDirectory = roomDirectory;
  }

  openSession(): DuckHuntCoopRoomWebTransportSession {
    return new DuckHuntCoopRoomWebTransportSession(this.#roomDirectory);
  }
}
