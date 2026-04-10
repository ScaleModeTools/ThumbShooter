import type { Username } from "../player-profile.js";
import type { TypeBrand } from "../type-branding.js";
import type { Milliseconds, Radians } from "../unit-measurements.js";
import {
  createMilliseconds,
  createRadians
} from "../unit-measurements.js";

export const metaversePresenceAnimationVocabularyIds = [
  "idle",
  "walk",
  "aim",
  "interact",
  "seated"
] as const;

export const metaversePresenceLocomotionModeIds = [
  "grounded",
  "swim",
  "fly",
  "mounted"
] as const;

export const metaversePresenceCommandTypes = [
  "join-presence",
  "leave-presence",
  "sync-presence"
] as const;

export const metaversePresenceServerEventTypes = [
  "presence-roster"
] as const;

export type MetaversePresenceAnimationVocabularyId =
  (typeof metaversePresenceAnimationVocabularyIds)[number];
export type MetaversePresenceLocomotionModeId =
  (typeof metaversePresenceLocomotionModeIds)[number];
export type MetaversePresenceCommandType =
  (typeof metaversePresenceCommandTypes)[number];
export type MetaversePresenceServerEventType =
  (typeof metaversePresenceServerEventTypes)[number];

export type MetaversePlayerId = TypeBrand<string, "MetaversePlayerId">;

