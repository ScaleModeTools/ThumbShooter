import type {
  MetaversePresenceWebTransportClientMessage,
  MetaversePresenceWebTransportServerMessage
} from "@webgpu-metaverse/shared/metaverse/presence";
import type { MetaversePlayerId } from "@webgpu-metaverse/shared/metaverse/presence";
import type { MetaverseRoomId } from "@webgpu-metaverse/shared";
import {
  createMetaversePresenceWebTransportErrorMessage,
  createMetaversePresenceWebTransportServerEventMessage
} from "@webgpu-metaverse/shared/metaverse/presence";

import type { MetaverseRoomDirectoryOwner } from "../types/metaverse-room-directory-owner.js";

export class MetaversePresenceWebTransportSession {
  readonly #roomDirectory: MetaverseRoomDirectoryOwner;

  #boundPlayerId: MetaversePlayerId | null = null;
  #boundRoomId: MetaverseRoomId | null = null;
  #disposed = false;

  constructor(roomDirectory: MetaverseRoomDirectoryOwner) {
    this.#roomDirectory = roomDirectory;
  }

  receiveClientMessage(
    message: MetaversePresenceWebTransportClientMessage,
    nowMs: number
  ): MetaversePresenceWebTransportServerMessage {
    this.#assertNotDisposed();

    try {
      this.#bindSession(message);

      switch (message.type) {
        case "presence-command-request":
          return createMetaversePresenceWebTransportServerEventMessage({
            event: this.#roomDirectory.acceptPresenceCommand(
              message.roomId,
              message.command,
              nowMs
            )
          });
        case "presence-roster-request":
          return createMetaversePresenceWebTransportServerEventMessage({
            event: this.#roomDirectory.readPresenceRosterEvent(
              message.roomId,
              nowMs,
              message.observerPlayerId
            )
          });
        default: {
          const exhaustiveCheck: never = message;
          throw new Error(
            `Unsupported metaverse presence WebTransport message: ${exhaustiveCheck}`
          );
        }
      }
    } catch (error) {
      return createMetaversePresenceWebTransportErrorMessage({
        message:
          error instanceof Error
            ? error.message
            : "Metaverse presence WebTransport request failed."
      });
    }
  }

  dispose(): void {
    this.#disposed = true;
  }

  #bindSession(message: MetaversePresenceWebTransportClientMessage): void {
    const nextPlayerId =
      message.type === "presence-command-request"
        ? message.command.playerId
        : message.observerPlayerId;

    if (this.#boundPlayerId !== null && this.#boundPlayerId !== nextPlayerId) {
      throw new Error(
        `Metaverse presence WebTransport session is already bound to ${this.#boundPlayerId}.`
      );
    }

    if (this.#boundRoomId !== null && this.#boundRoomId !== message.roomId) {
      throw new Error(
        `Metaverse presence WebTransport session is already bound to room ${this.#boundRoomId}.`
      );
    }

    this.#boundPlayerId = nextPlayerId;
    this.#boundRoomId = message.roomId;
  }

  #assertNotDisposed(): void {
    if (this.#disposed) {
      throw new Error(
        "Metaverse presence WebTransport session has already been disposed."
      );
    }
  }
}

export class MetaversePresenceWebTransportAdapter {
  readonly #roomDirectory: MetaverseRoomDirectoryOwner;

  constructor(roomDirectory: MetaverseRoomDirectoryOwner) {
    this.#roomDirectory = roomDirectory;
  }

  openSession(): MetaversePresenceWebTransportSession {
    return new MetaversePresenceWebTransportSession(this.#roomDirectory);
  }
}
