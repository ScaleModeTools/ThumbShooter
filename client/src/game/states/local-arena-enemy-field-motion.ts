import { createRadians } from "@thumbshooter/shared";

import type { LocalArenaSimulationConfig } from "../types/local-arena-simulation";
import type { LocalArenaEnemyRuntimeState } from "../types/local-arena-enemy-field";

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function settleEnemyDowned(enemyState: LocalArenaEnemyRuntimeState): void {
  enemyState.behaviorRemainingMs = 0;
  enemyState.velocityX = 0;
  enemyState.velocityY = 0;
}

function restoreEnemyGlide(enemyState: LocalArenaEnemyRuntimeState): void {
  enemyState.behaviorRemainingMs = 0;
  enemyState.velocityX = enemyState.homeVelocityX;
  enemyState.velocityY = enemyState.homeVelocityY;
  enemyState.renderState.behavior = "glide";
  enemyState.renderState.headingRadians = createRadians(
    Math.atan2(enemyState.homeVelocityY, enemyState.homeVelocityX)
  );
  enemyState.renderState.scale = enemyState.glideScale;
}

export function setEnemyDowned(
  enemyState: LocalArenaEnemyRuntimeState,
  config: LocalArenaSimulationConfig
): void {
  enemyState.behaviorRemainingMs = config.movement.downedDurationMs;
  enemyState.velocityX *= 0.35;
  enemyState.velocityY = config.movement.downedDriftVelocityY;
  enemyState.renderState.behavior = "downed";
  enemyState.renderState.scale = enemyState.downedScale;
}

export function stepEnemyField(
  enemyRuntimeStates: readonly LocalArenaEnemyRuntimeState[],
  config: LocalArenaSimulationConfig,
  deltaMs: number
): void {
  const deltaSeconds = deltaMs / 1000;

  if (deltaSeconds <= 0) {
    return;
  }

  for (const enemyState of enemyRuntimeStates) {
    enemyState.renderState.wingPhase += enemyState.wingSpeed * deltaSeconds;

    if (enemyState.renderState.behavior === "downed") {
      if (enemyState.behaviorRemainingMs > 0) {
        enemyState.behaviorRemainingMs = Math.max(
          0,
          enemyState.behaviorRemainingMs - deltaMs
        );
        enemyState.renderState.positionX = clamp(
          enemyState.renderState.positionX + enemyState.velocityX * deltaSeconds,
          config.arenaBounds.minX,
          config.arenaBounds.maxX
        );
        enemyState.renderState.positionY = clamp(
          enemyState.renderState.positionY + enemyState.velocityY * deltaSeconds,
          config.arenaBounds.minY,
          config.arenaBounds.maxY + 0.14
        );
        enemyState.renderState.headingRadians = createRadians(
          enemyState.renderState.headingRadians + deltaSeconds * 2.8
        );

        if (enemyState.behaviorRemainingMs === 0) {
          settleEnemyDowned(enemyState);
        }
      }

      continue;
    }

    enemyState.renderState.positionX += enemyState.velocityX * deltaSeconds;
    enemyState.renderState.positionY += enemyState.velocityY * deltaSeconds;

    if (
      enemyState.renderState.positionX < config.arenaBounds.minX ||
      enemyState.renderState.positionX > config.arenaBounds.maxX
    ) {
      enemyState.velocityX *= -1;
      enemyState.renderState.positionX = clamp(
        enemyState.renderState.positionX,
        config.arenaBounds.minX,
        config.arenaBounds.maxX
      );
    }

    if (
      enemyState.renderState.positionY < config.arenaBounds.minY ||
      enemyState.renderState.positionY > config.arenaBounds.maxY
    ) {
      enemyState.velocityY *= -1;
      enemyState.renderState.positionY = clamp(
        enemyState.renderState.positionY,
        config.arenaBounds.minY,
        config.arenaBounds.maxY
      );
    }

    enemyState.renderState.headingRadians = createRadians(
      Math.atan2(enemyState.velocityY, enemyState.velocityX)
    );

    if (enemyState.renderState.behavior === "scatter") {
      enemyState.behaviorRemainingMs -= deltaMs;

      if (enemyState.behaviorRemainingMs <= 0) {
        restoreEnemyGlide(enemyState);
      }
    }
  }
}
