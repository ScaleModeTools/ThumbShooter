import type {
  MetaverseSyncDriverVehicleControlCommand,
  MetaverseSyncPlayerLookIntentCommand,
  MetaverseSyncPlayerTraversalIntentCommand
} from "@webgpu-metaverse/shared";

export interface MetaverseRealtimeWorldLatestWinsDatagramTransport {
  dispose?(): void;
  sendDriverVehicleControlDatagram(
    command: MetaverseSyncDriverVehicleControlCommand
  ): Promise<void>;
  sendPlayerTraversalIntentDatagram(
    command: MetaverseSyncPlayerTraversalIntentCommand
  ): Promise<void>;
  sendPlayerLookIntentDatagram(
    command: MetaverseSyncPlayerLookIntentCommand
  ): Promise<void>;
}
