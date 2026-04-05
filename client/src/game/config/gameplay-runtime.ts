import type { GameplayRuntimeConfig } from "../types/gameplay-runtime";

export const gameplayRuntimeConfig = {
  background: {
    lowerColor: [0.02, 0.07, 0.16],
    upperColor: [0.03, 0.19, 0.29]
  },
  reticle: {
    innerRadius: 0.045,
    outerRadius: 0.065,
    strokeColor: [0.97, 0.98, 0.99],
    horizontalBarSize: {
      width: 0.18,
      height: 0.006
    },
    verticalBarSize: {
      width: 0.006,
      height: 0.18
    }
  }
} as const satisfies GameplayRuntimeConfig;
