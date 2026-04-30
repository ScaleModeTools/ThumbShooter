import type {
  MetaverseJoinPresenceCommand,
  MetaverseLeavePresenceCommand,
  MetaversePresenceCommand,
  MetaversePresenceRosterEvent,
  MetaverseSyncPresenceCommand
} from "@webgpu-metaverse/shared/metaverse/presence";
import type {
  MetaverseIssuePlayerActionCommand,
} from "@webgpu-metaverse/shared/metaverse";
import type {
  MetaverseRealtimeWorldClientCommand,
  MetaverseRealtimeWorldEvent,
  MetaverseSyncDriverVehicleControlCommand,
  MetaverseSyncMountedOccupancyCommand,
  MetaverseSyncPlayerLookIntentCommand,
  MetaverseSyncPlayerTraversalIntentCommand,
  MetaverseSyncPlayerWeaponStateCommand
} from "@webgpu-metaverse/shared/metaverse/realtime";

interface MetaverseAuthoritativePlayerPoseCommandHandler {
  acceptJoinCommand(command: MetaverseJoinPresenceCommand, nowMs: number): void;
  acceptSyncCommand(command: MetaverseSyncPresenceCommand, nowMs: number): void;
}

interface MetaverseAuthoritativePlayerLifecycleCommandHandler {
  acceptLeaveCommand(command: MetaverseLeavePresenceCommand): void;
}

interface MetaverseAuthoritativePlayerTraversalCommandHandler {
  acceptSyncPlayerLookIntentCommand(
    command: MetaverseSyncPlayerLookIntentCommand,
    nowMs: number
  ): void;
  acceptSyncPlayerTraversalIntentCommand(
    command: MetaverseSyncPlayerTraversalIntentCommand,
    nowMs: number
  ): void;
}

interface MetaverseAuthoritativePlayerWeaponStateCommandHandler {
  acceptSyncPlayerWeaponStateCommand(
    command: MetaverseSyncPlayerWeaponStateCommand,
    nowMs: number
  ): void;
}

interface MetaverseAuthoritativeCombatCommandHandler {
  acceptIssuePlayerActionCommand(
    command: MetaverseIssuePlayerActionCommand,
    nowMs: number
  ): void;
  isPlayerAlive(playerId: MetaverseIssuePlayerActionCommand["playerId"]): boolean;
}

interface MetaverseAuthoritativeResourceCommandHandler {
  acceptInteractWeaponResourceAction(
    command: MetaverseIssuePlayerActionCommand,
    nowMs: number
  ): void;
}

interface MetaverseAuthoritativeMountedOccupancyCommandHandler {
  acceptSyncMountedOccupancyCommand(
    command: MetaverseSyncMountedOccupancyCommand,
    nowMs: number
  ): void;
}

interface MetaverseAuthoritativeVehicleDriveCommandHandler {
  acceptSyncDriverVehicleControlCommand(
    command: MetaverseSyncDriverVehicleControlCommand,
    nowMs: number
  ): void;
}

interface MetaverseAuthoritativeWorldCommandIntakeDependencies {
  readonly advanceToTime: (nowMs: number) => void;
  readonly combatAuthority: MetaverseAuthoritativeCombatCommandHandler;
  readonly mountedOccupancyAuthority:
    MetaverseAuthoritativeMountedOccupancyCommandHandler;
  readonly playerLifecycleAuthority:
    MetaverseAuthoritativePlayerLifecycleCommandHandler;
  readonly playerPoseAuthority: MetaverseAuthoritativePlayerPoseCommandHandler;
  readonly playerTraversalAuthority:
    MetaverseAuthoritativePlayerTraversalCommandHandler;
  readonly playerWeaponStateAuthority:
    MetaverseAuthoritativePlayerWeaponStateCommandHandler;
  readonly resourceAuthority: MetaverseAuthoritativeResourceCommandHandler;
  readonly readPresenceRosterEvent:
    (nowMs: number) => MetaversePresenceRosterEvent;
  readonly readWorldEvent: (nowMs: number) => MetaverseRealtimeWorldEvent;
  readonly vehicleDriveAuthority:
    MetaverseAuthoritativeVehicleDriveCommandHandler;
}

