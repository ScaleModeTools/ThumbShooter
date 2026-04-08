import { localArenaSimulationConfig } from "./local-arena-simulation";

import type { CoopArenaSimulationConfig } from "../types/coop-arena-simulation";

export const coopArenaSimulationConfig = {
  feedback: localArenaSimulationConfig.feedback,
  targeting: {
    acquireRadius: localArenaSimulationConfig.targeting.acquireRadius
  },
  weapon: localArenaSimulationConfig.weapon
} as const satisfies CoopArenaSimulationConfig;
