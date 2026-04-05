import type {
  NormalizedViewportPoint
} from "@thumbshooter/shared";

import type { HandTrackingPoseState } from "./hand-tracking";

export const gameplayRuntimeLifecycleStates = [
  "idle",
  "booting",
  "running",
  "failed"
] as const;

export type GameplayRuntimeLifecycleState =
  (typeof gameplayRuntimeLifecycleStates)[number];

export interface GameplayHudSnapshot {
  readonly aimPoint: NormalizedViewportPoint | null;
  readonly failureReason: string | null;
  readonly lifecycle: GameplayRuntimeLifecycleState;
  readonly trackingState: HandTrackingPoseState;
}

export interface GameplayRuntimeConfig {
  readonly background: {
    readonly lowerColor: readonly [number, number, number];
    readonly upperColor: readonly [number, number, number];
  };
  readonly reticle: {
    readonly innerRadius: number;
    readonly outerRadius: number;
    readonly strokeColor: readonly [number, number, number];
    readonly horizontalBarSize: {
      readonly width: number;
      readonly height: number;
    };
    readonly verticalBarSize: {
      readonly width: number;
      readonly height: number;
    };
  };
}
