import { useEffect, useEffectEvent, useRef, useState } from "react";

import type { PlayerProfile } from "@thumbshooter/shared";

import { HandTrackingRuntime } from "../../game/classes/hand-tracking-runtime";
import { NinePointCalibrationSession } from "../../game/classes/nine-point-calibration-session";
import { gameFoundationConfig } from "../../game/config/game-foundation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { StageScreenLayout } from "./stage-screen-layout";

interface CalibrationStageScreenProps {
  readonly handTrackingRuntime: HandTrackingRuntime;
  readonly onCalibrationProgress: (
    nextProfile: PlayerProfile,
    progress: "captured" | "completed"
  ) => void;
  readonly profile: PlayerProfile;
}

function toPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function CalibrationStageScreen({
  handTrackingRuntime,
  onCalibrationProgress,
  profile
}: CalibrationStageScreenProps) {
  const [session] = useState(
    () => new NinePointCalibrationSession(profile.snapshot.calibrationSamples)
  );
  const [captureSnapshot, setCaptureSnapshot] = useState(() => session.snapshot);
  const [runtimeLifecycle, setRuntimeLifecycle] = useState(
    handTrackingRuntime.snapshot.lifecycle
  );
  const [trackingState, setTrackingState] = useState(
    handTrackingRuntime.latestPose.trackingState
  );
  const [runtimeFailureReason, setRuntimeFailureReason] = useState<string | null>(
    handTrackingRuntime.snapshot.failureReason
  );
  const rawPoseRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef(profile);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const handleCalibrationProgressEvent = useEffectEvent(
    (nextProfile: PlayerProfile, progress: "captured" | "completed") => {
      onCalibrationProgress(nextProfile, progress);
    }
  );

  const handleRetryRuntime = useEffectEvent(() => {
    handTrackingRuntime.dispose();
    setRuntimeLifecycle("idle");
    setTrackingState("unavailable");
    setRuntimeFailureReason(null);
    void handTrackingRuntime.ensureStarted().catch(() => {});
  });

  useEffect(() => {
    void handTrackingRuntime.ensureStarted().catch(() => {});
  }, [handTrackingRuntime]);

  useEffect(() => {
    let animationFrameHandle = 0;

    const updateLoop = () => {
      const runtimeSnapshot = handTrackingRuntime.snapshot;
      const latestPose = handTrackingRuntime.latestPose;

      setRuntimeLifecycle((currentValue) =>
        currentValue === runtimeSnapshot.lifecycle
          ? currentValue
          : runtimeSnapshot.lifecycle
      );
      setRuntimeFailureReason((currentValue) =>
        currentValue === runtimeSnapshot.failureReason
          ? currentValue
          : runtimeSnapshot.failureReason
      );
      setTrackingState((currentValue) =>
        currentValue === latestPose.trackingState
          ? currentValue
          : latestPose.trackingState
      );

      if (rawPoseRef.current !== null) {
        if (latestPose.trackingState === "tracked") {
          rawPoseRef.current.style.opacity = "1";
          rawPoseRef.current.style.left = toPercent(latestPose.pose.indexTip.x);
          rawPoseRef.current.style.top = toPercent(latestPose.pose.indexTip.y);
        } else {
          rawPoseRef.current.style.opacity = "0";
        }
      }

      const nextProgress = session.ingestTrackingSnapshot(latestPose);

      if (nextProgress.capturedSample !== null) {
        let nextProfile = profileRef.current.withCalibrationShot(
          nextProgress.capturedSample
        );
        let progress: "captured" | "completed" = "captured";

        if (nextProgress.fittedCalibration !== null) {
          nextProfile = nextProfile.withAimCalibration(
            nextProgress.fittedCalibration
          );
          progress = "completed";
        }

        profileRef.current = nextProfile;
        handleCalibrationProgressEvent(nextProfile, progress);
      }

      if (nextProgress.didChange) {
        setCaptureSnapshot(session.snapshot);
      }

      animationFrameHandle = window.requestAnimationFrame(updateLoop);
    };

    animationFrameHandle = window.requestAnimationFrame(updateLoop);

    return () => {
      window.cancelAnimationFrame(animationFrameHandle);
    };
  }, [handleCalibrationProgressEvent, handTrackingRuntime, session]);

  return (
    <StageScreenLayout
      description="Capture nine trigger-confirmed samples, fit the first affine aim transform, and persist it into the local player profile before gameplay boots."
      eyebrow="Stage 3"
      title="Nine-point calibration runtime"
    >
      <div className="flex flex-wrap gap-2">
        <Badge>{`Tracking runtime: ${runtimeLifecycle}`}</Badge>
        <Badge variant="secondary">{`Hand state: ${trackingState}`}</Badge>
        <Badge variant="secondary">
          {`${captureSnapshot.capturedSampleCount}/${captureSnapshot.totalAnchorCount} captured`}
        </Badge>
        <Badge variant="outline">
          Transform model: {gameFoundationConfig.calibration.transformModel}
        </Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="relative min-h-[30rem] overflow-hidden rounded-[1.75rem] border border-border/70 bg-slate-950/92 shadow-[0_24px_80px_rgb(15_23_42_/_0.28)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgb(56_189_248_/_0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgb(251_146_60_/_0.14),_transparent_36%)]" />
          <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgb(255_255_255_/_0.06)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255_/_0.06)_1px,transparent_1px)] [background-size:3rem_3rem]" />

          {gameFoundationConfig.calibration.anchors.map((anchor, anchorIndex) => {
            const isCaptured = anchorIndex < captureSnapshot.capturedSampleCount;
            const isCurrent = captureSnapshot.currentAnchorId === anchor.id;

            return (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2"
                key={anchor.id}
                style={{
                  left: toPercent(anchor.normalizedTarget.x),
                  top: toPercent(anchor.normalizedTarget.y)
                }}
              >
                <div
                  className={[
                    "flex size-12 items-center justify-center rounded-full border text-xs font-semibold transition",
                    isCaptured
                      ? "border-emerald-300/80 bg-emerald-300/18 text-emerald-100"
                      : isCurrent
                        ? "border-sky-300 bg-sky-300/16 text-sky-100 shadow-[0_0_0_10px_rgb(56_189_248_/_0.12)]"
                        : "border-white/28 bg-white/6 text-white/72"
                  ].join(" ")}
                >
                  {anchorIndex + 1}
                </div>
              </div>
            );
          })}

          <div
            className="pointer-events-none absolute z-10 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-200 bg-amber-300/70 opacity-0 shadow-[0_0_0_8px_rgb(251_191_36_/_0.16)] transition-opacity"
            ref={rawPoseRef}
          />

          <div className="absolute inset-x-5 bottom-5 rounded-[1.25rem] border border-white/12 bg-slate-950/72 p-4 backdrop-blur-md">
            <div className="flex flex-wrap gap-2">
              <Badge>{`Current anchor: ${captureSnapshot.currentAnchorLabel ?? "complete"}`}</Badge>
              <Badge variant="secondary">
                {captureSnapshot.captureState.replaceAll("-", " ")}
              </Badge>
            </div>
            <p className="mt-3 text-sm text-white/82">
              Point your index fingertip at the highlighted target, then drop your
              thumb to capture. Release the thumb before moving to the next point.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[1.5rem] border border-border/70 bg-muted/30 p-5">
            <p className="text-sm font-medium">Calibration guidance</p>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
              <div className="rounded-xl border border-border/70 bg-background/72 px-4 py-3">
                Worker-owned MediaPipe boot begins lazily when this screen mounts.
              </div>
              <div className="rounded-xl border border-border/70 bg-background/72 px-4 py-3">
                Latest validated hand pose snapshots stay on the game boundary and
                do not wait on old frames.
              </div>
              <div className="rounded-xl border border-border/70 bg-background/72 px-4 py-3">
                Captured samples persist immediately into the local player profile.
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-muted/30 p-5">
            <p className="text-sm font-medium">Current status</p>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
              <div className="rounded-xl border border-border/70 bg-background/72 px-4 py-3">
                Sample progress: {captureSnapshot.capturedSampleCount} of{" "}
                {captureSnapshot.totalAnchorCount}
              </div>
              <div className="rounded-xl border border-border/70 bg-background/72 px-4 py-3">
                Stored fit: {profile.hasAimCalibration ? "ready" : "pending"}
              </div>
              {runtimeFailureReason !== null ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive">
                  {runtimeFailureReason}
                </div>
              ) : null}
            </div>
          </div>

          {runtimeFailureReason !== null ? (
            <Button onClick={handleRetryRuntime} type="button" variant="outline">
              Retry tracking runtime
            </Button>
          ) : null}
        </div>
      </div>
    </StageScreenLayout>
  );
}
