import type {
  MetaverseJoinPresenceCommand,
  MetaverseLeavePresenceCommand,
  MetaversePlayerId,
  MetaversePresenceCommand,
  MetaversePresenceRosterEvent,
  MetaverseSyncPresenceCommand
} from "./metaverse-presence-contract.js";
import type { MetaverseRoomId } from "./metaverse-room-contract.js";
import {
  createMetaverseJoinPresenceCommand,
  createMetaverseLeavePresenceCommand,
  createMetaversePresenceRosterEvent,
  createMetaverseSyncPresenceCommand
} from "./metaverse-presence-contract.js";

export const metaversePresenceWebTransportClientMessageTypes = [
  "presence-roster-request",
  "presence-command-request"
] as const;

export const metaversePresenceWebTransportServerMessageTypes = [
  "presence-server-event",
  "presence-error"
] as const;

export type MetaversePresenceWebTransportClientMessageType =
  (typeof metaversePresenceWebTransportClientMessageTypes)[number];
export type MetaversePresenceWebTransportServerMessageType =
  (typeof metaversePresenceWebTransportServerMessageTypes)[number];

export interface MetaversePresenceWebTransportRosterRequest {
  readonly observerPlayerId: MetaversePlayerId;
  readonly roomId: MetaverseRoomId;
  readonly type: "presence-roster-request";
}

export interface MetaversePresenceWebTransportRosterRequestInput {
  readonly observerPlayerId: MetaversePlayerId;
  readonly roomId: MetaverseRoomId;
}

export interface MetaversePresenceWebTransportCommandRequest {
  readonly command: MetaversePresenceCommand;
  readonly roomId: MetaverseRoomId;
  readonly type: "presence-command-request";
}

export interface MetaversePresenceWebTransportCommandRequestInput {
  readonly command: MetaversePresenceCommand;
  readonly roomId: MetaverseRoomId;
}

export interface MetaversePresenceWebTransportServerEventMessage {
  readonly event: MetaversePresenceRosterEvent;
  readonly type: "presence-server-event";
}

export interface MetaversePresenceWebTransportServerEventMessageInput {
  readonly event: MetaversePresenceRosterEvent;
}

export interface MetaversePresenceWebTransportErrorMessage {
  readonly message: string;
  readonly type: "presence-error";
}

export interface MetaversePresenceWebTransportErrorMessageInput {
  readonly message: string;
}

export type MetaversePresenceWebTransportClientMessage =
  | MetaversePresenceWebTransportRosterRequest
  | MetaversePresenceWebTransportCommandRequest;

export type MetaversePresenceWebTransportServerMessage =
  | MetaversePresenceWebTransportErrorMessage
  | MetaversePresenceWebTransportServerEventMessage;

function normalizePresenceCommand(
  command: MetaversePresenceCommand
): MetaverseJoinPresenceCommand | MetaverseLeavePresenceCommand | MetaverseSyncPresenceCommand {
  switch (command.type) {
    case "join-presence":
      return createMetaverseJoinPresenceCommand(command);
    case "leave-presence":
      return createMetaverseLeavePresenceCommand(command);
    case "sync-presence":
      return createMetaverseSyncPresenceCommand(command);
    default: {
      const exhaustiveCheck: never = command;
      throw new Error(`Unsupported metaverse presence command: ${exhaustiveCheck}`);
    }
  }
}

export function createMetaversePresenceWebTransportRosterRequest(
  input: MetaversePresenceWebTransportRosterRequestInput
): MetaversePresenceWebTransportRosterRequest {
  return Object.freeze({
    observerPlayerId: input.observerPlayerId,
    roomId: input.roomId,
    type: "presence-roster-request"
  });
}

export function createMetaversePresenceWebTransportCommandRequest(
  input: MetaversePresenceWebTransportCommandRequestInput
): MetaversePresenceWebTransportCommandRequest {
  return Object.freeze({
    command: normalizePresenceCommand(input.command),
    roomId: input.roomId,
    type: "presence-command-request"
  });
}

export function createMetaversePresenceWebTransportServerEventMessage(
  input: MetaversePresenceWebTransportServerEventMessageInput
): MetaversePresenceWebTransportServerEventMessage {
  return Object.freeze({
    event: createMetaversePresenceRosterEvent(input.event.roster),
    type: "presence-server-event"
  });
}

export function createMetaversePresenceWebTransportErrorMessage(
  input: MetaversePresenceWebTransportErrorMessageInput
): MetaversePresenceWebTransportErrorMessage {
  return Object.freeze({
    message: input.message.trim().length === 0
      ? "Metaverse presence WebTransport request failed."
      : input.message.trim(),
    type: "presence-error"
  });
}
