import type { CalibrationCaptureConfig } from "../types/calibration-session";

export const calibrationCaptureConfig = {
  triggerGesture: {
    pressAxisAngleDegrees: 18,
    pressEngagementRatio: 0.72,
    releaseAxisAngleDegrees: 32,
    releaseEngagementRatio: 0.92
  }
} as const satisfies CalibrationCaptureConfig;
