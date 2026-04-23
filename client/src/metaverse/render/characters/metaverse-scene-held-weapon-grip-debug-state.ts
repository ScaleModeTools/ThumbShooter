import type {
  MetaverseRealtimePlayerWeaponStateSnapshot
} from "@webgpu-metaverse/shared";

import type {
  MetaverseLocalHeldWeaponGripDebugHandSocketId,
  MetaverseLocalHeldWeaponGripDebugPhase,
  MetaverseLocalHeldWeaponGripDebugSolveFailureReason,
  MetaverseLocalHeldWeaponGripTelemetrySnapshot
} from "../../types/metaverse-runtime";

const heldWeaponGripWarningErrorMeters = 0.03;
const heldWeaponGripBadErrorMeters = 0.08;
const heldWeaponMainHandWarningErrorMeters = 0.02;
const heldWeaponMainHandBadErrorMeters = 0.05;
const heldWeaponMainHandReachClampReasonToleranceMeters = 0.01;

interface MetaverseHeldWeaponGripBaseRecord {
  readonly adsBlend: number | null;
  readonly attachmentMountKind: "held" | "mounted-holster" | null;
  readonly heldSupportMarkerAvailable: boolean;
  readonly heldMountSocketName: string | null;
  readonly offHandSupportMarkerAvailable: boolean;
  readonly weaponState: MetaverseRealtimePlayerWeaponStateSnapshot | null;
}

interface MetaverseHeldWeaponGripSkippedRecord
  extends MetaverseHeldWeaponGripBaseRecord {
  readonly phase: Exclude<
    MetaverseLocalHeldWeaponGripDebugPhase,
    "grip-target-solve-failed" | "no-offhand-grip-mount" | "solved"
  >;
}

interface MetaverseHeldWeaponGripSolveFailureRecord
  extends MetaverseHeldWeaponGripBaseRecord {
  readonly failureReason: MetaverseLocalHeldWeaponGripDebugSolveFailureReason;
}

interface MetaverseHeldWeaponGripSolvedRecord
  extends MetaverseHeldWeaponGripBaseRecord {
  readonly mainHandGripErrorMeters: number;
  readonly mainHandGripSocketComparisonErrorMeters: number;
  readonly mainHandMaxReachMeters: number | null;
  readonly mainHandPalmSocketComparisonErrorMeters: number;
  readonly mainHandPoleAngleRadians: number | null;
  readonly mainHandPostPoleBiasErrorMeters: number | null;
  readonly mainHandReachClampDeltaMeters: number | null;
  readonly mainHandReachSlackMeters: number;
  readonly mainHandSolveErrorMeters: number | null;
  readonly mainHandSocket: Exclude<
    MetaverseLocalHeldWeaponGripDebugHandSocketId,
    "none" | "support"
  >;
  readonly mainHandTargetDistanceMeters: number | null;
  readonly offHandFinalErrorMeters: number | null;
  readonly offHandGripMounted: boolean;
  readonly offHandInitialSolveErrorMeters: number | null;
  readonly offHandPoleAngleRadians: number | null;
  readonly offHandPreSolveErrorMeters: number | null;
  readonly offHandRefinementPassCount: number;
  readonly offHandSocket: Exclude<
    MetaverseLocalHeldWeaponGripDebugHandSocketId,
    "none"
  >;
  readonly servicePistolAdsPoseActive: boolean;
  readonly servicePistolSupportPalmPoseActive: boolean;
}

function resolveAttachmentMountKind(
  attachmentMountKind: MetaverseHeldWeaponGripBaseRecord["attachmentMountKind"]
): MetaverseLocalHeldWeaponGripTelemetrySnapshot["attachmentMountKind"] {
  return attachmentMountKind ?? "none";
}

