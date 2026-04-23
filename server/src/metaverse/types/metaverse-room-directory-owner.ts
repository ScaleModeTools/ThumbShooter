import type {
  MetaverseJoinRoomRequest,
  MetaverseQuickJoinRoomRequest,
  MetaverseRoomAssignmentSnapshot,
  MetaverseRoomDirectorySnapshot,
  MetaverseRoomId,
  MetaverseMatchModeId
} from "@webgpu-metaverse/shared";
import type {
  MetaversePlayerId,
  MetaversePresenceCommand,
  MetaversePresenceRosterEvent,
  MetaversePresenceRosterSnapshot
} from "@webgpu-metaverse/shared/metaverse/presence";
import type {
  MetaverseRealtimeWorldClientCommand,
  MetaverseRealtimeWorldEvent,
  MetaverseRealtimeWorldSnapshot
} from "@webgpu-metaverse/shared/metaverse/realtime";

export interface MetaverseRoomDirectoryOwner {
  readonly tickIntervalMs: number;
  advanceToTime(nowMs: number): void;
  listRoomDirectorySnapshot(
    nowMs: number,
    matchMode?: MetaverseMatchModeId
  ): MetaverseRoomDirectorySnapshot;
  quickJoinRoom(
    request: MetaverseQuickJoinRoomRequest,
    nowMs: number
  ): MetaverseRoomAssignmentSnapshot;
  joinRoom(
    roomId: MetaverseRoomId,
    request: MetaverseJoinRoomRequest,
    nowMs: number
  ): MetaverseRoomAssignmentSnapshot;
  readPresenceRosterSnapshot(
    roomId: MetaverseRoomId,
    nowMs: number,
    observerPlayerId?: MetaversePlayerId
  ): MetaversePresenceRosterSnapshot;
  readPresenceRosterEvent(
    roomId: MetaverseRoomId,
    nowMs: number,
    observerPlayerId?: MetaversePlayerId
  ): MetaversePresenceRosterEvent;
  readWorldSnapshot(
    roomId: MetaverseRoomId,
    nowMs: number,
    observerPlayerId?: MetaversePlayerId
  ): MetaverseRealtimeWorldSnapshot;
  readWorldEvent(
    roomId: MetaverseRoomId,
    nowMs: number,
    observerPlayerId?: MetaversePlayerId
  ): MetaverseRealtimeWorldEvent;
  acceptPresenceCommand(
    roomId: MetaverseRoomId,
    command: MetaversePresenceCommand,
    nowMs: number
  ): MetaversePresenceRosterEvent;
  acceptWorldCommand(
    roomId: MetaverseRoomId,
    command: MetaverseRealtimeWorldClientCommand,
    nowMs: number
  ): MetaverseRealtimeWorldEvent;
  acceptBoundWorldCommand(
    command: MetaverseRealtimeWorldClientCommand,
    nowMs: number
  ): void;
}
