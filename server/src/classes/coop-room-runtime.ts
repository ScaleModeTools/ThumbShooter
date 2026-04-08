import type {
  CoopBirdBehaviorState,
  CoopBirdId,
  CoopFireShotCommand,
  CoopJoinRoomCommand,
  CoopLeaveRoomCommand,
  CoopPlayerId,
  CoopPlayerShotOutcomeState,
  CoopRoomClientCommand,
  CoopRoomServerEvent,
  CoopRoomSnapshot,
  NormalizedViewportPoint,
  Username
} from "@thumbshooter/shared";
import {
  createCoopRoomSnapshot,
  createCoopRoomSnapshotEvent
} from "@thumbshooter/shared";

import { coopRoomRuntimeConfig } from "../config/coop-room-runtime.js";
import type {
  CoopRoomBirdSeed,
  CoopRoomRuntimeConfig
} from "../types/coop-room-runtime.js";

interface PendingShotCommand {
  readonly aimPoint: NormalizedViewportPoint;
  readonly clientShotSequence: number;
  readonly playerId: CoopPlayerId;
}

interface CoopBirdRuntimeState {
  readonly birdId: CoopBirdId;
  readonly downedScale: number;
  readonly glideScale: number;
  readonly homeVelocityX: number;
  readonly homeVelocityY: number;
  readonly label: string;
  readonly radius: number;
  readonly scatterScale: number;
  readonly wingSpeed: number;
  behavior: CoopBirdBehaviorState;
  behaviorRemainingMs: number;
  headingRadians: number;
  lastInteractionByPlayerId: CoopPlayerId | null;
  lastInteractionTick: number | null;
  positionX: number;
  positionY: number;
  scale: number;
  velocityX: number;
  velocityY: number;
  visible: boolean;
  wingPhase: number;
}