export class MetaverseSceneHeldWeaponGripDebugState {
  #adsBlend: number | null = null;
  #aimMode: MetaverseLocalHeldWeaponGripTelemetrySnapshot["aimMode"] = null;
  #attachmentMountKind:
    MetaverseHeldWeaponGripBaseRecord["attachmentMountKind"] = null;
  #degradedFrameCount = 0;
  #gripTargetSolveFailureReason:
    MetaverseLocalHeldWeaponGripTelemetrySnapshot["gripTargetSolveFailureReason"] =
      null;
  #heldSupportMarkerAvailable = false;
  #heldMountSocketName: string | null = null;
  #lastDegradedAtMs: number | null = null;
  #lastDegradedReason: string | null = null;
  #mainHandGripErrorMeters: number | null = null;
  #mainHandGripSocketComparisonErrorMeters: number | null = null;
  #mainHandMaxReachMeters: number | null = null;
  #mainHandPalmSocketComparisonErrorMeters: number | null = null;
  #mainHandPoleAngleRadians: number | null = null;
  #mainHandPostPoleBiasErrorMeters: number | null = null;
  #mainHandReachClampDeltaMeters: number | null = null;
  #mainHandReachSlackMeters: number | null = null;
  #mainHandSolveErrorMeters: number | null = null;
  #mainHandSocket: MetaverseLocalHeldWeaponGripTelemetrySnapshot["mainHandSocket"] =
    "none";
  #mainHandTargetDistanceMeters: number | null = null;
  #offHandFinalErrorMeters: number | null = null;
  #offHandGripMounted = false;
  #offHandInitialSolveErrorMeters: number | null = null;
  #offHandPoleAngleRadians: number | null = null;
  #offHandPreSolveErrorMeters: number | null = null;
  #offHandRefinementPassCount = 0;
  #offHandSocket: MetaverseLocalHeldWeaponGripTelemetrySnapshot["offHandSocket"] =
    "none";
  #offHandSupportMarkerAvailable = false;
  #phase: MetaverseLocalHeldWeaponGripTelemetrySnapshot["phase"] =
    "no-character-runtime";
  #servicePistolAdsPoseActive = false;
  #servicePistolSupportPalmPoseActive = false;
  #stability: MetaverseLocalHeldWeaponGripTelemetrySnapshot["stability"] =
    "inactive";
  #weaponId: string | null = null;
  #weaponStatePresent = false;
  #worstMainHandGripErrorMeters = 0;
  #worstOffHandFinalErrorMeters = 0;

  reset(): void {
    this.#adsBlend = null;
    this.#aimMode = null;
    this.#attachmentMountKind = null;
    this.#degradedFrameCount = 0;
    this.#gripTargetSolveFailureReason = null;
    this.#heldSupportMarkerAvailable = false;
    this.#heldMountSocketName = null;
    this.#lastDegradedAtMs = null;
    this.#lastDegradedReason = null;
    this.#mainHandGripErrorMeters = null;
    this.#mainHandGripSocketComparisonErrorMeters = null;
    this.#mainHandMaxReachMeters = null;
    this.#mainHandPalmSocketComparisonErrorMeters = null;
    this.#mainHandPoleAngleRadians = null;
    this.#mainHandPostPoleBiasErrorMeters = null;
    this.#mainHandReachClampDeltaMeters = null;
    this.#mainHandReachSlackMeters = null;
    this.#mainHandSolveErrorMeters = null;
    this.#mainHandSocket = "none";
    this.#mainHandTargetDistanceMeters = null;
    this.#offHandFinalErrorMeters = null;
    this.#offHandGripMounted = false;
    this.#offHandInitialSolveErrorMeters = null;
    this.#offHandPoleAngleRadians = null;
    this.#offHandPreSolveErrorMeters = null;
    this.#offHandRefinementPassCount = 0;
    this.#offHandSocket = "none";
    this.#offHandSupportMarkerAvailable = false;
    this.#phase = "no-character-runtime";
    this.#servicePistolAdsPoseActive = false;
    this.#servicePistolSupportPalmPoseActive = false;
    this.#stability = "inactive";
    this.#weaponId = null;
    this.#weaponStatePresent = false;
    this.#worstMainHandGripErrorMeters = 0;
    this.#worstOffHandFinalErrorMeters = 0;
  }

