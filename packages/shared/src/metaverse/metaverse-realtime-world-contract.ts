import type { Username } from "../player-profile.js";
import type { TypeBrand } from "../type-branding.js";
import type { Milliseconds, Radians } from "../unit-measurements.js";
import {
  createMilliseconds,
  createRadians
} from "../unit-measurements.js";
import type {
  MetaversePlayerId,
  MetaversePresenceAnimationVocabularyId,
  MetaversePresenceLocomotionModeId,
  MetaversePresenceMountedOccupancyKind,
  MetaversePresenceMountedOccupantRoleId,
  MetaversePresenceVector3Snapshot,
  MetaversePresenceVector3SnapshotInput
} from "./metaverse-presence-contract.js";
import {
  createMetaversePresenceVector3Snapshot,
  metaversePresenceAnimationVocabularyIds,
  metaversePresenceLocomotionModeIds,
  metaversePresenceMountedOccupancyKinds,
  metaversePresenceMountedOccupantRoleIds
} from "./metaverse-presence-contract.js";

export const metaverseRealtimeWorldServerEventTypes = [
  "world-snapshot"
] as const;

export const metaverseRealtimeWorldClientCommandTypes = [
  "sync-driver-vehicle-control"
] as const;

export type MetaverseRealtimeWorldServerEventType =
  (typeof metaverseRealtimeWorldServerEventTypes)[number];
export type MetaverseRealtimeWorldClientCommandType =
  (typeof metaverseRealtimeWorldClientCommandTypes)[number];

export type MetaverseVehicleId = TypeBrand<string, "MetaverseVehicleId">;

export type MetaverseRealtimeVector3Snapshot = MetaversePresenceVector3Snapshot;
export type MetaverseRealtimeVector3SnapshotInput =
  MetaversePresenceVector3SnapshotInput;

export interface MetaverseRealtimeTickSnapshot {
  readonly currentTick: number;
  readonly owner: "server";
  readonly serverTimeMs: Milliseconds;
  readonly tickIntervalMs: Milliseconds;
}

export interface MetaverseRealtimeTickSnapshotInput {
  readonly currentTick: number;
  readonly serverTimeMs: number;
  readonly tickIntervalMs: number;
}

export interface MetaverseRealtimeMountedOccupancySnapshot {
  readonly entryId: string | null;
  readonly environmentAssetId: string;
  readonly occupancyKind: MetaversePresenceMountedOccupancyKind;
  readonly occupantRole: MetaversePresenceMountedOccupantRoleId;
  readonly seatId: string | null;
  readonly vehicleId: MetaverseVehicleId;
}

export interface MetaverseRealtimeMountedOccupancySnapshotInput {
  readonly entryId?: string | null;
  readonly environmentAssetId: string;
  readonly occupancyKind: MetaversePresenceMountedOccupancyKind;
  readonly occupantRole: MetaversePresenceMountedOccupantRoleId;
  readonly seatId?: string | null;
  readonly vehicleId: MetaverseVehicleId;
}

export interface MetaverseRealtimeVehicleSeatSnapshot {
  readonly occupantPlayerId: MetaversePlayerId | null;
  readonly occupantRole: MetaversePresenceMountedOccupantRoleId;
  readonly seatId: string;
}

export interface MetaverseRealtimeVehicleSeatSnapshotInput {
  readonly occupantPlayerId?: MetaversePlayerId | null;
  readonly occupantRole: MetaversePresenceMountedOccupantRoleId;
  readonly seatId: string;
}

export interface MetaverseDriverVehicleControlIntentSnapshot {
  readonly boost: boolean;
  readonly environmentAssetId: string;
  readonly moveAxis: number;
  readonly strafeAxis: number;
  readonly yawAxis: number;
}

export interface MetaverseDriverVehicleControlIntentSnapshotInput {
  readonly boost?: boolean;
  readonly environmentAssetId: string;
  readonly moveAxis?: number;
  readonly strafeAxis?: number;
  readonly yawAxis?: number;
}

export interface MetaverseRealtimePlayerSnapshot {
  readonly animationVocabulary: MetaversePresenceAnimationVocabularyId;
  readonly characterId: string;
  readonly linearVelocity: MetaverseRealtimeVector3Snapshot;
  readonly locomotionMode: MetaversePresenceLocomotionModeId;
  readonly mountedOccupancy: MetaverseRealtimeMountedOccupancySnapshot | null;
  readonly playerId: MetaversePlayerId;
  readonly position: MetaverseRealtimeVector3Snapshot;
  readonly stateSequence: number;
  readonly username: Username;
  readonly yawRadians: Radians;
}

