import type {
  CoopPlayerId,
  CoopPlayerShotOutcomeState,
  CoopRoomId,
  CoopRoomPhase,
  CoopRoomSnapshot,
  CoopSessionId,
  Username
} from "@thumbshooter/shared";
import { createCoopSessionId } from "@thumbshooter/shared";

import type {
  LocalCombatSessionPhase,
  LocalCombatSessionSnapshot
} from "./local-combat-session";

export interface SinglePlayerGameplaySessionSnapshot
  extends LocalCombatSessionSnapshot {
  readonly mode: "single-player";
}

export interface CoopGameplaySessionPlayerSnapshot {
  readonly connected: boolean;
  readonly hitsLanded: number;
  readonly isLocalPlayer: boolean;
  readonly lastOutcome: CoopPlayerShotOutcomeState | null;
  readonly playerId: CoopPlayerId;
  readonly ready: boolean;
  readonly scatterEventsCaused: number;
  readonly shotsFired: number;
  readonly username: Username;
}

export interface CoopGameplaySessionSnapshot {
  readonly birdsCleared: number;
  readonly birdsRemaining: number;
  readonly capacity: number;
  readonly connectedPlayerCount: number;
  readonly mode: "co-op";
  readonly phase: CoopRoomPhase;
  readonly playerCount: number;
  readonly players: readonly CoopGameplaySessionPlayerSnapshot[];
  readonly readyPlayerCount: number;
  readonly requiredReadyPlayerCount: number;
  readonly roomId: CoopRoomId;
  readonly sessionId: CoopSessionId;
  readonly teamHitsLanded: number;
  readonly teamShotsFired: number;
}

export type GameplaySessionSnapshot =
  | SinglePlayerGameplaySessionSnapshot
  | CoopGameplaySessionSnapshot;

export type GameplaySessionPhase =
  | LocalCombatSessionPhase
  | CoopRoomPhase;

function freezeCoopGameplaySessionPlayerSnapshot(
  playerSnapshot: CoopGameplaySessionPlayerSnapshot
): CoopGameplaySessionPlayerSnapshot {
  return Object.freeze({
    connected: playerSnapshot.connected,
    hitsLanded: playerSnapshot.hitsLanded,
    isLocalPlayer: playerSnapshot.isLocalPlayer,
    lastOutcome: playerSnapshot.lastOutcome,
    playerId: playerSnapshot.playerId,
    ready: playerSnapshot.ready,
    scatterEventsCaused: playerSnapshot.scatterEventsCaused,
    shotsFired: playerSnapshot.shotsFired,
    username: playerSnapshot.username
  });
}

export function createSinglePlayerGameplaySessionSnapshot(
  sessionSnapshot: LocalCombatSessionSnapshot
): SinglePlayerGameplaySessionSnapshot {
  return Object.freeze({
    hitsThisSession: sessionSnapshot.hitsThisSession,
    killsThisSession: sessionSnapshot.killsThisSession,
    mode: "single-player",
    phase: sessionSnapshot.phase,
    restartReady: sessionSnapshot.restartReady,
    roundDurationMs: sessionSnapshot.roundDurationMs,
    roundTimeRemainingMs: sessionSnapshot.roundTimeRemainingMs,
    score: sessionSnapshot.score,
    streak: sessionSnapshot.streak
  });
}

export function createPendingCoopGameplaySessionSnapshot(
  roomId: CoopRoomId
): CoopGameplaySessionSnapshot {
  const pendingSessionId = createCoopSessionId(`${roomId}-pending`);

  if (pendingSessionId === null) {
    throw new Error(`Unable to create a pending co-op session id for ${roomId}.`);
  }

  return Object.freeze({
    birdsCleared: 0,
    birdsRemaining: 0,
    capacity: 0,
    connectedPlayerCount: 0,
    mode: "co-op",
    phase: "waiting-for-players",
    playerCount: 0,
    players: Object.freeze([]),
    readyPlayerCount: 0,
    requiredReadyPlayerCount: 0,
    roomId,
    sessionId: pendingSessionId,
    teamHitsLanded: 0,
    teamShotsFired: 0
  });
}

export function createCoopGameplaySessionSnapshot(
  roomSnapshot: CoopRoomSnapshot,
  localPlayerId: CoopPlayerId
): CoopGameplaySessionSnapshot {
  let connectedPlayerCount = 0;
  let readyPlayerCount = 0;

  const players = roomSnapshot.players.map((playerSnapshot) => {
    if (playerSnapshot.connected) {
      connectedPlayerCount += 1;
    }

    if (playerSnapshot.connected && playerSnapshot.ready) {
      readyPlayerCount += 1;
    }

    return freezeCoopGameplaySessionPlayerSnapshot({
      connected: playerSnapshot.connected,
      hitsLanded: playerSnapshot.activity.hitsLanded,
      isLocalPlayer: playerSnapshot.playerId === localPlayerId,
      lastOutcome: playerSnapshot.activity.lastOutcome,
      playerId: playerSnapshot.playerId,
      ready: playerSnapshot.ready,
      scatterEventsCaused: playerSnapshot.activity.scatterEventsCaused,
      shotsFired: playerSnapshot.activity.shotsFired,
      username: playerSnapshot.username
    });
  });

  return Object.freeze({
    birdsCleared: roomSnapshot.session.birdsCleared,
    birdsRemaining: roomSnapshot.session.birdsRemaining,
    capacity: roomSnapshot.capacity,
    connectedPlayerCount,
    mode: "co-op",
    phase: roomSnapshot.session.phase,
    playerCount: roomSnapshot.players.length,
    players: Object.freeze(players),
    readyPlayerCount,
    requiredReadyPlayerCount: roomSnapshot.session.requiredReadyPlayerCount,
    roomId: roomSnapshot.roomId,
    sessionId: roomSnapshot.session.sessionId,
    teamHitsLanded: roomSnapshot.session.teamHitsLanded,
    teamShotsFired: roomSnapshot.session.teamShotsFired
  });
}