  recordSkippedFrame(
    input: MetaverseHeldWeaponGripSkippedRecord,
    nowMs: number = this.#readNowMs()
  ): void {
    this.#syncBaseFrame(input);
    this.#gripTargetSolveFailureReason = null;
    this.#mainHandGripErrorMeters = null;
    this.#mainHandGripSocketComparisonErrorMeters = null;
    this.#mainHandMaxReachMeters = null;
    this.#mainHandPalmSocketComparisonErrorMeters = null;
    this.#mainHandPoleAngleRadians = null;
    this.#mainHandPostPoleBiasErrorMeters = null;
    this.#mainHandReachClampDeltaMeters = null;
    this.#mainHandReachSlackMeters = null;
    this.#mainHandSolveErrorMeters = null;
    this.#mainHandSocket = "none";
    this.#mainHandTargetDistanceMeters = null;
    this.#offHandFinalErrorMeters = null;
    this.#offHandGripMounted = false;
    this.#offHandInitialSolveErrorMeters = null;
    this.#offHandPoleAngleRadians = null;
    this.#offHandPreSolveErrorMeters = null;
    this.#offHandRefinementPassCount = 0;
    this.#offHandSocket = "none";
    this.#phase = input.phase;
    this.#servicePistolAdsPoseActive = false;
    this.#servicePistolSupportPalmPoseActive = false;

    if (input.phase === "attachment-not-held" && input.weaponState !== null) {
      this.#stability = "warning";
      this.#recordDegradedFrame(nowMs, "attachment-not-held");
      return;
    }

    this.#stability = "inactive";
  }

  recordGripTargetSolveFailure(
    input: MetaverseHeldWeaponGripSolveFailureRecord,
    nowMs: number = this.#readNowMs()
  ): void {
    this.#syncBaseFrame(input);
    this.#gripTargetSolveFailureReason = input.failureReason;
    this.#mainHandGripErrorMeters = null;
    this.#mainHandGripSocketComparisonErrorMeters = null;
    this.#mainHandMaxReachMeters = null;
    this.#mainHandPalmSocketComparisonErrorMeters = null;
    this.#mainHandPoleAngleRadians = null;
    this.#mainHandPostPoleBiasErrorMeters = null;
    this.#mainHandReachClampDeltaMeters = null;
    this.#mainHandReachSlackMeters = null;
    this.#mainHandSolveErrorMeters = null;
    this.#mainHandSocket = "none";
    this.#mainHandTargetDistanceMeters = null;
    this.#offHandFinalErrorMeters = null;
    this.#offHandGripMounted = false;
    this.#offHandInitialSolveErrorMeters = null;
    this.#offHandPoleAngleRadians = null;
    this.#offHandPreSolveErrorMeters = null;
    this.#offHandRefinementPassCount = 0;
    this.#offHandSocket = "none";
    this.#phase = "grip-target-solve-failed";
    this.#servicePistolAdsPoseActive = false;
    this.#servicePistolSupportPalmPoseActive = false;
    this.#stability = "bad";
    this.#recordDegradedFrame(nowMs, input.failureReason);
  }

