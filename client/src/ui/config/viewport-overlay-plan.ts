import type { ViewportOverlayPlan } from "../types/ui-layout";

export const viewportOverlayPlan = {
  instructionsPlacement: "top-left",
  hudPlacement: "top-right",
  reticleMode: "viewport-scaled"
} as const satisfies ViewportOverlayPlan;
