import {
  createMetaverseCombatFeedEventSnapshot,
  createMetaverseCombatMatchSnapshot,
  createMetaverseCombatPlayerWeaponSnapshot,
  createMetaverseCombatProjectileSnapshot,
  createMetaversePlayerCombatHurtVolumes,
  createMetaversePlayerCombatSnapshot,
  createMetaverseUnmountedTraversalStateSnapshot,
  readMetaverseCombatWeaponProfile,
  resolveMetaverseCombatHitForSegment,
  type MetaverseCombatFeedEventSnapshotInput,
  type MetaverseCombatMatchSnapshot,
  type MetaverseCombatPlayerWeaponSnapshotInput,
  type MetaverseCombatProjectileSnapshot,
  type MetaverseCombatProjectileSnapshotInput,
  type MetaverseFireWeaponCommand,
  type MetaversePlayerCombatHurtVolumeConfig,
  type MetaversePlayerCombatSnapshot
} from "@webgpu-metaverse/shared";
import type {
  MetaversePlayerId,
  MetaversePlayerTeamId
} from "@webgpu-metaverse/shared/metaverse/presence";
import type {
  MetaverseRealtimePlayerWeaponStateSnapshot
} from "@webgpu-metaverse/shared/metaverse/realtime";

import type {
  PhysicsVector3Snapshot,
  RapierColliderHandle
} from "../../types/metaverse-authoritative-rapier.js";
import type { MetaverseAuthoritativeRapierPhysicsRuntime } from "../../classes/metaverse-authoritative-rapier-physics-runtime.js";

interface MetaverseCombatMountedOccupancyRuntimeState {
  readonly occupancyKind: string;
  readonly occupantRole: string;
}

export interface MetaverseAuthoritativeCombatPlayerRuntimeState<
  MountedOccupancy extends
    | MetaverseCombatMountedOccupancyRuntimeState
    | null = MetaverseCombatMountedOccupancyRuntimeState | null
> {
  linearVelocityX: number;
  linearVelocityY: number;
  linearVelocityZ: number;
  locomotionMode: string;
  mountedOccupancy: MountedOccupancy;
  readonly playerId: MetaversePlayerId;
  readonly teamId: MetaversePlayerTeamId;
  positionX: number;
  positionY: number;
  positionZ: number;
  stateSequence: number;
  unmountedTraversalState: ReturnType<typeof createMetaverseUnmountedTraversalStateSnapshot>;
  weaponState: MetaverseRealtimePlayerWeaponStateSnapshot | null;
  yawRadians: number;
  lookPitchRadians: number;
  lookYawRadians: number;
}

interface MutableMetaverseCombatWeaponRuntimeState {
  ammoInMagazine: number;
  ammoInReserve: number;
  reloadRemainingMs: number;
  shotsFired: number;
  shotsHit: number;
  readonly weaponId: string;
}

interface MutableMetaverseCombatPlayerRuntimeState {
  activeWeaponId: string;
  alive: boolean;
  assists: number;
  readonly damageLedgerByAttackerId: Map<MetaversePlayerId, number>;
  deaths: number;
  headshotKills: number;
  health: number;
  kills: number;
  lastAcceptedFireSequence: number;
  lastFireAtMs: number;
  maxHealth: number;
  respawnRemainingMs: number;
  spawnProtectionRemainingMs: number;
  readonly weaponsById: Map<string, MutableMetaverseCombatWeaponRuntimeState>;
}

interface MutableMetaverseCombatProjectileRuntimeState {
  readonly direction: PhysicsVector3Snapshot;
  expiresAtTimeMs: number;
  readonly ownerPlayerId: MetaversePlayerId;
  positionX: number;
  positionY: number;
  positionZ: number;
  readonly projectileId: string;
  resolution: MetaverseCombatProjectileSnapshot["resolution"];
  resolvedAtTimeMs: number | null;
  resolvedHitZone: MetaverseCombatProjectileSnapshot["resolvedHitZone"];
  resolvedPlayerId: MetaverseCombatProjectileSnapshot["resolvedPlayerId"];
  spawnedAtTimeMs: number;
  readonly velocityMetersPerSecond: number;
  readonly weaponId: string;
}

interface MutableMetaverseCombatMatchRuntimeState {
  assistDamageThreshold: number;
  completedAtTimeMs: number | null;
  friendlyFireEnabled: boolean;
  phase: MetaverseCombatMatchSnapshot["phase"];
  respawnDelayMs: number;
  scoreLimit: number;
  readonly teamScoresByTeamId: Map<MetaversePlayerTeamId, number>;
  timeLimitMs: number;
  timeRemainingMs: number;
  startedAtTimeMs: number | null;
  winnerTeamId: MetaversePlayerTeamId | null;
}

interface MetaverseAuthoritativeCombatAuthorityDependencies<
  PlayerRuntime extends MetaverseAuthoritativeCombatPlayerRuntimeState
