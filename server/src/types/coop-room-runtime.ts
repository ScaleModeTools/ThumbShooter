import type {
  CoopBirdId,
  CoopRoomId,
  CoopSessionId,
  Milliseconds
} from "@thumbshooter/shared";

export interface CoopRoomBirdSeed {
  readonly birdId: CoopBirdId;
  readonly glideVelocity: {
    readonly x: number;
    readonly y: number;
  };
  readonly label: string;
  readonly radius: number;
  readonly scale: number;
  readonly spawn: {
    readonly x: number;
    readonly y: number;
  };
  readonly wingSpeed: number;
}

export interface CoopRoomRuntimeConfig {
  readonly arenaBounds: {
    readonly maxX: number;
    readonly maxY: number;
    readonly minX: number;
    readonly minY: number;
  };
  readonly birds: readonly CoopRoomBirdSeed[];
  readonly capacity: number;
  readonly hitRadius: number;
  readonly movement: {
    readonly downedDriftVelocityY: number;
    readonly downedDurationMs: Milliseconds;
    readonly scatterDurationMs: Milliseconds;
    readonly scatterSpeed: number;
  };
  readonly requiredReadyPlayerCount: number;
  readonly roomId: CoopRoomId;
  readonly scatterRadius: number;
  readonly sessionId: CoopSessionId;
  readonly tickIntervalMs: Milliseconds;
}
