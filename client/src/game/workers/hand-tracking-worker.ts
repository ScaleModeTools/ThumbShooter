import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult
} from "@mediapipe/tasks-vision";

import type {
  HandTrackingPoseCandidate,
  HandTrackingWorkerBootMessage,
  HandTrackingWorkerEvent,
  HandTrackingWorkerMessage
} from "../types/hand-tracking";

let handLandmarker: HandLandmarker | null = null;
let landmarkIndices: HandTrackingWorkerBootMessage["landmarks"] = {
  thumbTipIndex: 4,
  indexTipIndex: 8
};

function postWorkerEvent(event: HandTrackingWorkerEvent): void {
  self.postMessage(event);
}

function readLandmarkCoordinate(
  value: number | undefined
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function extractPoseCandidate(
  result: HandLandmarkerResult
): HandTrackingPoseCandidate | null {
  const landmarks = result.landmarks[0];
  const thumbTip = landmarks?.[landmarkIndices.thumbTipIndex];
  const indexTip = landmarks?.[landmarkIndices.indexTipIndex];
  const thumbTipX = readLandmarkCoordinate(thumbTip?.x);
  const thumbTipY = readLandmarkCoordinate(thumbTip?.y);
  const indexTipX = readLandmarkCoordinate(indexTip?.x);
  const indexTipY = readLandmarkCoordinate(indexTip?.y);

  if (
    thumbTipX === null ||
    thumbTipY === null ||
    indexTipX === null ||
    indexTipY === null
  ) {
    return null;
  }

  return {
    thumbTip: {
      x: thumbTipX,
      y: thumbTipY
    },
    indexTip: {
      x: indexTipX,
      y: indexTipY
    }
  };
}

async function bootHandLandmarker(message: HandTrackingWorkerBootMessage): Promise<void> {
  handLandmarker?.close();

  landmarkIndices = message.landmarks;

  const vision = await FilesetResolver.forVisionTasks(message.wasmRoot);

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: message.modelAssetPath
    },
    numHands: message.numHands,
    runningMode: message.runningMode.toUpperCase() as "VIDEO"
  });
}

async function handleWorkerMessage(
  message: HandTrackingWorkerMessage
): Promise<void> {
  if (message.kind === "shutdown") {
    handLandmarker?.close();
    handLandmarker = null;
    return;
  }

  try {
    if (message.kind === "boot") {
      await bootHandLandmarker(message);
      postWorkerEvent({ kind: "ready" });
      return;
    }

    if (handLandmarker === null) {
      postWorkerEvent({
        kind: "error",
        reason: "Hand Landmarker was not ready before frame processing."
      });
      return;
    }

    const result = handLandmarker.detectForVideo(message.frame, message.timestampMs);
    const pose = extractPoseCandidate(result);

    postWorkerEvent({
      kind: "snapshot",
      pose,
      sequenceNumber: message.sequenceNumber,
      timestampMs: message.timestampMs
    });
  } catch {
    postWorkerEvent({
      kind: "error",
      reason: "MediaPipe Hand Landmarker boot or inference failed."
    });
  } finally {
    if (message.kind === "process-frame") {
      message.frame.close();
    }
  }
}

self.addEventListener("message", (event: MessageEvent<HandTrackingWorkerMessage>) => {
  void handleWorkerMessage(event.data);
});
