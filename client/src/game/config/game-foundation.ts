import type { GameFoundationConfig } from "../types/game-foundation";

export const gameFoundationConfig = {
  renderer: {
    target: "webgpu",
    viewportMode: "single-fullscreen",
    referenceExamples: [
      "examples/three/webgl-gpgpu-birds/reference.html",
      "examples/three/webgpu-compute-birds/README.md"
    ]
  },
  input: {
    tracker: "mediapipe-hand-landmarker",
    primaryLandmarks: ["thumb-tip", "index-fingertip"],
    reloadRule: "reticle-offscreen"
  },
  calibration: {
    anchors: [
      { id: "center", label: "Center", normalizedTarget: { x: 0.5, y: 0.5 } },
      { id: "top-left", label: "Top Left", normalizedTarget: { x: 0.1, y: 0.1 } },
      { id: "top-right", label: "Top Right", normalizedTarget: { x: 0.9, y: 0.1 } },
      { id: "bottom-left", label: "Bottom Left", normalizedTarget: { x: 0.1, y: 0.9 } },
      { id: "bottom-right", label: "Bottom Right", normalizedTarget: { x: 0.9, y: 0.9 } },
      { id: "top-center", label: "Top Center", normalizedTarget: { x: 0.5, y: 0.1 } },
      { id: "mid-right", label: "Mid Right", normalizedTarget: { x: 0.9, y: 0.5 } },
      { id: "mid-left", label: "Mid Left", normalizedTarget: { x: 0.1, y: 0.5 } },
      { id: "bottom-center", label: "Bottom Center", normalizedTarget: { x: 0.5, y: 0.9 } }
    ]
  },
  weapon: {
    supportedTriggerModes: ["single", "auto"]
  },
  prototype: {
    enemyPrototype: "birds",
    enemyMovementProfile: "slow-dodge",
    supportsScatterState: true
  }
} as const satisfies GameFoundationConfig;