export interface MetaverseRealtimePlayerSnapshotInput {
  readonly animationVocabulary?: MetaversePresenceAnimationVocabularyId;
  readonly characterId: string;
  readonly linearVelocity: MetaverseRealtimeVector3SnapshotInput;
  readonly locomotionMode?: MetaversePresenceLocomotionModeId;
  readonly mountedOccupancy?: MetaverseRealtimeMountedOccupancySnapshotInput | null;
  readonly playerId: MetaversePlayerId;
  readonly position: MetaverseRealtimeVector3SnapshotInput;
  readonly stateSequence?: number;
  readonly username: Username;
  readonly yawRadians: number;
}

export interface MetaverseRealtimeVehicleSnapshot {
  readonly angularVelocityRadiansPerSecond: number;
  readonly environmentAssetId: string;
  readonly linearVelocity: MetaverseRealtimeVector3Snapshot;
  readonly position: MetaverseRealtimeVector3Snapshot;
  readonly seats: readonly MetaverseRealtimeVehicleSeatSnapshot[];
  readonly vehicleId: MetaverseVehicleId;
  readonly yawRadians: Radians;
}

export interface MetaverseRealtimeVehicleSnapshotInput {
  readonly angularVelocityRadiansPerSecond: number;
  readonly environmentAssetId: string;
  readonly linearVelocity: MetaverseRealtimeVector3SnapshotInput;
  readonly position: MetaverseRealtimeVector3SnapshotInput;
  readonly seats: readonly MetaverseRealtimeVehicleSeatSnapshotInput[];
  readonly vehicleId: MetaverseVehicleId;
  readonly yawRadians: number;
}

export interface MetaverseRealtimeWorldSnapshot {
  readonly players: readonly MetaverseRealtimePlayerSnapshot[];
  readonly snapshotSequence: number;
  readonly tick: MetaverseRealtimeTickSnapshot;
  readonly vehicles: readonly MetaverseRealtimeVehicleSnapshot[];
}

export interface MetaverseRealtimeWorldSnapshotInput {
  readonly players: readonly MetaverseRealtimePlayerSnapshotInput[];
  readonly snapshotSequence?: number;
  readonly tick: MetaverseRealtimeTickSnapshotInput;
  readonly vehicles: readonly MetaverseRealtimeVehicleSnapshotInput[];
}

export interface MetaverseRealtimeWorldEvent {
  readonly type: "world-snapshot";
  readonly world: MetaverseRealtimeWorldSnapshot;
}

export interface MetaverseRealtimeWorldEventInput {
  readonly world: MetaverseRealtimeWorldSnapshotInput;
}

export interface MetaverseSyncDriverVehicleControlCommand {
  readonly controlIntent: MetaverseDriverVehicleControlIntentSnapshot;
  readonly controlSequence: number;
  readonly playerId: MetaversePlayerId;
  readonly type: "sync-driver-vehicle-control";
}

export interface MetaverseSyncDriverVehicleControlCommandInput {
  readonly controlIntent: MetaverseDriverVehicleControlIntentSnapshotInput;
  readonly controlSequence?: number;
  readonly playerId: MetaversePlayerId;
}

export type MetaverseRealtimeWorldClientCommand =
  MetaverseSyncDriverVehicleControlCommand;

const metaverseVehicleIdPattern = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

function normalizeFiniteNumber(rawValue: number): number {
  if (!Number.isFinite(rawValue)) {
    return 0;
  }

  return rawValue;
}

function normalizeFiniteNonNegativeInteger(rawValue: number): number {
  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return 0;
  }

  return Math.floor(rawValue);
}

function clampNormalizedAxis(rawValue: number | undefined): number {
  const normalizedValue = rawValue ?? 0;

  if (!Number.isFinite(normalizedValue)) {
    return 0;
  }

  return Math.min(1, Math.max(-1, normalizedValue));
}

function normalizeRequiredIdentifier(rawValue: string, label: string): string {
  const normalizedValue = rawValue.trim();

  if (normalizedValue.length === 0) {
    throw new Error(`${label} must not be empty.`);
  }

  return normalizedValue;
}

function normalizeOptionalIdentifier(
  rawValue: string | null | undefined,
  label: string
): string | null {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  return normalizeRequiredIdentifier(rawValue, label);
}

