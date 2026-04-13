import type {
  CoopPlayerId,
  CoopRoomServerEvent
} from "@webgpu-metaverse/shared";

import type { ReliableWebTransportSubscriptionHandle } from "./reliable-webtransport-subscription";

export interface CoopRoomSnapshotStreamTransport {
  dispose?(): void;
  subscribeRoomSnapshots(
    playerId: CoopPlayerId,
    handlers: {
      readonly onClose?: (() => void) | undefined;
      readonly onError?: ((error: unknown) => void) | undefined;
      readonly onRoomEvent: (event: CoopRoomServerEvent) => void;
    }
  ): ReliableWebTransportSubscriptionHandle;
}
