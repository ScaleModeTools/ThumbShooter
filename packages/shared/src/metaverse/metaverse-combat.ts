import type { Milliseconds, Radians } from "../unit-measurements.js";
import { createMilliseconds, createRadians } from "../unit-measurements.js";
import {
  createMetaversePresenceVector3Snapshot,
  type MetaversePlayerId,
  type MetaversePresenceVector3Snapshot,
  type MetaversePresenceVector3SnapshotInput
} from "./metaverse-presence-contract.js";
import type { MetaversePlayerTeamId } from "./metaverse-player-team.js";
import {
  metaverseGroundedBodyTraversalCoreConfig
} from "./metaverse-authoritative-traversal-config.js";
import {
  resolveMetaverseGroundedBodyColliderTranslationSnapshot
} from "./metaverse-grounded-body-contract.js";
import {
  metaverseTraversalActionResolutionStateIds,
  type MetaverseTraversalActionResolutionStateId
} from "./metaverse-traversal-contract.js";

export const metaverseCombatMatchPhaseIds = [
  "waiting-for-players",
  "active",
  "completed"
] as const;

export const metaverseCombatProjectileResolutionIds = [
  "active",
  "hit-player",
  "hit-world",
  "expired"
] as const;

export const metaverseCombatFeedEventTypeIds = [
  "spawn",
  "damage",
  "kill"
] as const;

export const metaversePlayerActionKindIds = [
  "fire-weapon",
  "jump"
] as const;

export const metaversePlayerActionReceiptStatusIds = [
  "accepted",
  "rejected"
] as const;

export const metaversePlayerActionFireWeaponRejectionReasonIds = [
  "match-inactive",
  "player-dead",
  "spawn-protected",
  "mounted",
  "reloading",
  "cooldown",
  "out-of-ammo",
  "invalid-direction",
  "unknown-weapon"
] as const;

export const metaverseCombatHitZoneIds = [
  "body",
  "head"
] as const;

export const metaverseCombatWeaponFireModeIds = [
  "semi",
  "burst",
  "auto"
] as const;

export const metaverseCombatWeaponDeliveryModelIds = [
  "hitscan",
  "projectile"
] as const;

export type MetaverseCombatMatchPhaseId =
  (typeof metaverseCombatMatchPhaseIds)[number];
export type MetaverseCombatProjectileResolutionId =
  (typeof metaverseCombatProjectileResolutionIds)[number];
export type MetaverseCombatFeedEventTypeId =
  (typeof metaverseCombatFeedEventTypeIds)[number];
export type MetaversePlayerActionKindId =
  (typeof metaversePlayerActionKindIds)[number];
export type MetaversePlayerActionReceiptStatusId =
  (typeof metaversePlayerActionReceiptStatusIds)[number];
export type MetaversePlayerActionFireWeaponRejectionReasonId =
  (typeof metaversePlayerActionFireWeaponRejectionReasonIds)[number];
export type MetaverseCombatHitZoneId =
  (typeof metaverseCombatHitZoneIds)[number];
export type MetaverseCombatWeaponFireModeId =
  (typeof metaverseCombatWeaponFireModeIds)[number];
export type MetaverseCombatWeaponDeliveryModelId =
  (typeof metaverseCombatWeaponDeliveryModelIds)[number];

export type MetaverseCombatActionKindId = MetaversePlayerActionKindId;
export type MetaverseCombatActionReceiptStatusId =
  MetaversePlayerActionReceiptStatusId;
export type MetaverseCombatActionRejectionReasonId =
  MetaversePlayerActionFireWeaponRejectionReasonId;

export const metaverseCombatActionKindIds = metaversePlayerActionKindIds;
export const metaverseCombatActionReceiptStatusIds =
  metaversePlayerActionReceiptStatusIds;
export const metaverseCombatActionRejectionReasonIds =
  metaversePlayerActionFireWeaponRejectionReasonIds;

export interface MetaverseCombatWeaponAccuracySnapshot {
  readonly adsAffectsAccuracy: boolean;
  readonly bloomDegrees: number;
  readonly gravityUnitsPerSecondSquared: number;
  readonly projectileLifetimeMs: Milliseconds;
  readonly projectileVelocityMetersPerSecond: number;
  readonly spreadDegrees: number;
}

export interface MetaverseCombatWeaponAccuracySnapshotInput {
  readonly adsAffectsAccuracy?: boolean;
  readonly bloomDegrees?: number;
  readonly gravityUnitsPerSecondSquared?: number;
  readonly projectileLifetimeMs?: number;
  readonly projectileVelocityMetersPerSecond?: number;
  readonly spreadDegrees?: number;
}

export interface MetaverseCombatWeaponDamageSnapshot {
  readonly body: number;
  readonly head: number;
}

export interface MetaverseCombatWeaponDamageSnapshotInput {
  readonly body?: number;
  readonly head?: number;
}

export interface MetaverseCombatWeaponMagazineSnapshot {
  readonly magazineCapacity: number;
  readonly reloadDurationMs: Milliseconds;
  readonly reserveCapacity: number;
}

export interface MetaverseCombatWeaponMagazineSnapshotInput {
  readonly magazineCapacity?: number;
  readonly reloadDurationMs?: number;
  readonly reserveCapacity?: number;
}

export interface MetaverseCombatWeaponRecoilPresentationSnapshot {
  readonly yawDegrees: number;
  readonly pitchDegrees: number;
}

export interface MetaverseCombatWeaponRecoilPresentationSnapshotInput {
  readonly yawDegrees?: number;
  readonly pitchDegrees?: number;
}

export interface MetaverseCombatWeaponProfileSnapshot {
  readonly accuracy: MetaverseCombatWeaponAccuracySnapshot;
  readonly damage: MetaverseCombatWeaponDamageSnapshot;
  readonly deliveryModel: MetaverseCombatWeaponDeliveryModelId;
  readonly fireMode: MetaverseCombatWeaponFireModeId;
  readonly firingOriginHeightMeters: number;
  readonly magazine: MetaverseCombatWeaponMagazineSnapshot;
  readonly recoilPresentation: MetaverseCombatWeaponRecoilPresentationSnapshot;
  readonly roundsPerMinute: number;
  readonly weaponId: string;
}

export interface MetaverseCombatWeaponProfileSnapshotInput {
  readonly damage: MetaverseCombatWeaponDamageSnapshotInput;
  readonly deliveryModel?: MetaverseCombatWeaponDeliveryModelId;
  readonly fireMode: MetaverseCombatWeaponFireModeId;
  readonly firingOriginHeightMeters?: number;
  readonly magazine: MetaverseCombatWeaponMagazineSnapshotInput;
  readonly recoilPresentation: MetaverseCombatWeaponRecoilPresentationSnapshotInput;
  readonly roundsPerMinute: number;
  readonly weaponId: string;
  readonly accuracy?: MetaverseCombatWeaponAccuracySnapshotInput;
}

export interface MetaverseCombatTeamSnapshot {
  readonly playerIds: readonly MetaversePlayerId[];
  readonly score: number;
  readonly teamId: MetaversePlayerTeamId;
}