interface CoopPlayerRuntimeState {
  readonly playerId: CoopPlayerId;
  connected: boolean;
  hitsLanded: number;
  lastAcknowledgedShotSequence: number;
  lastHitBirdId: CoopBirdId | null;
  lastOutcome: CoopPlayerShotOutcomeState | null;
  lastQueuedShotSequence: number;
  lastShotTick: number | null;
  ready: boolean;
  scatterEventsCaused: number;
  shotsFired: number;
  username: Username;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function normalizeNowMs(rawValue: number): number {
  if (!Number.isFinite(rawValue)) {
    return 0;
  }

  return Math.max(0, rawValue);
}

function createBirdRuntimeState(seed: CoopRoomBirdSeed): CoopBirdRuntimeState {
  const headingRadians = Math.atan2(seed.glideVelocity.y, seed.glideVelocity.x);

  return {
    behavior: "glide",
    behaviorRemainingMs: 0,
    birdId: seed.birdId,
    downedScale: seed.scale * 0.8,
    glideScale: seed.scale,
    headingRadians,
    homeVelocityX: seed.glideVelocity.x,
    homeVelocityY: seed.glideVelocity.y,
    label: seed.label,
    lastInteractionByPlayerId: null,
    lastInteractionTick: null,
    positionX: seed.spawn.x,
    positionY: seed.spawn.y,
    radius: seed.radius,
    scale: seed.scale,
    scatterScale: seed.scale * 1.08,
    velocityX: seed.glideVelocity.x,
    velocityY: seed.glideVelocity.y,
    visible: true,
    wingPhase: 0,
    wingSpeed: seed.wingSpeed
  };
}

function restoreBirdGlideState(birdState: CoopBirdRuntimeState): void {
  birdState.behavior = "glide";
  birdState.behaviorRemainingMs = 0;
  birdState.velocityX = birdState.homeVelocityX;
  birdState.velocityY = birdState.homeVelocityY;
  birdState.headingRadians = Math.atan2(
    birdState.homeVelocityY,
    birdState.homeVelocityX
  );
  birdState.scale = birdState.glideScale;
}

function settleBirdDownedState(birdState: CoopBirdRuntimeState): void {
  birdState.behaviorRemainingMs = 0;
  birdState.velocityX = 0;
  birdState.velocityY = 0;
}

function setBirdDowned(
  birdState: CoopBirdRuntimeState,
  playerId: CoopPlayerId,
  tick: number,
  config: CoopRoomRuntimeConfig
): void {
  birdState.behavior = "downed";
  birdState.behaviorRemainingMs = config.movement.downedDurationMs;
  birdState.velocityX *= 0.35;
  birdState.velocityY = config.movement.downedDriftVelocityY;
  birdState.scale = birdState.downedScale;
  birdState.lastInteractionByPlayerId = playerId;
  birdState.lastInteractionTick = tick;
}

function setBirdScatter(
  birdState: CoopBirdRuntimeState,
  playerId: CoopPlayerId,
  tick: number,
  aimPointX: number,
  aimPointY: number,
  config: CoopRoomRuntimeConfig
): void {
  const deltaX = birdState.positionX - aimPointX;
  const deltaY = birdState.positionY - aimPointY;
  const magnitude = Math.hypot(deltaX, deltaY) || 1;

  birdState.behavior = "scatter";
  birdState.behaviorRemainingMs = config.movement.scatterDurationMs;
  birdState.velocityX = (deltaX / magnitude) * config.movement.scatterSpeed;
  birdState.velocityY = (deltaY / magnitude) * config.movement.scatterSpeed;
  birdState.headingRadians = Math.atan2(birdState.velocityY, birdState.velocityX);
  birdState.scale = birdState.scatterScale;
  birdState.lastInteractionByPlayerId = playerId;
  birdState.lastInteractionTick = tick;
}

function findNearestLiveBird(
  birdStates: readonly CoopBirdRuntimeState[],
  aimPointX: number,
  aimPointY: number,
  radius: number
): CoopBirdRuntimeState | null {
  let nearestBird: CoopBirdRuntimeState | null = null;
  let nearestDistanceSquared = Number.POSITIVE_INFINITY;
  const radiusSquared = radius * radius;

  for (const birdState of birdStates) {
    if (birdState.behavior === "downed") {
      continue;
    }

    const deltaX = birdState.positionX - aimPointX;
    const deltaY = birdState.positionY - aimPointY;
    const distanceSquared = deltaX * deltaX + deltaY * deltaY;

    if (distanceSquared > radiusSquared || distanceSquared >= nearestDistanceSquared) {
      continue;
    }

    nearestBird = birdState;
    nearestDistanceSquared = distanceSquared;
  }

  return nearestBird;
}

function scatterBirdsNearAim(
  birdStates: readonly CoopBirdRuntimeState[],
  aimPointX: number,
  aimPointY: number,
  playerId: CoopPlayerId,
  tick: number,
  config: CoopRoomRuntimeConfig
): number {
  let scatteredBirdCount = 0;
  const scatterRadiusSquared = config.scatterRadius * config.scatterRadius;

  for (const birdState of birdStates) {
    if (birdState.behavior === "downed") {
      continue;
    }

    const deltaX = birdState.positionX - aimPointX;
    const deltaY = birdState.positionY - aimPointY;
    const distanceSquared = deltaX * deltaX + deltaY * deltaY;

    if (distanceSquared > scatterRadiusSquared) {
      continue;
    }

    setBirdScatter(birdState, playerId, tick, aimPointX, aimPointY, config);
    scatteredBirdCount += 1;
  }

  return scatteredBirdCount;
}

export class CoopRoomRuntime {
  readonly #birdStates: CoopBirdRuntimeState[];
  readonly #config: CoopRoomRuntimeConfig;
  readonly #pendingShots: PendingShotCommand[] = [];
  readonly #playerStates = new Map<CoopPlayerId, CoopPlayerRuntimeState>();

