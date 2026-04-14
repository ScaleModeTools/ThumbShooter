import type {
  MetaverseSyncPlayerLookIntentCommand,
  MetaverseSyncDriverVehicleControlCommand,
  MetaverseSyncPlayerTraversalIntentCommand
} from "./metaverse-realtime-world-contract.js";
import {
  createMetaverseSyncPlayerLookIntentCommand,
  createMetaverseSyncDriverVehicleControlCommand,
  createMetaverseSyncPlayerTraversalIntentCommand
} from "./metaverse-realtime-world-contract.js";

export const metaverseRealtimeWorldWebTransportClientDatagramTypes = [
  "world-player-look-intent-datagram",
  "world-player-traversal-intent-datagram",
  "world-driver-vehicle-control-datagram"
] as const;

export type MetaverseRealtimeWorldWebTransportClientDatagramType =
  (typeof metaverseRealtimeWorldWebTransportClientDatagramTypes)[number];

export interface MetaverseRealtimeWorldWebTransportDriverVehicleControlDatagram {
  readonly command: MetaverseSyncDriverVehicleControlCommand;
  readonly type: "world-driver-vehicle-control-datagram";
}

export interface MetaverseRealtimeWorldWebTransportDriverVehicleControlDatagramInput {
  readonly command: MetaverseSyncDriverVehicleControlCommand;
}

export interface MetaverseRealtimeWorldWebTransportPlayerLookIntentDatagram {
  readonly command: MetaverseSyncPlayerLookIntentCommand;
  readonly type: "world-player-look-intent-datagram";
}

export interface MetaverseRealtimeWorldWebTransportPlayerLookIntentDatagramInput {
  readonly command: MetaverseSyncPlayerLookIntentCommand;
}

export interface MetaverseRealtimeWorldWebTransportPlayerTraversalIntentDatagram {
  readonly command: MetaverseSyncPlayerTraversalIntentCommand;
  readonly type: "world-player-traversal-intent-datagram";
}

export interface MetaverseRealtimeWorldWebTransportPlayerTraversalIntentDatagramInput {
  readonly command: MetaverseSyncPlayerTraversalIntentCommand;
}

export type MetaverseRealtimeWorldWebTransportClientDatagram =
  | MetaverseRealtimeWorldWebTransportPlayerLookIntentDatagram
  | MetaverseRealtimeWorldWebTransportPlayerTraversalIntentDatagram
  | MetaverseRealtimeWorldWebTransportDriverVehicleControlDatagram;

export function createMetaverseRealtimeWorldWebTransportPlayerLookIntentDatagram(
  input: MetaverseRealtimeWorldWebTransportPlayerLookIntentDatagramInput
): MetaverseRealtimeWorldWebTransportPlayerLookIntentDatagram {
  return Object.freeze({
    command: createMetaverseSyncPlayerLookIntentCommand(input.command),
    type: "world-player-look-intent-datagram"
  });
}

export function createMetaverseRealtimeWorldWebTransportPlayerTraversalIntentDatagram(
  input: MetaverseRealtimeWorldWebTransportPlayerTraversalIntentDatagramInput
): MetaverseRealtimeWorldWebTransportPlayerTraversalIntentDatagram {
  return Object.freeze({
    command: createMetaverseSyncPlayerTraversalIntentCommand(input.command),
    type: "world-player-traversal-intent-datagram"
  });
}

export function createMetaverseRealtimeWorldWebTransportDriverVehicleControlDatagram(
  input: MetaverseRealtimeWorldWebTransportDriverVehicleControlDatagramInput
): MetaverseRealtimeWorldWebTransportDriverVehicleControlDatagram {
  return Object.freeze({
    command: createMetaverseSyncDriverVehicleControlCommand(input.command),
    type: "world-driver-vehicle-control-datagram"
  });
}
