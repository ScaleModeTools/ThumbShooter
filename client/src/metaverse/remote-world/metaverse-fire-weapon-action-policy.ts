import type {
  MetaverseCombatMatchPhaseId,
  MetaversePlayerActionReceiptSnapshot,
  MetaversePlayerCombatSnapshot,
  MetaverseRealtimeWorldSnapshot
} from "@webgpu-metaverse/shared";
import {
  readMetaverseCombatWeaponProfile
} from "@webgpu-metaverse/shared";
import type { MetaversePlayerId } from "@webgpu-metaverse/shared/metaverse/presence";

import type { MetaverseWorldClientRuntime } from "@/network";

interface MetaverseFireWeaponActionPolicyDependencies {
  readonly readEstimatedServerTimeMs: (localWallClockMs: number) => number;
  readonly readLocalPlayerId: () => MetaversePlayerId | null;
  readonly readWallClockMs: () => number;
  readonly readWorldClient: () => MetaverseWorldClientRuntime | null;
}

function resolveMillisecondsPerShot(weaponId: string): number | null {
  try {
    const weaponProfile = readMetaverseCombatWeaponProfile(weaponId);

    if (weaponProfile.roundsPerMinute <= 0) {
      return null;
    }

    return 60_000 / weaponProfile.roundsPerMinute;
  } catch {
    return null;
  }
}

function readLatestLocalPlayerWorldSnapshot(
  worldSnapshot: MetaverseRealtimeWorldSnapshot,
  playerId: MetaversePlayerId
): {
  readonly combat: MetaversePlayerCombatSnapshot | null;
  readonly combatMatchPhase: MetaverseCombatMatchPhaseId | null;
  readonly mountedOccupancy:
    | MetaverseRealtimeWorldSnapshot["players"][number]["mountedOccupancy"]
    | null;
  readonly recentPlayerActionReceipts:
    readonly MetaversePlayerActionReceiptSnapshot[];
} | null {
  const observerPlayerSnapshot = worldSnapshot.observerPlayer;
  const playerSnapshot =
    worldSnapshot.players.find(
      (candidatePlayerSnapshot) => candidatePlayerSnapshot.playerId === playerId
    ) ?? null;

  if (
    observerPlayerSnapshot === null ||
    observerPlayerSnapshot.playerId !== playerId ||
    playerSnapshot === null
  ) {
    return null;
  }

  return Object.freeze({
    combat: playerSnapshot.combat,
    combatMatchPhase: worldSnapshot.combatMatch?.phase ?? null,
    mountedOccupancy: playerSnapshot.mountedOccupancy ?? null,
    recentPlayerActionReceipts: observerPlayerSnapshot.recentPlayerActionReceipts
  });
}

export class MetaverseFireWeaponActionPolicy {
  readonly #readEstimatedServerTimeMs:
    MetaverseFireWeaponActionPolicyDependencies["readEstimatedServerTimeMs"];
  readonly #readLocalPlayerId:
    MetaverseFireWeaponActionPolicyDependencies["readLocalPlayerId"];
  readonly #readWallClockMs:
    MetaverseFireWeaponActionPolicyDependencies["readWallClockMs"];
  readonly #readWorldClient:
    MetaverseFireWeaponActionPolicyDependencies["readWorldClient"];

  constructor(dependencies: MetaverseFireWeaponActionPolicyDependencies) {
    this.#readEstimatedServerTimeMs = dependencies.readEstimatedServerTimeMs;
    this.#readLocalPlayerId = dependencies.readLocalPlayerId;
    this.#readWallClockMs = dependencies.readWallClockMs;
    this.#readWorldClient = dependencies.readWorldClient;
  }

  createFireWeaponAction(input: {
    readonly aimMode?: "ads" | "hip-fire";
    readonly aimSnapshot: {
      readonly pitchRadians: number;
      readonly yawRadians: number;
    };
    readonly weaponId: string;
  }): {
    readonly aimMode?: "ads" | "hip-fire";
    readonly aimSnapshot: {
      readonly pitchRadians: number;
      readonly yawRadians: number;
    };
    readonly issuedAtAuthoritativeTimeMs: number;
    readonly weaponId: string;
  } | null {
    const issuedAtAuthoritativeTimeMs = Math.max(
      0,
      this.#readEstimatedServerTimeMs(this.#readWallClockMs())
    );
    const worldClient = this.#readWorldClient();
    const playerId = this.#readLocalPlayerId();

    if (worldClient === null || playerId === null) {
      return null;
    }

    const latestWorldSnapshot =
      worldClient.worldSnapshotBuffer[worldClient.worldSnapshotBuffer.length - 1] ??
      null;

    if (latestWorldSnapshot !== null) {
      const localPlayerSnapshot = readLatestLocalPlayerWorldSnapshot(
        latestWorldSnapshot,
        playerId
      );

      if (localPlayerSnapshot !== null) {
        if (
          localPlayerSnapshot.combatMatchPhase !== null &&
          localPlayerSnapshot.combatMatchPhase !== "active"
        ) {
          return null;
        }

        if (localPlayerSnapshot.mountedOccupancy !== null) {
          return null;
        }

        const combatSnapshot = localPlayerSnapshot.combat;

        if (
          combatSnapshot !== null &&
          (!combatSnapshot.alive ||
            Number(combatSnapshot.spawnProtectionRemainingMs) > 0 ||
            combatSnapshot.activeWeapon === null ||
            Number(combatSnapshot.activeWeapon.reloadRemainingMs) > 0 ||
            combatSnapshot.activeWeapon.ammoInMagazine <= 0)
        ) {
          return null;
        }

        const millisecondsPerShot = resolveMillisecondsPerShot(input.weaponId);
        const latestAcceptedFireReceipt =
          localPlayerSnapshot.recentPlayerActionReceipts
            .toReversed()
            .find(
              (receiptSnapshot) =>
                receiptSnapshot.kind === "fire-weapon" &&
                receiptSnapshot.status === "accepted" &&
                receiptSnapshot.weaponId === input.weaponId
            ) ?? null;

        if (
          millisecondsPerShot !== null &&
          latestAcceptedFireReceipt !== null &&
          issuedAtAuthoritativeTimeMs -
            Number(latestAcceptedFireReceipt.processedAtTimeMs) +
            0.0001 <
            millisecondsPerShot
        ) {
          return null;
        }
      }
    }

    return Object.freeze({
      ...(input.aimMode === undefined
        ? {}
        : {
            aimMode: input.aimMode
          }),
      aimSnapshot: input.aimSnapshot,
      issuedAtAuthoritativeTimeMs,
      weaponId: input.weaponId
    });
  }
}
