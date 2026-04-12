import type {
  MetaversePlayerId,
  MetaversePresenceCommand,
  MetaversePresenceRosterEvent
} from "@webgpu-metaverse/shared";

import type { NetworkCommandTransportOptions } from "./transport-command-options";

export interface MetaversePresenceTransport {
  dispose?(): void;
  pollRosterSnapshot(
    playerId: MetaversePlayerId
  ): Promise<MetaversePresenceRosterEvent>;
  sendCommand(
    command: MetaversePresenceCommand,
    options?: NetworkCommandTransportOptions
  ): Promise<MetaversePresenceRosterEvent>;
}
