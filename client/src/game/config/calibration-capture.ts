import type { CalibrationCaptureConfig } from "../types/calibration-session";

export const calibrationCaptureConfig = {
  pressThreshold: 0.055,
  releaseThreshold: 0.02
} as const satisfies CalibrationCaptureConfig;
