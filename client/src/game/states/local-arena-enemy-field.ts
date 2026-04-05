export {
  countDownedEnemies,
  createEnemyField,
  resetEnemyField,
  summarizeEnemyField
} from "./local-arena-enemy-field-state";
export {
  applyReticleScatter,
  findNearestEnemyState,
  scatterEnemiesFromShot
} from "./local-arena-enemy-field-targeting";
export {
  setEnemyDowned,
  stepEnemyField
} from "./local-arena-enemy-field-motion";
export type { LocalArenaEnemyRuntimeState } from "../types/local-arena-enemy-field";
