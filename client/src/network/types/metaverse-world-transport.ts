import type {
  MetaverseRealtimeWorldClientCommand,
  MetaversePlayerId,
  MetaverseRealtimeWorldEvent
} from "@webgpu-metaverse/shared";
import type { NetworkCommandTransportOptions } from "./transport-command-options";

export interface MetaverseWorldTransport {
  dispose?(): void;
  pollWorldSnapshot(
    playerId: MetaversePlayerId
  ): Promise<MetaverseRealtimeWorldEvent>;
  sendCommand(
    command: MetaverseRealtimeWorldClientCommand,
    options?: NetworkCommandTransportOptions
  ): Promise<MetaverseRealtimeWorldEvent>;
}
