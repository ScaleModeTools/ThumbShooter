import type { HandTrackingRuntimeConfig } from "../types/hand-tracking";

export const handTrackingRuntimeConfig = {
  landmarker: {
    wasmRoot: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm",
    modelAssetPath:
      "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
    numHands: 1,
    runningMode: "video"
  },
  landmarks: {
    thumbTipIndex: 4,
    indexTipIndex: 8
  },
  framePump: {
    targetFps: 30
  }
} as const satisfies HandTrackingRuntimeConfig;