export interface MetaversePresenceVector3Snapshot {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface MetaversePresenceVector3SnapshotInput {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface MetaversePresencePoseSnapshot {
  readonly animationVocabulary: MetaversePresenceAnimationVocabularyId;
  readonly locomotionMode: MetaversePresenceLocomotionModeId;
  readonly position: MetaversePresenceVector3Snapshot;
  readonly stateSequence: number;
  readonly yawRadians: Radians;
}

export interface MetaversePresencePoseSnapshotInput {
  readonly animationVocabulary?: MetaversePresenceAnimationVocabularyId;
  readonly locomotionMode?: MetaversePresenceLocomotionModeId;
  readonly position: MetaversePresenceVector3SnapshotInput;
  readonly stateSequence?: number;
  readonly yawRadians: number;
}

export interface MetaversePresencePlayerSnapshot {
  readonly characterId: string;
  readonly playerId: MetaversePlayerId;
  readonly pose: MetaversePresencePoseSnapshot;
  readonly username: Username;
}

export interface MetaversePresencePlayerSnapshotInput {
  readonly characterId: string;
  readonly playerId: MetaversePlayerId;
  readonly pose: MetaversePresencePoseSnapshotInput;
  readonly username: Username;
}

export interface MetaversePresenceRosterSnapshot {
  readonly players: readonly MetaversePresencePlayerSnapshot[];
  readonly snapshotSequence: number;
  readonly tickIntervalMs: Milliseconds;
}

export interface MetaversePresenceRosterSnapshotInput {
  readonly players: readonly MetaversePresencePlayerSnapshotInput[];
  readonly snapshotSequence?: number;
  readonly tickIntervalMs?: number;
}

export interface MetaversePresenceRosterEvent {
  readonly roster: MetaversePresenceRosterSnapshot;
  readonly type: "presence-roster";
}

export interface MetaverseJoinPresenceCommand {
  readonly characterId: string;
  readonly playerId: MetaversePlayerId;
  readonly pose: MetaversePresencePoseSnapshot;
  readonly type: "join-presence";
  readonly username: Username;
}

export interface MetaverseJoinPresenceCommandInput {
  readonly characterId: string;
  readonly playerId: MetaversePlayerId;
  readonly pose: MetaversePresencePoseSnapshotInput;
  readonly username: Username;
}

export interface MetaverseLeavePresenceCommand {
  readonly playerId: MetaversePlayerId;
  readonly type: "leave-presence";
}

export interface MetaverseLeavePresenceCommandInput {
  readonly playerId: MetaversePlayerId;
}

export interface MetaverseSyncPresenceCommand {
  readonly playerId: MetaversePlayerId;
  readonly pose: MetaversePresencePoseSnapshot;
  readonly type: "sync-presence";
}

export interface MetaverseSyncPresenceCommandInput {
  readonly playerId: MetaversePlayerId;
  readonly pose: MetaversePresencePoseSnapshotInput;
}

export type MetaversePresenceCommand =
  | MetaverseJoinPresenceCommand
  | MetaverseLeavePresenceCommand
  | MetaverseSyncPresenceCommand;

export type MetaversePresenceServerEvent = MetaversePresenceRosterEvent;

const metaversePlayerIdPattern = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

function normalizeFiniteNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function normalizeSequence(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.floor(value);
}

function normalizeCharacterId(characterId: string): string {
  const normalizedCharacterId = characterId.trim();

  if (normalizedCharacterId.length === 0) {
    throw new Error("Metaverse presence characterId must not be empty.");
  }

  return normalizedCharacterId;
}

function resolveAnimationVocabulary(
  rawValue: MetaversePresencePoseSnapshotInput["animationVocabulary"]
): MetaversePresenceAnimationVocabularyId {
  if (
    rawValue !== undefined &&
    metaversePresenceAnimationVocabularyIds.includes(rawValue)
  ) {
    return rawValue;
  }

  return "idle";
}

function resolveLocomotionMode(
  rawValue: MetaversePresencePoseSnapshotInput["locomotionMode"]
): MetaversePresenceLocomotionModeId {
  if (
    rawValue !== undefined &&
    metaversePresenceLocomotionModeIds.includes(rawValue)
  ) {
    return rawValue;
  }

  return "grounded";
}

export function createMetaversePlayerId(rawValue: string): MetaversePlayerId | null {
  const normalizedValue = rawValue.trim().toLowerCase();

  if (!metaversePlayerIdPattern.test(normalizedValue)) {
    return null;
  }

  return normalizedValue as MetaversePlayerId;
}

export function createMetaversePresenceVector3Snapshot({
  x,
  y,
  z
}: MetaversePresenceVector3SnapshotInput): MetaversePresenceVector3Snapshot {
  return Object.freeze({
    x: normalizeFiniteNumber(x),
    y: normalizeFiniteNumber(y),
    z: normalizeFiniteNumber(z)
  });
}

export function createMetaversePresencePoseSnapshot({
  animationVocabulary,
  locomotionMode,
  position,
  stateSequence = 0,
  yawRadians
}: MetaversePresencePoseSnapshotInput): MetaversePresencePoseSnapshot {
  return Object.freeze({
    animationVocabulary: resolveAnimationVocabulary(animationVocabulary),
    locomotionMode: resolveLocomotionMode(locomotionMode),
    position: createMetaversePresenceVector3Snapshot(position),
    stateSequence: normalizeSequence(stateSequence),
    yawRadians: createRadians(yawRadians)
  });
}

export function createMetaversePresencePlayerSnapshot({
  characterId,
  playerId,
  pose,
  username
}: MetaversePresencePlayerSnapshotInput): MetaversePresencePlayerSnapshot {
  return Object.freeze({
    characterId: normalizeCharacterId(characterId),
    playerId,
    pose: createMetaversePresencePoseSnapshot(pose),
    username
  });
}

export function createMetaversePresenceRosterSnapshot({
  players,
  snapshotSequence = 0,
  tickIntervalMs = 150
}: MetaversePresenceRosterSnapshotInput): MetaversePresenceRosterSnapshot {
  return Object.freeze({
    players: Object.freeze(
      players.map((playerSnapshot) =>
        createMetaversePresencePlayerSnapshot(playerSnapshot)
      )
    ),
    snapshotSequence: normalizeSequence(snapshotSequence),
    tickIntervalMs: createMilliseconds(tickIntervalMs)
  });
}

export function createMetaversePresenceRosterEvent(
  roster: MetaversePresenceRosterSnapshotInput
): MetaversePresenceRosterEvent {
  return Object.freeze({
    roster: createMetaversePresenceRosterSnapshot(roster),
    type: "presence-roster"
  });
}

export function createMetaverseJoinPresenceCommand({
  characterId,
  playerId,
  pose,
  username
}: MetaverseJoinPresenceCommandInput): MetaverseJoinPresenceCommand {
  return Object.freeze({
    characterId: normalizeCharacterId(characterId),
    playerId,
    pose: createMetaversePresencePoseSnapshot(pose),
    type: "join-presence",
    username
  });
}

export function createMetaverseLeavePresenceCommand({
  playerId
}: MetaverseLeavePresenceCommandInput): MetaverseLeavePresenceCommand {
  return Object.freeze({
    playerId,
    type: "leave-presence"
  });
}

export function createMetaverseSyncPresenceCommand({
  playerId,
  pose
}: MetaverseSyncPresenceCommandInput): MetaverseSyncPresenceCommand {
  return Object.freeze({
    playerId,
    pose: createMetaversePresencePoseSnapshot(pose),
    type: "sync-presence"
  });
}
