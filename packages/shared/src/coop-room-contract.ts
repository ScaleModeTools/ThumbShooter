import type { Username } from "./player-profile.js";
import type { TypeBrand } from "./type-branding.js";
import type { Milliseconds, Radians } from "./unit-measurements.js";
import {
  createMilliseconds,
  createRadians
} from "./unit-measurements.js";
import type {
  NormalizedViewportPoint,
  NormalizedViewportPointInput
} from "./calibration-types.js";
import { createNormalizedViewportPoint } from "./calibration-types.js";

export const gameplaySessionModes = [
  "single-player",
  "co-op"
] as const;
export const gameplayTickOwners = [
  "client",
  "server"
] as const;
export const coopRoomPhases = [
  "waiting-for-players",
  "active",
  "completed"
] as const;
export const coopBirdBehaviorStates = [
  "glide",
  "scatter",
  "downed"
] as const;
export const coopPlayerShotOutcomeStates = [
  "miss",
  "scatter",
  "hit"
] as const;
export const coopRoomClientCommandTypes = [
  "join-room",
  "set-player-ready",
  "leave-room",
  "fire-shot"
] as const;
export const coopRoomServerEventTypes = [
  "room-snapshot"
] as const;

export type GameplaySessionMode = (typeof gameplaySessionModes)[number];
export type GameplayTickOwner = (typeof gameplayTickOwners)[number];
export type CoopRoomPhase = (typeof coopRoomPhases)[number];
export type CoopBirdBehaviorState = (typeof coopBirdBehaviorStates)[number];
export type CoopPlayerShotOutcomeState =
  (typeof coopPlayerShotOutcomeStates)[number];
export type CoopRoomClientCommandType =
  (typeof coopRoomClientCommandTypes)[number];
export type CoopRoomServerEventType =
  (typeof coopRoomServerEventTypes)[number];

export type CoopRoomId = TypeBrand<string, "CoopRoomId">;
export type CoopSessionId = TypeBrand<string, "CoopSessionId">;
export type CoopPlayerId = TypeBrand<string, "CoopPlayerId">;
export type CoopBirdId = TypeBrand<string, "CoopBirdId">;

export interface CoopRoomTickSnapshot {
  readonly currentTick: number;
  readonly owner: "server";
  readonly tickIntervalMs: Milliseconds;
}

export interface CoopRoomTickSnapshotInput {
  readonly currentTick: number;
  readonly tickIntervalMs: number;
}

export interface CoopBirdSnapshot {
  readonly behavior: CoopBirdBehaviorState;
  readonly birdId: CoopBirdId;
  readonly headingRadians: Radians;
  readonly label: string;
  readonly lastInteractionByPlayerId: CoopPlayerId | null;
  readonly lastInteractionTick: number | null;
  readonly position: NormalizedViewportPoint;
  readonly radius: number;
  readonly scale: number;
  readonly visible: boolean;
  readonly wingPhase: number;
}

export interface CoopBirdSnapshotInput {
  readonly behavior: CoopBirdBehaviorState;
  readonly birdId: CoopBirdId;
  readonly headingRadians: number;
  readonly label: string;
  readonly lastInteractionByPlayerId?: CoopPlayerId | null;
  readonly lastInteractionTick?: number | null;
  readonly position: NormalizedViewportPointInput;
  readonly radius: number;
  readonly scale: number;
  readonly visible: boolean;
  readonly wingPhase: number;
}

export interface CoopPlayerActivitySnapshot {
  readonly hitsLanded: number;
  readonly lastAcknowledgedShotSequence: number;
  readonly lastHitBirdId: CoopBirdId | null;
  readonly lastOutcome: CoopPlayerShotOutcomeState | null;
  readonly lastShotTick: number | null;
  readonly scatterEventsCaused: number;
  readonly shotsFired: number;
}

