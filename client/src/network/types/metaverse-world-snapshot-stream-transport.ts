import type {
  MetaversePlayerId,
  MetaverseRealtimeWorldEvent
} from "@webgpu-metaverse/shared";

import type { ReliableWebTransportSubscriptionHandle } from "./reliable-webtransport-subscription";

export interface MetaverseWorldSnapshotStreamTransport {
  dispose?(): void;
  subscribeWorldSnapshots(
    playerId: MetaversePlayerId,
    handlers: {
      readonly onClose?: (() => void) | undefined;
      readonly onError?: ((error: unknown) => void) | undefined;
      readonly onWorldEvent: (event: MetaverseRealtimeWorldEvent) => void;
    }
  ): ReliableWebTransportSubscriptionHandle;
}