function resolveAnimationVocabulary(
  rawValue: MetaverseRealtimePlayerSnapshotInput["animationVocabulary"]
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
  rawValue: MetaverseRealtimePlayerSnapshotInput["locomotionMode"]
): MetaversePresenceLocomotionModeId {
  if (
    rawValue !== undefined &&
    metaversePresenceLocomotionModeIds.includes(rawValue)
  ) {
    return rawValue;
  }

  return "grounded";
}

function resolveMountedOccupancyKind(
  rawValue: MetaverseRealtimeMountedOccupancySnapshotInput["occupancyKind"]
): MetaversePresenceMountedOccupancyKind {
  if (metaversePresenceMountedOccupancyKinds.includes(rawValue)) {
    return rawValue;
  }

  return "seat";
}

function resolveOccupantRole(
  rawValue:
    | MetaverseRealtimeMountedOccupancySnapshotInput["occupantRole"]
    | MetaverseRealtimeVehicleSeatSnapshotInput["occupantRole"]
): MetaversePresenceMountedOccupantRoleId {
  if (metaversePresenceMountedOccupantRoleIds.includes(rawValue)) {
    return rawValue;
  }

  return "passenger";
}

function normalizeCharacterId(characterId: string): string {
  return normalizeRequiredIdentifier(
    characterId,
    "Metaverse realtime characterId"
  );
}

function normalizeVehicleAssetId(environmentAssetId: string): string {
  return normalizeRequiredIdentifier(
    environmentAssetId,
    "Metaverse realtime environmentAssetId"
  );
}

function freezeDriverVehicleControlIntentSnapshot(
  input: MetaverseDriverVehicleControlIntentSnapshotInput
): MetaverseDriverVehicleControlIntentSnapshot {
  return Object.freeze({
    boost: input.boost === true,
    environmentAssetId: normalizeVehicleAssetId(input.environmentAssetId),
    moveAxis: clampNormalizedAxis(input.moveAxis),
    strafeAxis: clampNormalizedAxis(input.strafeAxis),
    yawAxis: clampNormalizedAxis(input.yawAxis)
  });
}

function freezeVehicleSeatSnapshot(
  input: MetaverseRealtimeVehicleSeatSnapshotInput
): MetaverseRealtimeVehicleSeatSnapshot {
  return Object.freeze({
    occupantPlayerId: input.occupantPlayerId ?? null,
    occupantRole: resolveOccupantRole(input.occupantRole),
    seatId: normalizeRequiredIdentifier(
      input.seatId,
      "Metaverse realtime seatId"
    )
  });
}

function freezeMountedOccupancySnapshot(
  input: MetaverseRealtimeMountedOccupancySnapshotInput
): MetaverseRealtimeMountedOccupancySnapshot {
  const occupancyKind = resolveMountedOccupancyKind(input.occupancyKind);
  const seatId = normalizeOptionalIdentifier(
    input.seatId,
    "Metaverse realtime seatId"
  );
  const entryId = normalizeOptionalIdentifier(
    input.entryId,
    "Metaverse realtime entryId"
  );

  if (occupancyKind === "seat" && seatId === null) {
    throw new Error("Metaverse realtime seat occupancy requires a seatId.");
  }

  if (occupancyKind === "entry" && entryId === null) {
    throw new Error("Metaverse realtime entry occupancy requires an entryId.");
  }

  return Object.freeze({
    entryId,
    environmentAssetId: normalizeVehicleAssetId(input.environmentAssetId),
    occupancyKind,
    occupantRole: resolveOccupantRole(input.occupantRole),
    seatId,
    vehicleId: input.vehicleId
  });
}

function freezePlayerSnapshot(
  input: MetaverseRealtimePlayerSnapshotInput,
  mountedOccupancy: MetaverseRealtimeMountedOccupancySnapshot | null
): MetaverseRealtimePlayerSnapshot {
  return Object.freeze({
    animationVocabulary: resolveAnimationVocabulary(input.animationVocabulary),
    characterId: normalizeCharacterId(input.characterId),
    linearVelocity: createMetaversePresenceVector3Snapshot(input.linearVelocity),
    locomotionMode: resolveLocomotionMode(input.locomotionMode),
    mountedOccupancy,
    playerId: input.playerId,
    position: createMetaversePresenceVector3Snapshot(input.position),
    stateSequence: normalizeFiniteNonNegativeInteger(input.stateSequence ?? 0),
    username: input.username,
    yawRadians: createRadians(input.yawRadians)
  });
}

