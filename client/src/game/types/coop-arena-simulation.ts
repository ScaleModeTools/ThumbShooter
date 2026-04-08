import type {
  CoopPlayerId,
  CoopRoomId,
  CoopRoomSnapshot,
  Milliseconds,
  NormalizedViewportPoint
} from "@thumbshooter/shared";

import type { WeaponDefinition } from "./weapon-contract";

export interface CoopArenaSimulationConfig {
  readonly feedback: {
    readonly holdDurationMs: Milliseconds;
  };
  readonly targeting: {
    readonly acquireRadius: number;
  };
  readonly weapon: WeaponDefinition;
}

export interface CoopArenaRoomSource {
  readonly roomId: CoopRoomId;
  readonly roomSnapshot: CoopRoomSnapshot | null;
  fireShot: (aimPoint: NormalizedViewportPoint) => void;
}

export interface CoopArenaLocalIdentity {
  readonly playerId: CoopPlayerId;
}
