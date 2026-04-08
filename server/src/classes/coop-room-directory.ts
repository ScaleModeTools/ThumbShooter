import type {
  CoopRoomClientCommand,
  CoopRoomId,
  CoopRoomServerEvent,
  CoopRoomSnapshot
} from "@thumbshooter/shared";

import { createCoopRoomRuntimeConfig } from "../config/coop-room-runtime.js";

import { CoopRoomRuntime } from "./coop-room-runtime.js";

export class CoopRoomDirectory {
  readonly #roomRuntimes = new Map<CoopRoomId, CoopRoomRuntime>();
  readonly #roomSessionOrdinals = new Map<CoopRoomId, number>();

  hasRoom(roomId: CoopRoomId): boolean {
    return this.#roomRuntimes.has(roomId);
  }

  listRoomSnapshots(nowMs: number): readonly CoopRoomSnapshot[] {
    return Object.freeze(
      [...this.#roomRuntimes.values()]
        .map((roomRuntime) => roomRuntime.advanceTo(nowMs))
        .sort((leftRoom, rightRoom) => leftRoom.roomId.localeCompare(rightRoom.roomId))
    );
  }

  advanceRoom(roomId: CoopRoomId, nowMs: number): CoopRoomSnapshot {
    const roomRuntime = this.#roomRuntimes.get(roomId);

    if (roomRuntime === undefined) {
      throw new Error(`Unknown co-op room: ${roomId}`);
    }

    return roomRuntime.advanceTo(nowMs);
  }

  acceptCommand(
    command: CoopRoomClientCommand,
    nowMs: number
  ): CoopRoomServerEvent {
    const roomRuntime = this.#resolveRoomRuntime(command);
    const roomEvent = roomRuntime.acceptCommand(command, nowMs);

    if (roomEvent.room.players.length === 0) {
      this.#roomRuntimes.delete(command.roomId);
    }

    return roomEvent;
  }

  #resolveRoomRuntime(command: CoopRoomClientCommand): CoopRoomRuntime {
    const existingRuntime = this.#roomRuntimes.get(command.roomId);

    if (existingRuntime !== undefined) {
      return existingRuntime;
    }

    if (command.type !== "join-room") {
      throw new Error(`Unknown co-op room: ${command.roomId}`);
    }

    const nextSessionOrdinal =
      (this.#roomSessionOrdinals.get(command.roomId) ?? 0) + 1;
    const roomRuntime = new CoopRoomRuntime(
      createCoopRoomRuntimeConfig(command.roomId, nextSessionOrdinal)
    );

    this.#roomSessionOrdinals.set(command.roomId, nextSessionOrdinal);
    this.#roomRuntimes.set(command.roomId, roomRuntime);

    return roomRuntime;
  }
}