function freezeVehicleSnapshot(
  input: MetaverseRealtimeVehicleSnapshotInput
): MetaverseRealtimeVehicleSnapshot {
  return Object.freeze({
    angularVelocityRadiansPerSecond: normalizeFiniteNumber(
      input.angularVelocityRadiansPerSecond
    ),
    environmentAssetId: normalizeVehicleAssetId(input.environmentAssetId),
    linearVelocity: createMetaversePresenceVector3Snapshot(input.linearVelocity),
    position: createMetaversePresenceVector3Snapshot(input.position),
    seats: Object.freeze(input.seats.map(freezeVehicleSeatSnapshot)),
    vehicleId: input.vehicleId,
    yawRadians: createRadians(input.yawRadians)
  });
}

function assertSeatOccupancyMatchesCanonical(
  playerId: MetaversePlayerId,
  mountedOccupancy: MetaverseRealtimeMountedOccupancySnapshot,
  canonicalOccupancy: MetaverseRealtimeMountedOccupancySnapshot
): void {
  if (
    mountedOccupancy.vehicleId !== canonicalOccupancy.vehicleId ||
    mountedOccupancy.environmentAssetId !== canonicalOccupancy.environmentAssetId ||
    mountedOccupancy.seatId !== canonicalOccupancy.seatId ||
    mountedOccupancy.occupantRole !== canonicalOccupancy.occupantRole
  ) {
    throw new Error(
      `Metaverse realtime player ${playerId} seat occupancy must match the authoritative vehicle seat state.`
    );
  }
}

function resolvePlayerMountedOccupancy(
  playerId: MetaversePlayerId,
  mountedOccupancyInput: MetaverseRealtimeMountedOccupancySnapshotInput | null | undefined,
  canonicalSeatOccupancy: MetaverseRealtimeMountedOccupancySnapshot | null,
  vehicleSnapshotById: ReadonlyMap<
    MetaverseVehicleId,
    MetaverseRealtimeVehicleSnapshot
  >
): MetaverseRealtimeMountedOccupancySnapshot | null {
  if (mountedOccupancyInput === undefined || mountedOccupancyInput === null) {
    return canonicalSeatOccupancy;
  }

  const mountedOccupancy = freezeMountedOccupancySnapshot(mountedOccupancyInput);

  if (mountedOccupancy.occupancyKind === "seat") {
    if (canonicalSeatOccupancy === null) {
      throw new Error(
        `Metaverse realtime player ${playerId} seat occupancy requires a matching occupied vehicle seat.`
      );
    }

    assertSeatOccupancyMatchesCanonical(
      playerId,
      mountedOccupancy,
      canonicalSeatOccupancy
    );

    return canonicalSeatOccupancy;
  }

  if (canonicalSeatOccupancy !== null) {
    throw new Error(
      `Metaverse realtime player ${playerId} cannot resolve entry occupancy while a vehicle seat claims the player at the same tick.`
    );
  }

  const occupiedVehicle = vehicleSnapshotById.get(mountedOccupancy.vehicleId);

  if (
    occupiedVehicle === undefined ||
    occupiedVehicle.environmentAssetId !== mountedOccupancy.environmentAssetId
  ) {
    throw new Error(
      `Metaverse realtime player ${playerId} entry occupancy must reference a vehicle present in the same world snapshot.`
    );
  }

  return mountedOccupancy;
}

export function createMetaverseVehicleId(
  rawValue: string
): MetaverseVehicleId | null {
  const normalizedValue = rawValue.trim();

  if (
    normalizedValue.length === 0 ||
    normalizedValue.length > 64 ||
    !metaverseVehicleIdPattern.test(normalizedValue)
  ) {
    return null;
  }

  return normalizedValue as MetaverseVehicleId;
}

export function createMetaverseRealtimeTickSnapshot(
  input: MetaverseRealtimeTickSnapshotInput
): MetaverseRealtimeTickSnapshot {
  return Object.freeze({
    currentTick: normalizeFiniteNonNegativeInteger(input.currentTick),
    owner: "server",
    serverTimeMs: createMilliseconds(input.serverTimeMs),
    tickIntervalMs: createMilliseconds(input.tickIntervalMs)
  });
}

export function createMetaverseDriverVehicleControlIntentSnapshot(
  input: MetaverseDriverVehicleControlIntentSnapshotInput
): MetaverseDriverVehicleControlIntentSnapshot {
  return freezeDriverVehicleControlIntentSnapshot(input);
}

export function createMetaverseRealtimeMountedOccupancySnapshot(
  input: MetaverseRealtimeMountedOccupancySnapshotInput
): MetaverseRealtimeMountedOccupancySnapshot {
  return freezeMountedOccupancySnapshot(input);
}

