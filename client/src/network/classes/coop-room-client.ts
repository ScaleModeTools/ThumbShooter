import type {
  CoopPlayerId,
  CoopRoomServerEvent,
  CoopRoomSnapshot,
  NormalizedViewportPoint
} from "@thumbshooter/shared";
import {
  createCoopFireShotCommand,
  createCoopJoinRoomCommand,
  createCoopLeaveRoomCommand,
  createCoopSetPlayerReadyCommand
} from "@thumbshooter/shared";

import { coopRoomClientConfig } from "../config/coop-room-client";
import {
  parseCoopRoomErrorMessage,
  parseCoopRoomServerEvent,
  resolveCoopRoomCommandUrl,
  resolveCoopRoomSnapshotUrl,
  serializeCoopRoomClientCommand
} from "../codecs/coop-room-client-http";
import type {
  CoopRoomClientConfig,
  CoopRoomClientStatusSnapshot,
  CoopRoomJoinRequest
} from "../types/coop-room-client";

interface CoopRoomClientDependencies {
  readonly clearTimeout?: typeof globalThis.clearTimeout;
  readonly fetch?: typeof globalThis.fetch;
  readonly setTimeout?: typeof globalThis.setTimeout;
}

type TimeoutHandle = ReturnType<typeof globalThis.setTimeout>;

function freezeStatusSnapshot(
  roomId: CoopRoomClientStatusSnapshot["roomId"],
  playerId: CoopRoomClientStatusSnapshot["playerId"],
  state: CoopRoomClientStatusSnapshot["state"],
  joined: boolean,
  lastSnapshotTick: number | null,
  lastError: string | null
): CoopRoomClientStatusSnapshot {
  return Object.freeze({
    joined,
    lastError,
    lastSnapshotTick,
    playerId,
    roomId,
    state
  });
}

function findPlayerAckSequence(
  roomSnapshot: CoopRoomSnapshot,
  playerId: CoopPlayerId | null
): number {
  if (playerId === null) {
    return 0;
  }

  const playerSnapshot = roomSnapshot.players.find(
    (candidate) => candidate.playerId === playerId
  );

  return playerSnapshot?.activity.lastAcknowledgedShotSequence ?? 0;
}

function resolveFetchDependency(
  fetchDependency: typeof globalThis.fetch | undefined
): typeof globalThis.fetch {
  if (fetchDependency !== undefined) {
    return fetchDependency;
  }

  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch.bind(globalThis);
  }

  throw new Error("Fetch API is unavailable for the co-op room client.");
}

export class CoopRoomClient {
  readonly #clearTimeout: typeof globalThis.clearTimeout;
  readonly #config: CoopRoomClientConfig;
  readonly #fetch: typeof globalThis.fetch;
  readonly #setTimeout: typeof globalThis.setTimeout;
  readonly #updateListeners = new Set<() => void>();

  #joinPromise: Promise<CoopRoomSnapshot> | null = null;
  #nextClientShotSequence = 0;
  #playerId: CoopPlayerId | null = null;
  #pollHandle: TimeoutHandle | null = null;
  #roomSnapshot: CoopRoomSnapshot | null = null;
  #statusSnapshot: CoopRoomClientStatusSnapshot;