  recordSolvedFrame(
    input: MetaverseHeldWeaponGripSolvedRecord,
    nowMs: number = this.#readNowMs()
  ): void {
    this.#syncBaseFrame(input);
    this.#gripTargetSolveFailureReason = null;
    this.#mainHandGripErrorMeters = input.mainHandGripErrorMeters;
    this.#mainHandGripSocketComparisonErrorMeters =
      input.mainHandGripSocketComparisonErrorMeters;
    this.#mainHandMaxReachMeters = input.mainHandMaxReachMeters;
    this.#mainHandPalmSocketComparisonErrorMeters =
      input.mainHandPalmSocketComparisonErrorMeters;
    this.#mainHandPoleAngleRadians = input.mainHandPoleAngleRadians;
    this.#mainHandPostPoleBiasErrorMeters =
      input.mainHandPostPoleBiasErrorMeters;
    this.#mainHandReachClampDeltaMeters = input.mainHandReachClampDeltaMeters;
    this.#mainHandReachSlackMeters = input.mainHandReachSlackMeters;
    this.#mainHandSolveErrorMeters = input.mainHandSolveErrorMeters;
    this.#mainHandSocket = input.mainHandSocket;
    this.#mainHandTargetDistanceMeters = input.mainHandTargetDistanceMeters;
    this.#offHandFinalErrorMeters = input.offHandFinalErrorMeters;
    this.#offHandGripMounted = input.offHandGripMounted;
    this.#offHandInitialSolveErrorMeters = input.offHandInitialSolveErrorMeters;
    this.#offHandPoleAngleRadians = input.offHandPoleAngleRadians;
    this.#offHandPreSolveErrorMeters = input.offHandPreSolveErrorMeters;
    this.#offHandRefinementPassCount = input.offHandRefinementPassCount;
    this.#offHandSocket = input.offHandSocket;
    this.#phase = input.offHandGripMounted ? "solved" : "no-offhand-grip-mount";
    this.#servicePistolAdsPoseActive = input.servicePistolAdsPoseActive;
    this.#servicePistolSupportPalmPoseActive =
      input.servicePistolSupportPalmPoseActive;
    this.#worstMainHandGripErrorMeters = Math.max(
      this.#worstMainHandGripErrorMeters,
      input.mainHandGripErrorMeters
    );
    this.#worstOffHandFinalErrorMeters = Math.max(
      this.#worstOffHandFinalErrorMeters,
      input.offHandFinalErrorMeters ?? 0
    );

    const degradationReason = this.#resolveDegradationReason(input);

    if (degradationReason === null) {
      this.#stability = "stable";
      return;
    }

    this.#stability =
      input.mainHandGripErrorMeters >= heldWeaponMainHandBadErrorMeters ||
      (input.offHandFinalErrorMeters ?? 0) >= heldWeaponGripBadErrorMeters ||
      degradationReason === "weapon-state-null"
        ? "bad"
        : "warning";
    this.#recordDegradedFrame(nowMs, degradationReason);
  }

  readSnapshot(nowMs: number): MetaverseLocalHeldWeaponGripTelemetrySnapshot {
    return Object.freeze({
      adsBlend: this.#adsBlend,
      aimMode: this.#aimMode,
      attachmentMountKind: resolveAttachmentMountKind(this.#attachmentMountKind),
      degradedFrameCount: this.#degradedFrameCount,
      gripTargetSolveFailureReason: this.#gripTargetSolveFailureReason,
      heldSupportMarkerAvailable: this.#heldSupportMarkerAvailable,
      heldMountSocketName: this.#heldMountSocketName,
      lastDegradedAgeMs:
        this.#lastDegradedAtMs === null ? null : Math.max(0, nowMs - this.#lastDegradedAtMs),
      lastDegradedReason: this.#lastDegradedReason,
      mainHandGripErrorMeters: this.#mainHandGripErrorMeters,
      mainHandGripSocketComparisonErrorMeters:
        this.#mainHandGripSocketComparisonErrorMeters,
      mainHandMaxReachMeters: this.#mainHandMaxReachMeters,
      mainHandPalmSocketComparisonErrorMeters:
        this.#mainHandPalmSocketComparisonErrorMeters,
      mainHandPoleAngleRadians: this.#mainHandPoleAngleRadians,
      mainHandPostPoleBiasErrorMeters: this.#mainHandPostPoleBiasErrorMeters,
      mainHandReachClampDeltaMeters: this.#mainHandReachClampDeltaMeters,
      mainHandReachSlackMeters: this.#mainHandReachSlackMeters,
      mainHandSolveErrorMeters: this.#mainHandSolveErrorMeters,
      mainHandSocket: this.#mainHandSocket,
      mainHandTargetDistanceMeters: this.#mainHandTargetDistanceMeters,
      offHandFinalErrorMeters: this.#offHandFinalErrorMeters,
      offHandGripMounted: this.#offHandGripMounted,
      offHandInitialSolveErrorMeters: this.#offHandInitialSolveErrorMeters,
      offHandPoleAngleRadians: this.#offHandPoleAngleRadians,
      offHandPreSolveErrorMeters: this.#offHandPreSolveErrorMeters,
      offHandRefinementPassCount: this.#offHandRefinementPassCount,
      offHandSocket: this.#offHandSocket,
      offHandSupportMarkerAvailable: this.#offHandSupportMarkerAvailable,
      phase: this.#phase,
      servicePistolAdsPoseActive: this.#servicePistolAdsPoseActive,
      servicePistolSupportPalmPoseActive:
        this.#servicePistolSupportPalmPoseActive,
      stability: this.#stability,
      weaponId: this.#weaponId,
      weaponStatePresent: this.#weaponStatePresent,
      worstMainHandGripErrorMeters: this.#worstMainHandGripErrorMeters,
      worstOffHandFinalErrorMeters: this.#worstOffHandFinalErrorMeters
    });
  }

  #syncBaseFrame(input: MetaverseHeldWeaponGripBaseRecord): void {
    this.#adsBlend = input.adsBlend;
    this.#aimMode = input.weaponState?.aimMode ?? null;
    this.#attachmentMountKind = input.attachmentMountKind;
    this.#heldSupportMarkerAvailable = input.heldSupportMarkerAvailable;
    this.#heldMountSocketName = input.heldMountSocketName;
    this.#offHandSupportMarkerAvailable = input.offHandSupportMarkerAvailable;
    this.#weaponId = input.weaponState?.weaponId ?? null;
    this.#weaponStatePresent = input.weaponState !== null;
  }

  #recordDegradedFrame(nowMs: number, reason: string): void {
    this.#degradedFrameCount += 1;
    this.#lastDegradedAtMs = nowMs;
    this.#lastDegradedReason = reason;
  }

  #resolveDegradationReason(
    input: MetaverseHeldWeaponGripSolvedRecord
  ): string | null {
    if (input.weaponState === null && input.heldSupportMarkerAvailable) {
      return "weapon-state-null";
    }

    if (
      input.mainHandGripErrorMeters >= heldWeaponMainHandWarningErrorMeters &&
      input.mainHandReachClampDeltaMeters !== null &&
      input.mainHandReachClampDeltaMeters >=
        heldWeaponMainHandWarningErrorMeters &&
      Math.abs(
        input.mainHandGripErrorMeters - input.mainHandReachClampDeltaMeters
      ) <= heldWeaponMainHandReachClampReasonToleranceMeters
    ) {
      return "main-hand-reach-clamped";
    }

    if (input.mainHandGripErrorMeters >= heldWeaponMainHandBadErrorMeters) {
      return "main-hand-error-bad";
    }

    if (input.mainHandGripErrorMeters >= heldWeaponMainHandWarningErrorMeters) {
      return "main-hand-error-warning";
    }

    if (
      input.offHandFinalErrorMeters !== null &&
      input.offHandFinalErrorMeters >= heldWeaponGripBadErrorMeters
    ) {
      return "off-hand-error-bad";
    }

    if (
      input.offHandFinalErrorMeters !== null &&
      input.offHandFinalErrorMeters >= heldWeaponGripWarningErrorMeters
    ) {
      return "off-hand-error-warning";
    }

    if (!input.offHandGripMounted && input.heldSupportMarkerAvailable) {
      return "off-hand-grip-mount-missing";
    }

    return null;
  }

  #readNowMs(): number {
    return globalThis.performance?.now() ?? Date.now();
  }
}
