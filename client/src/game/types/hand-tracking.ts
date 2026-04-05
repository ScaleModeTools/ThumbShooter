import {
  createHandTriggerPoseSample,
  type HandTriggerPoseSample
} from "@thumbshooter/shared";

export const handTrackingLifecycleStates = [
  "idle",
  "booting",
  "ready",
  "failed"
] as const;
export const handTrackingPoseStates = [
  "unavailable",
  "no-hand",
  "tracked"
] as const;

export type HandTrackingLifecycleState =
  (typeof handTrackingLifecycleStates)[number];
export type HandTrackingPoseState = (typeof handTrackingPoseStates)[number];

export interface HandTrackingPoseCandidate {
  readonly thumbTip: {
    readonly x: number;
    readonly y: number;
  };
  readonly indexTip: {
    readonly x: number;
    readonly y: number;
  };
}

export interface UnavailableHandTrackingSnapshot {
  readonly trackingState: "unavailable";
  readonly sequenceNumber: 0;
  readonly timestampMs: null;
  readonly pose: null;
}

export interface NoHandTrackingSnapshot {
  readonly trackingState: "no-hand";
  readonly sequenceNumber: number;
  readonly timestampMs: number;
  readonly pose: null;
}

export interface TrackedHandTrackingSnapshot {
  readonly trackingState: "tracked";
  readonly sequenceNumber: number;
  readonly timestampMs: number;
  readonly pose: HandTriggerPoseSample;
}

export type LatestHandTrackingSnapshot =
  | UnavailableHandTrackingSnapshot
  | NoHandTrackingSnapshot
  | TrackedHandTrackingSnapshot;

export interface HandTrackingRuntimeSnapshot {
  readonly lifecycle: HandTrackingLifecycleState;
  readonly failureReason: string | null;
  readonly latestPose: LatestHandTrackingSnapshot;
}

export interface HandTrackingRuntimeConfig {
  readonly landmarker: {
    readonly wasmRoot: string;
    readonly modelAssetPath: string;
    readonly numHands: 1;
    readonly runningMode: "video";
  };
  readonly landmarks: {
    readonly thumbTipIndex: 4;
    readonly indexTipIndex: 8;
  };
  readonly framePump: {
    readonly targetFps: number;
  };
}

export interface HandTrackingWorkerBootMessage {
  readonly kind: "boot";
  readonly wasmRoot: string;
  readonly modelAssetPath: string;
  readonly numHands: 1;
  readonly runningMode: "video";
  readonly landmarks: {
    readonly thumbTipIndex: 4;
    readonly indexTipIndex: 8;
  };
}

export interface HandTrackingWorkerProcessFrameMessage {
  readonly kind: "process-frame";
  readonly frame: ImageBitmap;
  readonly sequenceNumber: number;
  readonly timestampMs: number;
}

export interface HandTrackingWorkerShutdownMessage {
  readonly kind: "shutdown";
}

export type HandTrackingWorkerMessage =
  | HandTrackingWorkerBootMessage
  | HandTrackingWorkerProcessFrameMessage
  | HandTrackingWorkerShutdownMessage;

export interface HandTrackingWorkerReadyEvent {
  readonly kind: "ready";
}

export interface HandTrackingWorkerSnapshotEvent {
  readonly kind: "snapshot";
  readonly sequenceNumber: number;
  readonly timestampMs: number;
  readonly pose: HandTrackingPoseCandidate | null;
}

export interface HandTrackingWorkerErrorEvent {
  readonly kind: "error";
  readonly reason: string;
}

export type HandTrackingWorkerEvent =
  | HandTrackingWorkerReadyEvent
  | HandTrackingWorkerSnapshotEvent
  | HandTrackingWorkerErrorEvent;

function normalizeSequenceNumber(rawValue: number): number {
  if (!Number.isFinite(rawValue) || rawValue < 0) {
    return 0;
  }

  return Math.floor(rawValue);
}

function normalizeTimestamp(rawValue: number): number {
  if (!Number.isFinite(rawValue) || rawValue < 0) {
    return 0;
  }

  return rawValue;
}

export function createUnavailableHandTrackingSnapshot(): UnavailableHandTrackingSnapshot {
  return Object.freeze({
    trackingState: "unavailable",
    sequenceNumber: 0,
    timestampMs: null,
    pose: null
  });
}

export function createLatestHandTrackingSnapshot(input: {
  readonly sequenceNumber: number;
  readonly timestampMs: number;
  readonly pose: HandTrackingPoseCandidate | null;
}): LatestHandTrackingSnapshot {
  const sequenceNumber = normalizeSequenceNumber(input.sequenceNumber);
  const timestampMs = normalizeTimestamp(input.timestampMs);

  if (input.pose === null) {
    return Object.freeze({
      trackingState: "no-hand",
      sequenceNumber,
      timestampMs,
      pose: null
    });
  }

  return Object.freeze({
    trackingState: "tracked",
    sequenceNumber,
    timestampMs,
    pose: createHandTriggerPoseSample(input.pose)
  });
}

export function isTrackedHandTrackingSnapshot(
  snapshot: LatestHandTrackingSnapshot
): snapshot is TrackedHandTrackingSnapshot {
  return snapshot.trackingState === "tracked";
}
