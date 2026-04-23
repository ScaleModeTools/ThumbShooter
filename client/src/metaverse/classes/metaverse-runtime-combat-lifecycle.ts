import {
  metaverseLocalAuthorityReconciliationConfig
} from "../config/metaverse-world-network";
import type { MetaverseCameraSnapshot } from "../types/metaverse-runtime";

interface MetaverseRuntimeCombatLifecycleBootLifecycle {
  setDeathCameraSnapshot(snapshot: MetaverseCameraSnapshot | null): void;
  setRespawnControlLocked(locked: boolean): void;
}

interface MetaverseRuntimeCombatLifecycleAuthoritativeWorldSync {
  armLocalSpawnBootstrap(): void;
}

interface MetaverseRuntimeCombatLifecycleRemoteWorldRuntime {
  readFreshAuthoritativeLocalPlayerSnapshot(
    maxAuthoritativeSnapshotAgeMs: number
  ): {
    readonly combat: {
      readonly alive: boolean;
    } | null;
  } | null;
}

interface MetaverseRuntimeCombatLifecycleDependencies {
  readonly authoritativeWorldSync: MetaverseRuntimeCombatLifecycleAuthoritativeWorldSync;
  readonly bootLifecycle: MetaverseRuntimeCombatLifecycleBootLifecycle;
  readonly remoteWorldRuntime: MetaverseRuntimeCombatLifecycleRemoteWorldRuntime;
  readonly weaponPresentationRuntime?: {
    reset(): void;
  } | null;
}

export class MetaverseRuntimeCombatLifecycle {
  readonly #authoritativeWorldSync: MetaverseRuntimeCombatLifecycleAuthoritativeWorldSync;
  readonly #bootLifecycle: MetaverseRuntimeCombatLifecycleBootLifecycle;
  readonly #remoteWorldRuntime: MetaverseRuntimeCombatLifecycleRemoteWorldRuntime;
  readonly #weaponPresentationRuntime: {
    reset(): void;
  } | null;

  #lastAuthoritativeAlive: boolean | null = null;

  constructor({
    authoritativeWorldSync,
    bootLifecycle,
    remoteWorldRuntime,
    weaponPresentationRuntime
  }: MetaverseRuntimeCombatLifecycleDependencies) {
    this.#authoritativeWorldSync = authoritativeWorldSync;
    this.#bootLifecycle = bootLifecycle;
    this.#remoteWorldRuntime = remoteWorldRuntime;
    this.#weaponPresentationRuntime = weaponPresentationRuntime ?? null;
  }

  reset(): void {
    this.#lastAuthoritativeAlive = null;
  }

  syncLocalCombatState(liveCameraSnapshot: MetaverseCameraSnapshot): void {
    const authoritativeLocalPlayerSnapshot =
      this.#remoteWorldRuntime.readFreshAuthoritativeLocalPlayerSnapshot(
        metaverseLocalAuthorityReconciliationConfig.maxAuthoritativeSnapshotAgeMs
      );
    const combatSnapshot = authoritativeLocalPlayerSnapshot?.combat ?? null;

    if (combatSnapshot === null) {
      return;
    }

    if (combatSnapshot.alive) {
      if (this.#lastAuthoritativeAlive === false) {
        this.#bootLifecycle.setDeathCameraSnapshot(null);
        this.#bootLifecycle.setRespawnControlLocked(false);
        this.#authoritativeWorldSync.armLocalSpawnBootstrap();
      }
    } else if (this.#lastAuthoritativeAlive !== false) {
      this.#bootLifecycle.setDeathCameraSnapshot(liveCameraSnapshot);
      this.#bootLifecycle.setRespawnControlLocked(true);
      this.#weaponPresentationRuntime?.reset();
    }

    this.#lastAuthoritativeAlive = combatSnapshot.alive;
  }
}
