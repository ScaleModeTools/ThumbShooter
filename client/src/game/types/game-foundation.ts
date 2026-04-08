import type {
  CalibrationAnchorId,
  NormalizedViewportPoint
} from "@thumbshooter/shared";

export type { CalibrationAnchorId };

export type TriggerGestureMode = "single" | "auto";
export type WeaponReloadRule = "reticle-offscreen";
export type FirstPlayableWeaponId = "semiautomatic-pistol";

export interface CalibrationAnchorDefinition {
  readonly id: CalibrationAnchorId;
  readonly label: string;
  readonly normalizedTarget: NormalizedViewportPoint;
}
