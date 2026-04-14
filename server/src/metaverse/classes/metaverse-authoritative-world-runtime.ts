import {
  advanceMetaverseSurfaceTraversalMotion,
  advanceMetaverseSurfaceTraversalSnapshot,
  clamp,
  constrainMetaverseSurfaceTraversalPositionToWorldRadius,
  wrapRadians,
  MetaverseMovementAnimationPolicyRuntime,
  createMetaverseSyncDriverVehicleControlCommand,
  createMetaverseSyncPlayerLookIntentCommand,
  createMetaverseSyncMountedOccupancyCommand,
  createMetaverseSyncPlayerTraversalIntentCommand,
  metaverseWorldAutomaticSurfaceWaterlineThresholdMeters,
  createMetaversePresencePlayerSnapshot,
  createMetaversePresencePoseSnapshot,
  createMetaversePresenceRosterEvent,
  createMetaversePresenceRosterSnapshot,
  createMetaverseRealtimeWorldEvent,
  createMetaverseRealtimeWorldSnapshot,
  createMetaverseVehicleId,
  type MetaverseRealtimeWorldClientCommand,
  type MetaverseJoinPresenceCommand,
  type MetaverseLeavePresenceCommand,
  type MetaversePlayerId,
  type MetaversePresenceCommand,
  type MetaversePresenceMountedOccupancySnapshot,
  type MetaversePresenceMountedOccupantRoleId,
  type MetaversePresencePlayerSnapshot,
  type MetaversePresencePoseSnapshot,
  type MetaversePresenceRosterEvent,
  type MetaversePresenceRosterSnapshot,
  type MetaversePlayerTraversalIntentLocomotionModeId,
  type MetaversePlayerTraversalIntentSnapshot,
  type MetaverseRealtimeMountedOccupancySnapshotInput,
  type MetaverseRealtimeWorldEvent,
  type MetaverseRealtimeWorldSnapshot,
  type MetaverseSurfaceTraversalConfig,
  type MetaverseSyncDriverVehicleControlCommand,
  type MetaverseSyncPlayerLookIntentCommand,
  type MetaverseSyncMountedOccupancyCommand,
  type MetaverseSyncPlayerTraversalIntentCommand,
  type MetaverseSyncPresenceCommand
} from "@webgpu-metaverse/shared";

import {
  metaverseAuthoritativeStaticSurfaceColliders,
  resolveMetaverseAuthoritativeDynamicSurfaceColliders,
  type MetaverseAuthoritativeSurfaceColliderSnapshot
} from "../config/metaverse-authoritative-world-surface.js";
import { metaverseAuthoritativeWorldRuntimeConfig } from "../config/metaverse-authoritative-world-runtime.js";
import {
  constrainAuthoritativePlanarPositionAgainstBlockers,
  resolveAuthoritativeAutomaticSurfaceLocomotionMode,
  resolveAuthoritativeGroundedAutostepHeightMeters,
  resolveAuthoritativeWaterSurfaceHeightMeters,
  type MetaverseAuthoritativeSurfaceConfig
} from "../states/metaverse-authoritative-surface.js";
import type { MetaverseAuthoritativeWorldRuntimeConfig } from "../types/metaverse-authoritative-world-runtime.js";

interface MetaversePlayerWorldRuntimeState {
  angularVelocityRadiansPerSecond: number;
  readonly animationRuntime: MetaverseMovementAnimationPolicyRuntime;
  readonly characterId: string;
  forwardSpeedUnitsPerSecond: number;
  lastProcessedLookSequence: number;
  lastProcessedInputSequence: number;
  lastProcessedJumpActionSequence: number;
  lastGroundedPositionY: number;
  readonly playerId: MetaversePlayerId;
  readonly username: MetaversePresencePlayerSnapshot["username"];
  animationVocabulary: MetaversePresencePoseSnapshot["animationVocabulary"];
  lastPoseAtMs: number | null;
  lastSeenAtMs: number;
  linearVelocityX: number;
  linearVelocityY: number;
  linearVelocityZ: number;
  lookPitchRadians: number;
  lookYawRadians: number;
  locomotionMode: MetaversePresencePoseSnapshot["locomotionMode"];
  mountedOccupancy: MetaverseMountedOccupancyRuntimeState | null;
  positionX: number;
  positionY: number;
  positionZ: number;
  realtimeWorldAuthorityActive: boolean;
  stateSequence: number;
  strafeSpeedUnitsPerSecond: number;
  yawRadians: number;
}

interface MetaverseMountedOccupancyRuntimeState {
  readonly entryId: string | null;
  readonly environmentAssetId: string;
  readonly occupancyKind: MetaversePresenceMountedOccupancySnapshot["occupancyKind"];
  readonly occupantRole: MetaversePresenceMountedOccupantRoleId;
  readonly seatId: string | null;
  readonly vehicleId: NonNullable<ReturnType<typeof createMetaverseVehicleId>>;
}

interface MetaverseVehicleSeatRuntimeState {
  occupantPlayerId: MetaversePlayerId | null;
  occupantRole: MetaversePresenceMountedOccupantRoleId;
  readonly seatId: string;
}

interface MetaverseVehicleWorldRuntimeState {
  readonly environmentAssetId: string;
  readonly seatsById: Map<string, MetaverseVehicleSeatRuntimeState>;
  readonly vehicleId: NonNullable<ReturnType<typeof createMetaverseVehicleId>>;
  angularVelocityRadiansPerSecond: number;
  forwardSpeedUnitsPerSecond: number;
  lastPoseAtMs: number | null;
  linearVelocityX: number;
  linearVelocityY: number;
  linearVelocityZ: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  strafeSpeedUnitsPerSecond: number;
  yawRadians: number;
}

interface MetaverseDriverVehicleControlRuntimeState {
  readonly environmentAssetId: string;
  boost: boolean;
  controlSequence: number;
  moveAxis: number;
  strafeAxis: number;
  yawAxis: number;
}

interface MetaversePlayerTraversalIntentRuntimeState {
  boost: boolean;
  inputSequence: number;
  jumpActionSequence: number;
  jump: boolean;
  locomotionMode: MetaversePlayerTraversalIntentLocomotionModeId;
  moveAxis: number;
  strafeAxis: number;
  yawAxis: number;
}

interface MetaverseAuthoritativeSurfaceTraversalConfig
  extends MetaverseSurfaceTraversalConfig {
  readonly worldRadius: number;
}

interface MetaverseAuthoritativePlayerLookConstraintBounds {
  readonly maxPitchRadians: number;
  readonly maxYawOffsetRadians: number | null;
  readonly minPitchRadians: number;
}

const metaverseAuthoritativeVehicleSurfaceDriveConfig = Object.freeze({
  accelerationCurveExponent: 1.08,
  accelerationUnitsPerSecondSquared: 12,
  baseSpeedUnitsPerSecond: 10.5,
  boostCurveExponent: 1.02,
  boostMultiplier: 1.55,
  decelerationUnitsPerSecondSquared: 14,
  dragCurveExponent: 1.3,
  maxTurnSpeedRadiansPerSecond: 0.95,
  worldRadius: 110
});

const metaverseAuthoritativeGroundedTraversalConfig = Object.freeze({
  accelerationCurveExponent: 1.22,
  accelerationUnitsPerSecondSquared: 22,
  baseSpeedUnitsPerSecond: 8.5,
  boostCurveExponent: 1.08,
  boostMultiplier: 1.75,
  decelerationUnitsPerSecondSquared: 30,
  dragCurveExponent: 1.5,
  maxTurnSpeedRadiansPerSecond: 3.6,
  worldRadius: 110
} satisfies MetaverseAuthoritativeSurfaceTraversalConfig);

const metaverseAuthoritativeSwimTraversalConfig = Object.freeze({
  accelerationCurveExponent: 1.15,
  accelerationUnitsPerSecondSquared: 13,
  baseSpeedUnitsPerSecond: 6.4,
  boostCurveExponent: 1.1,
  boostMultiplier: 1.45,
  decelerationUnitsPerSecondSquared: 12,
  dragCurveExponent: 1.35,
  maxTurnSpeedRadiansPerSecond: 3.2,
  worldRadius: 110
} satisfies MetaverseAuthoritativeSurfaceTraversalConfig);

const metaverseAuthoritativeOceanHeightMeters = 0;
const metaverseAuthoritativeGroundedBodyConfig = Object.freeze({
  capsuleHalfHeightMeters: 0.48,
  capsuleRadiusMeters: 0.34,
  gravityUnitsPerSecond: 18,
  jumpImpulseUnitsPerSecond: 6.8,
  oceanHeightMeters: metaverseAuthoritativeOceanHeightMeters,
  stepHeightMeters: 0.28
} satisfies MetaverseAuthoritativeSurfaceConfig);
const metaverseAuthoritativeGroundedGravityUnitsPerSecond = 18;
const metaverseAuthoritativeGroundedJumpImpulseUnitsPerSecond = 6.8;
const metaverseAuthoritativeGroundedSnapToleranceMeters = 0.0001;
const metaverseAuthoritativeUnmountedPlayerLookConstraintBounds = Object.freeze({
  maxPitchRadians: 0.6,
  maxYawOffsetRadians: null,
  minPitchRadians: -0.6
} satisfies MetaverseAuthoritativePlayerLookConstraintBounds);
const metaverseAuthoritativeDriverPlayerLookConstraintBounds = Object.freeze({
  maxPitchRadians: 0.6,
  maxYawOffsetRadians: 0,
  minPitchRadians: -0.6
} satisfies MetaverseAuthoritativePlayerLookConstraintBounds);
const metaverseAuthoritativePassengerPlayerLookConstraintBounds = Object.freeze({
  maxPitchRadians: 0.42,
  maxYawOffsetRadians: Math.PI * 0.45,
  minPitchRadians: -0.42
} satisfies MetaverseAuthoritativePlayerLookConstraintBounds);
const metaverseAuthoritativeTurretPlayerLookConstraintBounds = Object.freeze({
  maxPitchRadians: 0.55,
  maxYawOffsetRadians: Math.PI * 0.6,
  minPitchRadians: -0.5
} satisfies MetaverseAuthoritativePlayerLookConstraintBounds);

