import type {
  MetaverseRealtimeWorldWebTransportClientDatagram
} from "@webgpu-metaverse/shared/metaverse/realtime";
import type { MetaversePlayerId } from "@webgpu-metaverse/shared/metaverse/presence";

import type { MetaverseRoomDirectoryOwner } from "../types/metaverse-room-directory-owner.js";

export class MetaverseRealtimeWorldWebTransportDatagramSession {
  readonly #roomDirectory: MetaverseRoomDirectoryOwner;

  #boundPlayerId: MetaversePlayerId | null = null;
  #disposed = false;

  constructor(roomDirectory: MetaverseRoomDirectoryOwner) {
    this.#roomDirectory = roomDirectory;
  }

  receiveClientDatagram(
    datagram: MetaverseRealtimeWorldWebTransportClientDatagram,
    nowMs: number
  ): void {
    this.#assertNotDisposed();
    this.#bindPlayerIdentity(datagram.command.playerId);
    this.#roomDirectory.acceptBoundWorldCommand(datagram.command, nowMs);
  }

  dispose(): void {
    this.#disposed = true;
  }

  #assertNotDisposed(): void {
    if (this.#disposed) {
      throw new Error(
        "Metaverse realtime world WebTransport datagram session has already been disposed."
      );
    }
  }

  #bindPlayerIdentity(playerId: MetaversePlayerId): void {
    if (this.#boundPlayerId !== null && this.#boundPlayerId !== playerId) {
      throw new Error(
        `Metaverse world WebTransport datagram session is already bound to ${this.#boundPlayerId}.`
      );
    }

    this.#boundPlayerId = playerId;
  }
}

export class MetaverseRealtimeWorldWebTransportDatagramAdapter {
  readonly #roomDirectory: MetaverseRoomDirectoryOwner;

  constructor(roomDirectory: MetaverseRoomDirectoryOwner) {
    this.#roomDirectory = roomDirectory;
  }

  openSession(): MetaverseRealtimeWorldWebTransportDatagramSession {
    return new MetaverseRealtimeWorldWebTransportDatagramSession(this.#roomDirectory);
  }
}