export interface CoopPlayerActivitySnapshotInput {
  readonly hitsLanded: number;
  readonly lastAcknowledgedShotSequence: number;
  readonly lastHitBirdId?: CoopBirdId | null;
  readonly lastOutcome?: CoopPlayerShotOutcomeState | null;
  readonly lastShotTick?: number | null;
  readonly scatterEventsCaused: number;
  readonly shotsFired: number;
}

export interface CoopPlayerSnapshot {
  readonly activity: CoopPlayerActivitySnapshot;
  readonly connected: boolean;
  readonly playerId: CoopPlayerId;
  readonly ready: boolean;
  readonly username: Username;
}

export interface CoopPlayerSnapshotInput {
  readonly activity?: CoopPlayerActivitySnapshotInput;
  readonly connected?: boolean;
  readonly playerId: CoopPlayerId;
  readonly ready?: boolean;
  readonly username: Username;
}

export interface CoopSessionSnapshot {
  readonly birdsCleared: number;
  readonly birdsRemaining: number;
  readonly mode: "co-op";
  readonly phase: CoopRoomPhase;
  readonly requiredReadyPlayerCount: number;
  readonly sessionId: CoopSessionId;
  readonly teamHitsLanded: number;
  readonly teamShotsFired: number;
}

export interface CoopSessionSnapshotInput {
  readonly birdsCleared: number;
  readonly birdsRemaining: number;
  readonly phase: CoopRoomPhase;
  readonly requiredReadyPlayerCount: number;
  readonly sessionId: CoopSessionId;
  readonly teamHitsLanded: number;
  readonly teamShotsFired: number;
}

export interface CoopRoomSnapshot {
  readonly birds: readonly CoopBirdSnapshot[];
  readonly capacity: number;
  readonly players: readonly CoopPlayerSnapshot[];
  readonly roomId: CoopRoomId;
  readonly session: CoopSessionSnapshot;
  readonly tick: CoopRoomTickSnapshot;
}

export interface CoopRoomSnapshotInput {
  readonly birds: readonly CoopBirdSnapshotInput[];
  readonly capacity: number;
  readonly players: readonly CoopPlayerSnapshotInput[];
  readonly roomId: CoopRoomId;
  readonly session: CoopSessionSnapshotInput;
  readonly tick: CoopRoomTickSnapshotInput;
}

export interface CoopJoinRoomCommand {
  readonly playerId: CoopPlayerId;
  readonly ready: boolean;
  readonly roomId: CoopRoomId;
  readonly type: "join-room";
  readonly username: Username;
}

export interface CoopJoinRoomCommandInput {
  readonly playerId: CoopPlayerId;
  readonly ready?: boolean;
  readonly roomId: CoopRoomId;
  readonly username: Username;
}

export interface CoopSetPlayerReadyCommand {
  readonly playerId: CoopPlayerId;
  readonly ready: boolean;
  readonly roomId: CoopRoomId;
  readonly type: "set-player-ready";
}

export interface CoopSetPlayerReadyCommandInput {
  readonly playerId: CoopPlayerId;
  readonly ready: boolean;
  readonly roomId: CoopRoomId;
}

export interface CoopLeaveRoomCommand {
  readonly playerId: CoopPlayerId;
  readonly roomId: CoopRoomId;
  readonly type: "leave-room";
}

export interface CoopLeaveRoomCommandInput {
  readonly playerId: CoopPlayerId;
  readonly roomId: CoopRoomId;
}

export interface CoopFireShotCommand {
  readonly aimPoint: NormalizedViewportPoint;
  readonly clientShotSequence: number;
  readonly playerId: CoopPlayerId;
  readonly roomId: CoopRoomId;
  readonly type: "fire-shot";
}

export interface CoopFireShotCommandInput {
  readonly aimPoint: NormalizedViewportPointInput;
  readonly clientShotSequence: number;
  readonly playerId: CoopPlayerId;
  readonly roomId: CoopRoomId;
}

