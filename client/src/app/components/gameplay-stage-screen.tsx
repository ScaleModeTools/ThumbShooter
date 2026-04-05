import { useEffect, useEffectEvent, useRef, useState } from "react";

import type { AffineAimTransformSnapshot } from "@thumbshooter/shared";

import { HandTrackingRuntime } from "../../game/classes/hand-tracking-runtime";
import { WebGpuGameplayRuntime } from "../../game/classes/webgpu-gameplay-runtime";
import { viewportOverlayPlan } from "../../ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface GameplayStageScreenProps {
  readonly aimCalibration: AffineAimTransformSnapshot;
  readonly audioStatusLabel: string;
  readonly handTrackingRuntime: HandTrackingRuntime;
  readonly onOpenMenu: () => void;
  readonly selectedReticleLabel: string;
  readonly username: string;
  readonly weaponLabel: string;
}

function aimPointMatches(
  currentValue: { readonly x: number; readonly y: number } | null,
  nextValue: { readonly x: number; readonly y: number } | null
): boolean {
  if (currentValue === nextValue) {
    return true;
  }

  if (currentValue === null || nextValue === null) {
    return false;
  }

  return currentValue.x === nextValue.x && currentValue.y === nextValue.y;
}

export function GameplayStageScreen({
  aimCalibration,
  audioStatusLabel,
  handTrackingRuntime,
  onOpenMenu,
  selectedReticleLabel,
  username,
  weaponLabel
}: GameplayStageScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameplayRuntime] = useState(
    () => new WebGpuGameplayRuntime(handTrackingRuntime, aimCalibration)
  );
  const [hudSnapshot, setHudSnapshot] = useState(() => gameplayRuntime.hudSnapshot);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const handleStartRuntime = useEffectEvent(async () => {
    if (canvasRef.current === null) {
      return;
    }

    try {
      const snapshot = await gameplayRuntime.start(canvasRef.current);

      setHudSnapshot(snapshot);
      setRuntimeError(null);
    } catch (error) {
      setHudSnapshot(gameplayRuntime.hudSnapshot);
      setRuntimeError(
        gameplayRuntime.hudSnapshot.failureReason ??
          (error instanceof Error ? error.message : "Gameplay runtime failed.")
      );
    }
  });

  const handleRetryRuntime = useEffectEvent(() => {
    gameplayRuntime.dispose();
    setHudSnapshot(gameplayRuntime.hudSnapshot);
    setRuntimeError(null);
    void handleStartRuntime();
  });

  useEffect(() => {
    void handleStartRuntime();

    const intervalHandle = window.setInterval(() => {
      const nextSnapshot = gameplayRuntime.hudSnapshot;

      setHudSnapshot((currentSnapshot) => {
        if (
          currentSnapshot.lifecycle === nextSnapshot.lifecycle &&
          currentSnapshot.trackingState === nextSnapshot.trackingState &&
          currentSnapshot.failureReason === nextSnapshot.failureReason &&
          aimPointMatches(currentSnapshot.aimPoint, nextSnapshot.aimPoint)
        ) {
          return currentSnapshot;
        }

        return nextSnapshot;
      });
    }, 150);

    return () => {
      window.clearInterval(intervalHandle);
      gameplayRuntime.dispose();
    };
  }, [gameplayRuntime, handleStartRuntime]);

  return (
    <Card className="relative min-h-[36rem] overflow-hidden rounded-[2rem] border-border/70 bg-card/88 shadow-[0_28px_90px_rgb(15_23_42_/_0.2)] backdrop-blur-xl">
      <canvas className="absolute inset-0 h-full w-full" ref={canvasRef} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgb(56_189_248_/_0.08),_transparent_28%)]" />

      <div className="relative flex h-full flex-col gap-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl rounded-[1.5rem] border border-white/12 bg-white/6 p-4 backdrop-blur-md">
            <div className="flex flex-wrap gap-2">
              <Badge>{`Instructions: ${viewportOverlayPlan.instructionsPlacement}`}</Badge>
              <Badge variant="secondary">{`HUD: ${viewportOverlayPlan.hudPlacement}`}</Badge>
              <Badge variant="outline">{audioStatusLabel}</Badge>
              <Badge variant="secondary">{`Tracking: ${hudSnapshot.trackingState}`}</Badge>
            </div>
            <p className="mt-4 text-sm text-white/82">
              Calibrated worker input now drives the live reticle inside the
              WebGPU runtime. Enemies and weapon fire stay out of scope for this
              milestone.
            </p>
            {runtimeError !== null ? (
              <div className="mt-4 rounded-xl border border-red-300/30 bg-red-500/12 px-3 py-3 text-sm text-red-100">
                {runtimeError}
              </div>
            ) : null}
          </div>

          <div className="flex gap-3">
            {runtimeError !== null ? (
              <Button onClick={handleRetryRuntime} type="button" variant="outline">
                Retry runtime
              </Button>
            ) : null}
            <Button onClick={onOpenMenu} type="button" variant="secondary">
              Open menu
            </Button>
          </div>
        </div>

        <div className="flex-1" />

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_0.8fr_0.9fr]">
          <div className="rounded-[1.5rem] border border-white/12 bg-white/6 p-4 backdrop-blur-md">
            <p className="text-sm font-medium text-white">Player</p>
            <p className="mt-2 text-2xl font-semibold text-white">{username}</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/12 bg-white/6 p-4 backdrop-blur-md">
            <p className="text-sm font-medium text-white">Reticle</p>
            <p className="mt-2 text-sm text-white/82">{selectedReticleLabel}</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/12 bg-white/6 p-4 backdrop-blur-md">
            <p className="text-sm font-medium text-white">Weapon lock</p>
            <p className="mt-2 text-sm text-white/82">{weaponLabel}</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/12 bg-white/6 p-4 backdrop-blur-md">
            <p className="text-sm font-medium text-white">Aim</p>
            <p className="mt-2 text-sm text-white/82">
              {hudSnapshot.aimPoint === null
                ? "Awaiting tracked hand"
                : `${hudSnapshot.aimPoint.x.toFixed(2)}, ${hudSnapshot.aimPoint.y.toFixed(2)}`}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
