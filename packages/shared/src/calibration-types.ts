export const calibrationAnchorIds = [
  "center",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "top-center",
  "mid-right",
  "mid-left",
  "bottom-center"
] as const;

export type CalibrationAnchorId = (typeof calibrationAnchorIds)[number];

export interface NormalizedViewportPoint {
  readonly x: number;
  readonly y: number;
}

export interface HandTriggerPoseSample {
  readonly thumbTip: NormalizedViewportPoint;
  readonly indexTip: NormalizedViewportPoint;
}

export interface CalibrationShotSample {
  readonly anchorId: CalibrationAnchorId;
  readonly intendedTarget: NormalizedViewportPoint;
  readonly observedPose: HandTriggerPoseSample;
}