export type CoopRoomClientCommand =
  | CoopJoinRoomCommand
  | CoopSetPlayerReadyCommand
  | CoopLeaveRoomCommand
  | CoopFireShotCommand;

export interface CoopRoomSnapshotEvent {
  readonly room: CoopRoomSnapshot;
  readonly type: "room-snapshot";
}

export type CoopRoomServerEvent = CoopRoomSnapshotEvent;

function normalizeTrimmedString(rawValue: string): string {
  return rawValue.trim();
}

function normalizeFiniteNonNegativeInteger(rawValue: number): number {
  if (!Number.isFinite(rawValue)) {
    return 0;
  }

  return Math.max(0, Math.floor(rawValue));
}

function normalizeFiniteNonNegativeNumber(rawValue: number): number {
  if (!Number.isFinite(rawValue)) {
    return 0;
  }

  return Math.max(0, rawValue);
}

function normalizeLastTick(rawValue: number | null | undefined): number | null {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  return normalizeFiniteNonNegativeInteger(rawValue);
}

function freezePlayerActivitySnapshot(
  input: CoopPlayerActivitySnapshotInput
): CoopPlayerActivitySnapshot {
  return Object.freeze({
    hitsLanded: normalizeFiniteNonNegativeInteger(input.hitsLanded),
    lastAcknowledgedShotSequence: normalizeFiniteNonNegativeInteger(
      input.lastAcknowledgedShotSequence
    ),
    lastHitBirdId: input.lastHitBirdId ?? null,
    lastOutcome: input.lastOutcome ?? null,
    lastShotTick: normalizeLastTick(input.lastShotTick),
    scatterEventsCaused: normalizeFiniteNonNegativeInteger(
      input.scatterEventsCaused
    ),
    shotsFired: normalizeFiniteNonNegativeInteger(input.shotsFired)
  });
}

function createDefaultPlayerActivitySnapshot(): CoopPlayerActivitySnapshot {
  return freezePlayerActivitySnapshot({
    hitsLanded: 0,
    lastAcknowledgedShotSequence: 0,
    scatterEventsCaused: 0,
    shotsFired: 0
  });
}

export function createCoopRoomId(rawValue: string): CoopRoomId | null {
  const normalizedValue = normalizeTrimmedString(rawValue);

  if (normalizedValue.length === 0) {
    return null;
  }

  return normalizedValue as CoopRoomId;
}

export function createCoopSessionId(rawValue: string): CoopSessionId | null {
  const normalizedValue = normalizeTrimmedString(rawValue);

  if (normalizedValue.length === 0) {
    return null;
  }

  return normalizedValue as CoopSessionId;
}

export function createCoopPlayerId(rawValue: string): CoopPlayerId | null {
  const normalizedValue = normalizeTrimmedString(rawValue);

  if (normalizedValue.length === 0) {
    return null;
  }

  return normalizedValue as CoopPlayerId;
}

export function createCoopBirdId(rawValue: string): CoopBirdId | null {
  const normalizedValue = normalizeTrimmedString(rawValue);

  if (normalizedValue.length === 0) {
    return null;
  }

  return normalizedValue as CoopBirdId;
}

export function createCoopRoomTickSnapshot(
  input: CoopRoomTickSnapshotInput
): CoopRoomTickSnapshot {
  return Object.freeze({
    currentTick: normalizeFiniteNonNegativeInteger(input.currentTick),
    owner: "server",
    tickIntervalMs: createMilliseconds(input.tickIntervalMs)
  });
}

export function createCoopBirdSnapshot(
  input: CoopBirdSnapshotInput
): CoopBirdSnapshot {
  return Object.freeze({
    behavior: input.behavior,
    birdId: input.birdId,
    headingRadians: createRadians(input.headingRadians),
    label: input.label,
    lastInteractionByPlayerId: input.lastInteractionByPlayerId ?? null,
    lastInteractionTick: normalizeLastTick(input.lastInteractionTick),
    position: createNormalizedViewportPoint(input.position),
    radius: normalizeFiniteNonNegativeNumber(input.radius),
    scale: normalizeFiniteNonNegativeNumber(input.scale),
    visible: input.visible,
    wingPhase: Number.isFinite(input.wingPhase) ? input.wingPhase : 0
  });
}