export interface MetaverseCombatTeamSnapshotInput {
  readonly playerIds?: readonly MetaversePlayerId[];
  readonly score?: number;
  readonly teamId: MetaversePlayerTeamId;
}

export interface MetaverseCombatDamageLedgerEntrySnapshot {
  readonly attackerPlayerId: MetaversePlayerId;
  readonly totalDamage: number;
}

export interface MetaverseCombatDamageLedgerEntrySnapshotInput {
  readonly attackerPlayerId: MetaversePlayerId;
  readonly totalDamage?: number;
}

export interface MetaverseCombatWeaponStatsSnapshot {
  readonly shotsFired: number;
  readonly shotsHit: number;
  readonly weaponId: string;
}

export interface MetaverseCombatWeaponStatsSnapshotInput {
  readonly shotsFired?: number;
  readonly shotsHit?: number;
  readonly weaponId: string;
}

export interface MetaverseCombatPlayerWeaponSnapshot {
  readonly ammoInMagazine: number;
  readonly ammoInReserve: number;
  readonly reloadRemainingMs: Milliseconds;
  readonly weaponId: string;
}

export interface MetaverseCombatPlayerWeaponSnapshotInput {
  readonly ammoInMagazine?: number;
  readonly ammoInReserve?: number;
  readonly reloadRemainingMs?: number;
  readonly weaponId: string;
}

export interface MetaversePlayerCombatSnapshot {
  readonly activeWeapon: MetaverseCombatPlayerWeaponSnapshot | null;
  readonly alive: boolean;
  readonly assists: number;
  readonly damageLedger: readonly MetaverseCombatDamageLedgerEntrySnapshot[];
  readonly deaths: number;
  readonly headshotKills: number;
  readonly health: number;
  readonly kills: number;
  readonly maxHealth: number;
  readonly respawnRemainingMs: Milliseconds;
  readonly spawnProtectionRemainingMs: Milliseconds;
  readonly weaponStats: readonly MetaverseCombatWeaponStatsSnapshot[];
}

export interface MetaversePlayerCombatSnapshotInput {
  readonly activeWeapon?: MetaverseCombatPlayerWeaponSnapshotInput | null;
  readonly alive?: boolean;
  readonly assists?: number;
  readonly damageLedger?:
    readonly MetaverseCombatDamageLedgerEntrySnapshotInput[];
  readonly deaths?: number;
  readonly headshotKills?: number;
  readonly health?: number;
  readonly kills?: number;
  readonly maxHealth?: number;
  readonly respawnRemainingMs?: number;
  readonly spawnProtectionRemainingMs?: number;
  readonly weaponStats?: readonly MetaverseCombatWeaponStatsSnapshotInput[];
}

export interface MetaverseCombatMatchSnapshot {
  readonly assistDamageThreshold: number;
  readonly completedAtTimeMs: Milliseconds | null;
  readonly friendlyFireEnabled: boolean;
  readonly mode: "team-deathmatch";
  readonly phase: MetaverseCombatMatchPhaseId;
  readonly respawnDelayMs: Milliseconds;
  readonly scoreLimit: number;
  readonly teams: readonly MetaverseCombatTeamSnapshot[];
  readonly timeLimitMs: Milliseconds;
  readonly timeRemainingMs: Milliseconds;
  readonly winnerTeamId: MetaversePlayerTeamId | null;
}

export interface MetaverseCombatMatchSnapshotInput {
  readonly assistDamageThreshold?: number;
  readonly completedAtTimeMs?: number | null;
  readonly friendlyFireEnabled?: boolean;
  readonly mode?: "team-deathmatch";
  readonly phase?: MetaverseCombatMatchPhaseId;
  readonly respawnDelayMs?: number;
  readonly scoreLimit?: number;
  readonly teams?: readonly MetaverseCombatTeamSnapshotInput[];
  readonly timeLimitMs?: number;
  readonly timeRemainingMs?: number;
  readonly winnerTeamId?: MetaversePlayerTeamId | null;
}

export interface MetaverseCombatAimSnapshot {
  readonly pitchRadians: Radians;
  readonly yawRadians: Radians;
}

export interface MetaverseCombatAimSnapshotInput {
  readonly pitchRadians?: number;
  readonly yawRadians?: number;
}

export interface MetaverseFireWeaponPlayerActionSnapshot {
  readonly actionSequence: number;
  readonly aimMode: "ads" | "hip-fire";
  readonly aimSnapshot: MetaverseCombatAimSnapshot;
  readonly issuedAtAuthoritativeTimeMs: Milliseconds;
  readonly kind: "fire-weapon";
  readonly weaponId: string;
}

export interface MetaverseFireWeaponPlayerActionSnapshotInput {
  readonly actionSequence?: number;
  readonly aimMode?: "ads" | "hip-fire";
  readonly aimSnapshot?: MetaverseCombatAimSnapshotInput;
  readonly issuedAtAuthoritativeTimeMs?: number;
  readonly weaponId: string;
}

export interface MetaverseJumpPlayerActionSnapshot {
  readonly actionSequence: number;
  readonly issuedAtAuthoritativeTimeMs: Milliseconds;
  readonly kind: "jump";
}

export interface MetaverseJumpPlayerActionSnapshotInput {
  readonly actionSequence?: number;
  readonly issuedAtAuthoritativeTimeMs?: number;
}

export type MetaversePlayerActionSnapshot =
  | MetaverseFireWeaponPlayerActionSnapshot
  | MetaverseJumpPlayerActionSnapshot;

export type MetaversePlayerActionSnapshotInput =
  | ({
      readonly kind: "fire-weapon";
    } & MetaverseFireWeaponPlayerActionSnapshotInput)
  | ({
      readonly kind: "jump";
    } & MetaverseJumpPlayerActionSnapshotInput);

export interface MetaverseIssuePlayerActionCommand {
  readonly action: MetaversePlayerActionSnapshot;
  readonly playerId: MetaversePlayerId;
  readonly type: "issue-player-action";
}

export interface MetaverseIssuePlayerActionCommandInput {
  readonly action: MetaversePlayerActionSnapshotInput;
  readonly playerId: MetaversePlayerId;
}

interface MetaversePlayerActionReceiptCommon {
  readonly actionSequence: number;
  readonly kind: MetaversePlayerActionKindId;
  readonly processedAtTimeMs: Milliseconds;
}

export interface MetaverseFireWeaponPlayerActionReceiptSnapshot
  extends MetaversePlayerActionReceiptCommon {
  readonly kind: "fire-weapon";
  readonly rejectionReason: MetaversePlayerActionFireWeaponRejectionReasonId | null;
  readonly sourceProjectileId: string | null;
  readonly status: MetaversePlayerActionReceiptStatusId;
  readonly weaponId: string;
}

export interface MetaverseJumpPlayerActionReceiptSnapshot
  extends MetaversePlayerActionReceiptCommon {
  readonly kind: "jump";
  readonly resolutionState: MetaverseTraversalActionResolutionStateId;
}

