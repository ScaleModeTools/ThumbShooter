import type {
  CoopPlayerId,
  CoopRoomId,
  CoopRoomSnapshot,
  Milliseconds,
  Username
} from "@thumbshooter/shared";

export const coopRoomClientStates = [
  "idle",
  "joining",
  "connected",
  "error",
  "disposed"
] as const;

export type CoopRoomClientState = (typeof coopRoomClientStates)[number];

export interface CoopRoomClientConfig {
  readonly defaultPollIntervalMs: Milliseconds;
  readonly roomId: CoopRoomId;
  readonly serverOrigin: string;
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

export interface CoopRoomSnapshotStore {
  readonly roomSnapshot: CoopRoomSnapshot | null;
  fireShot: (aimPoint: { readonly x: number; readonly y: number }) => void;
}
