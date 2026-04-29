import type { MetaverseMatchModeId } from "@webgpu-metaverse/shared";
import type { MetaversePlayerId } from "@webgpu-metaverse/shared/metaverse/presence";
import type { MetaverseRealtimeResourceSpawnSnapshotInput } from "@webgpu-metaverse/shared/metaverse/realtime";
import type { MetaverseMapBundleResourceSpawnSnapshot } from "@webgpu-metaverse/shared/metaverse/world";

interface MetaverseAuthoritativeResourceSpawnPlayerRuntimeState {
  readonly playerId: MetaversePlayerId;
  positionX: number;
  positionY: number;
  positionZ: number;
}

interface MutableMetaverseResourceSpawnRuntimeState {
  available: boolean;
  nextRespawnAtServerTimeMs: number | null;
  readonly resourceSpawn: MetaverseMapBundleResourceSpawnSnapshot;
}

interface MetaverseAuthoritativeResourceSpawnAuthorityDependencies<
  PlayerRuntime extends MetaverseAuthoritativeResourceSpawnPlayerRuntimeState
> {
  readonly incrementSnapshotSequence: () => void;
  readonly matchMode: MetaverseMatchModeId | null;
  readonly playersById: ReadonlyMap<MetaversePlayerId, PlayerRuntime>;
  readonly resourceSpawns: readonly MetaverseMapBundleResourceSpawnSnapshot[];
  readonly grantWeaponResourcePickup: (input: {
    readonly nowMs: number;
    readonly playerRuntime: PlayerRuntime;
    readonly resourceSpawn: MetaverseMapBundleResourceSpawnSnapshot;
  }) => boolean;
}

function normalizeNowMs(nowMs: number): number {
  if (!Number.isFinite(nowMs)) {
    return 0;
  }

  return Math.max(0, nowMs);
}

function shouldEnableResourceSpawn(
  resourceSpawn: MetaverseMapBundleResourceSpawnSnapshot,
  matchMode: MetaverseMatchModeId | null
): boolean {
  if (resourceSpawn.modeTags.length === 0) {
    return true;
  }

  return matchMode !== null && resourceSpawn.modeTags.includes(matchMode);
}

function createDistanceBetweenPlayerAndResource(
  playerRuntime: MetaverseAuthoritativeResourceSpawnPlayerRuntimeState,
  resourceSpawn: MetaverseMapBundleResourceSpawnSnapshot
): number {
  return Math.hypot(
    playerRuntime.positionX - resourceSpawn.position.x,
    playerRuntime.positionY - resourceSpawn.position.y,
    playerRuntime.positionZ - resourceSpawn.position.z
  );
}

export class MetaverseAuthoritativeResourceSpawnAuthority<
  PlayerRuntime extends MetaverseAuthoritativeResourceSpawnPlayerRuntimeState
> {
  readonly #dependencies: MetaverseAuthoritativeResourceSpawnAuthorityDependencies<PlayerRuntime>;
  readonly #resourceSpawnStatesById = new Map<
    string,
    MutableMetaverseResourceSpawnRuntimeState
  >();

  constructor(
    dependencies: MetaverseAuthoritativeResourceSpawnAuthorityDependencies<PlayerRuntime>
  ) {
    this.#dependencies = dependencies;

    for (const resourceSpawn of dependencies.resourceSpawns) {
      if (!shouldEnableResourceSpawn(resourceSpawn, dependencies.matchMode)) {
        continue;
      }

      this.#resourceSpawnStatesById.set(resourceSpawn.spawnId, {
        available: true,
        nextRespawnAtServerTimeMs: null,
        resourceSpawn
      });
    }
  }

  advanceResourceSpawns(_tickIntervalSeconds: number, nowMs: number): void {
    const normalizedNowMs = normalizeNowMs(nowMs);
    let changed = false;

    for (const state of this.#resourceSpawnStatesById.values()) {
      if (
        !state.available &&
        state.nextRespawnAtServerTimeMs !== null &&
        state.nextRespawnAtServerTimeMs <= normalizedNowMs
      ) {
        state.available = true;
        state.nextRespawnAtServerTimeMs = null;
        changed = true;
      }
    }

    for (const state of this.#resourceSpawnStatesById.values()) {
      if (!state.available) {
        continue;
      }

      for (const playerRuntime of this.#dependencies.playersById.values()) {
        if (
          createDistanceBetweenPlayerAndResource(
            playerRuntime,
            state.resourceSpawn
          ) > state.resourceSpawn.pickupRadiusMeters
        ) {
          continue;
        }

        if (
          !this.#dependencies.grantWeaponResourcePickup({
            nowMs: normalizedNowMs,
            playerRuntime,
            resourceSpawn: state.resourceSpawn
          })
        ) {
          continue;
        }

        state.available = false;
        state.nextRespawnAtServerTimeMs =
          normalizedNowMs + state.resourceSpawn.respawnCooldownMs;
        changed = true;
        break;
      }
    }

    if (changed) {
      this.#dependencies.incrementSnapshotSequence();
    }
  }

  readResourceSpawnSnapshots(): readonly MetaverseRealtimeResourceSpawnSnapshotInput[] {
    return Object.freeze(
      [...this.#resourceSpawnStatesById.values()]
        .sort((leftState, rightState) =>
          leftState.resourceSpawn.spawnId.localeCompare(
            rightState.resourceSpawn.spawnId
          )
        )
        .map((state) => ({
          ammoGrantRounds: state.resourceSpawn.ammoGrantRounds,
          assetId: state.resourceSpawn.assetId,
          available: state.available,
          label: state.resourceSpawn.label,
          modeTags: state.resourceSpawn.modeTags,
          nextRespawnAtServerTimeMs: state.nextRespawnAtServerTimeMs,
          pickupRadiusMeters: state.resourceSpawn.pickupRadiusMeters,
          position: state.resourceSpawn.position,
          resourceKind: state.resourceSpawn.resourceKind,
          respawnCooldownMs: state.resourceSpawn.respawnCooldownMs,
          spawnId: state.resourceSpawn.spawnId,
          weaponId: state.resourceSpawn.weaponId,
          yawRadians: state.resourceSpawn.yawRadians
        }))
    );
  }
}