export type MetaversePlayerActionReceiptSnapshot =
  | MetaverseFireWeaponPlayerActionReceiptSnapshot
  | MetaverseJumpPlayerActionReceiptSnapshot;

export type MetaverseCombatActionReceiptSnapshot =
  MetaverseFireWeaponPlayerActionReceiptSnapshot;

export type MetaversePlayerActionReceiptSnapshotInput =
  | ({
      readonly actionSequence?: number;
      readonly kind?: "fire-weapon";
      readonly processedAtTimeMs?: number;
      readonly rejectionReason?:
        | MetaversePlayerActionFireWeaponRejectionReasonId
        | null;
      readonly sourceProjectileId?: string | null;
      readonly status?: MetaversePlayerActionReceiptStatusId;
      readonly weaponId: string;
    })
  | ({
      readonly actionSequence?: number;
      readonly kind: "jump";
      readonly processedAtTimeMs?: number;
      readonly resolutionState?: MetaverseTraversalActionResolutionStateId;
    });

export type MetaverseCombatActionReceiptSnapshotInput =
  Extract<
    MetaversePlayerActionReceiptSnapshotInput,
    {
      readonly kind?: "fire-weapon";
    }
  >;

export interface MetaverseCombatProjectileSnapshot {
  readonly direction: MetaversePresenceVector3Snapshot;
  readonly expiresAtTimeMs: Milliseconds;
  readonly ownerPlayerId: MetaversePlayerId;
  readonly position: MetaversePresenceVector3Snapshot;
  readonly projectileId: string;
  readonly resolution: MetaverseCombatProjectileResolutionId;
  readonly resolvedAtTimeMs: Milliseconds | null;
  readonly resolvedHitZone: MetaverseCombatHitZoneId | null;
  readonly resolvedPlayerId: MetaversePlayerId | null;
  readonly sourceActionSequence: number;
  readonly spawnedAtTimeMs: Milliseconds;
  readonly velocityMetersPerSecond: number;
  readonly weaponId: string;
}

export interface MetaverseCombatProjectileSnapshotInput {
  readonly direction: MetaversePresenceVector3SnapshotInput;
  readonly expiresAtTimeMs?: number;
  readonly ownerPlayerId: MetaversePlayerId;
  readonly position: MetaversePresenceVector3SnapshotInput;
  readonly projectileId: string;
  readonly resolution?: MetaverseCombatProjectileResolutionId;
  readonly resolvedAtTimeMs?: number | null;
  readonly resolvedHitZone?: MetaverseCombatHitZoneId | null;
  readonly resolvedPlayerId?: MetaversePlayerId | null;
  readonly sourceActionSequence: number;
  readonly spawnedAtTimeMs?: number;
  readonly velocityMetersPerSecond?: number;
  readonly weaponId: string;
}

export interface MetaverseCombatSpawnFeedEventSnapshot {
  readonly playerId: MetaversePlayerId;
  readonly sequence: number;
  readonly teamId: MetaversePlayerTeamId;
  readonly timeMs: Milliseconds;
  readonly type: "spawn";
}

export interface MetaverseCombatSpawnFeedEventSnapshotInput {
  readonly playerId: MetaversePlayerId;
  readonly sequence?: number;
  readonly teamId: MetaversePlayerTeamId;
  readonly timeMs?: number;
}

export interface MetaverseCombatDamageFeedEventSnapshot {
  readonly attackerPlayerId: MetaversePlayerId;
  readonly damage: number;
  readonly hitZone: MetaverseCombatHitZoneId;
  readonly sequence: number;
  readonly sourceActionSequence: number;
  readonly sourceProjectileId: string | null;
  readonly targetPlayerId: MetaversePlayerId;
  readonly timeMs: Milliseconds;
  readonly type: "damage";
  readonly weaponId: string;
}

export interface MetaverseCombatDamageFeedEventSnapshotInput {
  readonly attackerPlayerId: MetaversePlayerId;
  readonly damage?: number;
  readonly hitZone?: MetaverseCombatHitZoneId;
  readonly sequence?: number;
  readonly sourceActionSequence: number;
  readonly sourceProjectileId?: string | null;
  readonly targetPlayerId: MetaversePlayerId;
  readonly timeMs?: number;
  readonly weaponId: string;
}

export interface MetaverseCombatKillFeedEventSnapshot {
  readonly assisterPlayerIds: readonly MetaversePlayerId[];
  readonly attackerPlayerId: MetaversePlayerId;
  readonly headshot: boolean;
  readonly sequence: number;
  readonly sourceActionSequence: number;
  readonly sourceProjectileId: string | null;
  readonly targetPlayerId: MetaversePlayerId;
  readonly targetTeamId: MetaversePlayerTeamId;
  readonly timeMs: Milliseconds;
  readonly type: "kill";
  readonly weaponId: string;
}

export interface MetaverseCombatKillFeedEventSnapshotInput {
  readonly assisterPlayerIds?: readonly MetaversePlayerId[];
  readonly attackerPlayerId: MetaversePlayerId;
  readonly headshot?: boolean;
  readonly sequence?: number;
  readonly sourceActionSequence: number;
  readonly sourceProjectileId?: string | null;
  readonly targetPlayerId: MetaversePlayerId;
  readonly targetTeamId: MetaversePlayerTeamId;
  readonly timeMs?: number;
  readonly weaponId: string;
}

export type MetaverseCombatFeedEventSnapshot =
  | MetaverseCombatDamageFeedEventSnapshot
  | MetaverseCombatKillFeedEventSnapshot
  | MetaverseCombatSpawnFeedEventSnapshot;

export type MetaverseCombatFeedEventSnapshotInput =
  | ({
      readonly type: "spawn";
    } & MetaverseCombatSpawnFeedEventSnapshotInput)
  | ({
      readonly type: "damage";
    } & MetaverseCombatDamageFeedEventSnapshotInput)
  | ({
      readonly type: "kill";
    } & MetaverseCombatKillFeedEventSnapshotInput);

export interface MetaverseCombatSphereSnapshot {
  readonly center: MetaversePresenceVector3Snapshot;
  readonly radiusMeters: number;
}

export interface MetaverseCombatCapsuleSnapshot {
  readonly end: MetaversePresenceVector3Snapshot;
  readonly radiusMeters: number;
  readonly start: MetaversePresenceVector3Snapshot;
}

export interface MetaversePlayerCombatHurtVolumesSnapshot {
  readonly bodyCapsule: MetaverseCombatCapsuleSnapshot;
  readonly headSphere: MetaverseCombatSphereSnapshot;
}

export interface MetaversePlayerCombatHurtVolumeConfig {
  readonly bodyBottomInsetMeters: number;
  readonly bodyTopInsetMeters: number;
  readonly capsuleHalfHeightMeters: number;
  readonly capsuleRadiusMeters: number;
  readonly headCenterHeightMeters: number;
  readonly headRadiusMeters: number;
}

