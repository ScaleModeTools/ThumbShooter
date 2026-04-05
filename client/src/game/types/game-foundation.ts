import type {
  CalibrationAnchorId,
  NormalizedViewportPoint
} from "../../../../packages/shared/src/index";

export const triggerGestureModes = ["single", "auto"] as const;

export type { CalibrationAnchorId };

export type TriggerGestureMode = (typeof triggerGestureModes)[number];

export interface CalibrationAnchorDefinition {
  readonly id: CalibrationAnchorId;
  readonly label: string;
  readonly normalizedTarget: NormalizedViewportPoint;
}

export interface GameFoundationConfig {
  readonly renderer: {
    readonly target: "webgpu";
    readonly viewportMode: "single-fullscreen";
    readonly referenceExamples: readonly string[];
  };
  readonly input: {
    readonly tracker: "mediapipe-hand-landmarker";
    readonly primaryLandmarks: readonly ["thumb-tip", "index-fingertip"];
    readonly reloadRule: "reticle-offscreen";
  };
  readonly calibration: {
    readonly anchors: readonly CalibrationAnchorDefinition[];
  };
  readonly weapon: {
    readonly supportedTriggerModes: readonly TriggerGestureMode[];
  };
  readonly prototype: {
    readonly enemyPrototype: "birds";
    readonly enemyMovementProfile: "slow-dodge";
    readonly supportsScatterState: true;
  };
}