export function createCoopPlayerActivitySnapshot(
  input: CoopPlayerActivitySnapshotInput
): CoopPlayerActivitySnapshot {
  return freezePlayerActivitySnapshot(input);
}

export function createCoopPlayerSnapshot(
  input: CoopPlayerSnapshotInput
): CoopPlayerSnapshot {
  return Object.freeze({
    activity:
      input.activity === undefined
        ? createDefaultPlayerActivitySnapshot()
        : createCoopPlayerActivitySnapshot(input.activity),
    connected: input.connected ?? true,
    playerId: input.playerId,
    ready: input.ready ?? false,
    username: input.username
  });
}

export function createCoopSessionSnapshot(
  input: CoopSessionSnapshotInput
): CoopSessionSnapshot {
  return Object.freeze({
    birdsCleared: normalizeFiniteNonNegativeInteger(input.birdsCleared),
    birdsRemaining: normalizeFiniteNonNegativeInteger(input.birdsRemaining),
    mode: "co-op",
    phase: input.phase,
    requiredReadyPlayerCount: Math.max(
      1,
      normalizeFiniteNonNegativeInteger(input.requiredReadyPlayerCount)
    ),
    sessionId: input.sessionId,
    teamHitsLanded: normalizeFiniteNonNegativeInteger(input.teamHitsLanded),
    teamShotsFired: normalizeFiniteNonNegativeInteger(input.teamShotsFired)
  });
}

export function createCoopRoomSnapshot(
  input: CoopRoomSnapshotInput
): CoopRoomSnapshot {
  return Object.freeze({
    birds: Object.freeze(input.birds.map((bird) => createCoopBirdSnapshot(bird))),
    capacity: Math.max(1, normalizeFiniteNonNegativeInteger(input.capacity)),
    players: Object.freeze(
      input.players.map((player) => createCoopPlayerSnapshot(player))
    ),
    roomId: input.roomId,
    session: createCoopSessionSnapshot(input.session),
    tick: createCoopRoomTickSnapshot(input.tick)
  });
}

export function createCoopJoinRoomCommand(
  input: CoopJoinRoomCommandInput
): CoopJoinRoomCommand {
  return Object.freeze({
    playerId: input.playerId,
    ready: input.ready ?? false,
    roomId: input.roomId,
    type: "join-room",
    username: input.username
  });
}

export function createCoopSetPlayerReadyCommand(
  input: CoopSetPlayerReadyCommandInput
): CoopSetPlayerReadyCommand {
  return Object.freeze({
    playerId: input.playerId,
    ready: input.ready,
    roomId: input.roomId,
    type: "set-player-ready"
  });
}

export function createCoopLeaveRoomCommand(
  input: CoopLeaveRoomCommandInput
): CoopLeaveRoomCommand {
  return Object.freeze({
    playerId: input.playerId,
    roomId: input.roomId,
    type: "leave-room"
  });
}

export function createCoopFireShotCommand(
  input: CoopFireShotCommandInput
): CoopFireShotCommand {
  return Object.freeze({
    aimPoint: createNormalizedViewportPoint(input.aimPoint),
    clientShotSequence: normalizeFiniteNonNegativeInteger(
      input.clientShotSequence
    ),
    playerId: input.playerId,
    roomId: input.roomId,
    type: "fire-shot"
  });
}

export function createCoopRoomSnapshotEvent(
  room: CoopRoomSnapshotInput | CoopRoomSnapshot
): CoopRoomSnapshotEvent {
  return Object.freeze({
    room: createCoopRoomSnapshot(room),
    type: "room-snapshot"
  });
}
