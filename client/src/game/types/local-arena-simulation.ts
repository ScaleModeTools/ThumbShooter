import type {
  Milliseconds,
  NormalizedViewportPoint,
  Radians
} from "@thumbshooter/shared";

import type { HandTrackingPoseState } from "./hand-tracking";
import type {
  SinglePlayerGameplaySessionSnapshot
} from "./gameplay-session";
import type {
  LocalCombatSessionConfig,
} from "./local-combat-session";
import type { WeaponDefinition, WeaponHudSnapshot } from "./weapon-contract";

export const localArenaEnemyBehaviorStates = [
  "glide",
  "scatter",
  "downed"
] as const;
export const localArenaTargetFeedbackStates = [
  "tracking-lost",
  "offscreen",
  "clear",
  "targeted",
  "hit",
  "miss"
] as const;

export type LocalArenaEnemyBehaviorState =
  (typeof localArenaEnemyBehaviorStates)[number];
export type LocalArenaTargetFeedbackState =
  (typeof localArenaTargetFeedbackStates)[number];

export interface LocalArenaEnemySeed {
  readonly id: string;
  readonly label: string;
  readonly spawn: {
    readonly x: number;
    readonly y: number;
  };
  readonly glideVelocity: {
    readonly x: number;
    readonly y: number;
  };
  readonly radius: number;
  readonly scale: number;
  readonly wingSpeed: number;
}

export interface LocalArenaEnemyRenderState {
  readonly behavior: LocalArenaEnemyBehaviorState;
  readonly headingRadians: Radians;
  readonly id: string;
  readonly label: string;
  readonly positionX: number;
  readonly positionY: number;
  readonly radius: number;
  readonly scale: number;
  readonly visible: boolean;
  readonly wingPhase: number;
}

export interface LocalArenaArenaSnapshot {
  readonly downedEnemyCount: number;
  readonly liveEnemyCount: number;
  readonly scatterEnemyCount: number;
}

export type LocalArenaWeaponSnapshot = WeaponHudSnapshot;

export interface LocalArenaTargetFeedbackSnapshot {
  readonly enemyId: string | null;
  readonly enemyLabel: string | null;
  readonly state: LocalArenaTargetFeedbackState;
}

export interface LocalArenaHudSnapshot {
  readonly aimPoint: NormalizedViewportPoint | null;
  readonly arena: LocalArenaArenaSnapshot;
  readonly session: SinglePlayerGameplaySessionSnapshot;
  readonly targetFeedback: LocalArenaTargetFeedbackSnapshot;
  readonly trackingState: HandTrackingPoseState;
  readonly weapon: LocalArenaWeaponSnapshot;
}

export interface LocalArenaSimulationConfig {
  readonly arenaBounds: {
    readonly maxX: number;
    readonly maxY: number;
    readonly minX: number;
    readonly minY: number;
  };
  readonly enemySeeds: readonly LocalArenaEnemySeed[];
  readonly feedback: {
    readonly holdDurationMs: Milliseconds;
  };
  readonly movement: {
    readonly downedDriftVelocityY: number;
    readonly maxStepMs: Milliseconds;
    readonly scatterDurationMs: Milliseconds;
    readonly scatterSpeed: number;
    readonly downedDurationMs: Milliseconds;
  };
  readonly session: LocalCombatSessionConfig;
  readonly targeting: {
    readonly acquireRadius: number;
    readonly hitRadius: number;
    readonly reticleScatterRadius: number;
    readonly shotScatterRadius: number;
  };
  readonly weapon: WeaponDefinition;
}
