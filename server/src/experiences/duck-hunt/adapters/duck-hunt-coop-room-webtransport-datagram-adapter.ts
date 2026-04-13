import type {
  CoopPlayerId,
  DuckHuntCoopRoomWebTransportClientDatagram
} from "@webgpu-metaverse/shared";

import { CoopRoomDirectory } from "../classes/coop-room-directory.js";

export class DuckHuntCoopRoomWebTransportDatagramSession {
  readonly #roomDirectory: CoopRoomDirectory;

  #boundPlayerId: CoopPlayerId | null = null;
  #disposed = false;

  constructor(roomDirectory: CoopRoomDirectory) {
    this.#roomDirectory = roomDirectory;
  }

  receiveClientDatagram(
    datagram: DuckHuntCoopRoomWebTransportClientDatagram,
    nowMs: number
  ): void {
    this.#assertNotDisposed();
    this.#bindPlayerIdentity(datagram.command.playerId);
    this.#roomDirectory.acceptCommand(datagram.command, nowMs);
  }

  dispose(): void {
    this.#disposed = true;
  }

  #assertNotDisposed(): void {
    if (this.#disposed) {
      throw new Error(
        "Duck Hunt co-op room WebTransport datagram session has already been disposed."
      );
    }
  }

  #bindPlayerIdentity(playerId: CoopPlayerId): void {
    if (this.#boundPlayerId !== null && this.#boundPlayerId !== playerId) {
      throw new Error(
        `Duck Hunt co-op room WebTransport datagram session is already bound to ${this.#boundPlayerId}.`
      );
    }

    this.#boundPlayerId = playerId;
  }
}

export class DuckHuntCoopRoomWebTransportDatagramAdapter {
  readonly #roomDirectory: CoopRoomDirectory;

  constructor(roomDirectory: CoopRoomDirectory) {
    this.#roomDirectory = roomDirectory;
  }

  openSession(): DuckHuntCoopRoomWebTransportDatagramSession {
    return new DuckHuntCoopRoomWebTransportDatagramSession(
      this.#roomDirectory
    );
  }
}