  constructor(
    config: CoopRoomClientConfig = coopRoomClientConfig,
    dependencies: CoopRoomClientDependencies = {}
  ) {
    this.#config = config;
    this.#fetch = resolveFetchDependency(dependencies.fetch);
    this.#setTimeout = dependencies.setTimeout ?? globalThis.setTimeout.bind(globalThis);
    this.#clearTimeout =
      dependencies.clearTimeout ?? globalThis.clearTimeout.bind(globalThis);
    this.#statusSnapshot = freezeStatusSnapshot(
      config.roomId,
      null,
      "idle",
      false,
      null,
      null
    );
  }

  get roomSnapshot(): CoopRoomSnapshot | null {
    return this.#roomSnapshot;
  }

  get roomId(): CoopRoomClientConfig["roomId"] {
    return this.#config.roomId;
  }

  get statusSnapshot(): CoopRoomClientStatusSnapshot {
    return this.#statusSnapshot;
  }

  subscribeUpdates(listener: () => void): () => void {
    this.#updateListeners.add(listener);

    return () => {
      this.#updateListeners.delete(listener);
    };
  }

  async ensureJoined(request: CoopRoomJoinRequest): Promise<CoopRoomSnapshot> {
    this.#assertNotDisposed();

    if (this.#playerId !== null && this.#playerId !== request.playerId) {
      throw new Error("Co-op room client already joined with a different player.");
    }

    if (
      this.#roomSnapshot !== null &&
      this.#playerId === request.playerId &&
      this.#statusSnapshot.joined
    ) {
      return this.#roomSnapshot;
    }

    if (this.#joinPromise !== null) {
      return this.#joinPromise;
    }

    this.#playerId = request.playerId;
    this.#statusSnapshot = freezeStatusSnapshot(
      this.#config.roomId,
      request.playerId,
      "joining",
      false,
      this.#statusSnapshot.lastSnapshotTick,
      null
    );
    this.#notifyUpdates();

    const joinPromise = this.#ensureJoinedInternal(request);
    this.#joinPromise = joinPromise;

    try {
      return await joinPromise;
    } finally {
      if (this.#joinPromise === joinPromise) {
        this.#joinPromise = null;
      }
    }
  }

  async setPlayerReady(ready: boolean): Promise<CoopRoomSnapshot> {
    this.#assertNotDisposed();

    if (this.#playerId === null) {
      throw new Error("Co-op room client must join before updating readiness.");
    }

    try {
      const serverEvent = await this.#postCommand(
        createCoopSetPlayerReadyCommand({
          playerId: this.#playerId,
          ready,
          roomId: this.#config.roomId
        })
      );

      this.#applyServerEvent(serverEvent);

      return serverEvent.room;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Co-op room readiness update failed.";

      this.#setError(message);
      throw error;
    }
  }

  fireShot(aimPoint: NormalizedViewportPoint): void {
    if (this.#playerId === null || this.#statusSnapshot.state === "disposed") {
      return;
    }

    this.#nextClientShotSequence += 1;
    const command = createCoopFireShotCommand({
      aimPoint,
      clientShotSequence: this.#nextClientShotSequence,
      playerId: this.#playerId,
      roomId: this.#config.roomId
    });

    void this.#postCommand(command)
      .then((serverEvent) => {
        this.#applyServerEvent(serverEvent);
      })
      .catch((error: unknown) => {
        this.#setError(
          error instanceof Error
            ? error.message
            : "Co-op fire-shot command failed."
        );
      });
  }

  dispose(): void {
    if (this.#statusSnapshot.state === "disposed") {
      return;
    }

    const playerIdToLeave =
      this.#statusSnapshot.joined && this.#playerId !== null
        ? this.#playerId
        : null;

    this.#cancelScheduledPoll();
    this.#statusSnapshot = freezeStatusSnapshot(
      this.#config.roomId,
      this.#playerId,
      "disposed",
      false,
      this.#statusSnapshot.lastSnapshotTick,
      null
    );
    this.#notifyUpdates();

    if (playerIdToLeave !== null) {
      void this.#postLeaveRoomDuringDispose(playerIdToLeave);
    }
  }

  async #ensureJoinedInternal(
    request: CoopRoomJoinRequest
  ): Promise<CoopRoomSnapshot> {
    try {
      const serverEvent = await this.#postCommand(
        createCoopJoinRoomCommand({
          playerId: request.playerId,
          ready: request.ready,
          roomId: this.#config.roomId,
          username: request.username
        })
      );

      this.#applyServerEvent(serverEvent);

      if (!this.#isDisposed()) {
        this.#schedulePoll(0);
      }

      return serverEvent.room;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Co-op room join failed.";

      this.#setError(message);
      throw error;
    }
  }

  #applyServerEvent(serverEvent: CoopRoomServerEvent): void {
    if (this.#isDisposed()) {
      return;
    }

    if (!this.#shouldAcceptRoomSnapshot(serverEvent.room)) {
      return;
    }

    this.#roomSnapshot = serverEvent.room;
    this.#statusSnapshot = freezeStatusSnapshot(
      this.#config.roomId,
      this.#playerId,
      "connected",
      true,
      serverEvent.room.tick.currentTick,
      null
    );
    this.#notifyUpdates();
  }

  #shouldAcceptRoomSnapshot(nextSnapshot: CoopRoomSnapshot): boolean {
    if (this.#roomSnapshot === null) {
      return true;
    }

    const currentTick = this.#roomSnapshot.tick.currentTick;
    const nextTick = nextSnapshot.tick.currentTick;

    if (nextTick > currentTick) {
      return true;
    }

    if (nextTick < currentTick) {
      return false;
    }

    return (
      findPlayerAckSequence(nextSnapshot, this.#playerId) >=
      findPlayerAckSequence(this.#roomSnapshot, this.#playerId)
    );
  }

  #schedulePoll(delayMs: number): void {
    this.#cancelScheduledPoll();

    if (this.#statusSnapshot.state === "disposed" || this.#playerId === null) {
      return;
    }

    this.#pollHandle = this.#setTimeout(() => {
      this.#pollHandle = null;
      void this.#pollRoomSnapshot();
    }, Math.max(0, delayMs));
  }

  #cancelScheduledPoll(): void {
    if (this.#pollHandle === null) {
      return;
    }

    this.#clearTimeout(this.#pollHandle);
    this.#pollHandle = null;
  }

  async #pollRoomSnapshot(): Promise<void> {
    if (this.#playerId === null || this.#statusSnapshot.state === "disposed") {
      return;
    }

    try {
      const response = await this.#fetch(
        resolveCoopRoomSnapshotUrl(this.#config.serverOrigin, this.#config.roomId)
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          parseCoopRoomErrorMessage(payload, "Co-op room snapshot poll failed.")
        );
      }

      this.#applyServerEvent(parseCoopRoomServerEvent(payload));
    } catch (error) {
      this.#setError(
        error instanceof Error
          ? error.message
          : "Co-op room snapshot poll failed."
      );
    } finally {
      if (!this.#isDisposed() && this.#playerId !== null) {
        this.#schedulePoll(this.#resolvePollDelayMs());
      }
    }
  }

  async #postCommand(
    command:
      | ReturnType<typeof createCoopJoinRoomCommand>
      | ReturnType<typeof createCoopSetPlayerReadyCommand>
      | ReturnType<typeof createCoopLeaveRoomCommand>
      | ReturnType<typeof createCoopFireShotCommand>,
    requestInit: RequestInit = {}
  ): Promise<CoopRoomServerEvent> {
    const response = await this.#fetch(
      resolveCoopRoomCommandUrl(this.#config.serverOrigin, this.#config.roomId),
      {
        body: serializeCoopRoomClientCommand(command),
        headers: {
          "content-type": "application/json"
        },
        method: "POST",
        ...requestInit
      }
    );
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(
        parseCoopRoomErrorMessage(payload, "Co-op room command failed.")
      );
    }

    return parseCoopRoomServerEvent(payload);
  }

  async #postLeaveRoomDuringDispose(playerId: CoopPlayerId): Promise<void> {
    try {
      await this.#postCommand(
        createCoopLeaveRoomCommand({
          playerId,
          roomId: this.#config.roomId
        }),
        {
          keepalive: true
        }
      );
    } catch {
      // Best-effort disconnect signaling should never block disposal.
    }
  }

  #resolvePollDelayMs(): number {
    if (this.#roomSnapshot !== null) {
      return Number(this.#roomSnapshot.tick.tickIntervalMs);
    }

    return Number(this.#config.defaultPollIntervalMs);
  }

  #setError(message: string): void {
    if (this.#statusSnapshot.state === "disposed") {
      return;
    }

    this.#statusSnapshot = freezeStatusSnapshot(
      this.#config.roomId,
      this.#playerId,
      "error",
      this.#roomSnapshot !== null,
      this.#roomSnapshot?.tick.currentTick ?? null,
      message
    );
    this.#notifyUpdates();
  }

  #assertNotDisposed(): void {
    if (this.#isDisposed()) {
      throw new Error("Co-op room client is already disposed.");
    }
  }

  #isDisposed(): boolean {
    return this.#statusSnapshot.state === "disposed";
  }

  #notifyUpdates(): void {
    for (const listener of this.#updateListeners) {
      listener();
    }
  }
}
