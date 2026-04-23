import {
  createMetaverseLeavePresenceCommand,
  createMetaverseRoomAssignmentSnapshot,
  createMetaverseRoomDirectoryEntrySnapshot,
  type MetaversePlayerId,
  type MetaversePresenceCommand,
  type MetaversePresenceRosterEvent,
  type MetaversePresenceRosterSnapshot,
  type MetaverseRealtimeWorldClientCommand,
  type MetaverseRealtimeWorldEvent,
  type MetaverseRealtimeWorldSnapshot,
  type MetaverseRoomAssignmentSnapshot,
  type MetaverseRoomDirectoryEntrySnapshot,
  type MetaverseRoomId,
  type MetaverseRoomSessionId,
  type MetaverseRoomStatusId,
  type MetaverseMatchModeId
} from "@webgpu-metaverse/shared";

import { MetaverseAuthoritativeWorldRuntime } from "./metaverse-authoritative-world-runtime.js";
import type { MetaverseAuthoritativeWorldRuntimeConfig } from "../types/metaverse-authoritative-world-runtime.js";

export interface MetaverseRoomRuntimeConfig {
  readonly bundleId: string;
  readonly capacity: number;
  readonly launchVariationId: string;
  readonly leaderPlayerId: MetaversePlayerId | null;
  readonly matchMode: MetaverseMatchModeId;
  readonly roomId: MetaverseRoomId;
  readonly roomSessionId: MetaverseRoomSessionId;
  readonly runtimeConfig?: Partial<MetaverseAuthoritativeWorldRuntimeConfig>;
}

export class MetaverseRoomRuntime {
  readonly #bundleId: string;
  readonly #capacity: number;
  readonly #launchVariationId: string;
  readonly #matchMode: MetaverseMatchModeId;
  readonly #roomId: MetaverseRoomId;
  readonly #roomSessionId: MetaverseRoomSessionId;
  readonly #runtime: MetaverseAuthoritativeWorldRuntime;

  #leaderPlayerId: MetaversePlayerId | null;

  constructor(config: MetaverseRoomRuntimeConfig) {
    this.#bundleId = config.bundleId;
    this.#capacity = config.capacity;
    this.#launchVariationId = config.launchVariationId;
    this.#leaderPlayerId = config.leaderPlayerId;
    this.#matchMode = config.matchMode;
    this.#roomId = config.roomId;
    this.#roomSessionId = config.roomSessionId;
    this.#runtime = new MetaverseAuthoritativeWorldRuntime(
      config.runtimeConfig ?? {},
      config.bundleId
    );
  }

  get bundleId(): string {
    return this.#bundleId;
  }

  get capacity(): number {
    return this.#capacity;
  }

  get launchVariationId(): string {
    return this.#launchVariationId;
  }

  get leaderPlayerId(): MetaversePlayerId | null {
    return this.#leaderPlayerId;
  }

  get matchMode(): MetaverseMatchModeId {
    return this.#matchMode;
  }

  get roomId(): MetaverseRoomId {
    return this.#roomId;
  }

  get roomSessionId(): MetaverseRoomSessionId {
    return this.#roomSessionId;
  }

  get tickIntervalMs(): number {
    return this.#runtime.tickIntervalMs;
  }

  advanceToTime(nowMs: number): void {
    this.#runtime.advanceToTime(nowMs);
  }

  setLeaderPlayerId(playerId: MetaversePlayerId | null): void {
    this.#leaderPlayerId = playerId;
  }

  readPresenceRosterSnapshot(
    nowMs: number,
    observerPlayerId?: MetaversePlayerId
  ): MetaversePresenceRosterSnapshot {
    return this.#runtime.readPresenceRosterSnapshot(nowMs, observerPlayerId);
  }

  readPresenceRosterEvent(
    nowMs: number,
    observerPlayerId?: MetaversePlayerId
  ): MetaversePresenceRosterEvent {
    return this.#runtime.readPresenceRosterEvent(nowMs, observerPlayerId);
  }

  readWorldSnapshot(
    nowMs: number,
    observerPlayerId?: MetaversePlayerId
  ): MetaverseRealtimeWorldSnapshot {
    return this.#runtime.readWorldSnapshot(nowMs, observerPlayerId);
  }

  readWorldEvent(
    nowMs: number,
    observerPlayerId?: MetaversePlayerId
  ): MetaverseRealtimeWorldEvent {
    return this.#runtime.readWorldEvent(nowMs, observerPlayerId);
  }

  acceptPresenceCommand(
    command: MetaversePresenceCommand,
    nowMs: number
  ): MetaversePresenceRosterEvent {
    return this.#runtime.acceptPresenceCommand(command, nowMs);
  }

  acceptWorldCommand(
    command: MetaverseRealtimeWorldClientCommand,
    nowMs: number
  ): MetaverseRealtimeWorldEvent {
    return this.#runtime.acceptWorldCommand(command, nowMs);
  }

  forceRemovePlayer(playerId: MetaversePlayerId, nowMs: number): void {
    try {
      this.#runtime.acceptPresenceCommand(
        createMetaverseLeavePresenceCommand({
          playerId
        }),
        nowMs
      );
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !error.message.startsWith("Unknown metaverse player:")
      ) {
        throw error;
      }
    }
  }

  readAssignmentSnapshot(
    connectedPlayerCount: number
  ): MetaverseRoomAssignmentSnapshot {
    return createMetaverseRoomAssignmentSnapshot({
      bundleId: this.#bundleId,
      capacity: this.#capacity,
      connectedPlayerCount,
      launchVariationId: this.#launchVariationId,
      leaderPlayerId: this.#leaderPlayerId,
      matchMode: this.#matchMode,
      roomId: this.#roomId,
      roomSessionId: this.#roomSessionId
    });
  }

  readDirectoryEntry(
    nowMs: number,
    connectedPlayerCount: number,
    status: MetaverseRoomStatusId
  ): MetaverseRoomDirectoryEntrySnapshot {
    const worldSnapshot = this.#runtime.readWorldSnapshot(nowMs);
    const combatMatch = worldSnapshot.combatMatch;
    const redTeamSnapshot =
      combatMatch?.teams.find((teamSnapshot) => teamSnapshot.teamId === "red") ??
      null;
    const blueTeamSnapshot =
      combatMatch?.teams.find((teamSnapshot) => teamSnapshot.teamId === "blue") ??
      null;

    return createMetaverseRoomDirectoryEntrySnapshot({
      blueTeamPlayerCount: blueTeamSnapshot?.playerIds.length ?? 0,
      blueTeamScore: blueTeamSnapshot?.score ?? 0,
      bundleId: this.#bundleId,
      capacity: this.#capacity,
      connectedPlayerCount,
      launchVariationId: this.#launchVariationId,
      leaderPlayerId: this.#leaderPlayerId,
      matchMode: this.#matchMode,
      phase: combatMatch?.phase ?? null,
      redTeamPlayerCount: redTeamSnapshot?.playerIds.length ?? 0,
      redTeamScore: redTeamSnapshot?.score ?? 0,
      roomId: this.#roomId,
      roomSessionId: this.#roomSessionId,
      scoreLimit: combatMatch?.scoreLimit ?? null,
      status,
      timeRemainingMs:
        combatMatch === null ? null : Number(combatMatch.timeRemainingMs)
    });
  }
}
