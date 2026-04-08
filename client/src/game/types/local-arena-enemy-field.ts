import type { Radians } from "@thumbshooter/shared";

import type {
  LocalArenaEnemyBehaviorState,
  LocalArenaSimulationConfig
} from "./local-arena-simulation";

export interface MutableEnemyRenderState {
  behavior: LocalArenaEnemyBehaviorState;
  headingRadians: Radians;
  id: string;
  label: string;
  positionX: number;
  positionY: number;
  radius: number;
  scale: number;
  visible: boolean;
  wingPhase: number;
}

export interface LocalArenaEnemyRuntimeState {
  readonly downedScale: number;
  readonly glideScale: number;
  readonly homeVelocityX: number;
  readonly homeVelocityY: number;
  readonly renderState: MutableEnemyRenderState;
  readonly scatterScale: number;
  readonly wingSpeed: number;
  behaviorRemainingMs: number;
  velocityX: number;
  velocityY: number;
}

export type LocalArenaEnemySeed =
  LocalArenaSimulationConfig["enemySeeds"][number];