  #lastAdvancedAtMs: number | null = null;
  #phase: CoopRoomSnapshot["session"]["phase"] = "waiting-for-players";
  #snapshot: CoopRoomSnapshot;
  #teamHitsLanded = 0;
  #teamShotsFired = 0;
  #tick = 0;

  constructor(config: CoopRoomRuntimeConfig = coopRoomRuntimeConfig) {
    this.#config = config;
    this.#birdStates = config.birds.map((seed) => createBirdRuntimeState(seed));
    this.#snapshot = this.#buildSnapshot();
  }

  get roomId(): CoopRoomRuntimeConfig["roomId"] {
    return this.#config.roomId;
  }

  get snapshot(): CoopRoomSnapshot {
    return this.#snapshot;
  }

  advanceTo(nowMs: number): CoopRoomSnapshot {
    const safeNowMs = normalizeNowMs(nowMs);

    if (this.#lastAdvancedAtMs === null) {
      this.#lastAdvancedAtMs = safeNowMs;
      this.#snapshot = this.#buildSnapshot();
      return this.#snapshot;
    }

    while (this.#lastAdvancedAtMs + this.#config.tickIntervalMs <= safeNowMs) {
      this.#lastAdvancedAtMs += this.#config.tickIntervalMs;
      this.#advanceOneTick();
    }

    this.#snapshot = this.#buildSnapshot();

    return this.#snapshot;
  }

  acceptCommand(
    command: CoopRoomClientCommand,
    nowMs: number = Date.now()
  ): CoopRoomServerEvent {
    this.#assertRoom(command.roomId);
    this.advanceTo(nowMs);

    switch (command.type) {
      case "join-room":
        this.#upsertPlayer(command);
        break;
      case "set-player-ready":
        this.#setPlayerReady(command);
        break;
      case "leave-room":
        this.#leavePlayer(command);
        break;
      case "fire-shot":
        this.#queueShot(command);
        break;
    }

    this.#snapshot = this.#buildSnapshot();

    return createCoopRoomSnapshotEvent(this.#snapshot);
  }

  #assertRoom(roomId: CoopRoomRuntimeConfig["roomId"]): void {
    if (roomId !== this.#config.roomId) {
      throw new Error(`Unknown co-op room: ${roomId}`);
    }
  }

  #upsertPlayer(command: CoopJoinRoomCommand): void {
    const existingPlayer = this.#playerStates.get(command.playerId);

    if (existingPlayer !== undefined) {
      existingPlayer.connected = true;
      existingPlayer.ready = command.ready;
      existingPlayer.username = command.username;
      return;
    }

    if (this.#playerStates.size >= this.#config.capacity) {
      throw new Error(`Co-op room ${this.#config.roomId} is full.`);
    }