export function createMetaverseRealtimeVehicleSeatSnapshot(
  input: MetaverseRealtimeVehicleSeatSnapshotInput
): MetaverseRealtimeVehicleSeatSnapshot {
  return freezeVehicleSeatSnapshot(input);
}

export function createMetaverseRealtimePlayerSnapshot(
  input: MetaverseRealtimePlayerSnapshotInput
): MetaverseRealtimePlayerSnapshot {
  return freezePlayerSnapshot(
    input,
    input.mountedOccupancy === undefined || input.mountedOccupancy === null
      ? null
      : freezeMountedOccupancySnapshot(input.mountedOccupancy)
  );
}

export function createMetaverseRealtimeVehicleSnapshot(
  input: MetaverseRealtimeVehicleSnapshotInput
): MetaverseRealtimeVehicleSnapshot {
  return freezeVehicleSnapshot(input);
}

export function createMetaverseRealtimeWorldSnapshot(
  input: MetaverseRealtimeWorldSnapshotInput
): MetaverseRealtimeWorldSnapshot {
  const vehicles = input.vehicles.map(freezeVehicleSnapshot);
  const vehicleSnapshotById = new Map<
    MetaverseVehicleId,
    MetaverseRealtimeVehicleSnapshot
  >();
  const canonicalSeatOccupancyByPlayerId = new Map<
    MetaversePlayerId,
    MetaverseRealtimeMountedOccupancySnapshot
  >();

  for (const vehicle of vehicles) {
    if (vehicleSnapshotById.has(vehicle.vehicleId)) {
      throw new Error(
        `Metaverse realtime world snapshot includes duplicate vehicleId ${vehicle.vehicleId}.`
      );
    }

    vehicleSnapshotById.set(vehicle.vehicleId, vehicle);

    for (const seat of vehicle.seats) {
      if (seat.occupantPlayerId === null) {
        continue;
      }

      if (canonicalSeatOccupancyByPlayerId.has(seat.occupantPlayerId)) {
        throw new Error(
          `Metaverse realtime world snapshot assigns player ${seat.occupantPlayerId} to more than one occupied vehicle seat.`
        );
      }

      canonicalSeatOccupancyByPlayerId.set(
        seat.occupantPlayerId,
        Object.freeze({
          entryId: null,
          environmentAssetId: vehicle.environmentAssetId,
          occupancyKind: "seat",
          occupantRole: seat.occupantRole,
          seatId: seat.seatId,
          vehicleId: vehicle.vehicleId
        })
      );
    }
  }

  const players = input.players.map((playerInput) =>
    freezePlayerSnapshot(
      playerInput,
      resolvePlayerMountedOccupancy(
        playerInput.playerId,
        playerInput.mountedOccupancy,
        canonicalSeatOccupancyByPlayerId.get(playerInput.playerId) ?? null,
        vehicleSnapshotById
      )
    )
  );
  const playerIds = new Set<MetaversePlayerId>();

  for (const player of players) {
    if (playerIds.has(player.playerId)) {
      throw new Error(
        `Metaverse realtime world snapshot includes duplicate playerId ${player.playerId}.`
      );
    }

    playerIds.add(player.playerId);
  }

  for (const occupantPlayerId of canonicalSeatOccupancyByPlayerId.keys()) {
    if (!playerIds.has(occupantPlayerId)) {
      throw new Error(
        `Metaverse realtime vehicle seat occupancy references missing player ${occupantPlayerId}.`
      );
    }
  }

  return Object.freeze({
    players: Object.freeze(players),
    snapshotSequence: normalizeFiniteNonNegativeInteger(input.snapshotSequence ?? 0),
    tick: createMetaverseRealtimeTickSnapshot(input.tick),
    vehicles: Object.freeze(vehicles)
  });
}

export function createMetaverseRealtimeWorldEvent(
  input: MetaverseRealtimeWorldEventInput
): MetaverseRealtimeWorldEvent {
  return Object.freeze({
    type: "world-snapshot",
    world: createMetaverseRealtimeWorldSnapshot(input.world)
  });
}

export function createMetaverseSyncDriverVehicleControlCommand(
  input: MetaverseSyncDriverVehicleControlCommandInput
): MetaverseSyncDriverVehicleControlCommand {
  return Object.freeze({
    controlIntent: freezeDriverVehicleControlIntentSnapshot(input.controlIntent),
    controlSequence: normalizeFiniteNonNegativeInteger(
      input.controlSequence ?? 0
    ),
    playerId: input.playerId,
    type: "sync-driver-vehicle-control"
  });
}
