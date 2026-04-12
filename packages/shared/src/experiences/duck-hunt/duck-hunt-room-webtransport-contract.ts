import type {
  CoopFireShotCommand,
  CoopJoinRoomCommand,
  CoopKickPlayerCommand,
  CoopLeaveRoomCommand,
  CoopPlayerId,
  CoopRoomClientCommand,
  CoopRoomId,
  CoopRoomServerEvent,
  CoopSetPlayerReadyCommand,
  CoopStartSessionCommand,
  CoopSyncPlayerPresenceCommand
} from "./duck-hunt-room-contract.js";
import {
  createCoopFireShotCommand,
  createCoopJoinRoomCommand,
  createCoopKickPlayerCommand,
  createCoopLeaveRoomCommand,
  createCoopRoomSnapshotEvent,
  createCoopSetPlayerReadyCommand,
  createCoopStartSessionCommand,
  createCoopSyncPlayerPresenceCommand
} from "./duck-hunt-room-contract.js";

export const duckHuntCoopRoomWebTransportClientMessageTypes = [
  "coop-room-snapshot-request",
  "coop-room-command-request"
] as const;

export const duckHuntCoopRoomWebTransportServerMessageTypes = [
  "coop-room-server-event",
  "coop-room-error"
] as const;

export type DuckHuntCoopRoomWebTransportClientMessageType =
  (typeof duckHuntCoopRoomWebTransportClientMessageTypes)[number];
export type DuckHuntCoopRoomWebTransportServerMessageType =
  (typeof duckHuntCoopRoomWebTransportServerMessageTypes)[number];

export interface DuckHuntCoopRoomWebTransportSnapshotRequest {
  readonly observerPlayerId: CoopPlayerId;
  readonly roomId: CoopRoomId;
  readonly type: "coop-room-snapshot-request";
}

export interface DuckHuntCoopRoomWebTransportSnapshotRequestInput {
  readonly observerPlayerId: CoopPlayerId;
  readonly roomId: CoopRoomId;
}

export interface DuckHuntCoopRoomWebTransportCommandRequest {
  readonly command: CoopRoomClientCommand;
  readonly type: "coop-room-command-request";
}

export interface DuckHuntCoopRoomWebTransportCommandRequestInput {
  readonly command: CoopRoomClientCommand;
}

export interface DuckHuntCoopRoomWebTransportServerEventMessage {
  readonly event: CoopRoomServerEvent;
  readonly type: "coop-room-server-event";
}

export interface DuckHuntCoopRoomWebTransportServerEventMessageInput {
  readonly event: CoopRoomServerEvent;
}

export interface DuckHuntCoopRoomWebTransportErrorMessage {
  readonly message: string;
  readonly type: "coop-room-error";
}

export interface DuckHuntCoopRoomWebTransportErrorMessageInput {
  readonly message: string;
}

export type DuckHuntCoopRoomWebTransportClientMessage =
  | DuckHuntCoopRoomWebTransportSnapshotRequest
  | DuckHuntCoopRoomWebTransportCommandRequest;

export type DuckHuntCoopRoomWebTransportServerMessage =
  | DuckHuntCoopRoomWebTransportErrorMessage
  | DuckHuntCoopRoomWebTransportServerEventMessage;

function normalizeCoopRoomCommand(
  command: CoopRoomClientCommand
):
  | CoopFireShotCommand
  | CoopJoinRoomCommand
  | CoopKickPlayerCommand
  | CoopLeaveRoomCommand
  | CoopSetPlayerReadyCommand
  | CoopStartSessionCommand
  | CoopSyncPlayerPresenceCommand {
  switch (command.type) {
    case "fire-shot":
      return createCoopFireShotCommand(command);
    case "join-room":
      return createCoopJoinRoomCommand(command);
    case "kick-player":
      return createCoopKickPlayerCommand(command);
    case "leave-room":
      return createCoopLeaveRoomCommand(command);
    case "set-player-ready":
      return createCoopSetPlayerReadyCommand(command);
    case "start-session":
      return createCoopStartSessionCommand(command);
    case "sync-player-presence":
      return createCoopSyncPlayerPresenceCommand(command);
    default: {
      const exhaustiveCheck: never = command;
      throw new Error(`Unsupported co-op room command: ${exhaustiveCheck}`);
    }
  }
}

export function createDuckHuntCoopRoomWebTransportSnapshotRequest(
  input: DuckHuntCoopRoomWebTransportSnapshotRequestInput
): DuckHuntCoopRoomWebTransportSnapshotRequest {
  return Object.freeze({
    observerPlayerId: input.observerPlayerId,
    roomId: input.roomId,
    type: "coop-room-snapshot-request"
  });
}

export function createDuckHuntCoopRoomWebTransportCommandRequest(
  input: DuckHuntCoopRoomWebTransportCommandRequestInput
): DuckHuntCoopRoomWebTransportCommandRequest {
  return Object.freeze({
    command: normalizeCoopRoomCommand(input.command),
    type: "coop-room-command-request"
  });
}

export function createDuckHuntCoopRoomWebTransportServerEventMessage(
  input: DuckHuntCoopRoomWebTransportServerEventMessageInput
): DuckHuntCoopRoomWebTransportServerEventMessage {
  return Object.freeze({
    event: createCoopRoomSnapshotEvent(input.event.room),
    type: "coop-room-server-event"
  });
}

export function createDuckHuntCoopRoomWebTransportErrorMessage(
  input: DuckHuntCoopRoomWebTransportErrorMessageInput
): DuckHuntCoopRoomWebTransportErrorMessage {
  return Object.freeze({
    message: input.message.trim().length === 0
      ? "Duck Hunt co-op room WebTransport request failed."
      : input.message.trim(),
    type: "coop-room-error"
  });
}