    this.#playerStates.set(command.playerId, {
      connected: true,
      hitsLanded: 0,
      lastAcknowledgedShotSequence: 0,
      lastHitBirdId: null,
      lastOutcome: null,
      lastQueuedShotSequence: 0,
      lastShotTick: null,
      playerId: command.playerId,
      ready: command.ready,
      scatterEventsCaused: 0,
      shotsFired: 0,
      username: command.username
    });
  }

  #setPlayerReady(command: Extract<CoopRoomClientCommand, { type: "set-player-ready" }>): void {
    const playerState = this.#playerStates.get(command.playerId);

    if (playerState === undefined) {
      throw new Error(`Unknown co-op player: ${command.playerId}`);
    }

    playerState.ready = command.ready;
  }

  #leavePlayer(command: CoopLeaveRoomCommand): void {
    const playerState = this.#playerStates.get(command.playerId);

    if (playerState === undefined) {
      return;
    }

    this.#dropPendingShotsForPlayer(command.playerId);

    if (this.#phase === "waiting-for-players") {
      this.#playerStates.delete(command.playerId);
      return;
    }

    playerState.connected = false;
    playerState.ready = false;
  }

  #queueShot(command: CoopFireShotCommand): void {
    const playerState = this.#playerStates.get(command.playerId);

    if (playerState === undefined) {
      throw new Error(`Unknown co-op player: ${command.playerId}`);
    }

    if (
      command.clientShotSequence <= playerState.lastAcknowledgedShotSequence ||
      command.clientShotSequence <= playerState.lastQueuedShotSequence
    ) {
      return;
    }

    playerState.lastQueuedShotSequence = command.clientShotSequence;
    this.#pendingShots.push({
      aimPoint: command.aimPoint,
      clientShotSequence: command.clientShotSequence,
      playerId: command.playerId
    });
  }

  #dropPendingShotsForPlayer(playerId: CoopPlayerId): void {
    for (let index = this.#pendingShots.length - 1; index >= 0; index -= 1) {
      if (this.#pendingShots[index]?.playerId === playerId) {
        this.#pendingShots.splice(index, 1);
      }
    }
  }

  #advanceOneTick(): void {
    this.#tick += 1;

    if (
      this.#phase === "waiting-for-players" &&
      this.#countReadyPlayers() >= this.#config.requiredReadyPlayerCount
    ) {
      this.#phase = "active";
    }

    if (this.#phase === "active") {
      this.#processPendingShots();
      this.#stepBirds(this.#config.tickIntervalMs);

      if (this.#countRemainingBirds() === 0) {
        this.#phase = "completed";
      }
    }
  }

  #processPendingShots(): void {
    for (const pendingShot of this.#pendingShots.splice(0)) {
      const playerState = this.#playerStates.get(pendingShot.playerId);

      if (playerState === undefined || !playerState.connected) {
        continue;
      }

      if (pendingShot.clientShotSequence <= playerState.lastAcknowledgedShotSequence) {
        continue;
      }

      playerState.shotsFired += 1;
      playerState.lastAcknowledgedShotSequence = pendingShot.clientShotSequence;
      playerState.lastShotTick = this.#tick;
      playerState.lastOutcome = "miss";
      playerState.lastHitBirdId = null;
      this.#teamShotsFired += 1;

      const targetedBird = findNearestLiveBird(
        this.#birdStates,
        pendingShot.aimPoint.x,
        pendingShot.aimPoint.y,
        this.#config.hitRadius
      );

      if (targetedBird !== null) {
        setBirdDowned(targetedBird, pendingShot.playerId, this.#tick, this.#config);
        playerState.hitsLanded += 1;
        playerState.lastOutcome = "hit";
        playerState.lastHitBirdId = targetedBird.birdId;
        this.#teamHitsLanded += 1;
        continue;
      }

      const scatteredBirdCount = scatterBirdsNearAim(
        this.#birdStates,
        pendingShot.aimPoint.x,
        pendingShot.aimPoint.y,
        pendingShot.playerId,
        this.#tick,
        this.#config
      );

      if (scatteredBirdCount > 0) {
        playerState.lastOutcome = "scatter";
        playerState.scatterEventsCaused += 1;
      }
    }
  }

  #stepBirds(deltaMs: number): void {
    const deltaSeconds = deltaMs / 1000;

    if (deltaSeconds <= 0) {
      return;
    }

    for (const birdState of this.#birdStates) {
      birdState.wingPhase += birdState.wingSpeed * deltaSeconds;

      if (birdState.behavior === "downed") {
        if (birdState.behaviorRemainingMs > 0) {
          birdState.behaviorRemainingMs = Math.max(
            0,
            birdState.behaviorRemainingMs - deltaMs
          );
          birdState.positionX = clamp(
            birdState.positionX + birdState.velocityX * deltaSeconds,
            this.#config.arenaBounds.minX,
            this.#config.arenaBounds.maxX
          );
          birdState.positionY = clamp(
            birdState.positionY + birdState.velocityY * deltaSeconds,
            this.#config.arenaBounds.minY,
            this.#config.arenaBounds.maxY + 0.14
          );
          birdState.headingRadians += deltaSeconds * 2.8;

          if (birdState.behaviorRemainingMs === 0) {
            settleBirdDownedState(birdState);
          }
        }

        continue;
      }

      birdState.positionX += birdState.velocityX * deltaSeconds;
      birdState.positionY += birdState.velocityY * deltaSeconds;

      if (
        birdState.positionX < this.#config.arenaBounds.minX ||
        birdState.positionX > this.#config.arenaBounds.maxX
      ) {
        birdState.velocityX *= -1;
        birdState.positionX = clamp(
          birdState.positionX,
          this.#config.arenaBounds.minX,
          this.#config.arenaBounds.maxX
        );
      }

      if (
        birdState.positionY < this.#config.arenaBounds.minY ||
        birdState.positionY > this.#config.arenaBounds.maxY
      ) {
        birdState.velocityY *= -1;
        birdState.positionY = clamp(
          birdState.positionY,
          this.#config.arenaBounds.minY,
          this.#config.arenaBounds.maxY
        );
      }

      birdState.headingRadians = Math.atan2(birdState.velocityY, birdState.velocityX);

      if (birdState.behavior === "scatter") {
        birdState.behaviorRemainingMs = Math.max(
          0,
          birdState.behaviorRemainingMs - deltaMs
        );

        if (birdState.behaviorRemainingMs === 0) {
          restoreBirdGlideState(birdState);
        }
      }
    }
  }

  #countReadyPlayers(): number {
    let readyPlayerCount = 0;

    for (const playerState of this.#playerStates.values()) {
      if (playerState.connected && playerState.ready) {
        readyPlayerCount += 1;
      }
    }

    return readyPlayerCount;
  }

  #countRemainingBirds(): number {
    let remainingBirdCount = 0;

    for (const birdState of this.#birdStates) {
      if (birdState.behavior !== "downed") {
        remainingBirdCount += 1;
      }
    }

    return remainingBirdCount;
  }

  #buildSnapshot(): CoopRoomSnapshot {
    const birdsCleared = this.#birdStates.length - this.#countRemainingBirds();

    return createCoopRoomSnapshot({
      birds: this.#birdStates.map((birdState) => ({
        behavior: birdState.behavior,
        birdId: birdState.birdId,
        headingRadians: birdState.headingRadians,
        label: birdState.label,
        lastInteractionByPlayerId: birdState.lastInteractionByPlayerId,
        lastInteractionTick: birdState.lastInteractionTick,
        position: {
          x: birdState.positionX,
          y: birdState.positionY
        },
        radius: birdState.radius,
        scale: birdState.scale,
        visible: birdState.visible,
        wingPhase: birdState.wingPhase
      })),
      capacity: this.#config.capacity,
      players: [...this.#playerStates.values()]
        .sort((leftPlayer, rightPlayer) =>
          leftPlayer.playerId.localeCompare(rightPlayer.playerId)
        )
        .map((playerState) => ({
          activity: {
            hitsLanded: playerState.hitsLanded,
            lastAcknowledgedShotSequence: playerState.lastAcknowledgedShotSequence,
            lastHitBirdId: playerState.lastHitBirdId,
            lastOutcome: playerState.lastOutcome,
            lastShotTick: playerState.lastShotTick,
            scatterEventsCaused: playerState.scatterEventsCaused,
            shotsFired: playerState.shotsFired
          },
          connected: playerState.connected,
          playerId: playerState.playerId,
          ready: playerState.ready,
          username: playerState.username
        })),
      roomId: this.#config.roomId,
      session: {
        birdsCleared,
        birdsRemaining: this.#countRemainingBirds(),
        phase: this.#phase,
        requiredReadyPlayerCount: this.#config.requiredReadyPlayerCount,
        sessionId: this.#config.sessionId,
        teamHitsLanded: this.#teamHitsLanded,
        teamShotsFired: this.#teamShotsFired
      },
      tick: {
        currentTick: this.#tick,
        tickIntervalMs: this.#config.tickIntervalMs
      }
    });
  }
}
