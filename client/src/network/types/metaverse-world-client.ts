import type {
  MetaversePlayerId,
  MetaverseRealtimeWorldSnapshot,
  Milliseconds
} from "@webgpu-metaverse/shared";

export const metaverseWorldClientStates = [
  "idle",
  "connecting",
  "connected",
  "error",
  "disposed"
] as const;

export type MetaverseWorldClientState =
  (typeof metaverseWorldClientStates)[number];

export interface MetaverseWorldClientConfig {
  readonly defaultCommandIntervalMs: Milliseconds;
  readonly defaultPollIntervalMs: Milliseconds;
  readonly maxBufferedSnapshots: number;
  readonly serverOrigin: string;
  readonly worldCommandPath: string;
  readonly worldPath: string;
}

export interface MetaverseWorldClientStatusSnapshot {
  readonly connected: boolean;
  readonly lastError: string | null;
  readonly lastSnapshotSequence: number | null;
  readonly lastWorldTick: number | null;
  readonly playerId: MetaversePlayerId | null;
  readonly state: MetaverseWorldClientState;
}

export interface MetaverseWorldSnapshotStore {
  readonly worldSnapshotBuffer: readonly MetaverseRealtimeWorldSnapshot[];
}