export interface MetaversePlayerCombatHurtVolumeInput {
  readonly activeBodyPosition: MetaversePresenceVector3SnapshotInput;
  readonly config?: Partial<MetaversePlayerCombatHurtVolumeConfig>;
}

export interface MetaverseCombatHitResolutionSnapshot {
  readonly distanceMeters: number;
  readonly hitZone: MetaverseCombatHitZoneId;
  readonly point: MetaversePresenceVector3Snapshot;
}

const defaultCombatWeaponAccuracy = Object.freeze({
  adsAffectsAccuracy: false,
  bloomDegrees: 0,
  gravityUnitsPerSecondSquared: 0,
  projectileLifetimeMs: createMilliseconds(2_000),
  projectileVelocityMetersPerSecond: 900,
  spreadDegrees: 0
} satisfies MetaverseCombatWeaponAccuracySnapshot);

const defaultCombatWeaponDeliveryModel: MetaverseCombatWeaponDeliveryModelId =
  "projectile";
const defaultCombatWeaponFiringOriginHeightMeters = 1.62;

const defaultCombatMatchTeams = Object.freeze([
  Object.freeze({
    playerIds: Object.freeze([]),
    score: 0,
    teamId: "red"
  } satisfies MetaverseCombatTeamSnapshotInput),
  Object.freeze({
    playerIds: Object.freeze([]),
    score: 0,
    teamId: "blue"
  } satisfies MetaverseCombatTeamSnapshotInput)
] satisfies readonly MetaverseCombatTeamSnapshotInput[]);

export const defaultMetaversePlayerCombatHurtVolumeConfig = Object.freeze({
  bodyBottomInsetMeters: 0.1,
  bodyTopInsetMeters: 0.22,
  capsuleHalfHeightMeters:
    metaverseGroundedBodyTraversalCoreConfig.capsuleHalfHeightMeters,
  capsuleRadiusMeters:
    metaverseGroundedBodyTraversalCoreConfig.capsuleRadiusMeters,
  headCenterHeightMeters:
    metaverseGroundedBodyTraversalCoreConfig.capsuleHalfHeightMeters +
    metaverseGroundedBodyTraversalCoreConfig.capsuleRadiusMeters * 0.82,
  headRadiusMeters: 0.18
} satisfies MetaversePlayerCombatHurtVolumeConfig);

function normalizeFiniteNumber(rawValue: number, fallback = 0): number {
  return Number.isFinite(rawValue) ? rawValue : fallback;
}

function normalizeFiniteNonNegativeNumber(
  rawValue: number | undefined,
  fallback = 0
): number {
  const normalizedValue = normalizeFiniteNumber(rawValue ?? fallback, fallback);

  return normalizedValue <= 0 ? 0 : normalizedValue;
}

function normalizeFiniteNonNegativeInteger(
  rawValue: number | undefined,
  fallback = 0
): number {
  return Math.floor(normalizeFiniteNonNegativeNumber(rawValue, fallback));
}

function normalizeIdentifier(value: string, label: string): string {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new Error(`${label} must not be empty.`);
  }

  return normalizedValue;
}

function normalizeOptionalIdentifier(
  value: string | null | undefined,
  label: string
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return normalizeIdentifier(value, label);
}

