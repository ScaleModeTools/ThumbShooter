import type { LocalArenaSimulationConfig } from "../types/local-arena-simulation";
import type { LocalArenaEnemyRuntimeState } from "../types/local-arena-enemy-field";

function distanceSquared(
  leftX: number,
  leftY: number,
  rightX: number,
  rightY: number
): number {
  const deltaX = leftX - rightX;
  const deltaY = leftY - rightY;

  return deltaX * deltaX + deltaY * deltaY;
}

function normalizeVector(
  x: number,
  y: number,
  fallbackX: number,
  fallbackY: number
): { readonly x: number; readonly y: number } {
  const vectorLength = Math.hypot(x, y);

  if (vectorLength > 0.0001) {
    return Object.freeze({
      x: x / vectorLength,
      y: y / vectorLength
    });
  }

  const fallbackLength = Math.hypot(fallbackX, fallbackY);

  if (fallbackLength > 0.0001) {
    return Object.freeze({
      x: fallbackX / fallbackLength,
      y: fallbackY / fallbackLength
    });
  }

  return Object.freeze({
    x: 1,
    y: 0
  });
}

function setEnemyScatter(
  enemyState: LocalArenaEnemyRuntimeState,
  config: LocalArenaSimulationConfig,
  aimX: number,
  aimY: number
): void {
  const scatterDirection = normalizeVector(
    enemyState.renderState.positionX - aimX,
    enemyState.renderState.positionY - aimY,
    enemyState.homeVelocityX,
    enemyState.homeVelocityY
  );

  enemyState.behaviorRemainingMs = config.movement.scatterDurationMs;
  enemyState.velocityX = scatterDirection.x * config.movement.scatterSpeed;
  enemyState.velocityY = scatterDirection.y * config.movement.scatterSpeed;
  enemyState.renderState.behavior = "scatter";
  enemyState.renderState.scale = enemyState.scatterScale;
}

export function findNearestEnemyState(
  enemyRuntimeStates: readonly LocalArenaEnemyRuntimeState[],
  aimX: number,
  aimY: number,
  radius: number
): LocalArenaEnemyRuntimeState | null {
  const radiusSquared = radius * radius;
  let bestDistanceSquared = Number.POSITIVE_INFINITY;
  let bestEnemy: LocalArenaEnemyRuntimeState | null = null;

  for (const enemyState of enemyRuntimeStates) {
    if (enemyState.renderState.behavior === "downed") {
      continue;
    }

    const nextDistanceSquared = distanceSquared(
      enemyState.renderState.positionX,
      enemyState.renderState.positionY,
      aimX,
      aimY
    );

    if (
      nextDistanceSquared <= radiusSquared &&
      nextDistanceSquared < bestDistanceSquared
    ) {
      bestDistanceSquared = nextDistanceSquared;
      bestEnemy = enemyState;
    }
  }

  return bestEnemy;
}

export function applyReticleScatter(
  enemyRuntimeStates: readonly LocalArenaEnemyRuntimeState[],
  config: LocalArenaSimulationConfig,
  aimX: number,
  aimY: number
): void {
  const radiusSquared =
    config.targeting.reticleScatterRadius * config.targeting.reticleScatterRadius;

  for (const enemyState of enemyRuntimeStates) {
    if (enemyState.renderState.behavior === "downed") {
      continue;
    }

    if (
      distanceSquared(
        enemyState.renderState.positionX,
        enemyState.renderState.positionY,
        aimX,
        aimY
      ) <= radiusSquared
    ) {
      setEnemyScatter(enemyState, config, aimX, aimY);
    }
  }
}

export function scatterEnemiesFromShot(
  enemyRuntimeStates: readonly LocalArenaEnemyRuntimeState[],
  config: LocalArenaSimulationConfig,
  aimX: number,
  aimY: number
): void {
  const radiusSquared =
    config.targeting.shotScatterRadius * config.targeting.shotScatterRadius;

  for (const enemyState of enemyRuntimeStates) {
    if (enemyState.renderState.behavior === "downed") {
      continue;
    }

    if (
      distanceSquared(
        enemyState.renderState.positionX,
        enemyState.renderState.positionY,
        aimX,
        aimY
      ) <= radiusSquared
    ) {
      setEnemyScatter(enemyState, config, aimX, aimY);
    }
  }
}
