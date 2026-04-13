import type {
  MetaverseRealtimeWorldWebTransportClientDatagram,
  MetaverseSyncDriverVehicleControlCommand,
  MetaverseSyncPlayerTraversalIntentCommand
} from "@webgpu-metaverse/shared";
import {
  createMetaverseRealtimeWorldWebTransportDriverVehicleControlDatagram,
  createMetaverseRealtimeWorldWebTransportPlayerTraversalIntentDatagram
} from "@webgpu-metaverse/shared";

import { LatestWinsWebTransportJsonDatagramChannel } from "./latest-wins-webtransport-json-datagram-channel";
import type { MetaverseRealtimeWorldLatestWinsDatagramTransport } from "../types/metaverse-realtime-world-latest-wins-datagram-transport";

interface MetaverseRealtimeWorldLatestWinsWebTransportDatagramTransportConfig {
  readonly webTransportUrl: string;
}

interface MetaverseRealtimeWorldLatestWinsWebTransportDatagramChannel {
  dispose(): void;
  sendDatagram(
    datagram: MetaverseRealtimeWorldWebTransportClientDatagram
  ): Promise<void>;
}

interface WebTransportDatagramStreamLike {
  readonly writable: WritableStream<Uint8Array>;
}

interface WebTransportLike {
  readonly closed?: Promise<unknown>;
  readonly datagrams?: WebTransportDatagramStreamLike;
  readonly ready?: Promise<unknown>;
  close(closeInfo?: {
    readonly closeCode?: number;
    readonly reason?: string;
  }): void;
}

interface MetaverseRealtimeWorldLatestWinsWebTransportDatagramTransportDependencies {
  readonly channel?: MetaverseRealtimeWorldLatestWinsWebTransportDatagramChannel;
  readonly webTransportFactory?: (url: string) => WebTransportLike;
}

export function createMetaverseRealtimeWorldLatestWinsWebTransportDatagramTransport(
  config: MetaverseRealtimeWorldLatestWinsWebTransportDatagramTransportConfig,
  dependencies: MetaverseRealtimeWorldLatestWinsWebTransportDatagramTransportDependencies = {}
): MetaverseRealtimeWorldLatestWinsDatagramTransport {
  const channel =
    dependencies.channel ??
    new LatestWinsWebTransportJsonDatagramChannel<MetaverseRealtimeWorldWebTransportClientDatagram>(
      {
        url: config.webTransportUrl
      },
      dependencies.webTransportFactory === undefined
        ? {}
        : {
            webTransportFactory: dependencies.webTransportFactory
          }
    );

  return Object.freeze({
    dispose() {
      channel.dispose();
    },
    async sendDriverVehicleControlDatagram(
      command: MetaverseSyncDriverVehicleControlCommand
    ): Promise<void> {
      await channel.sendDatagram(
        createMetaverseRealtimeWorldWebTransportDriverVehicleControlDatagram({
          command
        })
      );
    },
    async sendPlayerTraversalIntentDatagram(
      command: MetaverseSyncPlayerTraversalIntentCommand
    ): Promise<void> {
      await channel.sendDatagram(
        createMetaverseRealtimeWorldWebTransportPlayerTraversalIntentDatagram({
          command
        })
      );
    }
  });
}