function resolveAuthoritativeWaterlineHeightMeters(
  position: {
    readonly y?: number;
    readonly x: number;
    readonly z: number;
  }
): number {
  return resolveAuthoritativeWaterSurfaceHeightMeters(
    metaverseAuthoritativeGroundedBodyConfig,
    {
      x: position.x,
      z: position.z
    }
  ) ??
    (Number.isFinite(position.y ?? Number.NaN) ? (position.y ?? 0) : 0);
}

function sortPlayerIds(leftPlayerId: MetaversePlayerId, rightPlayerId: MetaversePlayerId): number {
  if (leftPlayerId < rightPlayerId) {
    return -1;
  }

  if (leftPlayerId > rightPlayerId) {
    return 1;
  }

  return 0;
}

function sortVehicleIds(
  leftVehicleId: MetaverseVehicleWorldRuntimeState["vehicleId"],
  rightVehicleId: MetaverseVehicleWorldRuntimeState["vehicleId"]
): number {
  if (leftVehicleId < rightVehicleId) {
    return -1;
  }

  if (leftVehicleId > rightVehicleId) {
    return 1;
  }

  return 0;
}

function normalizeNowMs(nowMs: number): number {
  if (!Number.isFinite(nowMs)) {
    return 0;
  }

  return Math.max(0, nowMs);
}

function isOlderPresenceUpdate(
  currentStateSequence: number,
  nextPose: MetaversePresencePoseSnapshot
): boolean {
  return nextPose.stateSequence < currentStateSequence;
}

function hasExplicitPresenceLook(nextPose: MetaversePresencePoseSnapshot): boolean {
  return (
    nextPose.look.pitchRadians !== 0 ||
    nextPose.look.yawRadians !== nextPose.yawRadians
  );
}

function computeSecondsBetween(
  previousTimeMs: number | null,
  nowMs: number
): number | null {
  if (previousTimeMs === null) {
    return null;
  }

  const deltaSeconds = (nowMs - previousTimeMs) / 1_000;

  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
    return null;
  }

  return deltaSeconds;
}

function normalizeAngularDeltaRadians(rawValue: number): number {
  return wrapRadians(rawValue);
}

function clampAxis(rawValue: number): number {
  return clamp(rawValue, -1, 1);
}

function resolveTraversalInputMagnitude(
  moveAxis: number,
  strafeAxis: number
): number {
  return Math.hypot(clampAxis(moveAxis), clampAxis(strafeAxis));
}

function isGroundedUnmountedPlayerRuntime(
  playerRuntime: MetaversePlayerWorldRuntimeState
): boolean {
  return (
    Math.abs(playerRuntime.positionY - playerRuntime.lastGroundedPositionY) <=
      metaverseAuthoritativeGroundedSnapToleranceMeters &&
    Math.abs(playerRuntime.linearVelocityY) <=
      metaverseAuthoritativeGroundedSnapToleranceMeters
  );
}

function resolveAuthoritativePlayerLookConstraintBounds(
  playerRuntime: MetaversePlayerWorldRuntimeState
): MetaverseAuthoritativePlayerLookConstraintBounds {
  if (playerRuntime.mountedOccupancy === null) {
    return metaverseAuthoritativeUnmountedPlayerLookConstraintBounds;
  }

  switch (playerRuntime.mountedOccupancy.occupantRole) {
    case "driver":
      return metaverseAuthoritativeDriverPlayerLookConstraintBounds;
    case "turret":
      return metaverseAuthoritativeTurretPlayerLookConstraintBounds;
    case "passenger":
    default:
      return metaverseAuthoritativePassengerPlayerLookConstraintBounds;
  }
}

function createMountedOccupancyRuntimeState(
  mountedOccupancy: MetaversePresenceMountedOccupancySnapshot,
  vehicleId: NonNullable<ReturnType<typeof createMetaverseVehicleId>>
): MetaverseMountedOccupancyRuntimeState {
  return Object.freeze({
    entryId: mountedOccupancy.entryId,
    environmentAssetId: mountedOccupancy.environmentAssetId,
    occupancyKind: mountedOccupancy.occupancyKind,
    occupantRole: mountedOccupancy.occupantRole,
    seatId: mountedOccupancy.seatId,
    vehicleId
  });
}

export class MetaverseAuthoritativeWorldRuntime {
  readonly #config: MetaverseAuthoritativeWorldRuntimeConfig;
  readonly #driverVehicleControlsByPlayerId = new Map<
    MetaversePlayerId,
    MetaverseDriverVehicleControlRuntimeState
  >();
  readonly #playerTraversalIntentsByPlayerId = new Map<
    MetaversePlayerId,
    MetaversePlayerTraversalIntentRuntimeState
  >();
  readonly #playersById = new Map<MetaversePlayerId, MetaversePlayerWorldRuntimeState>();
  readonly #vehicleIdsByEnvironmentAssetId = new Map<
    string,
    NonNullable<ReturnType<typeof createMetaverseVehicleId>>
  >();
  readonly #vehiclesById = new Map<
    NonNullable<ReturnType<typeof createMetaverseVehicleId>>,
    MetaverseVehicleWorldRuntimeState
  >();

  #currentTick = 0;
  #lastAdvancedAtMs: number | null = null;
  #nextVehicleOrdinal = 1;
  #snapshotSequence = 0;

