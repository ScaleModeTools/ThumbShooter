import { createRadians } from "@thumbshooter/shared";

import type {
  LocalArenaArenaSnapshot,
  LocalArenaEnemyRenderState,
  LocalArenaSimulationConfig
} from "../types/local-arena-simulation";
import type {
  LocalArenaEnemyRuntimeState,
  LocalArenaEnemySeed
} from "../types/local-arena-enemy-field";

function freezeArenaSnapshot(
  liveEnemyCount: number,
  scatterEnemyCount: number,
  downedEnemyCount: number
): LocalArenaArenaSnapshot {
  return Object.freeze({
    downedEnemyCount,
    liveEnemyCount,
    scatterEnemyCount
  });
}

function createEnemyRuntimeState(
  seed: LocalArenaEnemySeed
): LocalArenaEnemyRuntimeState {
  return {
    behaviorRemainingMs: 0,
    downedScale: seed.scale * 0.8,
    glideScale: seed.scale,
    homeVelocityX: seed.glideVelocity.x,
    homeVelocityY: seed.glideVelocity.y,
    renderState: {
      behavior: "glide",
      headingRadians: createRadians(
        Math.atan2(seed.glideVelocity.y, seed.glideVelocity.x)
      ),
      id: seed.id,
      label: seed.label,
      positionX: seed.spawn.x,
      positionY: seed.spawn.y,
      radius: seed.radius,
      scale: seed.scale,
      visible: true,
      wingPhase: 0
    },
    scatterScale: seed.scale * 1.08,
    velocityX: seed.glideVelocity.x,
    velocityY: seed.glideVelocity.y,
    wingSpeed: seed.wingSpeed
  };
}

export function createEnemyField(
  config: LocalArenaSimulationConfig
): {
  readonly enemyRenderStates: readonly LocalArenaEnemyRenderState[];
  readonly enemyRuntimeStates: LocalArenaEnemyRuntimeState[];
} {
  const enemyRuntimeStates = config.enemySeeds.map((seed) =>
    createEnemyRuntimeState(seed)
  );

  return {
    enemyRenderStates: enemyRuntimeStates.map(
      (enemyState) => enemyState.renderState
    ),
    enemyRuntimeStates
  };
}

export function summarizeEnemyField(
  enemyRuntimeStates: readonly LocalArenaEnemyRuntimeState[]
): LocalArenaArenaSnapshot {
  let liveEnemyCount = 0;
  let scatterEnemyCount = 0;
  let downedEnemyCount = 0;

  for (const enemyState of enemyRuntimeStates) {
    if (enemyState.renderState.behavior === "downed") {
      downedEnemyCount += 1;
      continue;
    }

    liveEnemyCount += 1;

    if (enemyState.renderState.behavior === "scatter") {
      scatterEnemyCount += 1;
    }
  }

  return freezeArenaSnapshot(liveEnemyCount, scatterEnemyCount, downedEnemyCount);
}

export function countDownedEnemies(
  enemyRuntimeStates: readonly LocalArenaEnemyRuntimeState[]
): number {
  let downedEnemyCount = 0;

  for (const enemyState of enemyRuntimeStates) {
    if (enemyState.renderState.behavior === "downed") {
      downedEnemyCount += 1;
    }
  }

  return downedEnemyCount;
}

export function resetEnemyField(
  enemyRuntimeStates: readonly LocalArenaEnemyRuntimeState[],
  config: LocalArenaSimulationConfig
): void {
  for (let index = 0; index < enemyRuntimeStates.length; index += 1) {
    const enemyState = enemyRuntimeStates[index]!;
    const seed = config.enemySeeds[index]!;

    enemyState.behaviorRemainingMs = 0;
    enemyState.velocityX = enemyState.homeVelocityX;
    enemyState.velocityY = enemyState.homeVelocityY;
    enemyState.renderState.behavior = "glide";
    enemyState.renderState.headingRadians = createRadians(
      Math.atan2(enemyState.homeVelocityY, enemyState.homeVelocityX)
    );
    enemyState.renderState.positionX = seed.spawn.x;
    enemyState.renderState.positionY = seed.spawn.y;
    enemyState.renderState.scale = enemyState.glideScale;
    enemyState.renderState.visible = true;
    enemyState.renderState.wingPhase = 0;
  }
}