> {
  readonly clearDriverVehicleControl: (playerId: MetaversePlayerId) => void;
  readonly clearPlayerTraversalIntent: (playerId: MetaversePlayerId) => void;
  readonly clearPlayerVehicleOccupancy: (playerId: MetaversePlayerId) => void;
  readonly hurtVolumeConfig?: Partial<MetaversePlayerCombatHurtVolumeConfig>;
  readonly incrementSnapshotSequence: () => void;
  readonly physicsRuntime: MetaverseAuthoritativeRapierPhysicsRuntime;
  readonly playerTraversalColliderHandles: ReadonlySet<RapierColliderHandle>;
  readonly playersById: ReadonlyMap<MetaversePlayerId, PlayerRuntime>;
  readonly readTickIntervalMs: () => number;
  readonly resolveRespawnPose: (
    playerId: MetaversePlayerId,
    teamId: MetaversePlayerTeamId
  ) => {
    readonly position: PhysicsVector3Snapshot;
    readonly yawRadians: number;
  };
  readonly syncAuthoritativePlayerLookToCurrentFacing: (
    playerRuntime: PlayerRuntime
  ) => void;
  readonly syncPlayerTraversalAuthorityState: (
    playerRuntime: PlayerRuntime
  ) => void;
  readonly syncPlayerTraversalBodyRuntimes: (
    playerRuntime: PlayerRuntime,
    groundedOverride?: boolean
  ) => void;
}

const defaultCombatWeaponId = "metaverse-service-pistol-v2" as const;
const combatRewindWindowMs = 150;
const projectileRetentionAfterResolutionMs = 250;
const spawnProtectionDurationMs = 1_000;

function createPhysicsVector3Snapshot(
  x: number,
  y: number,
  z: number
): PhysicsVector3Snapshot {
  return Object.freeze({
    x,
    y,
    z
  });
}

function normalizeNowMs(nowMs: number): number {
  if (!Number.isFinite(nowMs)) {
    return 0;
  }

  return Math.max(0, nowMs);
}

function normalizeFiniteNonNegativeNumber(
  rawValue: number | undefined,
  fallback = 0
): number {
  if (!Number.isFinite(rawValue ?? fallback)) {
    return Math.max(0, fallback);
  }

  return Math.max(0, rawValue ?? fallback);
}

function normalizeDirection(
  direction: Pick<PhysicsVector3Snapshot, "x" | "y" | "z">
): PhysicsVector3Snapshot | null {
  const length = Math.hypot(direction.x, direction.y, direction.z);

  if (!Number.isFinite(length) || length <= 0.000001) {
    return null;
  }

  return createPhysicsVector3Snapshot(
    direction.x / length,
    direction.y / length,
    direction.z / length
  );
}

function createOffsetVector(
  origin: Pick<PhysicsVector3Snapshot, "x" | "y" | "z">,
  direction: Pick<PhysicsVector3Snapshot, "x" | "y" | "z">,
  distanceMeters: number
): PhysicsVector3Snapshot {
  return createPhysicsVector3Snapshot(
    origin.x + direction.x * distanceMeters,
    origin.y + direction.y * distanceMeters,
    origin.z + direction.z * distanceMeters
  );
}

function createDistanceBetweenPoints(
  left: Pick<PhysicsVector3Snapshot, "x" | "y" | "z">,
  right: Pick<PhysicsVector3Snapshot, "x" | "y" | "z">
): number {
  return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
}

function createPlayerBodyPositionSnapshot(
  playerRuntime: Pick<
    MetaverseAuthoritativeCombatPlayerRuntimeState,
    "positionX" | "positionY" | "positionZ"
  >
): PhysicsVector3Snapshot {
  return createPhysicsVector3Snapshot(
    playerRuntime.positionX,
    playerRuntime.positionY,
    playerRuntime.positionZ
  );
}

function createProjectilePositionSnapshot(
  projectileRuntime: Pick<
    MutableMetaverseCombatProjectileRuntimeState,
    "positionX" | "positionY" | "positionZ"
  >
): PhysicsVector3Snapshot {
  return createPhysicsVector3Snapshot(
    projectileRuntime.positionX,
    projectileRuntime.positionY,
    projectileRuntime.positionZ
  );
}

export class MetaverseAuthoritativeCombatAuthority<
  PlayerRuntime extends MetaverseAuthoritativeCombatPlayerRuntimeState