  constructor(config: Partial<MetaverseAuthoritativeWorldRuntimeConfig> = {}) {
    this.#config = {
      playerInactivityTimeoutMs:
        config.playerInactivityTimeoutMs ??
        metaverseAuthoritativeWorldRuntimeConfig.playerInactivityTimeoutMs,
      tickIntervalMs:
        config.tickIntervalMs ??
        metaverseAuthoritativeWorldRuntimeConfig.tickIntervalMs
    };
  }

  #resolveAuthoritativeSurfaceColliders():
    readonly MetaverseAuthoritativeSurfaceColliderSnapshot[] {
    const surfaceColliders: MetaverseAuthoritativeSurfaceColliderSnapshot[] = [
      ...metaverseAuthoritativeStaticSurfaceColliders
    ];

    for (const vehicleRuntime of this.#vehiclesById.values()) {
      if (vehicleRuntime.lastPoseAtMs === null) {
        continue;
      }

      surfaceColliders.push(
        ...resolveMetaverseAuthoritativeDynamicSurfaceColliders(
          vehicleRuntime.environmentAssetId,
          {
            position: {
              x: vehicleRuntime.positionX,
              y: vehicleRuntime.positionY,
              z: vehicleRuntime.positionZ
            },
            yawRadians: vehicleRuntime.yawRadians
          }
        )
      );
    }

    return surfaceColliders;
  }

  #syncUnmountedPlayerToAuthoritativeSurface(
    playerRuntime: MetaversePlayerWorldRuntimeState,
    surfaceColliders: readonly MetaverseAuthoritativeSurfaceColliderSnapshot[],
    excludedOwnerEnvironmentAssetId: string | null = null
  ): void {
    const filteredSurfaceColliders =
      excludedOwnerEnvironmentAssetId === null
        ? surfaceColliders
        : surfaceColliders.filter(
            (surfaceCollider) =>
              surfaceCollider.ownerEnvironmentAssetId !==
              excludedOwnerEnvironmentAssetId
          );
    const waterlineHeightMeters = resolveAuthoritativeWaterlineHeightMeters({
      y: playerRuntime.positionY,
      x: playerRuntime.positionX,
      z: playerRuntime.positionZ
    });
    const locomotionDecision = resolveAuthoritativeAutomaticSurfaceLocomotionMode(
      metaverseAuthoritativeGroundedBodyConfig,
      filteredSurfaceColliders,
      {
        x: playerRuntime.positionX,
        y: playerRuntime.positionY,
        z: playerRuntime.positionZ
      },
      playerRuntime.yawRadians,
      playerRuntime.locomotionMode === "swim" ? "swim" : "grounded"
    );

    if (
      locomotionDecision.locomotionMode === "grounded" &&
      locomotionDecision.supportHeightMeters !== null
    ) {
      playerRuntime.positionY = locomotionDecision.supportHeightMeters;
      playerRuntime.lastGroundedPositionY =
        locomotionDecision.supportHeightMeters;
      playerRuntime.locomotionMode = "grounded";
      playerRuntime.animationRuntime.reset("idle");
      playerRuntime.animationVocabulary =
        playerRuntime.animationRuntime.animationVocabulary;
      return;
    }

    playerRuntime.positionY = waterlineHeightMeters;
    playerRuntime.locomotionMode = "swim";
    playerRuntime.animationRuntime.reset("swim-idle");
    playerRuntime.animationVocabulary =
      playerRuntime.animationRuntime.animationVocabulary;
  }

  get tickIntervalMs(): number {
    return Number(this.#config.tickIntervalMs);
  }

  readPresenceRosterSnapshot(
    nowMs: number,
    observerPlayerId?: MetaversePlayerId
  ): MetaversePresenceRosterSnapshot {
    const worldSnapshot = this.readWorldSnapshot(nowMs, observerPlayerId);

    return createMetaversePresenceRosterSnapshot({
      players: worldSnapshot.players.map((playerSnapshot) =>
        createMetaversePresencePlayerSnapshot({
          characterId: playerSnapshot.characterId,
          playerId: playerSnapshot.playerId,
          pose: createMetaversePresencePoseSnapshot({
            animationVocabulary: playerSnapshot.animationVocabulary,
            look: {
              pitchRadians: playerSnapshot.look.pitchRadians,
              yawRadians: playerSnapshot.look.yawRadians
            },
            locomotionMode: playerSnapshot.locomotionMode,
            mountedOccupancy:
              playerSnapshot.mountedOccupancy === null
                ? null
                : {
                    environmentAssetId:
                      playerSnapshot.mountedOccupancy.environmentAssetId,
                    entryId: playerSnapshot.mountedOccupancy.entryId,
                    occupancyKind: playerSnapshot.mountedOccupancy.occupancyKind,
                    occupantRole: playerSnapshot.mountedOccupancy.occupantRole,
                    seatId: playerSnapshot.mountedOccupancy.seatId
                  },
            position: playerSnapshot.position,
            stateSequence: playerSnapshot.stateSequence,
            yawRadians: playerSnapshot.yawRadians
          }),
          username: playerSnapshot.username
        })
      ),
      snapshotSequence: worldSnapshot.snapshotSequence,
      tickIntervalMs: Number(worldSnapshot.tick.tickIntervalMs)
    });
  }

  readPresenceRosterEvent(
    nowMs: number,
    observerPlayerId?: MetaversePlayerId
  ): MetaversePresenceRosterEvent {
    return createMetaversePresenceRosterEvent(
      this.readPresenceRosterSnapshot(nowMs, observerPlayerId)
    );
  }

  readWorldSnapshot(
    nowMs: number,
    observerPlayerId?: MetaversePlayerId
  ): MetaverseRealtimeWorldSnapshot {
    const normalizedNowMs = normalizeNowMs(nowMs);

    if (
      observerPlayerId !== undefined &&
      !this.#playersById.has(observerPlayerId)
    ) {
      throw new Error(`Unknown metaverse player: ${observerPlayerId}`);
    }

    if (observerPlayerId !== undefined) {
      this.#recordObserverHeartbeat(observerPlayerId, normalizedNowMs);
    }

    const players = [...this.#playersById.values()]
      .sort((leftPlayer, rightPlayer) =>
        sortPlayerIds(leftPlayer.playerId, rightPlayer.playerId)
      )
      .map((playerRuntime) => ({
        angularVelocityRadiansPerSecond:
          playerRuntime.angularVelocityRadiansPerSecond,
        animationVocabulary: playerRuntime.animationVocabulary,
        characterId: playerRuntime.characterId,
        lastProcessedInputSequence: playerRuntime.lastProcessedInputSequence,
        linearVelocity: {
          x: playerRuntime.linearVelocityX,
          y: playerRuntime.linearVelocityY,
          z: playerRuntime.linearVelocityZ
        },
        look: {
          pitchRadians: playerRuntime.lookPitchRadians,
          yawRadians: playerRuntime.lookYawRadians
        },
        locomotionMode: playerRuntime.locomotionMode,
        ...(playerRuntime.mountedOccupancy === null
          ? {}
          : playerRuntime.mountedOccupancy.occupancyKind === "entry"
            ? {
                mountedOccupancy: {
                  entryId: playerRuntime.mountedOccupancy.entryId,
                  environmentAssetId:
                    playerRuntime.mountedOccupancy.environmentAssetId,
                  occupancyKind: playerRuntime.mountedOccupancy.occupancyKind,
                  occupantRole: playerRuntime.mountedOccupancy.occupantRole,
                  seatId: playerRuntime.mountedOccupancy.seatId,
                  vehicleId: playerRuntime.mountedOccupancy.vehicleId
                } satisfies MetaverseRealtimeMountedOccupancySnapshotInput
              }
            : {}),
        playerId: playerRuntime.playerId,
        position: {
          x: playerRuntime.positionX,
          y: playerRuntime.positionY,
          z: playerRuntime.positionZ
        },
        stateSequence: playerRuntime.stateSequence,
        username: playerRuntime.username,
        yawRadians: playerRuntime.yawRadians
      }));
    const vehicles = [...this.#vehiclesById.values()]
      .sort((leftVehicle, rightVehicle) =>
        sortVehicleIds(leftVehicle.vehicleId, rightVehicle.vehicleId)
      )
      .map((vehicleRuntime) => ({
        angularVelocityRadiansPerSecond:
          vehicleRuntime.angularVelocityRadiansPerSecond,
        environmentAssetId: vehicleRuntime.environmentAssetId,
        linearVelocity: {
          x: vehicleRuntime.linearVelocityX,
          y: vehicleRuntime.linearVelocityY,
          z: vehicleRuntime.linearVelocityZ
        },
        position: {
          x: vehicleRuntime.positionX,
          y: vehicleRuntime.positionY,
          z: vehicleRuntime.positionZ
        },
        seats: [...vehicleRuntime.seatsById.values()]
          .sort((leftSeat, rightSeat) =>
            leftSeat.seatId.localeCompare(rightSeat.seatId)
          )
          .map((seatRuntime) => ({
            occupantPlayerId: seatRuntime.occupantPlayerId,
            occupantRole: seatRuntime.occupantRole,
            seatId: seatRuntime.seatId
          })),
        vehicleId: vehicleRuntime.vehicleId,
        yawRadians: vehicleRuntime.yawRadians
      }));

    return createMetaverseRealtimeWorldSnapshot({
      players,
      snapshotSequence: this.#snapshotSequence,
      tick: {
        currentTick: this.#currentTick,
        emittedAtServerTimeMs: normalizedNowMs,
        simulationTimeMs: this.#lastAdvancedAtMs ?? normalizedNowMs,
        tickIntervalMs: Number(this.#config.tickIntervalMs)
      },
      vehicles
    });
  }

  advanceToTime(nowMs: number): void {
    const normalizedNowMs = normalizeNowMs(nowMs);

    this.#advanceToTime(normalizedNowMs);
    this.#pruneInactivePlayers(normalizedNowMs);
  }

  readWorldEvent(
    nowMs: number,
    observerPlayerId?: MetaversePlayerId
  ): MetaverseRealtimeWorldEvent {
    return createMetaverseRealtimeWorldEvent({
      world: this.readWorldSnapshot(nowMs, observerPlayerId)
    });
  }

  acceptPresenceCommand(
    command: MetaversePresenceCommand,
    nowMs: number
  ): MetaversePresenceRosterEvent {
    const normalizedNowMs = normalizeNowMs(nowMs);

    this.advanceToTime(normalizedNowMs);

    switch (command.type) {
      case "join-presence":
        this.#acceptJoinCommand(command, normalizedNowMs);
        break;
      case "leave-presence":
        this.#acceptLeaveCommand(command);
        break;
      case "sync-presence":
        this.#acceptSyncCommand(command, normalizedNowMs);
        break;
      default: {
        const exhaustiveCommand: never = command;

        throw new Error(
          `Unsupported metaverse presence command type: ${exhaustiveCommand}`
        );
      }
    }

    return this.readPresenceRosterEvent(normalizedNowMs);
  }

  acceptWorldCommand(
    command: MetaverseRealtimeWorldClientCommand,
    nowMs: number
  ): MetaverseRealtimeWorldEvent {
    const normalizedNowMs = normalizeNowMs(nowMs);

    this.advanceToTime(normalizedNowMs);

    switch (command.type) {
      case "sync-driver-vehicle-control":
        this.#acceptSyncDriverVehicleControlCommand(command, normalizedNowMs);
        break;
      case "sync-mounted-occupancy":
        this.#acceptSyncMountedOccupancyCommand(command, normalizedNowMs);
        break;
      case "sync-player-look-intent":
        this.#acceptSyncPlayerLookIntentCommand(command, normalizedNowMs);
        break;
      case "sync-player-traversal-intent":
        this.#acceptSyncPlayerTraversalIntentCommand(command, normalizedNowMs);
        break;
      default: {
        const exhaustiveCommand: never = command;

        throw new Error(
          `Unsupported metaverse realtime world command type: ${exhaustiveCommand}`
        );
      }
    }

    return this.readWorldEvent(normalizedNowMs);
  }

  #acceptJoinCommand(
    command: MetaverseJoinPresenceCommand,
    nowMs: number
  ): void {
    const nextPose = createMetaversePresencePoseSnapshot(command.pose);
    const currentPlayer = this.#playersById.get(command.playerId);

    if (
      currentPlayer !== undefined &&
      isOlderPresenceUpdate(currentPlayer.stateSequence, nextPose)
    ) {
      currentPlayer.lastSeenAtMs = nowMs;
      return;
    }

    const playerRuntime =
      currentPlayer ??
      this.#createPlayerRuntimeState(
        command.playerId,
        command.characterId,
        command.username,
        nowMs
      );

    playerRuntime.lastSeenAtMs = nowMs;

    if (currentPlayer !== undefined && playerRuntime.realtimeWorldAuthorityActive) {
      return;
    }

    this.#applyPlayerPose(
      playerRuntime,
      nextPose,
      nowMs,
      hasExplicitPresenceLook(nextPose)
    );
    this.#playersById.set(command.playerId, playerRuntime);
    this.#snapshotSequence += 1;
  }

  #acceptLeaveCommand(command: MetaverseLeavePresenceCommand): void {
    const playerRuntime = this.#playersById.get(command.playerId);

    if (playerRuntime === undefined) {
      throw new Error(`Unknown metaverse player: ${command.playerId}`);
    }

    this.#clearDriverVehicleControl(command.playerId);
    this.#clearPlayerTraversalIntent(command.playerId);
    this.#clearPlayerVehicleOccupancy(command.playerId);
    this.#playersById.delete(command.playerId);
    this.#snapshotSequence += 1;
  }

  #acceptSyncCommand(
    command: MetaverseSyncPresenceCommand,
    nowMs: number
  ): void {
    const nextPose = createMetaversePresencePoseSnapshot(command.pose);

    this.#acceptPlayerPoseCommand(
      command.playerId,
      nextPose,
      nowMs,
      hasExplicitPresenceLook(nextPose)
    );
  }

  #acceptSyncPlayerTraversalIntentCommand(
    command: MetaverseSyncPlayerTraversalIntentCommand,
    nowMs: number
  ): void {
    const normalizedCommand =
      createMetaverseSyncPlayerTraversalIntentCommand(command);
    const playerRuntime = this.#playersById.get(normalizedCommand.playerId);

    if (playerRuntime === undefined) {
      throw new Error(
        `Unknown metaverse player: ${normalizedCommand.playerId}`
      );
    }

    playerRuntime.realtimeWorldAuthorityActive = true;

    if (playerRuntime.mountedOccupancy !== null) {
      playerRuntime.lastSeenAtMs = nowMs;
      return;
    }

    const existingTraversalIntent =
      this.#playerTraversalIntentsByPlayerId.get(normalizedCommand.playerId);

    if (
      existingTraversalIntent !== undefined &&
      normalizedCommand.intent.inputSequence <= existingTraversalIntent.inputSequence
    ) {
      playerRuntime.lastSeenAtMs = nowMs;
      return;
    }

    this.#playerTraversalIntentsByPlayerId.set(normalizedCommand.playerId, {
      boost: normalizedCommand.intent.boost,
      inputSequence: normalizedCommand.intent.inputSequence,
      jumpActionSequence: normalizedCommand.intent.jumpActionSequence,
      jump: normalizedCommand.intent.jump,
      locomotionMode: normalizedCommand.intent.locomotionMode,
      moveAxis: normalizedCommand.intent.moveAxis,
      strafeAxis: normalizedCommand.intent.strafeAxis,
      yawAxis: normalizedCommand.intent.yawAxis
    });
    playerRuntime.lastSeenAtMs = nowMs;
  }

  #acceptSyncPlayerLookIntentCommand(
    command: MetaverseSyncPlayerLookIntentCommand,
    nowMs: number
  ): void {
    const normalizedCommand = createMetaverseSyncPlayerLookIntentCommand(command);
    const playerRuntime = this.#playersById.get(normalizedCommand.playerId);

    if (playerRuntime === undefined) {
      throw new Error(
        `Unknown metaverse player: ${normalizedCommand.playerId}`
      );
    }

    playerRuntime.realtimeWorldAuthorityActive = true;
    playerRuntime.lastSeenAtMs = nowMs;

    if (
      normalizedCommand.lookSequence <= playerRuntime.lastProcessedLookSequence
    ) {
      return;
    }

    const constrainedLookIntent =
      this.#resolveConstrainedPlayerLookIntent(
        playerRuntime,
        normalizedCommand.lookIntent.pitchRadians,
        normalizedCommand.lookIntent.yawRadians
      );

    const lookChanged =
      playerRuntime.lookPitchRadians !== constrainedLookIntent.pitchRadians ||
      playerRuntime.lookYawRadians !== constrainedLookIntent.yawRadians;

    playerRuntime.lastProcessedLookSequence = normalizedCommand.lookSequence;
    playerRuntime.lookPitchRadians = constrainedLookIntent.pitchRadians;
    playerRuntime.lookYawRadians = constrainedLookIntent.yawRadians;

    if (lookChanged) {
      this.#snapshotSequence += 1;
    }
  }

  #acceptSyncMountedOccupancyCommand(
    command: MetaverseSyncMountedOccupancyCommand,
    nowMs: number
  ): void {
    const normalizedCommand = createMetaverseSyncMountedOccupancyCommand(command);
    const playerRuntime = this.#playersById.get(normalizedCommand.playerId);

    if (playerRuntime === undefined) {
      throw new Error(
        `Unknown metaverse player: ${normalizedCommand.playerId}`
      );
    }

    playerRuntime.realtimeWorldAuthorityActive = true;
    playerRuntime.lastSeenAtMs = nowMs;

    if (normalizedCommand.mountedOccupancy === null) {
      const authoritativeSurfaceColliders =
        this.#resolveAuthoritativeSurfaceColliders();
      const previousMountedEnvironmentAssetId =
        playerRuntime.mountedOccupancy?.environmentAssetId ?? null;

      this.#clearPlayerVehicleOccupancy(playerRuntime.playerId);
      this.#clearDriverVehicleControl(playerRuntime.playerId);
      this.#clearPlayerTraversalIntent(playerRuntime.playerId);
      playerRuntime.animationRuntime.reset("idle");
      playerRuntime.animationVocabulary =
        playerRuntime.animationRuntime.animationVocabulary;
      playerRuntime.angularVelocityRadiansPerSecond = 0;
      playerRuntime.forwardSpeedUnitsPerSecond = 0;
      playerRuntime.linearVelocityX = 0;
      playerRuntime.linearVelocityY = 0;
      playerRuntime.linearVelocityZ = 0;
      playerRuntime.mountedOccupancy = null;
      playerRuntime.lastPoseAtMs = nowMs;
      playerRuntime.strafeSpeedUnitsPerSecond = 0;
      this.#syncUnmountedPlayerToAuthoritativeSurface(
        playerRuntime,
        authoritativeSurfaceColliders,
        previousMountedEnvironmentAssetId
      );
      this.#syncAuthoritativePlayerLookToCurrentFacing(playerRuntime);
      this.#snapshotSequence += 1;
      return;
    }

    const requestedMountedOccupancy = this.#resolveMountedOccupancyRuntimeState(
      normalizedCommand.mountedOccupancy
    );
    const acceptedMountedOccupancy = this.#resolveAcceptedMountedOccupancy(
      playerRuntime.playerId,
      requestedMountedOccupancy,
      playerRuntime.mountedOccupancy
    );

    this.#clearPlayerVehicleOccupancy(playerRuntime.playerId);
    this.#clearPlayerTraversalIntent(playerRuntime.playerId);
    playerRuntime.mountedOccupancy = acceptedMountedOccupancy;
    playerRuntime.locomotionMode =
      acceptedMountedOccupancy === null ? "grounded" : "mounted";

    if (acceptedMountedOccupancy === null) {
      const authoritativeSurfaceColliders =
        this.#resolveAuthoritativeSurfaceColliders();
      const excludedMountedEnvironmentAssetId =
        requestedMountedOccupancy?.environmentAssetId ??
        playerRuntime.mountedOccupancy?.environmentAssetId ??
        null;

      this.#clearDriverVehicleControl(playerRuntime.playerId);
      playerRuntime.animationRuntime.reset("idle");
      playerRuntime.animationVocabulary =
        playerRuntime.animationRuntime.animationVocabulary;
      playerRuntime.angularVelocityRadiansPerSecond = 0;
      playerRuntime.forwardSpeedUnitsPerSecond = 0;
      playerRuntime.linearVelocityX = 0;
      playerRuntime.linearVelocityY = 0;
      playerRuntime.linearVelocityZ = 0;
      playerRuntime.lastPoseAtMs = nowMs;
      playerRuntime.strafeSpeedUnitsPerSecond = 0;
      this.#syncUnmountedPlayerToAuthoritativeSurface(
        playerRuntime,
        authoritativeSurfaceColliders,
        excludedMountedEnvironmentAssetId
      );
      this.#syncAuthoritativePlayerLookToCurrentFacing(playerRuntime);
      this.#snapshotSequence += 1;
      return;
    }

    if (acceptedMountedOccupancy.occupantRole !== "driver") {
      this.#clearDriverVehicleControl(playerRuntime.playerId);
    }

    const vehicleRuntime = this.#syncVehicleOccupancyAndInitialPoseFromPlayer(
      playerRuntime,
      acceptedMountedOccupancy,
      nowMs
    );

    this.#syncMountedPlayerPoseFromVehicle(playerRuntime, vehicleRuntime, nowMs);
    this.#snapshotSequence += 1;
  }

  #acceptPlayerPoseCommand(
    playerId: MetaversePlayerId,
    nextPose: MetaversePresencePoseSnapshot,
    nowMs: number,
    lookProvided: boolean = false
  ): void {
    const playerRuntime = this.#playersById.get(playerId);

    if (playerRuntime === undefined) {
      throw new Error(`Unknown metaverse player: ${playerId}`);
    }

    playerRuntime.lastSeenAtMs = nowMs;

    if (isOlderPresenceUpdate(playerRuntime.stateSequence, nextPose)) {
      return;
    }

    if (playerRuntime.realtimeWorldAuthorityActive) {
      return;
    }

    this.#applyPlayerPose(playerRuntime, nextPose, nowMs, lookProvided);
    this.#snapshotSequence += 1;
  }

  #acceptSyncDriverVehicleControlCommand(
    command: MetaverseSyncDriverVehicleControlCommand,
    nowMs: number
  ): void {
    const playerRuntime = this.#playersById.get(command.playerId);

    if (playerRuntime === undefined) {
      throw new Error(`Unknown metaverse player: ${command.playerId}`);
    }

    playerRuntime.realtimeWorldAuthorityActive = true;

    const normalizedCommand =
      createMetaverseSyncDriverVehicleControlCommand(command);
    const mountedOccupancy = playerRuntime.mountedOccupancy;

    if (
      mountedOccupancy === null ||
      mountedOccupancy.occupancyKind !== "seat" ||
      mountedOccupancy.occupantRole !== "driver" ||
      mountedOccupancy.seatId === null ||
      mountedOccupancy.environmentAssetId !==
        normalizedCommand.controlIntent.environmentAssetId
    ) {
      return;
    }

    const vehicleRuntime = this.#vehiclesById.get(mountedOccupancy.vehicleId);
    const seatRuntime =
      vehicleRuntime?.seatsById.get(mountedOccupancy.seatId) ?? null;

    if (
      seatRuntime === null ||
      seatRuntime.occupantPlayerId !== command.playerId ||
      seatRuntime.occupantRole !== "driver"
    ) {
      return;
    }

    const existingControlState =
      this.#driverVehicleControlsByPlayerId.get(command.playerId);

    if (
      existingControlState !== undefined &&
      normalizedCommand.controlSequence <= existingControlState.controlSequence
    ) {
      return;
    }

    this.#driverVehicleControlsByPlayerId.set(command.playerId, {
      boost: normalizedCommand.controlIntent.boost,
      controlSequence: normalizedCommand.controlSequence,
      environmentAssetId: normalizedCommand.controlIntent.environmentAssetId,
      moveAxis: normalizedCommand.controlIntent.moveAxis,
      strafeAxis: normalizedCommand.controlIntent.strafeAxis,
      yawAxis: normalizedCommand.controlIntent.yawAxis
    });
    playerRuntime.lastSeenAtMs = nowMs;
  }

  #createPlayerRuntimeState(
    playerId: MetaversePlayerId,
    characterId: string,
    username: MetaversePresencePlayerSnapshot["username"],
    nowMs: number
  ): MetaversePlayerWorldRuntimeState {
    return {
      angularVelocityRadiansPerSecond: 0,
      animationRuntime: new MetaverseMovementAnimationPolicyRuntime(),
      animationVocabulary: "idle",
      characterId,
      forwardSpeedUnitsPerSecond: 0,
      lastProcessedLookSequence: 0,
      lastProcessedInputSequence: 0,
      lastProcessedJumpActionSequence: 0,
      lastGroundedPositionY: 0,
      lastPoseAtMs: null,
      lastSeenAtMs: nowMs,
      linearVelocityX: 0,
      linearVelocityY: 0,
      linearVelocityZ: 0,
      lookPitchRadians: 0,
      lookYawRadians: 0,
      locomotionMode: "grounded",
      mountedOccupancy: null,
      playerId,
      positionX: 0,
      positionY: 0,
      positionZ: 0,
      realtimeWorldAuthorityActive: false,
      stateSequence: 0,
      strafeSpeedUnitsPerSecond: 0,
      username,
      yawRadians: 0
    };
  }

  #applyPlayerPose(
    playerRuntime: MetaversePlayerWorldRuntimeState,
    nextPose: MetaversePresencePoseSnapshot,
    nowMs: number,
    lookProvided: boolean = false
  ): void {
    const requestedMountedOccupancy = this.#resolveMountedOccupancyRuntimeState(
      nextPose.mountedOccupancy
    );
    const acceptedMountedOccupancy = this.#resolveAcceptedMountedOccupancy(
      playerRuntime.playerId,
      requestedMountedOccupancy,
      playerRuntime.mountedOccupancy
    );

    this.#clearPlayerVehicleOccupancy(playerRuntime.playerId);
    this.#clearPlayerTraversalIntent(playerRuntime.playerId);

    playerRuntime.animationRuntime.reset(nextPose.animationVocabulary);
    playerRuntime.animationVocabulary =
      playerRuntime.animationRuntime.animationVocabulary;
    playerRuntime.forwardSpeedUnitsPerSecond = 0;
    playerRuntime.lastProcessedInputSequence = nextPose.stateSequence;
    playerRuntime.lastProcessedJumpActionSequence = 0;
    playerRuntime.lastGroundedPositionY = nextPose.position.y;
    playerRuntime.locomotionMode =
      acceptedMountedOccupancy === null && requestedMountedOccupancy !== null
        ? "grounded"
        : nextPose.locomotionMode;
    playerRuntime.stateSequence = nextPose.stateSequence;
    playerRuntime.strafeSpeedUnitsPerSecond = 0;
    playerRuntime.mountedOccupancy = acceptedMountedOccupancy;

    if (playerRuntime.mountedOccupancy === null) {
      this.#clearDriverVehicleControl(playerRuntime.playerId);
      this.#applyPlayerWorldPoseFromPresence(playerRuntime, nextPose, nowMs);

      if (requestedMountedOccupancy !== null) {
        this.#syncUnmountedPlayerToAuthoritativeSurface(
          playerRuntime,
          this.#resolveAuthoritativeSurfaceColliders(),
          requestedMountedOccupancy.environmentAssetId
        );
      }

      this.#syncPlayerLookFromPresence(playerRuntime, nextPose, lookProvided);

      return;
    }

    if (playerRuntime.mountedOccupancy.occupantRole !== "driver") {
      this.#clearDriverVehicleControl(playerRuntime.playerId);
    }

    const previousMountedFacingYawRadians = playerRuntime.yawRadians;

    playerRuntime.positionX = nextPose.position.x;
    playerRuntime.positionY = nextPose.position.y;
    playerRuntime.positionZ = nextPose.position.z;
    playerRuntime.yawRadians = nextPose.yawRadians;

    const vehicleRuntime = this.#syncVehicleOccupancyAndInitialPoseFromPlayer(
      playerRuntime,
      playerRuntime.mountedOccupancy,
      nowMs
    );

    this.#syncMountedPlayerPoseFromVehicle(
      playerRuntime,
      vehicleRuntime,
      nowMs,
      previousMountedFacingYawRadians
    );
    this.#syncPlayerLookFromPresence(playerRuntime, nextPose, lookProvided);
  }

  #resolveMountedOccupancyRuntimeState(
    mountedOccupancy: MetaversePresenceMountedOccupancySnapshot | null
  ): MetaverseMountedOccupancyRuntimeState | null {
    if (mountedOccupancy === null) {
      return null;
    }

    return createMountedOccupancyRuntimeState(
      mountedOccupancy,
      this.#resolveVehicleId(mountedOccupancy.environmentAssetId)
    );
  }

  #resolveAcceptedMountedOccupancy(
    playerId: MetaversePlayerId,
    requestedMountedOccupancy: MetaverseMountedOccupancyRuntimeState | null,
    previousMountedOccupancy: MetaverseMountedOccupancyRuntimeState | null
  ): MetaverseMountedOccupancyRuntimeState | null {
    if (
      requestedMountedOccupancy !== null &&
      this.#canPlayerOccupyMountedSeat(playerId, requestedMountedOccupancy)
    ) {
      return requestedMountedOccupancy;
    }

    if (
      previousMountedOccupancy !== null &&
      this.#canPlayerOccupyMountedSeat(playerId, previousMountedOccupancy)
    ) {
      return previousMountedOccupancy;
    }

    return null;
  }

  #canPlayerOccupyMountedSeat(
    playerId: MetaversePlayerId,
    mountedOccupancy: MetaverseMountedOccupancyRuntimeState
  ): boolean {
    if (
      mountedOccupancy.occupancyKind !== "seat" ||
      mountedOccupancy.seatId === null
    ) {
      return true;
    }

    const vehicleRuntime = this.#ensureVehicleRuntime(
      mountedOccupancy.environmentAssetId,
      mountedOccupancy.vehicleId
    );
    const existingSeatRuntime = vehicleRuntime.seatsById.get(
      mountedOccupancy.seatId
    );

    return (
      existingSeatRuntime === undefined ||
      existingSeatRuntime.occupantPlayerId === null ||
      existingSeatRuntime.occupantPlayerId === playerId
    );
  }

  #applyPlayerWorldPoseFromPresence(
    playerRuntime: MetaversePlayerWorldRuntimeState,
    nextPose: MetaversePresencePoseSnapshot,
    nowMs: number
  ): void {
    const deltaSeconds = computeSecondsBetween(playerRuntime.lastPoseAtMs, nowMs);
    const previousPositionX = playerRuntime.positionX;
    const previousPositionY = playerRuntime.positionY;
    const previousPositionZ = playerRuntime.positionZ;
    const previousYawRadians = playerRuntime.yawRadians;

    playerRuntime.positionX = nextPose.position.x;
    playerRuntime.positionY = nextPose.position.y;
    playerRuntime.positionZ = nextPose.position.z;
    playerRuntime.yawRadians = nextPose.yawRadians;
    if (playerRuntime.locomotionMode === "grounded") {
      playerRuntime.lastGroundedPositionY = nextPose.position.y;
    }

    if (deltaSeconds === null) {
      playerRuntime.angularVelocityRadiansPerSecond = 0;
      playerRuntime.forwardSpeedUnitsPerSecond = 0;
      playerRuntime.linearVelocityX = 0;
      playerRuntime.linearVelocityY = 0;
      playerRuntime.linearVelocityZ = 0;
      playerRuntime.strafeSpeedUnitsPerSecond = 0;
    } else {
      playerRuntime.angularVelocityRadiansPerSecond =
        normalizeAngularDeltaRadians(
          playerRuntime.yawRadians - previousYawRadians
        ) / deltaSeconds;
      playerRuntime.linearVelocityX =
        (playerRuntime.positionX - previousPositionX) / deltaSeconds;
      playerRuntime.linearVelocityY =
        (playerRuntime.positionY - previousPositionY) / deltaSeconds;
      playerRuntime.linearVelocityZ =
        (playerRuntime.positionZ - previousPositionZ) / deltaSeconds;
      const forwardX = Math.sin(playerRuntime.yawRadians);
      const forwardZ = -Math.cos(playerRuntime.yawRadians);
      const rightX = Math.cos(playerRuntime.yawRadians);
      const rightZ = Math.sin(playerRuntime.yawRadians);

      playerRuntime.forwardSpeedUnitsPerSecond =
        playerRuntime.linearVelocityX * forwardX +
        playerRuntime.linearVelocityZ * forwardZ;
      playerRuntime.strafeSpeedUnitsPerSecond =
        playerRuntime.linearVelocityX * rightX +
        playerRuntime.linearVelocityZ * rightZ;
    }

    playerRuntime.lastPoseAtMs = nowMs;
  }

  #syncPlayerLookFromPresence(
    playerRuntime: MetaversePlayerWorldRuntimeState,
    nextPose: MetaversePresencePoseSnapshot,
    lookProvided: boolean
  ): void {
    if (!lookProvided) {
      playerRuntime.lastProcessedLookSequence = 0;
      this.#syncImplicitPlayerLookFromBodyYaw(playerRuntime);
      return;
    }

    const constrainedLookIntent = this.#resolveConstrainedPlayerLookIntent(
      playerRuntime,
      nextPose.look.pitchRadians,
      nextPose.look.yawRadians
    );

    playerRuntime.lastProcessedLookSequence = Math.max(1, nextPose.stateSequence);
    playerRuntime.lookPitchRadians = constrainedLookIntent.pitchRadians;
    playerRuntime.lookYawRadians = constrainedLookIntent.yawRadians;
  }

  #syncVehicleOccupancyAndInitialPoseFromPlayer(
    playerRuntime: MetaversePlayerWorldRuntimeState,
    mountedOccupancy: MetaverseMountedOccupancyRuntimeState,
    nowMs: number
  ): MetaverseVehicleWorldRuntimeState {
    const vehicleRuntime = this.#ensureVehicleRuntime(
      mountedOccupancy.environmentAssetId,
      mountedOccupancy.vehicleId
    );

    if (mountedOccupancy.occupancyKind === "seat" && mountedOccupancy.seatId !== null) {
      const seatRuntime = this.#ensureVehicleSeatRuntime(
        vehicleRuntime,
        mountedOccupancy.seatId,
        mountedOccupancy.occupantRole
      );

      seatRuntime.occupantPlayerId = playerRuntime.playerId;
      seatRuntime.occupantRole = mountedOccupancy.occupantRole;
    }

    if (vehicleRuntime.lastPoseAtMs === null) {
      vehicleRuntime.angularVelocityRadiansPerSecond = 0;
      vehicleRuntime.forwardSpeedUnitsPerSecond = 0;
      vehicleRuntime.linearVelocityX = 0;
      vehicleRuntime.linearVelocityY = 0;
      vehicleRuntime.linearVelocityZ = 0;
      vehicleRuntime.positionX = playerRuntime.positionX;
      vehicleRuntime.positionY = playerRuntime.positionY;
      vehicleRuntime.positionZ = playerRuntime.positionZ;
      vehicleRuntime.strafeSpeedUnitsPerSecond = 0;
      vehicleRuntime.yawRadians = playerRuntime.yawRadians;
      vehicleRuntime.lastPoseAtMs = nowMs;
    }

    return vehicleRuntime;
  }

  #syncMountedPlayerPoseFromVehicle(
    playerRuntime: MetaversePlayerWorldRuntimeState,
    vehicleRuntime: MetaverseVehicleWorldRuntimeState,
    nowMs: number,
    previousFacingYawRadians: number = playerRuntime.yawRadians
  ): void {
    playerRuntime.positionX = vehicleRuntime.positionX;
    playerRuntime.positionY = vehicleRuntime.positionY;
    playerRuntime.positionZ = vehicleRuntime.positionZ;
    playerRuntime.yawRadians = vehicleRuntime.yawRadians;
    this.#syncAuthoritativePlayerLookForFacingChange(
      playerRuntime,
      previousFacingYawRadians,
      vehicleRuntime.yawRadians
    );
    playerRuntime.angularVelocityRadiansPerSecond =
      vehicleRuntime.angularVelocityRadiansPerSecond;
    playerRuntime.forwardSpeedUnitsPerSecond =
      vehicleRuntime.forwardSpeedUnitsPerSecond;
    playerRuntime.linearVelocityX = vehicleRuntime.linearVelocityX;
    playerRuntime.linearVelocityY = vehicleRuntime.linearVelocityY;
    playerRuntime.linearVelocityZ = vehicleRuntime.linearVelocityZ;
    playerRuntime.strafeSpeedUnitsPerSecond =
      vehicleRuntime.strafeSpeedUnitsPerSecond;
    playerRuntime.animationVocabulary =
      playerRuntime.mountedOccupancy?.occupancyKind === "seat"
        ? (() => {
            playerRuntime.animationRuntime.reset("seated");
            return playerRuntime.animationRuntime.animationVocabulary;
          })()
        : playerRuntime.animationRuntime.advance(
            {
              grounded: true,
              inputMagnitude: 0,
              locomotionMode: "grounded",
              planarSpeedUnitsPerSecond: Math.hypot(
                vehicleRuntime.linearVelocityX,
                vehicleRuntime.linearVelocityZ
              ),
              verticalSpeedUnitsPerSecond: vehicleRuntime.linearVelocityY
            },
            vehicleRuntime.lastPoseAtMs === null || nowMs <= vehicleRuntime.lastPoseAtMs
              ? 0
              : (nowMs - vehicleRuntime.lastPoseAtMs) / 1_000
          );
    playerRuntime.lastPoseAtMs = nowMs;
  }

  #syncImplicitPlayerLookFromBodyYaw(
    playerRuntime: MetaversePlayerWorldRuntimeState
  ): void {
    if (playerRuntime.lastProcessedLookSequence > 0) {
      return;
    }

    playerRuntime.lookPitchRadians = 0;
    playerRuntime.lookYawRadians = playerRuntime.yawRadians;
  }

  #resolveConstrainedPlayerLookIntent(
    playerRuntime: MetaversePlayerWorldRuntimeState,
    pitchRadians: number,
    yawRadians: number
  ): {
    readonly pitchRadians: number;
    readonly yawRadians: number;
  } {
    const bounds = resolveAuthoritativePlayerLookConstraintBounds(playerRuntime);
    const constrainedPitchRadians = clamp(
      pitchRadians,
      bounds.minPitchRadians,
      bounds.maxPitchRadians
    );

    if (bounds.maxYawOffsetRadians === null) {
      return {
        pitchRadians: constrainedPitchRadians,
        yawRadians: wrapRadians(yawRadians)
      };
    }

    const constrainedYawOffsetRadians = clamp(
      normalizeAngularDeltaRadians(yawRadians - playerRuntime.yawRadians),
      -bounds.maxYawOffsetRadians,
      bounds.maxYawOffsetRadians
    );

    return {
      pitchRadians: constrainedPitchRadians,
      yawRadians: wrapRadians(
        playerRuntime.yawRadians + constrainedYawOffsetRadians
      )
    };
  }

  #syncAuthoritativePlayerLookForFacingChange(
    playerRuntime: MetaversePlayerWorldRuntimeState,
    previousFacingYawRadians: number,
    nextFacingYawRadians: number
  ): void {
    if (playerRuntime.lastProcessedLookSequence === 0) {
      this.#syncImplicitPlayerLookFromBodyYaw(playerRuntime);
      return;
    }

    const bounds = resolveAuthoritativePlayerLookConstraintBounds(playerRuntime);

    playerRuntime.lookPitchRadians = clamp(
      playerRuntime.lookPitchRadians,
      bounds.minPitchRadians,
      bounds.maxPitchRadians
    );

    if (bounds.maxYawOffsetRadians === null) {
      playerRuntime.lookYawRadians = wrapRadians(playerRuntime.lookYawRadians);
      return;
    }

    const constrainedYawOffsetRadians = clamp(
      normalizeAngularDeltaRadians(
        playerRuntime.lookYawRadians - previousFacingYawRadians
      ),
      -bounds.maxYawOffsetRadians,
      bounds.maxYawOffsetRadians
    );

    playerRuntime.lookYawRadians = wrapRadians(
      nextFacingYawRadians + constrainedYawOffsetRadians
    );
  }

  #syncAuthoritativePlayerLookToCurrentFacing(
    playerRuntime: MetaversePlayerWorldRuntimeState
  ): void {
    this.#syncAuthoritativePlayerLookForFacingChange(
      playerRuntime,
      playerRuntime.yawRadians,
      playerRuntime.yawRadians
    );
  }

  #ensureVehicleRuntime(
    environmentAssetId: string,
    vehicleId: NonNullable<ReturnType<typeof createMetaverseVehicleId>>
  ): MetaverseVehicleWorldRuntimeState {
    const existingVehicleRuntime = this.#vehiclesById.get(vehicleId);

    if (existingVehicleRuntime !== undefined) {
      return existingVehicleRuntime;
    }

    const vehicleRuntime: MetaverseVehicleWorldRuntimeState = {
      angularVelocityRadiansPerSecond: 0,
      environmentAssetId,
      forwardSpeedUnitsPerSecond: 0,
      lastPoseAtMs: null,
      linearVelocityX: 0,
      linearVelocityY: 0,
      linearVelocityZ: 0,
      positionX: 0,
      positionY: 0,
      positionZ: 0,
      seatsById: new Map(),
      strafeSpeedUnitsPerSecond: 0,
      vehicleId,
      yawRadians: 0
    };

    this.#vehiclesById.set(vehicleId, vehicleRuntime);

    return vehicleRuntime;
  }

  #ensureVehicleSeatRuntime(
    vehicleRuntime: MetaverseVehicleWorldRuntimeState,
    seatId: string,
    occupantRole: MetaversePresenceMountedOccupantRoleId
  ): MetaverseVehicleSeatRuntimeState {
    const existingSeatRuntime = vehicleRuntime.seatsById.get(seatId);

    if (existingSeatRuntime !== undefined) {
      return existingSeatRuntime;
    }

    const seatRuntime: MetaverseVehicleSeatRuntimeState = {
      occupantPlayerId: null,
      occupantRole,
      seatId
    };

    vehicleRuntime.seatsById.set(seatId, seatRuntime);

    return seatRuntime;
  }

  #resolveVehicleId(
    environmentAssetId: string
  ): NonNullable<ReturnType<typeof createMetaverseVehicleId>> {
    const existingVehicleId =
      this.#vehicleIdsByEnvironmentAssetId.get(environmentAssetId);

    if (existingVehicleId !== undefined) {
      return existingVehicleId;
    }

    const preferredVehicleId =
      createMetaverseVehicleId(environmentAssetId) ??
      createMetaverseVehicleId(`metaverse-vehicle-${this.#nextVehicleOrdinal}`);

    if (preferredVehicleId === null) {
      throw new Error(
        `Metaverse authoritative world could not resolve a vehicle id for ${environmentAssetId}.`
      );
    }

    this.#nextVehicleOrdinal += 1;
    this.#vehicleIdsByEnvironmentAssetId.set(environmentAssetId, preferredVehicleId);

    return preferredVehicleId;
  }

  #clearPlayerVehicleOccupancy(playerId: MetaversePlayerId): void {
    for (const vehicleRuntime of this.#vehiclesById.values()) {
      for (const seatRuntime of vehicleRuntime.seatsById.values()) {
        if (seatRuntime.occupantPlayerId === playerId) {
          seatRuntime.occupantPlayerId = null;
        }
      }
    }
  }

  #clearDriverVehicleControl(playerId: MetaversePlayerId): void {
    this.#driverVehicleControlsByPlayerId.delete(playerId);
  }

  #clearPlayerTraversalIntent(playerId: MetaversePlayerId): void {
    this.#playerTraversalIntentsByPlayerId.delete(playerId);
  }

  #recordObserverHeartbeat(
    observerPlayerId: MetaversePlayerId,
    nowMs: number
  ): void {
    const observerRuntime = this.#playersById.get(observerPlayerId);

    if (observerRuntime === undefined) {
      return;
    }

    observerRuntime.lastSeenAtMs = nowMs;
  }

  #pruneInactivePlayers(nowMs: number): void {
    const timeoutMs = Number(this.#config.playerInactivityTimeoutMs);
    let prunedPlayer = false;

    for (const [playerId, playerRuntime] of this.#playersById) {
      if (nowMs - playerRuntime.lastSeenAtMs <= timeoutMs) {
        continue;
      }

      this.#clearDriverVehicleControl(playerId);
      this.#clearPlayerTraversalIntent(playerId);
      this.#clearPlayerVehicleOccupancy(playerId);
      this.#playersById.delete(playerId);
      prunedPlayer = true;
    }

    if (prunedPlayer) {
      this.#snapshotSequence += 1;
    }
  }

  #advanceToTime(nowMs: number): void {
    if (this.#lastAdvancedAtMs === null) {
      this.#lastAdvancedAtMs = nowMs;
      return;
    }

    const tickIntervalMs = Number(this.#config.tickIntervalMs);

    if (!Number.isFinite(tickIntervalMs) || tickIntervalMs <= 0) {
      return;
    }

    let advancedTick = false;
    const tickIntervalSeconds = tickIntervalMs / 1_000;

    while (this.#lastAdvancedAtMs + tickIntervalMs <= nowMs) {
      this.#lastAdvancedAtMs += tickIntervalMs;
      this.#advanceUnmountedPlayerRuntimes(
        tickIntervalSeconds,
        this.#lastAdvancedAtMs
      );
      this.#advanceVehicleRuntimes(tickIntervalSeconds, this.#lastAdvancedAtMs);
      this.#syncMountedPlayerWorldStateFromVehicles(this.#lastAdvancedAtMs);
      this.#currentTick += 1;
      advancedTick = true;
    }

    if (advancedTick) {
      this.#snapshotSequence += 1;
    }
  }

  #advanceVehicleRuntimes(deltaSeconds: number, nowMs: number): void {
    for (const vehicleRuntime of this.#vehiclesById.values()) {
      if (vehicleRuntime.lastPoseAtMs === null) {
        continue;
      }

      const driverControlState =
        this.#resolveDriverVehicleControlRuntimeState(vehicleRuntime);

      this.#advanceVehicleRuntime(vehicleRuntime, driverControlState, deltaSeconds);
      vehicleRuntime.lastPoseAtMs = nowMs;
    }
  }

  #advanceUnmountedPlayerRuntimes(deltaSeconds: number, nowMs: number): void {
    const authoritativeSurfaceColliders =
      this.#resolveAuthoritativeSurfaceColliders();

    for (const playerRuntime of this.#playersById.values()) {
      if (playerRuntime.mountedOccupancy !== null) {
        continue;
      }

      this.#advanceUnmountedPlayerRuntime(
        playerRuntime,
        deltaSeconds,
        nowMs,
        authoritativeSurfaceColliders
      );
    }
  }

  #advanceUnmountedPlayerRuntime(
    playerRuntime: MetaversePlayerWorldRuntimeState,
    deltaSeconds: number,
    nowMs: number,
    authoritativeSurfaceColliders: readonly MetaverseAuthoritativeSurfaceColliderSnapshot[]
  ): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return;
    }

    const traversalIntent =
      this.#playerTraversalIntentsByPlayerId.get(playerRuntime.playerId) ?? null;
    const currentSurfaceLocomotionMode = (
      playerRuntime.locomotionMode === "swim" ? "swim" : "grounded"
    );
    const locomotionDecision = resolveAuthoritativeAutomaticSurfaceLocomotionMode(
      metaverseAuthoritativeGroundedBodyConfig,
      authoritativeSurfaceColliders,
      {
        x: playerRuntime.positionX,
        y: playerRuntime.positionY,
        z: playerRuntime.positionZ
      },
      playerRuntime.yawRadians,
      currentSurfaceLocomotionMode
    );
    const locomotionMode = locomotionDecision.locomotionMode;
    const traversalConfig =
      locomotionMode === "swim"
        ? metaverseAuthoritativeSwimTraversalConfig
        : metaverseAuthoritativeGroundedTraversalConfig;
    const groundedAtStartOfTick =
      locomotionMode === "grounded" &&
      isGroundedUnmountedPlayerRuntime(playerRuntime);
    const moveAxis = clampAxis(traversalIntent?.moveAxis ?? 0);
    const strafeAxis = clampAxis(traversalIntent?.strafeAxis ?? 0);
    const motionSnapshot = advanceMetaverseSurfaceTraversalMotion(
      playerRuntime.yawRadians,
      {
        forwardSpeedUnitsPerSecond: playerRuntime.forwardSpeedUnitsPerSecond,
        strafeSpeedUnitsPerSecond: playerRuntime.strafeSpeedUnitsPerSecond
      },
      {
        boost: traversalIntent?.boost === true,
        moveAxis,
        strafeAxis,
        yawAxis: traversalIntent?.yawAxis ?? 0
      },
      traversalConfig,
      deltaSeconds,
      true,
      1,
      playerRuntime.lastProcessedLookSequence > 0
        ? playerRuntime.lookYawRadians
        : null
    );
    const nextYawRadians = motionSnapshot.yawRadians;
    const forwardX = Math.sin(nextYawRadians);
    const forwardZ = -Math.cos(nextYawRadians);
    const rightX = Math.cos(nextYawRadians);
    const rightZ = Math.sin(nextYawRadians);
    const radialClampedPlanarPosition =
      constrainMetaverseSurfaceTraversalPositionToWorldRadius(
        {
          x: playerRuntime.positionX + motionSnapshot.velocityX * deltaSeconds,
          y: playerRuntime.positionY,
          z: playerRuntime.positionZ + motionSnapshot.velocityZ * deltaSeconds
        },
        traversalConfig.worldRadius
      );
    const previousPositionY = playerRuntime.positionY;
    let nextPositionX = radialClampedPlanarPosition.x;
    let nextPositionY = resolveAuthoritativeWaterlineHeightMeters({
      x: radialClampedPlanarPosition.x,
      z: radialClampedPlanarPosition.z
    });
    let nextPositionZ = radialClampedPlanarPosition.z;
    let nextLinearVelocityY = 0;
    let grounded = false;
    let resolvedLocomotionMode: "grounded" | "swim" = locomotionMode;

    if (locomotionMode === "swim") {
      const currentWaterlineHeightMeters = resolveAuthoritativeWaterlineHeightMeters({
        x: playerRuntime.positionX,
        z: playerRuntime.positionZ
      });
      const constrainedPlanarPosition =
        constrainAuthoritativePlanarPositionAgainstBlockers(
          authoritativeSurfaceColliders,
          {
            x: playerRuntime.positionX,
            y: currentWaterlineHeightMeters,
            z: playerRuntime.positionZ
          },
          {
            x: radialClampedPlanarPosition.x,
            y: currentWaterlineHeightMeters,
            z: radialClampedPlanarPosition.z
          },
          metaverseAuthoritativeGroundedBodyConfig.capsuleRadiusMeters,
          currentWaterlineHeightMeters -
            metaverseAuthoritativeGroundedBodyConfig.capsuleRadiusMeters,
          currentWaterlineHeightMeters +
            metaverseAuthoritativeGroundedBodyConfig.capsuleHalfHeightMeters +
            metaverseAuthoritativeGroundedBodyConfig.capsuleRadiusMeters
        );
      const nextSwimLocomotionDecision =
        resolveAuthoritativeAutomaticSurfaceLocomotionMode(
          metaverseAuthoritativeGroundedBodyConfig,
          authoritativeSurfaceColliders,
          constrainedPlanarPosition,
          nextYawRadians,
          "swim"
        );

      nextPositionX = constrainedPlanarPosition.x;
      nextPositionZ = constrainedPlanarPosition.z;
      nextPositionY = resolveAuthoritativeWaterlineHeightMeters({
        x: constrainedPlanarPosition.x,
        z: constrainedPlanarPosition.z
      });

      if (
        nextSwimLocomotionDecision.locomotionMode === "grounded" &&
        nextSwimLocomotionDecision.supportHeightMeters !== null
      ) {
        nextPositionY = nextSwimLocomotionDecision.supportHeightMeters;
        grounded = true;
        resolvedLocomotionMode = "grounded";
      }
    } else {
      const groundedPlanarPosition =
        constrainAuthoritativePlanarPositionAgainstBlockers(
          authoritativeSurfaceColliders,
          {
            x: playerRuntime.positionX,
            y: playerRuntime.positionY,
            z: playerRuntime.positionZ
          },
          radialClampedPlanarPosition,
          metaverseAuthoritativeGroundedBodyConfig.capsuleRadiusMeters,
          Math.min(playerRuntime.lastGroundedPositionY, playerRuntime.positionY),
          Math.max(
            playerRuntime.lastGroundedPositionY,
            playerRuntime.positionY
          ) +
            metaverseAuthoritativeGroundedBodyConfig.capsuleHalfHeightMeters * 2 +
            metaverseAuthoritativeGroundedBodyConfig.capsuleRadiusMeters * 2
        );
      const jumpRequested =
        traversalIntent !== null &&
        traversalIntent.jumpActionSequence >
          playerRuntime.lastProcessedJumpActionSequence &&
        groundedAtStartOfTick;

      if (playerRuntime.locomotionMode !== "grounded") {
        playerRuntime.lastGroundedPositionY = playerRuntime.positionY;
        playerRuntime.linearVelocityY = 0;
      }

      const autostepHeightMeters =
        resolveAuthoritativeGroundedAutostepHeightMeters(
          metaverseAuthoritativeGroundedBodyConfig,
          authoritativeSurfaceColliders,
          {
            x: playerRuntime.positionX,
            y: playerRuntime.lastGroundedPositionY,
            z: playerRuntime.positionZ
          },
          nextYawRadians,
          moveAxis,
          strafeAxis,
          playerRuntime.linearVelocityY,
          jumpRequested
        );
      const nextGroundedLocomotionDecision =
        resolveAuthoritativeAutomaticSurfaceLocomotionMode(
          metaverseAuthoritativeGroundedBodyConfig,
          authoritativeSurfaceColliders,
          groundedPlanarPosition,
          nextYawRadians,
          "grounded"
        );
      const nextVerticalSpeedUnitsPerSecond =
        (jumpRequested
          ? Math.max(
              playerRuntime.linearVelocityY,
              metaverseAuthoritativeGroundedJumpImpulseUnitsPerSecond
            )
          : playerRuntime.linearVelocityY) -
        metaverseAuthoritativeGroundedGravityUnitsPerSecond * deltaSeconds;
      const unclampedPositionY =
        previousPositionY + nextVerticalSpeedUnitsPerSecond * deltaSeconds;
      const nextGroundSupportHeightMeters =
        nextGroundedLocomotionDecision.supportHeightMeters ??
        locomotionDecision.supportHeightMeters ??
        playerRuntime.lastGroundedPositionY;
      const nextGroundWaterlineHeightMeters = resolveAuthoritativeWaterlineHeightMeters(
        {
          x: groundedPlanarPosition.x,
          z: groundedPlanarPosition.z
        }
      );

      nextPositionX = groundedPlanarPosition.x;
      nextPositionZ = groundedPlanarPosition.z;

      const shouldEnterSwim =
        nextGroundedLocomotionDecision.locomotionMode === "swim" &&
        unclampedPositionY <=
          nextGroundWaterlineHeightMeters +
            metaverseWorldAutomaticSurfaceWaterlineThresholdMeters;

      if (
        shouldEnterSwim ||
        (autostepHeightMeters === null &&
          nextGroundSupportHeightMeters >
            playerRuntime.lastGroundedPositionY +
              metaverseAuthoritativeGroundedBodyConfig.stepHeightMeters +
              metaverseAuthoritativeGroundedSnapToleranceMeters &&
          !jumpRequested)
      ) {
        nextPositionY = nextGroundWaterlineHeightMeters;
        grounded = false;
        resolvedLocomotionMode = "swim";
      } else {
        resolvedLocomotionMode = "grounded";

        if (
          unclampedPositionY <=
          nextGroundSupportHeightMeters +
            metaverseAuthoritativeGroundedSnapToleranceMeters
        ) {
          nextPositionY = nextGroundSupportHeightMeters;
          nextLinearVelocityY = 0;
          grounded = true;
        } else {
          nextPositionY = unclampedPositionY;
          nextLinearVelocityY =
            (nextPositionY - previousPositionY) / deltaSeconds;
          grounded = false;
        }
      }
    }

    const deltaX = nextPositionX - playerRuntime.positionX;
    const deltaZ = nextPositionZ - playerRuntime.positionZ;
    const previousYawRadians = playerRuntime.yawRadians;

    playerRuntime.positionX = nextPositionX;
    playerRuntime.positionY = nextPositionY;
    playerRuntime.positionZ = nextPositionZ;
    playerRuntime.yawRadians = nextYawRadians;
    this.#syncImplicitPlayerLookFromBodyYaw(playerRuntime);
    playerRuntime.angularVelocityRadiansPerSecond =
      normalizeAngularDeltaRadians(nextYawRadians - previousYawRadians) /
      deltaSeconds;
    playerRuntime.forwardSpeedUnitsPerSecond =
      (deltaX * forwardX + deltaZ * forwardZ) / deltaSeconds;
    playerRuntime.linearVelocityX = deltaX / deltaSeconds;
    playerRuntime.linearVelocityY = nextLinearVelocityY;
    playerRuntime.linearVelocityZ = deltaZ / deltaSeconds;
    playerRuntime.locomotionMode = resolvedLocomotionMode;
    playerRuntime.strafeSpeedUnitsPerSecond =
      (deltaX * rightX + deltaZ * rightZ) / deltaSeconds;
    playerRuntime.animationVocabulary = playerRuntime.animationRuntime.advance(
      {
        grounded,
        inputMagnitude:
          traversalIntent === null
            ? 0
            : resolveTraversalInputMagnitude(
                traversalIntent.moveAxis,
                traversalIntent.strafeAxis
              ),
        locomotionMode: resolvedLocomotionMode,
        planarSpeedUnitsPerSecond: Math.hypot(
          playerRuntime.linearVelocityX,
          playerRuntime.linearVelocityZ
        ),
        verticalSpeedUnitsPerSecond: playerRuntime.linearVelocityY
      },
      deltaSeconds
    );
    playerRuntime.lastPoseAtMs = nowMs;

    if (resolvedLocomotionMode === "grounded" && grounded) {
      playerRuntime.lastGroundedPositionY = nextPositionY;
    }

    if (
      traversalIntent !== null &&
      traversalIntent.inputSequence > playerRuntime.lastProcessedInputSequence
    ) {
      playerRuntime.lastProcessedInputSequence = traversalIntent.inputSequence;
      playerRuntime.stateSequence = traversalIntent.inputSequence;
    }

    if (
      traversalIntent !== null &&
      traversalIntent.jumpActionSequence >
        playerRuntime.lastProcessedJumpActionSequence
    ) {
      playerRuntime.lastProcessedJumpActionSequence =
        traversalIntent.jumpActionSequence;
    }
  }

  #resolveDriverVehicleControlRuntimeState(
    vehicleRuntime: MetaverseVehicleWorldRuntimeState
  ): MetaverseDriverVehicleControlRuntimeState | null {
    for (const seatRuntime of vehicleRuntime.seatsById.values()) {
      if (
        seatRuntime.occupantPlayerId === null ||
        seatRuntime.occupantRole !== "driver"
      ) {
        continue;
      }

      const playerRuntime = this.#playersById.get(seatRuntime.occupantPlayerId);

      if (
        playerRuntime === undefined ||
        playerRuntime.mountedOccupancy === null ||
        playerRuntime.mountedOccupancy.occupancyKind !== "seat" ||
        playerRuntime.mountedOccupancy.vehicleId !== vehicleRuntime.vehicleId
      ) {
        continue;
      }

      const driverControlState = this.#driverVehicleControlsByPlayerId.get(
        seatRuntime.occupantPlayerId
      );

      if (
        driverControlState === undefined ||
        driverControlState.environmentAssetId !== vehicleRuntime.environmentAssetId
      ) {
        return null;
      }

      return driverControlState;
    }

    return null;
  }

  #advanceVehicleRuntime(
    vehicleRuntime: MetaverseVehicleWorldRuntimeState,
    driverControlState: MetaverseDriverVehicleControlRuntimeState | null,
    deltaSeconds: number
  ): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return;
    }

    const nextVehicleState = advanceMetaverseSurfaceTraversalSnapshot(
      {
        planarSpeedUnitsPerSecond: Math.hypot(
          vehicleRuntime.linearVelocityX,
          vehicleRuntime.linearVelocityZ
        ),
        position: {
          x: vehicleRuntime.positionX,
          y: vehicleRuntime.positionY,
          z: vehicleRuntime.positionZ
        },
        yawRadians: vehicleRuntime.yawRadians
      },
      {
        forwardSpeedUnitsPerSecond: vehicleRuntime.forwardSpeedUnitsPerSecond,
        strafeSpeedUnitsPerSecond: vehicleRuntime.strafeSpeedUnitsPerSecond
      },
      {
        boost: driverControlState?.boost === true,
        moveAxis: driverControlState?.moveAxis ?? 0,
        strafeAxis: driverControlState?.strafeAxis ?? 0,
        yawAxis: driverControlState?.yawAxis ?? 0
      },
      metaverseAuthoritativeVehicleSurfaceDriveConfig,
      deltaSeconds,
      metaverseAuthoritativeVehicleSurfaceDriveConfig.worldRadius,
      vehicleRuntime.positionY
    );
    const nextYawRadians = nextVehicleState.snapshot.yawRadians;
    const nextPositionX = nextVehicleState.snapshot.position.x;
    const nextPositionZ = nextVehicleState.snapshot.position.z;
    const deltaX = nextPositionX - vehicleRuntime.positionX;
    const deltaZ = nextPositionZ - vehicleRuntime.positionZ;
    const previousYawRadians = vehicleRuntime.yawRadians;
    vehicleRuntime.positionX = nextPositionX;
    vehicleRuntime.positionZ = nextPositionZ;
    vehicleRuntime.yawRadians = nextYawRadians;
    vehicleRuntime.linearVelocityX = deltaX / deltaSeconds;
    vehicleRuntime.linearVelocityY = 0;
    vehicleRuntime.linearVelocityZ = deltaZ / deltaSeconds;
    vehicleRuntime.angularVelocityRadiansPerSecond =
      normalizeAngularDeltaRadians(nextYawRadians - previousYawRadians) /
      deltaSeconds;
    vehicleRuntime.forwardSpeedUnitsPerSecond =
      nextVehicleState.speedSnapshot.forwardSpeedUnitsPerSecond;
    vehicleRuntime.strafeSpeedUnitsPerSecond =
      nextVehicleState.speedSnapshot.strafeSpeedUnitsPerSecond;
  }

  #syncMountedPlayerWorldStateFromVehicles(nowMs: number): void {
    for (const playerRuntime of this.#playersById.values()) {
      const mountedOccupancy = playerRuntime.mountedOccupancy;

      if (mountedOccupancy === null) {
        continue;
      }

      const vehicleRuntime = this.#vehiclesById.get(mountedOccupancy.vehicleId);

      if (vehicleRuntime === undefined) {
        continue;
      }

      this.#syncMountedPlayerPoseFromVehicle(playerRuntime, vehicleRuntime, nowMs);
    }
  }
}
