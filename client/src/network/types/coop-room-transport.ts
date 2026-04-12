import type {
  CoopPlayerId,
  CoopRoomClientCommand,
  CoopRoomServerEvent
} from "@webgpu-metaverse/shared";

import type { NetworkCommandTransportOptions } from "./transport-command-options";

export interface CoopRoomTransport {
  dispose?(): void;
  pollRoomSnapshot(playerId: CoopPlayerId): Promise<CoopRoomServerEvent>;
  sendCommand(
    command: CoopRoomClientCommand,
    options?: NetworkCommandTransportOptions
  ): Promise<CoopRoomServerEvent>;
}
