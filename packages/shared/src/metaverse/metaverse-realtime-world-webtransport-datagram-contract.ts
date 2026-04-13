import type {
  MetaverseSyncDriverVehicleControlCommand,
  MetaverseSyncPlayerTraversalIntentCommand
} from "./metaverse-realtime-world-contract.js";
import {
  createMetaverseSyncDriverVehicleControlCommand,
  createMetaverseSyncPlayerTraversalIntentCommand
} from "./metaverse-realtime-world-contract.js";

export const metaverseRealtimeWorldWebTransportClientDatagramTypes = [
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

export interface MetaverseRealtimeWorldWebTransportPlayerTraversalIntentDatagram {
  readonly command: MetaverseSyncPlayerTraversalIntentCommand;
  readonly type: "world-player-traversal-intent-datagram";
}

export interface MetaverseRealtimeWorldWebTransportPlayerTraversalIntentDatagramInput {
  readonly command: MetaverseSyncPlayerTraversalIntentCommand;
}

export type MetaverseRealtimeWorldWebTransportClientDatagram =
  | MetaverseRealtimeWorldWebTransportPlayerTraversalIntentDatagram
  | MetaverseRealtimeWorldWebTransportDriverVehicleControlDatagram;

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
