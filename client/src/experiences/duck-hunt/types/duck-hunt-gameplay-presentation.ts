import type {
  NormalizedViewportPoint,
  NormalizedViewportPointInput
} from "@webgpu-metaverse/shared";
import type {
  CoopRoomSnapshotPath,
  CoopRoomSnapshotStreamLiveness
} from "../../../network";

import type { GameplaySessionPhase } from "./duck-hunt-gameplay-session";
import type { LocalArenaTargetFeedbackState } from "./duck-hunt-local-arena-simulation";
import type { WeaponReadinessState } from "./duck-hunt-weapon-contract";

export const gameplayDebugPanelModes = [
  "hidden",
  "telemetry",
  "aim-inspector"
] as const;
export const gameplayReticleStyledStates = [
  "tracking-unavailable",
  "neutral",
  "targeted",
  "hit",
  "reload-required",
  "reloading",
  "round-paused"
] as const;
export const gameplayReticleVisualStates = [
  "hidden",
  ...gameplayReticleStyledStates
] as const;

export type GameplayDebugPanelMode = (typeof gameplayDebugPanelModes)[number];
export type GameplayReticleStyledState =
  (typeof gameplayReticleStyledStates)[number];
export type GameplayReticleVisualState =
  (typeof gameplayReticleVisualStates)[number];

export const gameplayCoopProjectionSources = [
  "unavailable",
  "latest-snapshot",
  "buffered-snapshots"
] as const;

export type GameplayCoopProjectionSource =
  (typeof gameplayCoopProjectionSources)[number];

export type { HandTrackingTelemetrySnapshot } from "../../../tracking";

export interface GameplayTelemetrySnapshot {
  readonly aimPoint: NormalizedViewportPoint | null;
  readonly coopRoom: {
    readonly bufferDepth: number;
    readonly clockOffsetEstimateMs: number | null;
    readonly latestSnapshotUpdateRateHz: number | null;
    readonly playerPresenceDatagramSendFailureCount: number;
    readonly playerPresenceLastTransportError: string | null;
    readonly playerPresenceReliableFallbackActive: boolean;
    readonly projectedSimulationLagMs: number | null;
    readonly projectionSource: GameplayCoopProjectionSource;
    readonly snapshotStreamAvailable: boolean;
    readonly snapshotStreamLastTransportError: string | null;
    readonly snapshotStreamLiveness: CoopRoomSnapshotStreamLiveness;
    readonly snapshotStreamPath: CoopRoomSnapshotPath;
    readonly snapshotStreamReconnectCount: number;
  } | null;
  readonly frameDeltaMs: number;
  readonly frameRate: number;
  readonly observedAimPoint: NormalizedViewportPointInput | null;
  readonly renderer: {
    readonly devicePixelRatio: number;
    readonly drawCallCount: number;
    readonly label: string;
    readonly triangleCount: number;
  };
  readonly renderedFrameCount: number;
  readonly reticleVisualState: GameplayReticleVisualState;
  readonly sessionPhase: GameplaySessionPhase;
  readonly targetFeedbackState: LocalArenaTargetFeedbackState;
  readonly thumbDropDistance: number | null;
  readonly trackingPoseAgeMs: number | null;
  readonly trackingSequenceNumber: number;
  readonly weaponReadiness: WeaponReadinessState;
  readonly worldTimeMs: number;
}
