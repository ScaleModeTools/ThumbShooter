import type { LatestHandTrackingSnapshot } from "./hand-tracking";
import type {
  LocalArenaEnemyRenderState
} from "./local-arena-simulation";
import type { GameplayArenaHudSnapshot } from "./gameplay-runtime";

export interface GameplayArenaRuntime {
  readonly enemyRenderStates: readonly LocalArenaEnemyRenderState[];
  readonly hudSnapshot: GameplayArenaHudSnapshot;
  readonly worldTimeMs: number;
  advance: (
    trackingSnapshot: LatestHandTrackingSnapshot,
    nowMs?: number
  ) => GameplayArenaHudSnapshot;
  reset: (trackingSnapshot?: LatestHandTrackingSnapshot) => void;
}