function normalizeNowMs(nowMs: number): number {
  if (!Number.isFinite(nowMs)) {
    return 0;
  }

  return Math.max(0, nowMs);
}

export class MetaverseAuthoritativeWorldCommandIntake {
  readonly #dependencies: MetaverseAuthoritativeWorldCommandIntakeDependencies;

  constructor(dependencies: MetaverseAuthoritativeWorldCommandIntakeDependencies) {
    this.#dependencies = dependencies;
  }

  acceptPresenceCommand(
    command: MetaversePresenceCommand,
    nowMs: number
  ): MetaversePresenceRosterEvent {
    const normalizedNowMs = normalizeNowMs(nowMs);

    this.#dependencies.advanceToTime(normalizedNowMs);

    switch (command.type) {
      case "join-presence":
        this.#dependencies.playerPoseAuthority.acceptJoinCommand(
          command,
          normalizedNowMs
        );
        break;
      case "leave-presence":
        this.#dependencies.playerLifecycleAuthority.acceptLeaveCommand(command);
        break;
      case "sync-presence":
        this.#dependencies.playerPoseAuthority.acceptSyncCommand(
          command,
          normalizedNowMs
        );
        break;
      default: {
        const exhaustiveCommand: never = command;

        throw new Error(
          `Unsupported metaverse presence command type: ${exhaustiveCommand}`
        );
      }
    }

    return this.#dependencies.readPresenceRosterEvent(normalizedNowMs);
  }

  acceptWorldCommand(
    command: MetaverseRealtimeWorldClientCommand,
    nowMs: number
  ): MetaverseRealtimeWorldEvent {
    const normalizedNowMs = normalizeNowMs(nowMs);

    this.#dependencies.advanceToTime(normalizedNowMs);

    switch (command.type) {
      case "issue-player-action":
        if (command.action.kind === "interact-weapon-resource") {
          this.#dependencies.resourceAuthority.acceptInteractWeaponResourceAction(
            command,
            normalizedNowMs
          );
        } else {
          this.#dependencies.combatAuthority.acceptIssuePlayerActionCommand(
            command,
            normalizedNowMs
          );
        }
        break;
      case "sync-driver-vehicle-control":
        if (this.#isPlayerAlive(command.playerId)) {
          this.#dependencies.vehicleDriveAuthority.acceptSyncDriverVehicleControlCommand(
            command,
            normalizedNowMs
          );
        }
        break;
      case "sync-mounted-occupancy":
        if (this.#isPlayerAlive(command.playerId)) {
          this.#dependencies.mountedOccupancyAuthority.acceptSyncMountedOccupancyCommand(
            command,
            normalizedNowMs
          );
        }
        break;
      case "sync-player-look-intent":
        if (this.#isPlayerAlive(command.playerId)) {
          this.#dependencies.playerTraversalAuthority.acceptSyncPlayerLookIntentCommand(
            command,
            normalizedNowMs
          );
        }
        break;
      case "sync-player-traversal-intent":
        if (this.#isPlayerAlive(command.playerId)) {
          this.#dependencies.playerTraversalAuthority.acceptSyncPlayerTraversalIntentCommand(
            command,
            normalizedNowMs
          );
        }
        break;
      case "sync-player-weapon-state":
        if (this.#isPlayerAlive(command.playerId)) {
          this.#dependencies.playerWeaponStateAuthority
            .acceptSyncPlayerWeaponStateCommand(command, normalizedNowMs);
        }
        break;
      default: {
        const exhaustiveCommand: never = command;

        throw new Error(
          `Unsupported metaverse realtime world command type: ${exhaustiveCommand}`
        );
      }
    }

    return this.#dependencies.readWorldEvent(normalizedNowMs);
  }

  #isPlayerAlive(
    playerId: MetaverseIssuePlayerActionCommand["playerId"]
  ): boolean {
    return this.#dependencies.combatAuthority.isPlayerAlive(playerId);
  }
}
