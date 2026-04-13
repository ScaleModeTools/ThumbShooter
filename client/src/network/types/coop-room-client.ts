import type {
  CoopPlayerId,
  CoopPlayerPresenceSnapshotInput,
  CoopRoomId,
  CoopRoomSnapshot,
  Milliseconds,
  Username,
  CoopVector3SnapshotInput
} from "@webgpu-metaverse/shared";

export const coopRoomClientStates = [
  "idle",
  "joining",
  "connected",
  "error",
  "disposed"
] as const;

export type CoopRoomClientState = (typeof coopRoomClientStates)[number];

export const coopRoomSnapshotPaths = [
  "http-polling",
  "reliable-snapshot-stream",
  "fallback-polling"
] as const;

export type CoopRoomSnapshotPath = (typeof coopRoomSnapshotPaths)[number];

export const coopRoomSnapshotStreamLivenessStates = [
  "inactive",
  "subscribed",
  "reconnecting",
  "fallback-polling"
] as const;

export type CoopRoomSnapshotStreamLiveness =
  (typeof coopRoomSnapshotStreamLivenessStates)[number];

export interface CoopRoomClientConfig {
  readonly defaultPollIntervalMs: Milliseconds;
  readonly maxBufferedSnapshots: number;
  readonly roomId: CoopRoomId;
  readonly roomCollectionPath: string;
  readonly serverOrigin: string;
  readonly snapshotStreamReconnectDelayMs: Milliseconds;
}

export interface CoopRoomJoinRequest {
  readonly playerId: CoopPlayerId;
  readonly ready: boolean;
  readonly username: Username;
}

export interface CoopRoomClientStatusSnapshot {
  readonly joined: boolean;
  readonly lastError: string | null;
  readonly lastSnapshotTick: number | null;
  readonly playerId: CoopPlayerId | null;
  readonly roomId: CoopRoomId;
  readonly state: CoopRoomClientState;
}

export interface CoopRoomSnapshotStreamTelemetrySnapshot {
  readonly available: boolean;
  readonly fallbackActive: boolean;
  readonly lastTransportError: string | null;
  readonly liveness: CoopRoomSnapshotStreamLiveness;
  readonly path: CoopRoomSnapshotPath;
  readonly reconnectCount: number;
}

export interface CoopRoomClientTelemetrySnapshot {
  readonly latestSnapshotUpdateRateHz: number | null;
  readonly playerPresenceDatagramSendFailureCount: number;
  readonly playerPresenceLastTransportError: string | null;
  readonly playerPresenceReliableFallbackActive: boolean;
  readonly snapshotStream: CoopRoomSnapshotStreamTelemetrySnapshot;
}

export interface CoopRoomSnapshotStore {
  readonly roomSnapshotBuffer: readonly CoopRoomSnapshot[];
  readonly roomSnapshot: CoopRoomSnapshot | null;
  fireShot: (
    origin: CoopVector3SnapshotInput,
    aimDirection: CoopVector3SnapshotInput,
    options?: {
      readonly clientEstimatedSimulationTimeMs?: number;
      readonly weaponId?: string;
    }
  ) => void;
  syncPlayerPresence: (
    presence: Omit<CoopPlayerPresenceSnapshotInput, "lastUpdatedTick" | "stateSequence">
  ) => void;
}