function clampToUnitRange(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value < -1) {
    return -1;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function normalizeTimeMs(rawValue: number | null | undefined): Milliseconds | null {
  if (rawValue === null) {
    return null;
  }

  return createMilliseconds(normalizeFiniteNonNegativeNumber(rawValue));
}

function normalizeProjectileResolution(
  value: string | undefined
): MetaverseCombatProjectileResolutionId {
  return metaverseCombatProjectileResolutionIds.includes(
    value as MetaverseCombatProjectileResolutionId
  )
    ? (value as MetaverseCombatProjectileResolutionId)
    : "active";
}

function normalizePlayerActionKind(
  value: string | undefined
): MetaversePlayerActionKindId {
  return metaversePlayerActionKindIds.includes(value as MetaversePlayerActionKindId)
    ? (value as MetaversePlayerActionKindId)
    : "fire-weapon";
}

function normalizePlayerActionReceiptStatus(
  value: string | undefined
): MetaversePlayerActionReceiptStatusId {
  return metaversePlayerActionReceiptStatusIds.includes(
    value as MetaversePlayerActionReceiptStatusId
  )
    ? (value as MetaversePlayerActionReceiptStatusId)
    : "rejected";
}

function normalizePlayerActionFireWeaponRejectionReason(
  value: string | null | undefined
): MetaversePlayerActionFireWeaponRejectionReasonId | null {
  if (value === null || value === undefined) {
    return null;
  }

  return metaversePlayerActionFireWeaponRejectionReasonIds.includes(
    value as MetaversePlayerActionFireWeaponRejectionReasonId
  )
    ? (value as MetaversePlayerActionFireWeaponRejectionReasonId)
    : null;
}

function normalizeHitZone(
  value: string | null | undefined,
  fallback: MetaverseCombatHitZoneId | null = null
): MetaverseCombatHitZoneId | null {
  if (value === null || value === undefined) {
    return fallback;
  }

  return metaverseCombatHitZoneIds.includes(value as MetaverseCombatHitZoneId)
    ? (value as MetaverseCombatHitZoneId)
    : fallback;
}

function normalizeMatchPhase(
  value: string | undefined
): MetaverseCombatMatchPhaseId {
  return metaverseCombatMatchPhaseIds.includes(value as MetaverseCombatMatchPhaseId)
    ? (value as MetaverseCombatMatchPhaseId)
    : "waiting-for-players";
}

function normalizeWeaponFireMode(
  value: string | undefined
): MetaverseCombatWeaponFireModeId {
  return metaverseCombatWeaponFireModeIds.includes(
    value as MetaverseCombatWeaponFireModeId
  )
    ? (value as MetaverseCombatWeaponFireModeId)
    : "semi";
}

function normalizeWeaponDeliveryModel(
  value: string | undefined
): MetaverseCombatWeaponDeliveryModelId {
  return metaverseCombatWeaponDeliveryModelIds.includes(
    value as MetaverseCombatWeaponDeliveryModelId
  )
    ? (value as MetaverseCombatWeaponDeliveryModelId)
    : defaultCombatWeaponDeliveryModel;
}

function normalizeTraversalActionResolutionState(
  value: string | undefined
): MetaverseTraversalActionResolutionStateId {
  return metaverseTraversalActionResolutionStateIds.includes(
    value as MetaverseTraversalActionResolutionStateId
  )
    ? (value as MetaverseTraversalActionResolutionStateId)
    : "none";
}

function createVector3Snapshot(
  input: MetaversePresenceVector3SnapshotInput
): MetaversePresenceVector3Snapshot {
  return createMetaversePresenceVector3Snapshot({
    x: normalizeFiniteNumber(input.x),
    y: normalizeFiniteNumber(input.y),
    z: normalizeFiniteNumber(input.z)
  });
}

export function createMetaverseCombatAimSnapshot(
  input: MetaverseCombatAimSnapshotInput = {}
): MetaverseCombatAimSnapshot {
  return Object.freeze({
    pitchRadians: createRadians(normalizeFiniteNumber(input.pitchRadians ?? 0)),
    yawRadians: createRadians(normalizeFiniteNumber(input.yawRadians ?? 0))
  });
}

export function resolveMetaverseCombatAimDirectionSnapshot(
  aimSnapshot: Pick<MetaverseCombatAimSnapshot, "pitchRadians" | "yawRadians">
): MetaversePresenceVector3Snapshot {
  const horizontalScale = Math.cos(aimSnapshot.pitchRadians);

  return createVector3Snapshot({
    x: Math.sin(aimSnapshot.yawRadians) * horizontalScale,
    y: Math.sin(aimSnapshot.pitchRadians),
    z: -Math.cos(aimSnapshot.yawRadians) * horizontalScale
  });
}

function createPointOnSegment(
  start: MetaversePresenceVector3Snapshot,
  end: MetaversePresenceVector3Snapshot,
  alpha: number
): MetaversePresenceVector3Snapshot {
  const t = Math.max(0, Math.min(1, alpha));

  return createVector3Snapshot({
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
    z: start.z + (end.z - start.z) * t
  });
}

function readDot(
  left: Pick<MetaversePresenceVector3Snapshot, "x" | "y" | "z">,
  right: Pick<MetaversePresenceVector3Snapshot, "x" | "y" | "z">
): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function subtractVectors(
  left: Pick<MetaversePresenceVector3Snapshot, "x" | "y" | "z">,
  right: Pick<MetaversePresenceVector3Snapshot, "x" | "y" | "z">
): MetaversePresenceVector3Snapshot {
  return createVector3Snapshot({
    x: left.x - right.x,
    y: left.y - right.y,
    z: left.z - right.z
  });
}

function readLengthSquared(
  value: Pick<MetaversePresenceVector3Snapshot, "x" | "y" | "z">
): number {
  return readDot(value, value);
}

function readSegmentClosestApproach(
  segmentStart: MetaversePresenceVector3Snapshot,
  segmentEnd: MetaversePresenceVector3Snapshot,
  axisStart: MetaversePresenceVector3Snapshot,
  axisEnd: MetaversePresenceVector3Snapshot
): {
  readonly distanceSquared: number;
  readonly segmentAlpha: number;
} {
  const epsilon = 0.000001;
  const segmentDirection = subtractVectors(segmentEnd, segmentStart);
  const axisDirection = subtractVectors(axisEnd, axisStart);
  const betweenStarts = subtractVectors(segmentStart, axisStart);
  const segmentLengthSquared = readLengthSquared(segmentDirection);
  const axisLengthSquared = readLengthSquared(axisDirection);
  const segmentAxisDot = readDot(segmentDirection, axisDirection);
  const segmentStartDot = readDot(segmentDirection, betweenStarts);
  const axisStartDot = readDot(axisDirection, betweenStarts);
  const denominator =
    segmentLengthSquared * axisLengthSquared - segmentAxisDot * segmentAxisDot;

  let segmentAlpha = 0;
  let axisAlpha = 0;

  if (segmentLengthSquared <= epsilon && axisLengthSquared <= epsilon) {
    segmentAlpha = 0;
    axisAlpha = 0;
  } else if (segmentLengthSquared <= epsilon) {
    segmentAlpha = 0;
    axisAlpha = Math.max(
      0,
      Math.min(1, axisStartDot / Math.max(axisLengthSquared, epsilon))
    );
  } else if (axisLengthSquared <= epsilon) {
    axisAlpha = 0;
    segmentAlpha = Math.max(
      0,
      Math.min(1, -segmentStartDot / Math.max(segmentLengthSquared, epsilon))
    );
  } else if (Math.abs(denominator) <= epsilon) {
    segmentAlpha = Math.max(
      0,
      Math.min(1, -segmentStartDot / Math.max(segmentLengthSquared, epsilon))
    );
    const projectedAxisAlpha =
      (segmentAxisDot * segmentAlpha + axisStartDot) /
      Math.max(axisLengthSquared, epsilon);

    axisAlpha = Math.max(0, Math.min(1, projectedAxisAlpha));
  } else {
    segmentAlpha = Math.max(
      0,
      Math.min(
        1,
        (segmentAxisDot * axisStartDot - axisLengthSquared * segmentStartDot) /
          denominator
      )
    );
    axisAlpha = Math.max(
      0,
      Math.min(
        1,
        (segmentLengthSquared * axisStartDot - segmentAxisDot * segmentStartDot) /
          denominator
      )
    );
  }

  const closestSegmentPoint = createPointOnSegment(
    segmentStart,
    segmentEnd,
    segmentAlpha
  );
  const closestAxisPoint = createPointOnSegment(axisStart, axisEnd, axisAlpha);
  const separation = subtractVectors(closestSegmentPoint, closestAxisPoint);

  return Object.freeze({
    distanceSquared: readLengthSquared(separation),
    segmentAlpha
  });
}

function readSegmentSphereIntersectionDistance(
  segmentStart: MetaversePresenceVector3Snapshot,
  segmentEnd: MetaversePresenceVector3Snapshot,
  sphere: MetaverseCombatSphereSnapshot
): number | null {
  const segmentDirection = subtractVectors(segmentEnd, segmentStart);
  const originToCenter = subtractVectors(segmentStart, sphere.center);
  const a = readLengthSquared(segmentDirection);

  if (a <= 0.000001) {
    return null;
  }

  const b = 2 * readDot(segmentDirection, originToCenter);
  const c =
    readLengthSquared(originToCenter) - sphere.radiusMeters * sphere.radiusMeters;
  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return null;
  }

  const sqrtDiscriminant = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDiscriminant) / (2 * a);
  const t2 = (-b + sqrtDiscriminant) / (2 * a);
  const t =
    t1 >= 0 && t1 <= 1 ? t1 : t2 >= 0 && t2 <= 1 ? t2 : null;

  if (t === null) {
    return null;
  }

  return Math.sqrt(a) * t;
}

