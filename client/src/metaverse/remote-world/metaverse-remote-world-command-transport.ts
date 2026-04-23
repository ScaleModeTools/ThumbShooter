import type {
  MetaversePlayerTraversalIntentSnapshotInput,
  MetaverseRealtimePlayerWeaponStateSnapshot
} from "@webgpu-metaverse/shared/metaverse/realtime";

import type {
  MetaverseCameraSnapshot,
  MountedEnvironmentSnapshot
} from "../types/metaverse-runtime";
import type { MetaverseLocalPlayerIdentity } from "../classes/metaverse-presence-runtime";
import type {
  MetaverseIssuedTraversalIntentInputSnapshot,
  RoutedDriverVehicleControlIntentSnapshot
} from "../traversal/types/traversal";
import type { MetaverseWorldClientRuntime } from "@/network";
import { MetaverseFireWeaponActionPolicy } from "./metaverse-fire-weapon-action-policy";

interface MetaverseRemoteWorldCommandTransportDependencies {
  readonly localPlayerIdentity: MetaverseLocalPlayerIdentity | null;
  readonly readEstimatedServerTimeMs: (localWallClockMs: number) => number;
  readonly readWallClockMs: () => number;
  readonly readWorldClient: () => MetaverseWorldClientRuntime | null;
}

export class MetaverseRemoteWorldCommandTransport {
  readonly #fireWeaponActionPolicy: MetaverseFireWeaponActionPolicy;
  readonly #localPlayerIdentity: MetaverseLocalPlayerIdentity | null;
  readonly #readWorldClient: () => MetaverseWorldClientRuntime | null;

  constructor({
    localPlayerIdentity,
    readEstimatedServerTimeMs,
    readWallClockMs,
    readWorldClient
  }: MetaverseRemoteWorldCommandTransportDependencies) {
    this.#fireWeaponActionPolicy = new MetaverseFireWeaponActionPolicy({
      readEstimatedServerTimeMs,
      readLocalPlayerId: () => this.#localPlayerIdentity?.playerId ?? null,
      readWallClockMs,
      readWorldClient
    });
    this.#localPlayerIdentity = localPlayerIdentity;
    this.#readWorldClient = readWorldClient;
  }

  syncLocalDriverVehicleControl(
    controlIntentSnapshot: RoutedDriverVehicleControlIntentSnapshot | null
  ): void {
    const worldClient = this.#readWorldClient();

    if (worldClient === null || this.#localPlayerIdentity === null) {
      return;
    }

    if (controlIntentSnapshot === null) {
      worldClient.syncDriverVehicleControl(null);
      return;
    }

    worldClient.syncDriverVehicleControl({
      controlIntent: {
        boost: controlIntentSnapshot.controlIntent.boost,
        environmentAssetId: controlIntentSnapshot.environmentAssetId,
        moveAxis: controlIntentSnapshot.controlIntent.moveAxis,
        strafeAxis: controlIntentSnapshot.controlIntent.strafeAxis,
        yawAxis: controlIntentSnapshot.controlIntent.yawAxis
      },
      playerId: this.#localPlayerIdentity.playerId
    });
  }

  syncMountedOccupancy(
    mountedEnvironment: MountedEnvironmentSnapshot | null
  ): void {
    const worldClient = this.#readWorldClient();

    if (worldClient === null || this.#localPlayerIdentity === null) {
      return;
    }

    worldClient.syncMountedOccupancy({
      mountedOccupancy:
        mountedEnvironment === null
          ? null
          : {
              environmentAssetId: mountedEnvironment.environmentAssetId,
              entryId: mountedEnvironment.entryId,
              occupancyKind: mountedEnvironment.occupancyKind,
              occupantRole: mountedEnvironment.occupantRole,
              seatId: mountedEnvironment.seatId
            },
      playerId: this.#localPlayerIdentity.playerId
    });
  }

  syncLocalTraversalIntent(
    traversalIntentInput: MetaversePlayerTraversalIntentSnapshotInput | null
  ): MetaverseIssuedTraversalIntentInputSnapshot | null {
    const worldClient = this.#readWorldClient();

    if (worldClient === null || this.#localPlayerIdentity === null) {
      worldClient?.syncPlayerTraversalIntent(null);
      return null;
    }

    if (traversalIntentInput === null) {
      worldClient.syncPlayerTraversalIntent(null);
      return null;
    }

    return worldClient.syncPlayerTraversalIntent({
      intent: traversalIntentInput,
      playerId: this.#localPlayerIdentity.playerId
    });
  }

  previewLocalTraversalIntent(
    traversalIntentInput: MetaversePlayerTraversalIntentSnapshotInput | null
  ): MetaverseIssuedTraversalIntentInputSnapshot | null {
    const worldClient = this.#readWorldClient();

    if (worldClient === null || this.#localPlayerIdentity === null) {
      return null;
    }

    if (traversalIntentInput === null) {
      return null;
    }

    return worldClient.previewPlayerTraversalIntent({
      intent: traversalIntentInput,
      playerId: this.#localPlayerIdentity.playerId
    });
  }

  syncLocalPlayerLook(
    lookSnapshot:
      | Pick<MetaverseCameraSnapshot, "pitchRadians" | "yawRadians">
      | null
  ): void {
    const worldClient = this.#readWorldClient();

    if (worldClient === null || this.#localPlayerIdentity === null) {
      worldClient?.syncPlayerLookIntent(null);
      return;
    }

    if (lookSnapshot === null) {
      worldClient.syncPlayerLookIntent(null);
      return;
    }

    worldClient.syncPlayerLookIntent({
      lookIntent: {
        pitchRadians: lookSnapshot.pitchRadians,
        yawRadians: lookSnapshot.yawRadians
      },
      playerId: this.#localPlayerIdentity.playerId
    });
  }

  syncLocalPlayerWeaponState(
    weaponState: MetaverseRealtimePlayerWeaponStateSnapshot | null
  ): void {
    const worldClient = this.#readWorldClient();

    if (worldClient === null || this.#localPlayerIdentity === null) {
      worldClient?.syncPlayerWeaponState?.(null);
      return;
    }

    worldClient.syncPlayerWeaponState?.({
      playerId: this.#localPlayerIdentity.playerId,
      weaponState
    });
  }

  fireWeapon(input: {
    readonly aimMode?: "ads" | "hip-fire";
    readonly aimSnapshot: {
      readonly pitchRadians: number;
      readonly yawRadians: number;
    };
    readonly weaponId: string;
  }): void {
    const worldClient = this.#readWorldClient();

    if (worldClient === null || this.#localPlayerIdentity === null) {
      return;
    }

    const fireWeaponAction =
      this.#fireWeaponActionPolicy.createFireWeaponAction(input);

    if (fireWeaponAction === null) {
      return;
    }

    worldClient.issuePlayerAction?.({
      action: {
        ...(fireWeaponAction.aimMode === undefined
          ? {}
          : {
              aimMode: fireWeaponAction.aimMode
            }),
        aimSnapshot: fireWeaponAction.aimSnapshot,
        issuedAtAuthoritativeTimeMs:
          fireWeaponAction.issuedAtAuthoritativeTimeMs,
        kind: "fire-weapon",
        weaponId: fireWeaponAction.weaponId
      },
      playerId: this.#localPlayerIdentity.playerId
    });
  }
}