> {
  readonly #dependencies: MetaverseAuthoritativeCombatAuthorityDependencies<PlayerRuntime>;
  readonly #feedEvents: MetaverseCombatFeedEventSnapshotInput[] = [];
  readonly #matchState: MutableMetaverseCombatMatchRuntimeState;
  readonly #playerCombatStateByPlayerId = new Map<
    MetaversePlayerId,
    MutableMetaverseCombatPlayerRuntimeState
  >();
  readonly #projectilesById = new Map<
    string,
    MutableMetaverseCombatProjectileRuntimeState
  >();

  #feedSequence = 0;

  constructor(
    dependencies: MetaverseAuthoritativeCombatAuthorityDependencies<PlayerRuntime>
  ) {
    this.#dependencies = dependencies;
    this.#matchState = {
      assistDamageThreshold: 50,
      completedAtTimeMs: null,
      friendlyFireEnabled: false,
      phase: "waiting-for-players",
      respawnDelayMs: 3_000,
      scoreLimit: 50,
      startedAtTimeMs: null,
      teamScoresByTeamId: new Map([
        ["red", 0],
        ["blue", 0]
      ]),
      timeLimitMs: 600_000,
      timeRemainingMs: 600_000,
      winnerTeamId: null
    };
  }

  acceptFireWeaponCommand(
    command: MetaverseFireWeaponCommand,
    nowMs: number
  ): void {
    const normalizedNowMs = normalizeNowMs(nowMs);

    this.syncCombatState(normalizedNowMs);

    const playerRuntime = this.#dependencies.playersById.get(command.playerId);

    if (playerRuntime === undefined) {
      throw new Error(`Unknown metaverse player: ${command.playerId}`);
    }

    const combatState = this.#ensurePlayerCombatState(playerRuntime);

    if (command.fireSequence <= combatState.lastAcceptedFireSequence) {
      return;
    }

    combatState.lastAcceptedFireSequence = command.fireSequence;

    if (this.#matchState.phase !== "active") {
      return;
    }

    if (
      !combatState.alive ||
      combatState.spawnProtectionRemainingMs > 0 ||
      playerRuntime.mountedOccupancy !== null
    ) {
      return;
    }

    const weaponId = this.#resolveActiveWeaponId(playerRuntime, command.weaponId);
    const weaponProfile = readMetaverseCombatWeaponProfile(weaponId);
    const weaponState = this.#ensureWeaponRuntimeState(combatState, weaponId);

    if (weaponState.reloadRemainingMs > 0) {
      return;
    }

    const millisecondsPerShot =
      weaponProfile.roundsPerMinute <= 0
        ? Number.POSITIVE_INFINITY
        : 60_000 / weaponProfile.roundsPerMinute;

    if (normalizedNowMs - combatState.lastFireAtMs + 0.0001 < millisecondsPerShot) {
      return;
    }

    if (weaponState.ammoInMagazine <= 0) {
      this.#startReloadIfNeeded(weaponState, weaponProfile);
      this.#dependencies.incrementSnapshotSequence();
      return;
    }

    const normalizedDirection = normalizeDirection(command.forwardDirection);

    if (normalizedDirection === null) {
      return;
    }

    weaponState.ammoInMagazine -= 1;
    weaponState.shotsFired += 1;
    combatState.lastFireAtMs = normalizedNowMs;
    combatState.activeWeaponId = weaponId;

    const rewindLowerBound = Math.max(0, normalizedNowMs - combatRewindWindowMs);
    const rewindUpperBound = normalizedNowMs;
    const spawnTimeMs = Math.min(
      rewindUpperBound,
      Math.max(rewindLowerBound, Number(command.clientFireTimeMs))
    );
    const projectileId = `${command.playerId}:${command.fireSequence}`;
    const projectileRuntime: MutableMetaverseCombatProjectileRuntimeState = {
      direction: normalizedDirection,
      expiresAtTimeMs:
        spawnTimeMs + Number(weaponProfile.accuracy.projectileLifetimeMs),
      ownerPlayerId: command.playerId,
      positionX: command.muzzleOrigin.x,
      positionY: command.muzzleOrigin.y,
      positionZ: command.muzzleOrigin.z,
      projectileId,
      resolution: "active",
      resolvedAtTimeMs: null,
      resolvedHitZone: null,
      resolvedPlayerId: null,
      spawnedAtTimeMs: spawnTimeMs,
      velocityMetersPerSecond:
        weaponProfile.accuracy.projectileVelocityMetersPerSecond,
      weaponId
    };
    const fastForwardSeconds = Math.max(
      0,
      (normalizedNowMs - spawnTimeMs) / 1_000
    );

    if (fastForwardSeconds > 0) {
      this.#advanceProjectile(projectileRuntime, fastForwardSeconds, normalizedNowMs);
    }

    if (projectileRuntime.resolution === "active") {
      this.#projectilesById.set(projectileId, projectileRuntime);
    }

    if (weaponState.ammoInMagazine <= 0) {
      this.#startReloadIfNeeded(weaponState, weaponProfile);
    }

    this.#dependencies.incrementSnapshotSequence();
  }

  advanceCombatRuntimes(
    tickIntervalSeconds: number,
    nowMs: number
  ): void {
    const normalizedNowMs = normalizeNowMs(nowMs);

    this.syncCombatState(normalizedNowMs);

    for (const [playerId, combatState] of this.#playerCombatStateByPlayerId) {
      if (!this.#dependencies.playersById.has(playerId)) {
        continue;
      }

      this.#advancePlayerWeaponReloads(combatState, tickIntervalSeconds);
      this.#advanceSpawnProtection(combatState, tickIntervalSeconds);
      this.#advanceRespawnState(playerId, combatState, normalizedNowMs, tickIntervalSeconds);
    }

    for (const projectileRuntime of this.#projectilesById.values()) {
      this.#advanceProjectile(projectileRuntime, tickIntervalSeconds, normalizedNowMs);
    }

    this.#pruneResolvedProjectiles(normalizedNowMs);
  }

  syncCombatState(nowMs: number): void {
    this.#pruneMissingPlayerCombatState();

    for (const playerRuntime of this.#dependencies.playersById.values()) {
      this.#ensurePlayerCombatState(playerRuntime);
    }

    if (
      this.#matchState.phase === "waiting-for-players" &&
      this.#dependencies.playersById.size >= 2
    ) {
      this.#startMatch(nowMs);
      this.#dependencies.incrementSnapshotSequence();
      return;
    }

    if (
      this.#matchState.phase === "active" &&
      this.#matchState.startedAtTimeMs !== null
    ) {
      const elapsedMs = Math.max(0, nowMs - this.#matchState.startedAtTimeMs);

      this.#matchState.timeRemainingMs = Math.max(
        0,
        this.#matchState.timeLimitMs - elapsedMs
      );

      if (this.#matchState.timeRemainingMs <= 0) {
        this.#completeMatch(nowMs);
        this.#dependencies.incrementSnapshotSequence();
      }
    }
  }

  readCombatFeedSnapshots(): readonly ReturnType<
    typeof createMetaverseCombatFeedEventSnapshot
  >[] {
    return Object.freeze(
      this.#feedEvents.map((eventSnapshot) =>
        createMetaverseCombatFeedEventSnapshot(eventSnapshot)
      )
    );
  }

  readCombatMatchSnapshot(): MetaverseCombatMatchSnapshot {
    return createMetaverseCombatMatchSnapshot({
      assistDamageThreshold: this.#matchState.assistDamageThreshold,
      completedAtTimeMs: this.#matchState.completedAtTimeMs,
      friendlyFireEnabled: this.#matchState.friendlyFireEnabled,
      phase: this.#matchState.phase,
      respawnDelayMs: this.#matchState.respawnDelayMs,
      scoreLimit: this.#matchState.scoreLimit,
      teams: [
        {
          playerIds: this.#collectTeamRoster("red"),
          score: this.#matchState.teamScoresByTeamId.get("red") ?? 0,
          teamId: "red"
        },
        {
          playerIds: this.#collectTeamRoster("blue"),
          score: this.#matchState.teamScoresByTeamId.get("blue") ?? 0,
          teamId: "blue"
        }
      ],
      timeLimitMs: this.#matchState.timeLimitMs,
      timeRemainingMs: this.#matchState.timeRemainingMs,
      winnerTeamId: this.#matchState.winnerTeamId
    });
  }

  readPlayerCombatSnapshot(
    playerId: MetaversePlayerId
  ): MetaversePlayerCombatSnapshot | null {
    const combatState = this.#playerCombatStateByPlayerId.get(playerId) ?? null;

    if (combatState === null) {
      return null;
    }

    return createMetaversePlayerCombatSnapshot({
      activeWeapon: this.#createActiveWeaponSnapshotInput(combatState),
      alive: combatState.alive,
      assists: combatState.assists,
      damageLedger: [...combatState.damageLedgerByAttackerId.entries()].map(
        ([attackerPlayerId, totalDamage]) => ({
          attackerPlayerId,
          totalDamage
        })
      ),
      deaths: combatState.deaths,
      headshotKills: combatState.headshotKills,
      health: combatState.health,
      kills: combatState.kills,
      maxHealth: combatState.maxHealth,
      respawnRemainingMs: combatState.respawnRemainingMs,
      spawnProtectionRemainingMs: combatState.spawnProtectionRemainingMs,
      weaponStats: [...combatState.weaponsById.values()].map((weaponState) => ({
        shotsFired: weaponState.shotsFired,
        shotsHit: weaponState.shotsHit,
        weaponId: weaponState.weaponId
      }))
    });
  }

  readProjectileSnapshots(): readonly MetaverseCombatProjectileSnapshot[] {
    return Object.freeze(
      [...this.#projectilesById.values()].map((projectileRuntime) =>
        createMetaverseCombatProjectileSnapshot(
          this.#createProjectileSnapshotInput(projectileRuntime)
        )
      )
    );
  }

  #advancePlayerWeaponReloads(
    combatState: MutableMetaverseCombatPlayerRuntimeState,
    tickIntervalSeconds: number
  ): void {
    const tickIntervalMs = tickIntervalSeconds * 1_000;

    for (const weaponState of combatState.weaponsById.values()) {
      if (weaponState.reloadRemainingMs <= 0) {
        continue;
      }

      weaponState.reloadRemainingMs = Math.max(
        0,
        weaponState.reloadRemainingMs - tickIntervalMs
      );

      if (weaponState.reloadRemainingMs > 0) {
        continue;
      }

      const weaponProfile = readMetaverseCombatWeaponProfile(weaponState.weaponId);
      const roundsMissing =
        weaponProfile.magazine.magazineCapacity - weaponState.ammoInMagazine;
      const roundsToLoad = Math.min(roundsMissing, weaponState.ammoInReserve);

      weaponState.ammoInMagazine += roundsToLoad;
      weaponState.ammoInReserve -= roundsToLoad;
    }
  }

  #advanceProjectile(
    projectileRuntime: MutableMetaverseCombatProjectileRuntimeState,
    deltaSeconds: number,
    nowMs: number
  ): void {
    if (projectileRuntime.resolution !== "active") {
      return;
    }

    if (projectileRuntime.expiresAtTimeMs <= nowMs) {
      this.#resolveProjectile(projectileRuntime, "expired", null, null, nowMs);
      this.#dependencies.incrementSnapshotSequence();
      return;
    }

    const segmentStart = createProjectilePositionSnapshot(projectileRuntime);
    const segmentEnd = createOffsetVector(
      segmentStart,
      projectileRuntime.direction,
      projectileRuntime.velocityMetersPerSecond * deltaSeconds
    );
    const worldHit = this.#dependencies.physicsRuntime.castRay(
      segmentStart,
      projectileRuntime.direction,
      createDistanceBetweenPoints(segmentStart, segmentEnd),
      (collider) => !this.#dependencies.playerTraversalColliderHandles.has(collider)
    );
    let closestPlayerHit:
      | {
          readonly distanceMeters: number;
          readonly hitZone: "body" | "head";
          readonly point: PhysicsVector3Snapshot;
          readonly targetPlayerId: MetaversePlayerId;
        }
      | null = null;

    for (const targetRuntime of this.#dependencies.playersById.values()) {
      if (targetRuntime.playerId === projectileRuntime.ownerPlayerId) {
        continue;
      }

      const targetCombatState =
        this.#playerCombatStateByPlayerId.get(targetRuntime.playerId) ?? null;

      if (
        targetCombatState === null ||
        !targetCombatState.alive ||
        targetCombatState.spawnProtectionRemainingMs > 0
      ) {
        continue;
      }

      const ownerRuntime =
        this.#dependencies.playersById.get(projectileRuntime.ownerPlayerId) ?? null;

      if (
        ownerRuntime !== null &&
        !this.#matchState.friendlyFireEnabled &&
        ownerRuntime.teamId === targetRuntime.teamId
      ) {
        continue;
      }

      const hurtVolumes = createMetaversePlayerCombatHurtVolumes({
        activeBodyPosition: createPlayerBodyPositionSnapshot(targetRuntime),
        ...(this.#dependencies.hurtVolumeConfig === undefined
          ? {}
          : {
              config: this.#dependencies.hurtVolumeConfig
            })
      });
      const hitResolution = resolveMetaverseCombatHitForSegment(
        segmentStart,
        segmentEnd,
        hurtVolumes
      );

      if (hitResolution === null) {
        continue;
      }

      if (
        closestPlayerHit === null ||
        hitResolution.distanceMeters < closestPlayerHit.distanceMeters
      ) {
        closestPlayerHit = {
          distanceMeters: hitResolution.distanceMeters,
          hitZone: hitResolution.hitZone,
          point: hitResolution.point,
          targetPlayerId: targetRuntime.playerId
        };
      }
    }

    if (
      worldHit !== null &&
      (closestPlayerHit === null ||
        worldHit.distanceMeters < closestPlayerHit.distanceMeters)
    ) {
      this.#resolveProjectile(
        projectileRuntime,
        "hit-world",
        null,
        null,
        nowMs
      );
      projectileRuntime.positionX = worldHit.point.x;
      projectileRuntime.positionY = worldHit.point.y;
      projectileRuntime.positionZ = worldHit.point.z;
      this.#dependencies.incrementSnapshotSequence();
      return;
    }

    if (closestPlayerHit !== null) {
      projectileRuntime.positionX = closestPlayerHit.point.x;
      projectileRuntime.positionY = closestPlayerHit.point.y;
      projectileRuntime.positionZ = closestPlayerHit.point.z;
      this.#applyPlayerHit(
        projectileRuntime,
        closestPlayerHit.targetPlayerId,
        closestPlayerHit.hitZone,
        nowMs
      );
      this.#dependencies.incrementSnapshotSequence();
      return;
    }

    projectileRuntime.positionX = segmentEnd.x;
    projectileRuntime.positionY = segmentEnd.y;
    projectileRuntime.positionZ = segmentEnd.z;
  }

  #advanceRespawnState(
    playerId: MetaversePlayerId,
    combatState: MutableMetaverseCombatPlayerRuntimeState,
    nowMs: number,
    tickIntervalSeconds: number
  ): void {
    if (combatState.alive) {
      return;
    }

    combatState.respawnRemainingMs = Math.max(
      0,
      combatState.respawnRemainingMs - tickIntervalSeconds * 1_000
    );

    if (combatState.respawnRemainingMs > 0 || this.#matchState.phase !== "active") {
      return;
    }

    const playerRuntime = this.#dependencies.playersById.get(playerId);

    if (playerRuntime === undefined) {
      return;
    }

    this.#respawnPlayer(playerRuntime, combatState, nowMs);
  }

  #advanceSpawnProtection(
    combatState: MutableMetaverseCombatPlayerRuntimeState,
    tickIntervalSeconds: number
  ): void {
    if (combatState.spawnProtectionRemainingMs <= 0) {
      return;
    }

    combatState.spawnProtectionRemainingMs = Math.max(
      0,
      combatState.spawnProtectionRemainingMs - tickIntervalSeconds * 1_000
    );
  }

  #applyPlayerHit(
    projectileRuntime: MutableMetaverseCombatProjectileRuntimeState,
    targetPlayerId: MetaversePlayerId,
    hitZone: "body" | "head",
    nowMs: number
  ): void {
    const targetCombatState =
      this.#playerCombatStateByPlayerId.get(targetPlayerId) ?? null;
    const ownerCombatState =
      this.#playerCombatStateByPlayerId.get(projectileRuntime.ownerPlayerId) ?? null;
    const targetRuntime = this.#dependencies.playersById.get(targetPlayerId) ?? null;

    if (
      targetCombatState === null ||
      ownerCombatState === null ||
      targetRuntime === null
    ) {
      this.#resolveProjectile(projectileRuntime, "expired", null, null, nowMs);
      return;
    }

    const weaponProfile = readMetaverseCombatWeaponProfile(projectileRuntime.weaponId);
    const damage =
      hitZone === "head" ? weaponProfile.damage.head : weaponProfile.damage.body;

    targetCombatState.health = Math.max(0, targetCombatState.health - damage);
    const ownerWeaponState =
      ownerCombatState.weaponsById.get(projectileRuntime.weaponId) ?? null;

    if (ownerWeaponState !== null) {
      ownerWeaponState.shotsHit += 1;
    }
    targetCombatState.damageLedgerByAttackerId.set(
      projectileRuntime.ownerPlayerId,
      (targetCombatState.damageLedgerByAttackerId.get(projectileRuntime.ownerPlayerId) ??
        0) + damage
    );

    if (targetCombatState.health > 0) {
      this.#feedEvents.push({
        attackerPlayerId: projectileRuntime.ownerPlayerId,
        damage,
        hitZone,
        sequence: ++this.#feedSequence,
        targetPlayerId,
        timeMs: nowMs,
        type: "damage",
        weaponId: projectileRuntime.weaponId
      });
      this.#trimFeedEvents();
      this.#resolveProjectile(
        projectileRuntime,
        "hit-player",
        targetPlayerId,
        hitZone,
        nowMs
      );
      return;
    }

    targetCombatState.alive = false;
    targetCombatState.deaths += 1;
    targetCombatState.health = 0;
    targetCombatState.respawnRemainingMs = this.#matchState.respawnDelayMs;
    targetCombatState.spawnProtectionRemainingMs = 0;
    ownerCombatState.kills += 1;

    if (hitZone === "head") {
      ownerCombatState.headshotKills += 1;
    }

    this.#matchState.teamScoresByTeamId.set(
      this.#dependencies.playersById.get(projectileRuntime.ownerPlayerId)?.teamId ??
        "red",
      (this.#matchState.teamScoresByTeamId.get(
        this.#dependencies.playersById.get(projectileRuntime.ownerPlayerId)?.teamId ??
          "red"
      ) ?? 0) + 1
    );

    const assisterPlayerIds = [...targetCombatState.damageLedgerByAttackerId.entries()]
      .filter(
        ([attackerPlayerId, totalDamage]) =>
          attackerPlayerId !== projectileRuntime.ownerPlayerId &&
          totalDamage >= this.#matchState.assistDamageThreshold
      )
      .map(([attackerPlayerId]) => attackerPlayerId);

    for (const assisterPlayerId of assisterPlayerIds) {
      const assisterCombatState =
        this.#playerCombatStateByPlayerId.get(assisterPlayerId) ?? null;

      if (assisterCombatState !== null) {
        assisterCombatState.assists += 1;
      }
    }

    this.#feedEvents.push({
      assisterPlayerIds: Object.freeze(assisterPlayerIds),
      attackerPlayerId: projectileRuntime.ownerPlayerId,
      headshot: hitZone === "head",
      sequence: ++this.#feedSequence,
      targetPlayerId,
      targetTeamId: targetRuntime.teamId,
      timeMs: nowMs,
      type: "kill",
      weaponId: projectileRuntime.weaponId
    });
    this.#trimFeedEvents();
    this.#resolveProjectile(
      projectileRuntime,
      "hit-player",
      targetPlayerId,
      hitZone,
      nowMs
    );

    if (
      (this.#matchState.teamScoresByTeamId.get("red") ?? 0) >=
        this.#matchState.scoreLimit ||
      (this.#matchState.teamScoresByTeamId.get("blue") ?? 0) >=
        this.#matchState.scoreLimit
    ) {
      this.#completeMatch(nowMs);
    }
  }

  #collectTeamRoster(
    teamId: MetaversePlayerTeamId
  ): readonly MetaversePlayerId[] {
    return Object.freeze(
      [...this.#dependencies.playersById.values()]
        .filter((playerRuntime) => playerRuntime.teamId === teamId)
        .map((playerRuntime) => playerRuntime.playerId)
    );
  }

  #completeMatch(nowMs: number): void {
    const redScore = this.#matchState.teamScoresByTeamId.get("red") ?? 0;
    const blueScore = this.#matchState.teamScoresByTeamId.get("blue") ?? 0;

    this.#matchState.completedAtTimeMs = nowMs;
    this.#matchState.phase = "completed";
    this.#matchState.timeRemainingMs = 0;
    this.#matchState.winnerTeamId =
      redScore === blueScore ? null : redScore > blueScore ? "red" : "blue";
  }

  #createActiveWeaponSnapshotInput(
    combatState: MutableMetaverseCombatPlayerRuntimeState
  ): MetaverseCombatPlayerWeaponSnapshotInput | null {
    const activeWeaponState =
      combatState.weaponsById.get(combatState.activeWeaponId) ?? null;

    if (activeWeaponState === null) {
      return null;
    }

    return {
      ammoInMagazine: activeWeaponState.ammoInMagazine,
      ammoInReserve: activeWeaponState.ammoInReserve,
      reloadRemainingMs: activeWeaponState.reloadRemainingMs,
      weaponId: activeWeaponState.weaponId
    };
  }

  #createProjectileSnapshotInput(
    projectileRuntime: MutableMetaverseCombatProjectileRuntimeState
  ): MetaverseCombatProjectileSnapshotInput {
    return {
      direction: projectileRuntime.direction,
      expiresAtTimeMs: projectileRuntime.expiresAtTimeMs,
      ownerPlayerId: projectileRuntime.ownerPlayerId,
      position: createProjectilePositionSnapshot(projectileRuntime),
      projectileId: projectileRuntime.projectileId,
      resolution: projectileRuntime.resolution,
      resolvedAtTimeMs: projectileRuntime.resolvedAtTimeMs,
      resolvedHitZone: projectileRuntime.resolvedHitZone,
      resolvedPlayerId: projectileRuntime.resolvedPlayerId,
      spawnedAtTimeMs: projectileRuntime.spawnedAtTimeMs,
      velocityMetersPerSecond: projectileRuntime.velocityMetersPerSecond,
      weaponId: projectileRuntime.weaponId
    };
  }

  #ensurePlayerCombatState(
    playerRuntime: PlayerRuntime
  ): MutableMetaverseCombatPlayerRuntimeState {
    const existingCombatState =
      this.#playerCombatStateByPlayerId.get(playerRuntime.playerId) ?? null;

    if (existingCombatState !== null) {
      existingCombatState.activeWeaponId = this.#resolveActiveWeaponId(
        playerRuntime,
        existingCombatState.activeWeaponId
      );
      this.#ensureWeaponRuntimeState(
        existingCombatState,
        existingCombatState.activeWeaponId
      );

      return existingCombatState;
    }

    const nextCombatState: MutableMetaverseCombatPlayerRuntimeState = {
      activeWeaponId: this.#resolveActiveWeaponId(playerRuntime, null),
      alive: true,
      assists: 0,
      damageLedgerByAttackerId: new Map(),
      deaths: 0,
      headshotKills: 0,
      health: 100,
      kills: 0,
      lastAcceptedFireSequence: 0,
      lastFireAtMs: Number.NEGATIVE_INFINITY,
      maxHealth: 100,
      respawnRemainingMs: 0,
      spawnProtectionRemainingMs:
        this.#matchState.phase === "active" ? spawnProtectionDurationMs : 0,
      weaponsById: new Map()
    };

    this.#ensureWeaponRuntimeState(nextCombatState, nextCombatState.activeWeaponId);
    this.#playerCombatStateByPlayerId.set(playerRuntime.playerId, nextCombatState);

    return nextCombatState;
  }

  #ensureWeaponRuntimeState(
    combatState: MutableMetaverseCombatPlayerRuntimeState,
    weaponId: string
  ): MutableMetaverseCombatWeaponRuntimeState {
    const existingWeaponState = combatState.weaponsById.get(weaponId) ?? null;

    if (existingWeaponState !== null) {
      return existingWeaponState;
    }

    const weaponProfile = readMetaverseCombatWeaponProfile(weaponId);
    const nextWeaponState: MutableMetaverseCombatWeaponRuntimeState = {
      ammoInMagazine: weaponProfile.magazine.magazineCapacity,
      ammoInReserve: weaponProfile.magazine.reserveCapacity,
      reloadRemainingMs: 0,
      shotsFired: 0,
      shotsHit: 0,
      weaponId
    };

    combatState.weaponsById.set(weaponId, nextWeaponState);

    return nextWeaponState;
  }

  #pruneMissingPlayerCombatState(): void {
    for (const playerId of this.#playerCombatStateByPlayerId.keys()) {
      if (!this.#dependencies.playersById.has(playerId)) {
        this.#playerCombatStateByPlayerId.delete(playerId);
      }
    }
  }

  #pruneResolvedProjectiles(nowMs: number): void {
    for (const [projectileId, projectileRuntime] of this.#projectilesById) {
      if (
        projectileRuntime.resolution !== "active" &&
        (projectileRuntime.resolvedAtTimeMs ?? nowMs) +
          projectileRetentionAfterResolutionMs <=
          nowMs
      ) {
        this.#projectilesById.delete(projectileId);
      }
    }
  }

  #resolveActiveWeaponId(
    playerRuntime: PlayerRuntime,
    requestedWeaponId: string | null
  ): string {
    const candidateWeaponId =
      requestedWeaponId ??
      playerRuntime.weaponState?.weaponId ??
      defaultCombatWeaponId;

    return readMetaverseCombatWeaponProfile(candidateWeaponId).weaponId;
  }

  #resolveProjectile(
    projectileRuntime: MutableMetaverseCombatProjectileRuntimeState,
    resolution: MetaverseCombatProjectileSnapshot["resolution"],
    resolvedPlayerId: MetaversePlayerId | null,
    resolvedHitZone: MetaverseCombatProjectileSnapshot["resolvedHitZone"],
    nowMs: number
  ): void {
    projectileRuntime.resolution = resolution;
    projectileRuntime.resolvedAtTimeMs = nowMs;
    projectileRuntime.resolvedHitZone = resolvedHitZone;
    projectileRuntime.resolvedPlayerId = resolvedPlayerId;
  }

  #respawnPlayer(
    playerRuntime: PlayerRuntime,
    combatState: MutableMetaverseCombatPlayerRuntimeState,
    nowMs: number
  ): void {
    const respawnPose = this.#dependencies.resolveRespawnPose(
      playerRuntime.playerId,
      playerRuntime.teamId
    );

    this.#dependencies.clearDriverVehicleControl(playerRuntime.playerId);
    this.#dependencies.clearPlayerTraversalIntent(playerRuntime.playerId);
    this.#dependencies.clearPlayerVehicleOccupancy(playerRuntime.playerId);
    playerRuntime.linearVelocityX = 0;
    playerRuntime.linearVelocityY = 0;
    playerRuntime.linearVelocityZ = 0;
    playerRuntime.locomotionMode = "grounded";
    playerRuntime.mountedOccupancy = null;
    playerRuntime.positionX = respawnPose.position.x;
    playerRuntime.positionY = respawnPose.position.y;
    playerRuntime.positionZ = respawnPose.position.z;
    playerRuntime.stateSequence += 1;
    playerRuntime.unmountedTraversalState = createMetaverseUnmountedTraversalStateSnapshot(
      {
        locomotionMode: "grounded"
      }
    );
    playerRuntime.yawRadians = respawnPose.yawRadians;
    playerRuntime.lookPitchRadians = 0;
    playerRuntime.lookYawRadians = respawnPose.yawRadians;
    combatState.alive = true;
    combatState.health = combatState.maxHealth;
    combatState.respawnRemainingMs = 0;
    combatState.spawnProtectionRemainingMs = spawnProtectionDurationMs;
    combatState.damageLedgerByAttackerId.clear();

    for (const weaponState of combatState.weaponsById.values()) {
      const weaponProfile = readMetaverseCombatWeaponProfile(weaponState.weaponId);

      weaponState.ammoInMagazine = weaponProfile.magazine.magazineCapacity;
      weaponState.ammoInReserve = weaponProfile.magazine.reserveCapacity;
      weaponState.reloadRemainingMs = 0;
    }

    this.#dependencies.syncPlayerTraversalBodyRuntimes(playerRuntime, true);
    this.#dependencies.syncPlayerTraversalAuthorityState(playerRuntime);
    this.#dependencies.syncAuthoritativePlayerLookToCurrentFacing(playerRuntime);
    this.#feedEvents.push({
      playerId: playerRuntime.playerId,
      sequence: ++this.#feedSequence,
      teamId: playerRuntime.teamId,
      timeMs: nowMs,
      type: "spawn"
    });
    this.#trimFeedEvents();
  }

  #startMatch(nowMs: number): void {
    this.#matchState.completedAtTimeMs = null;
    this.#matchState.phase = "active";
    this.#matchState.startedAtTimeMs = nowMs;
    this.#matchState.teamScoresByTeamId.set("red", 0);
    this.#matchState.teamScoresByTeamId.set("blue", 0);
    this.#matchState.timeRemainingMs = this.#matchState.timeLimitMs;
    this.#matchState.winnerTeamId = null;
    this.#feedEvents.length = 0;
    this.#feedSequence = 0;
    this.#projectilesById.clear();

    for (const playerRuntime of this.#dependencies.playersById.values()) {
      const combatState = this.#ensurePlayerCombatState(playerRuntime);

      combatState.assists = 0;
      combatState.deaths = 0;
      combatState.headshotKills = 0;
      combatState.kills = 0;
      combatState.lastAcceptedFireSequence = 0;
      combatState.lastFireAtMs = Number.NEGATIVE_INFINITY;
      combatState.damageLedgerByAttackerId.clear();
      this.#respawnPlayer(playerRuntime, combatState, nowMs);
    }
  }

  #startReloadIfNeeded(
    weaponState: MutableMetaverseCombatWeaponRuntimeState,
    weaponProfile: ReturnType<typeof readMetaverseCombatWeaponProfile>
  ): void {
    if (
      weaponState.reloadRemainingMs > 0 ||
      weaponState.ammoInReserve <= 0 ||
      weaponState.ammoInMagazine >= weaponProfile.magazine.magazineCapacity
    ) {
      return;
    }

    weaponState.reloadRemainingMs = Number(weaponProfile.magazine.reloadDurationMs);
  }

  #trimFeedEvents(): void {
    if (this.#feedEvents.length <= 32) {
      return;
    }

    this.#feedEvents.splice(0, this.#feedEvents.length - 32);
  }
}
