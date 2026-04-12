import type {
  MetaverseRealtimeWorldClientCommand,
  MetaverseRealtimeWorldEvent,
  MetaverseSyncDriverVehicleControlCommand
} from "./metaverse-realtime-world-contract.js";
import {
  createMetaverseRealtimeWorldEvent,
  createMetaverseSyncDriverVehicleControlCommand
} from "./metaverse-realtime-world-contract.js";
import type { MetaversePlayerId } from "./metaverse-presence-contract.js";

export const metaverseRealtimeWorldWebTransportClientMessageTypes = [
  "world-snapshot-request",
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
  readonly type: "world-snapshot-request";
}

export interface MetaverseRealtimeWorldWebTransportSnapshotRequestInput {
  readonly observerPlayerId: MetaversePlayerId;
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
  readonly type: "world-command-request";
}

export interface MetaverseRealtimeWorldWebTransportCommandRequestInput {
  readonly command: MetaverseRealtimeWorldClientCommand;
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
  | MetaverseRealtimeWorldWebTransportSnapshotRequest;

export type MetaverseRealtimeWorldWebTransportServerMessage =
  | MetaverseRealtimeWorldWebTransportErrorMessage
  | MetaverseRealtimeWorldWebTransportServerEventMessage;

export function createMetaverseRealtimeWorldWebTransportSnapshotRequest(
  input: MetaverseRealtimeWorldWebTransportSnapshotRequestInput
): MetaverseRealtimeWorldWebTransportSnapshotRequest {
  return Object.freeze({
    observerPlayerId: input.observerPlayerId,
    type: "world-snapshot-request"
  });
}

function normalizeMetaverseRealtimeWorldClientCommand(
  command: MetaverseRealtimeWorldClientCommand
): MetaverseSyncDriverVehicleControlCommand {
  return createMetaverseSyncDriverVehicleControlCommand(command);
}

export function createMetaverseRealtimeWorldWebTransportCommandRequest(
  input: MetaverseRealtimeWorldWebTransportCommandRequestInput
): MetaverseRealtimeWorldWebTransportCommandRequest {
  return Object.freeze({
    command: normalizeMetaverseRealtimeWorldClientCommand(input.command),
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