export function createMetaverseCombatWeaponProfileSnapshot(
  input: MetaverseCombatWeaponProfileSnapshotInput
): MetaverseCombatWeaponProfileSnapshot {
  return Object.freeze({
    accuracy: Object.freeze({
      adsAffectsAccuracy:
        input.accuracy?.adsAffectsAccuracy ??
        defaultCombatWeaponAccuracy.adsAffectsAccuracy,
      bloomDegrees: normalizeFiniteNonNegativeNumber(
        input.accuracy?.bloomDegrees,
        defaultCombatWeaponAccuracy.bloomDegrees
      ),
      gravityUnitsPerSecondSquared: normalizeFiniteNumber(
        input.accuracy?.gravityUnitsPerSecondSquared ??
          defaultCombatWeaponAccuracy.gravityUnitsPerSecondSquared
      ),
      projectileLifetimeMs: createMilliseconds(
        normalizeFiniteNonNegativeNumber(
          input.accuracy?.projectileLifetimeMs,
          Number(defaultCombatWeaponAccuracy.projectileLifetimeMs)
        )
      ),
      projectileVelocityMetersPerSecond: normalizeFiniteNonNegativeNumber(
        input.accuracy?.projectileVelocityMetersPerSecond,
        defaultCombatWeaponAccuracy.projectileVelocityMetersPerSecond
      ),
      spreadDegrees: normalizeFiniteNonNegativeNumber(
        input.accuracy?.spreadDegrees,
        defaultCombatWeaponAccuracy.spreadDegrees
      )
    }),
    damage: Object.freeze({
      body: normalizeFiniteNonNegativeNumber(input.damage.body, 0),
      head: normalizeFiniteNonNegativeNumber(input.damage.head, 0)
    }),
    deliveryModel: normalizeWeaponDeliveryModel(input.deliveryModel),
    fireMode: normalizeWeaponFireMode(input.fireMode),
    firingOriginHeightMeters: normalizeFiniteNonNegativeNumber(
      input.firingOriginHeightMeters,
      defaultCombatWeaponFiringOriginHeightMeters
    ),
    magazine: Object.freeze({
      magazineCapacity: normalizeFiniteNonNegativeInteger(
        input.magazine.magazineCapacity,
        1
      ),
      reloadDurationMs: createMilliseconds(
        normalizeFiniteNonNegativeNumber(input.magazine.reloadDurationMs)
      ),
      reserveCapacity: normalizeFiniteNonNegativeInteger(
        input.magazine.reserveCapacity
      )
    }),
    recoilPresentation: Object.freeze({
      pitchDegrees: normalizeFiniteNonNegativeNumber(
        input.recoilPresentation.pitchDegrees
      ),
      yawDegrees: normalizeFiniteNonNegativeNumber(
        input.recoilPresentation.yawDegrees
      )
    }),
    roundsPerMinute: normalizeFiniteNonNegativeNumber(input.roundsPerMinute),
    weaponId: normalizeIdentifier(input.weaponId, "Metaverse combat weaponId")
  }) as MetaverseCombatWeaponProfileSnapshot;
}

export function createMetaverseCombatWeaponStatsSnapshot(
  input: MetaverseCombatWeaponStatsSnapshotInput
): MetaverseCombatWeaponStatsSnapshot {
  return Object.freeze({
    shotsFired: normalizeFiniteNonNegativeInteger(input.shotsFired),
    shotsHit: normalizeFiniteNonNegativeInteger(input.shotsHit),
    weaponId: normalizeIdentifier(input.weaponId, "Metaverse combat weaponId")
  });
}

export function createMetaverseCombatPlayerWeaponSnapshot(
  input: MetaverseCombatPlayerWeaponSnapshotInput
): MetaverseCombatPlayerWeaponSnapshot {
  return Object.freeze({
    ammoInMagazine: normalizeFiniteNonNegativeInteger(input.ammoInMagazine),
    ammoInReserve: normalizeFiniteNonNegativeInteger(input.ammoInReserve),
    reloadRemainingMs: createMilliseconds(
      normalizeFiniteNonNegativeNumber(input.reloadRemainingMs)
    ),
    weaponId: normalizeIdentifier(input.weaponId, "Metaverse combat weaponId")
  });
}

export function createMetaverseCombatDamageLedgerEntrySnapshot(
  input: MetaverseCombatDamageLedgerEntrySnapshotInput
): MetaverseCombatDamageLedgerEntrySnapshot {
  return Object.freeze({
    attackerPlayerId: input.attackerPlayerId,
    totalDamage: normalizeFiniteNonNegativeNumber(input.totalDamage)
  });
}

export function createMetaversePlayerCombatSnapshot(
  input: MetaversePlayerCombatSnapshotInput = {}
): MetaversePlayerCombatSnapshot {
  const maxHealth = normalizeFiniteNonNegativeNumber(input.maxHealth, 100);
  const normalizedHealth = Math.min(
    maxHealth,
    normalizeFiniteNonNegativeNumber(input.health, maxHealth)
  );

  return Object.freeze({
    activeWeapon:
      input.activeWeapon === null
        ? null
        : input.activeWeapon === undefined
          ? null
          : createMetaverseCombatPlayerWeaponSnapshot(input.activeWeapon),
    alive: input.alive ?? normalizedHealth > 0,
    assists: normalizeFiniteNonNegativeInteger(input.assists),
    damageLedger: Object.freeze(
      (input.damageLedger ?? []).map(
        createMetaverseCombatDamageLedgerEntrySnapshot
      )
    ),
    deaths: normalizeFiniteNonNegativeInteger(input.deaths),
    headshotKills: normalizeFiniteNonNegativeInteger(input.headshotKills),
    health: normalizedHealth,
    kills: normalizeFiniteNonNegativeInteger(input.kills),
    maxHealth,
    respawnRemainingMs: createMilliseconds(
      normalizeFiniteNonNegativeNumber(input.respawnRemainingMs)
    ),
    spawnProtectionRemainingMs: createMilliseconds(
      normalizeFiniteNonNegativeNumber(input.spawnProtectionRemainingMs)
    ),
    weaponStats: Object.freeze(
      (input.weaponStats ?? []).map(createMetaverseCombatWeaponStatsSnapshot)
    )
  });
}

export function createMetaverseCombatTeamSnapshot(
  input: MetaverseCombatTeamSnapshotInput
): MetaverseCombatTeamSnapshot {
  return Object.freeze({
    playerIds: Object.freeze([...(input.playerIds ?? [])]),
    score: normalizeFiniteNonNegativeInteger(input.score),
    teamId: input.teamId
  });
}

export function createMetaverseCombatMatchSnapshot(
  input: MetaverseCombatMatchSnapshotInput = {}
): MetaverseCombatMatchSnapshot {
  return Object.freeze({
    assistDamageThreshold: normalizeFiniteNonNegativeNumber(
      input.assistDamageThreshold,
      50
    ),
    completedAtTimeMs: normalizeTimeMs(input.completedAtTimeMs),
    friendlyFireEnabled: input.friendlyFireEnabled === true,
    mode: input.mode ?? "team-deathmatch",
    phase: normalizeMatchPhase(input.phase),
    respawnDelayMs: createMilliseconds(
      normalizeFiniteNonNegativeNumber(input.respawnDelayMs, 3_000)
    ),
    scoreLimit: normalizeFiniteNonNegativeInteger(input.scoreLimit, 50),
    teams: Object.freeze(
      (input.teams ?? defaultCombatMatchTeams).map(createMetaverseCombatTeamSnapshot)
    ),
    timeLimitMs: createMilliseconds(
      normalizeFiniteNonNegativeNumber(input.timeLimitMs, 600_000)
    ),
    timeRemainingMs: createMilliseconds(
      normalizeFiniteNonNegativeNumber(input.timeRemainingMs, 600_000)
    ),
    winnerTeamId: input.winnerTeamId ?? null
  });
}

