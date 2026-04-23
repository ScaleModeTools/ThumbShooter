import type {
  MetaverseRealtimeWorldEvent
} from "./realtime/metaverse-realtime-world-snapshots.js";
import {
  createMetaverseSyncDriverVehicleControlCommand,
  createMetaverseSyncPlayerLookIntentCommand,
  createMetaverseSyncMountedOccupancyCommand,
  createMetaverseSyncPlayerTraversalIntentCommand,
  createMetaverseSyncPlayerWeaponStateCommand
} from "./realtime/metaverse-realtime-world-commands.js";
import {
  createMetaverseIssuePlayerActionCommand
} from "./metaverse-combat.js";
import type {
  MetaverseRealtimeWorldClientCommand
} from "./realtime/metaverse-realtime-world-commands.js";
import {
  createMetaverseRealtimeWorldEvent
} from "./realtime/metaverse-realtime-world-snapshots.js";
import type { MetaversePlayerId } from "./metaverse-presence-contract.js";
import type { MetaverseRoomId } from "./metaverse-room-contract.js";

export const metaverseRealtimeWorldWebTransportClientMessageTypes = [
  "world-snapshot-request",
  "world-snapshot-subscribe",
  "world-command-request"
] as const;

export const metaverseRealtimeWorldWebTransportServerMessageTypes = [
  "world-server-event",
  "world-error"
] as const;

export type MetaverseRealtimeWorldWebTransportClientMessageType =
  (typeof metaverseRealtimeWorldWebTransportClientMessageTypes)[number];
export type MetaverseRealtimeWorldWebTransportServerMessageType =
  (typeof metaverseRealtimeWorldWebTransportServerMessageTypes)[number];

export interface MetaverseRealtimeWorldWebTransportSnapshotRequest {
  readonly observerPlayerId: MetaversePlayerId;
  readonly roomId: MetaverseRoomId;
  readonly type: "world-snapshot-request";
}

export interface MetaverseRealtimeWorldWebTransportSnapshotRequestInput {
  readonly observerPlayerId: MetaversePlayerId;
  readonly roomId: MetaverseRoomId;
}

export interface MetaverseRealtimeWorldWebTransportSnapshotSubscribeRequest {
  readonly observerPlayerId: MetaversePlayerId;
  readonly roomId: MetaverseRoomId;
  readonly type: "world-snapshot-subscribe";
}

export interface MetaverseRealtimeWorldWebTransportSnapshotSubscribeRequestInput {
  readonly observerPlayerId: MetaversePlayerId;
  readonly roomId: MetaverseRoomId;
}

export interface MetaverseRealtimeWorldWebTransportServerEventMessage {
  readonly event: MetaverseRealtimeWorldEvent;
  readonly type: "world-server-event";
}

export interface MetaverseRealtimeWorldWebTransportServerEventMessageInput {
  readonly event: MetaverseRealtimeWorldEvent;
}

export interface MetaverseRealtimeWorldWebTransportCommandRequest {
  readonly command: MetaverseRealtimeWorldClientCommand;
  readonly roomId: MetaverseRoomId;
  readonly type: "world-command-request";
}

export interface MetaverseRealtimeWorldWebTransportCommandRequestInput {
  readonly command: MetaverseRealtimeWorldClientCommand;
  readonly roomId: MetaverseRoomId;
}

export interface MetaverseRealtimeWorldWebTransportErrorMessage {
  readonly message: string;
  readonly type: "world-error";
}

export interface MetaverseRealtimeWorldWebTransportErrorMessageInput {
  readonly message: string;
}

export type MetaverseRealtimeWorldWebTransportClientMessage =
  | MetaverseRealtimeWorldWebTransportCommandRequest
  | MetaverseRealtimeWorldWebTransportSnapshotRequest
  | MetaverseRealtimeWorldWebTransportSnapshotSubscribeRequest;

export type MetaverseRealtimeWorldWebTransportServerMessage =
  | MetaverseRealtimeWorldWebTransportErrorMessage
  | MetaverseRealtimeWorldWebTransportServerEventMessage;

export function createMetaverseRealtimeWorldWebTransportSnapshotRequest(
  input: MetaverseRealtimeWorldWebTransportSnapshotRequestInput
): MetaverseRealtimeWorldWebTransportSnapshotRequest {
  return Object.freeze({
    observerPlayerId: input.observerPlayerId,
    roomId: input.roomId,
    type: "world-snapshot-request"
  });
}

export function createMetaverseRealtimeWorldWebTransportSnapshotSubscribeRequest(
  input: MetaverseRealtimeWorldWebTransportSnapshotSubscribeRequestInput
): MetaverseRealtimeWorldWebTransportSnapshotSubscribeRequest {
  return Object.freeze({
    observerPlayerId: input.observerPlayerId,
    roomId: input.roomId,
    type: "world-snapshot-subscribe"
  });
}

function normalizeMetaverseRealtimeWorldClientCommand(
  command: MetaverseRealtimeWorldClientCommand
): MetaverseRealtimeWorldClientCommand {
  switch (command.type) {
    case "issue-player-action":
      return createMetaverseIssuePlayerActionCommand(command);
    case "sync-driver-vehicle-control":
      return createMetaverseSyncDriverVehicleControlCommand(command);
    case "sync-mounted-occupancy":
      return createMetaverseSyncMountedOccupancyCommand(command);
    case "sync-player-look-intent":
      return createMetaverseSyncPlayerLookIntentCommand(command);
    case "sync-player-traversal-intent":
      return createMetaverseSyncPlayerTraversalIntentCommand(command);
    case "sync-player-weapon-state":
      return createMetaverseSyncPlayerWeaponStateCommand(command);
    default: {
      const exhaustiveCommand: never = command;

      throw new Error(
        `Unsupported metaverse realtime world command type: ${exhaustiveCommand}`
      );
    }
  }
}

export function createMetaverseRealtimeWorldWebTransportCommandRequest(
  input: MetaverseRealtimeWorldWebTransportCommandRequestInput
): MetaverseRealtimeWorldWebTransportCommandRequest {
  return Object.freeze({
    command: normalizeMetaverseRealtimeWorldClientCommand(input.command),
    roomId: input.roomId,
    type: "world-command-request"
  });
}

export function createMetaverseRealtimeWorldWebTransportServerEventMessage(
  input: MetaverseRealtimeWorldWebTransportServerEventMessageInput
): MetaverseRealtimeWorldWebTransportServerEventMessage {
  return Object.freeze({
    event: createMetaverseRealtimeWorldEvent({
      world: input.event.world
    }),
    type: "world-server-event"
  });
}

export function createMetaverseRealtimeWorldWebTransportErrorMessage(
  input: MetaverseRealtimeWorldWebTransportErrorMessageInput
): MetaverseRealtimeWorldWebTransportErrorMessage {
  return Object.freeze({
    message: input.message.trim().length === 0
      ? "Metaverse world WebTransport request failed."
      : input.message.trim(),
    type: "world-error"
  });
}