export function createMetaversePlayerActionReceiptSnapshot(
  input: MetaversePlayerActionReceiptSnapshotInput
): MetaversePlayerActionReceiptSnapshot {
  const processedAtTimeMs = createMilliseconds(
    normalizeFiniteNonNegativeNumber(input.processedAtTimeMs)
  );
  const actionSequence = normalizeFiniteNonNegativeInteger(input.actionSequence);

  if (input.kind === "jump") {
    return Object.freeze({
      actionSequence,
      kind: "jump",
      processedAtTimeMs,
      resolutionState: normalizeTraversalActionResolutionState(
        input.resolutionState
      )
    });
  }

  const status = normalizePlayerActionReceiptStatus(input.status);
  const rejectionReason =
    status === "rejected"
      ? normalizePlayerActionFireWeaponRejectionReason(input.rejectionReason)
      : null;

  return Object.freeze({
    actionSequence,
    kind: "fire-weapon",
    processedAtTimeMs,
    rejectionReason,
    sourceProjectileId:
      status === "accepted"
        ? normalizeOptionalIdentifier(
            input.sourceProjectileId,
            "Metaverse combat projectileId"
          )
        : null,
    status,
    weaponId: normalizeIdentifier(input.weaponId, "Metaverse combat weaponId")
  });
}

export function createMetaverseCombatActionReceiptSnapshot(
  input: MetaverseCombatActionReceiptSnapshotInput
): MetaverseCombatActionReceiptSnapshot {
  const compatibilityProjectileId =
    "projectileId" in input &&
    typeof input.projectileId === "string"
      ? input.projectileId
      : undefined;

  return createMetaversePlayerActionReceiptSnapshot({
    ...(input.actionSequence === undefined
      ? {}
      : {
          actionSequence: input.actionSequence
        }),
    kind: "fire-weapon",
    ...(input.processedAtTimeMs === undefined
      ? {}
      : {
          processedAtTimeMs: input.processedAtTimeMs
        }),
    ...(input.rejectionReason === undefined
      ? {}
      : {
          rejectionReason: input.rejectionReason
        }),
    ...(input.sourceProjectileId === undefined
      ? {}
      : {
          sourceProjectileId: input.sourceProjectileId
        }),
    ...(input.sourceProjectileId === undefined &&
    compatibilityProjectileId !== undefined
      ? {
          sourceProjectileId: compatibilityProjectileId
        }
      : {}),
    ...(input.status === undefined
      ? {}
      : {
          status: input.status
        }),
    weaponId: input.weaponId
  }) as MetaverseCombatActionReceiptSnapshot;
}

export function createMetaverseCombatProjectileSnapshot(
  input: MetaverseCombatProjectileSnapshotInput
): MetaverseCombatProjectileSnapshot {
  return Object.freeze({
    direction: createVector3Snapshot({
      x: clampToUnitRange(input.direction.x),
      y: clampToUnitRange(input.direction.y),
      z: clampToUnitRange(input.direction.z)
    }),
    expiresAtTimeMs: createMilliseconds(
      normalizeFiniteNonNegativeNumber(input.expiresAtTimeMs)
    ),
    ownerPlayerId: input.ownerPlayerId,
    position: createVector3Snapshot(input.position),
    projectileId: normalizeIdentifier(
      input.projectileId,
      "Metaverse combat projectileId"
    ),
    resolution: normalizeProjectileResolution(input.resolution),
    resolvedAtTimeMs: normalizeTimeMs(input.resolvedAtTimeMs),
    resolvedHitZone: normalizeHitZone(input.resolvedHitZone, null),
    resolvedPlayerId: input.resolvedPlayerId ?? null,
    sourceActionSequence: normalizeFiniteNonNegativeInteger(
      input.sourceActionSequence
    ),
    spawnedAtTimeMs: createMilliseconds(
      normalizeFiniteNonNegativeNumber(input.spawnedAtTimeMs)
    ),
    velocityMetersPerSecond: normalizeFiniteNonNegativeNumber(
      input.velocityMetersPerSecond
    ),
    weaponId: normalizeIdentifier(input.weaponId, "Metaverse combat weaponId")
  });
}

export function createMetaverseCombatFeedEventSnapshot(
  input: MetaverseCombatFeedEventSnapshotInput
): MetaverseCombatFeedEventSnapshot {
  switch (input.type) {
    case "spawn":
      return Object.freeze({
        playerId: input.playerId,
        sequence: normalizeFiniteNonNegativeInteger(input.sequence),
        teamId: input.teamId,
        timeMs: createMilliseconds(normalizeFiniteNonNegativeNumber(input.timeMs)),
        type: "spawn"
      });
    case "damage":
      return Object.freeze({
        attackerPlayerId: input.attackerPlayerId,
        damage: normalizeFiniteNonNegativeNumber(input.damage),
        hitZone: normalizeHitZone(input.hitZone, "body") ?? "body",
        sequence: normalizeFiniteNonNegativeInteger(input.sequence),
        sourceActionSequence: normalizeFiniteNonNegativeInteger(
          input.sourceActionSequence
        ),
        sourceProjectileId: normalizeOptionalIdentifier(
          input.sourceProjectileId,
          "Metaverse combat projectileId"
        ),
        targetPlayerId: input.targetPlayerId,
        timeMs: createMilliseconds(normalizeFiniteNonNegativeNumber(input.timeMs)),
        type: "damage",
        weaponId: normalizeIdentifier(input.weaponId, "Metaverse combat weaponId")
      });
    case "kill":
      return Object.freeze({
        assisterPlayerIds: Object.freeze([...(input.assisterPlayerIds ?? [])]),
        attackerPlayerId: input.attackerPlayerId,
        headshot: input.headshot === true,
        sequence: normalizeFiniteNonNegativeInteger(input.sequence),
        sourceActionSequence: normalizeFiniteNonNegativeInteger(
          input.sourceActionSequence
        ),
        sourceProjectileId: normalizeOptionalIdentifier(
          input.sourceProjectileId,
          "Metaverse combat projectileId"
        ),
        targetPlayerId: input.targetPlayerId,
        targetTeamId: input.targetTeamId,
        timeMs: createMilliseconds(normalizeFiniteNonNegativeNumber(input.timeMs)),
        type: "kill",
        weaponId: normalizeIdentifier(input.weaponId, "Metaverse combat weaponId")
      });
    default: {
      const exhaustiveInput: never = input;

      throw new Error(
        `Unsupported metaverse combat feed event type: ${exhaustiveInput}`
      );
    }
  }
}

export function createMetaverseFireWeaponPlayerActionSnapshot(
  input: MetaverseFireWeaponPlayerActionSnapshotInput
): MetaverseFireWeaponPlayerActionSnapshot {
  return Object.freeze({
    actionSequence: normalizeFiniteNonNegativeInteger(input.actionSequence),
    aimMode: input.aimMode === "ads" ? "ads" : "hip-fire",
    aimSnapshot: createMetaverseCombatAimSnapshot(input.aimSnapshot),
    issuedAtAuthoritativeTimeMs: createMilliseconds(
      normalizeFiniteNonNegativeNumber(input.issuedAtAuthoritativeTimeMs)
    ),
    kind: "fire-weapon",
    weaponId: normalizeIdentifier(input.weaponId, "Metaverse combat weaponId")
  });
}

export function createMetaverseJumpPlayerActionSnapshot(
  input: MetaverseJumpPlayerActionSnapshotInput = {}
): MetaverseJumpPlayerActionSnapshot {
  return Object.freeze({
    actionSequence: normalizeFiniteNonNegativeInteger(input.actionSequence),
    issuedAtAuthoritativeTimeMs: createMilliseconds(
      normalizeFiniteNonNegativeNumber(input.issuedAtAuthoritativeTimeMs)
    ),
    kind: "jump"
  });
}

export function createMetaversePlayerActionSnapshot(
  input: MetaversePlayerActionSnapshotInput
): MetaversePlayerActionSnapshot {
  switch (input.kind) {
    case "jump":
      return createMetaverseJumpPlayerActionSnapshot(input);
    case "fire-weapon":
      return createMetaverseFireWeaponPlayerActionSnapshot(input);
    default: {
      const exhaustiveInput: never = input;

      throw new Error(
        `Unsupported metaverse player action kind: ${exhaustiveInput}`
      );
    }
  }
}

export function createMetaverseIssuePlayerActionCommand(
  input: MetaverseIssuePlayerActionCommandInput
): MetaverseIssuePlayerActionCommand {
  return Object.freeze({
    action: createMetaversePlayerActionSnapshot(input.action),
    playerId: input.playerId,
    type: "issue-player-action"
  });
}

export function createMetaversePlayerCombatHurtVolumes(
  input: MetaversePlayerCombatHurtVolumeInput
): MetaversePlayerCombatHurtVolumesSnapshot {
  const config = Object.freeze({
    ...defaultMetaversePlayerCombatHurtVolumeConfig,
    ...(input.config ?? {})
  });
  const activeBodyRootPosition = createVector3Snapshot(input.activeBodyPosition);
  const capsuleCenterPosition =
    resolveMetaverseGroundedBodyColliderTranslationSnapshot(
      {
        capsuleHalfHeightMeters: config.capsuleHalfHeightMeters,
        capsuleRadiusMeters: config.capsuleRadiusMeters
      },
      activeBodyRootPosition
    );
  const bodyStartHeight =
    capsuleCenterPosition.y -
    Math.max(
      0,
      config.capsuleHalfHeightMeters - config.bodyBottomInsetMeters
    );
  const bodyEndHeight =
    capsuleCenterPosition.y +
    Math.max(0, config.capsuleHalfHeightMeters - config.bodyTopInsetMeters);

  return Object.freeze({
    bodyCapsule: Object.freeze({
      end: createVector3Snapshot({
        x: capsuleCenterPosition.x,
        y: bodyEndHeight,
        z: capsuleCenterPosition.z
      }),
      radiusMeters: Math.max(0.05, config.capsuleRadiusMeters * 0.9),
      start: createVector3Snapshot({
        x: capsuleCenterPosition.x,
        y: bodyStartHeight,
        z: capsuleCenterPosition.z
      })
    }),
    headSphere: Object.freeze({
      center: createVector3Snapshot({
        x: capsuleCenterPosition.x,
        y: capsuleCenterPosition.y + config.headCenterHeightMeters,
        z: capsuleCenterPosition.z
      }),
      radiusMeters: Math.max(0.05, config.headRadiusMeters)
    })
  });
}

export function resolveMetaverseCombatHitForSegment(
  segmentStart: MetaversePresenceVector3SnapshotInput,
  segmentEnd: MetaversePresenceVector3SnapshotInput,
  hurtVolumes: MetaversePlayerCombatHurtVolumesSnapshot
): MetaverseCombatHitResolutionSnapshot | null {
  const normalizedSegmentStart = createVector3Snapshot(segmentStart);
  const normalizedSegmentEnd = createVector3Snapshot(segmentEnd);
  const headDistanceMeters = readSegmentSphereIntersectionDistance(
    normalizedSegmentStart,
    normalizedSegmentEnd,
    hurtVolumes.headSphere
  );
  const bodyClosestApproach = readSegmentClosestApproach(
    normalizedSegmentStart,
    normalizedSegmentEnd,
    hurtVolumes.bodyCapsule.start,
    hurtVolumes.bodyCapsule.end
  );
  const bodyDistanceMeters =
    bodyClosestApproach.distanceSquared <=
    hurtVolumes.bodyCapsule.radiusMeters * hurtVolumes.bodyCapsule.radiusMeters
      ? Math.sqrt(
          readLengthSquared(subtractVectors(normalizedSegmentEnd, normalizedSegmentStart))
        ) * bodyClosestApproach.segmentAlpha
      : null;

  if (headDistanceMeters === null && bodyDistanceMeters === null) {
    return null;
  }

  const useHead =
    headDistanceMeters !== null &&
    (bodyDistanceMeters === null || headDistanceMeters <= bodyDistanceMeters);
  const distanceMeters =
    useHead ? headDistanceMeters! : bodyDistanceMeters!;
  const segmentLength = Math.sqrt(
    readLengthSquared(subtractVectors(normalizedSegmentEnd, normalizedSegmentStart))
  );
  const segmentAlpha =
    segmentLength <= 0.000001 ? 0 : distanceMeters / segmentLength;

  return Object.freeze({
    distanceMeters,
    hitZone: useHead ? "head" : "body",
    point: createPointOnSegment(
      normalizedSegmentStart,
      normalizedSegmentEnd,
      segmentAlpha
    )
  });
}

export const metaverseCombatWeaponProfiles = Object.freeze([
  createMetaverseCombatWeaponProfileSnapshot({
    accuracy: {
      adsAffectsAccuracy: false,
      bloomDegrees: 0,
      gravityUnitsPerSecondSquared: 0,
      projectileLifetimeMs: 2_000,
      projectileVelocityMetersPerSecond: 900,
      spreadDegrees: 0
    },
    damage: {
      body: 24,
      head: 42
    },
    deliveryModel: "hitscan",
    fireMode: "semi",
    firingOriginHeightMeters: 1.62,
    magazine: {
      magazineCapacity: 12,
      reloadDurationMs: 1_450,
      reserveCapacity: 48
    },
    recoilPresentation: {
      pitchDegrees: 1.2,
      yawDegrees: 0.55
    },
    roundsPerMinute: 420,
    weaponId: "metaverse-service-pistol-v2"
  })
] satisfies readonly MetaverseCombatWeaponProfileSnapshot[]);

const metaverseCombatWeaponProfileById = new Map(
  metaverseCombatWeaponProfiles.map((profile) => [profile.weaponId, profile])
);

export function readMetaverseCombatWeaponProfile(
  weaponId: string
): MetaverseCombatWeaponProfileSnapshot {
  const weaponProfile = metaverseCombatWeaponProfileById.get(weaponId) ?? null;

  if (weaponProfile === null) {
    throw new Error(`Unknown metaverse combat weapon profile: ${weaponId}`);
  }

  return weaponProfile;
}
