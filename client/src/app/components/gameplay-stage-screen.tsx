import { useEffect, useEffectEvent, useRef, useState } from "react";

import type {
  AffineAimTransformSnapshot,
  HandTriggerCalibrationSnapshot
} from "@thumbshooter/shared";

import type {
  GameplayDebugPanelMode,
  GameplaySignal,
  GameplayTelemetrySnapshot,
  HandTrackingTelemetrySnapshot
} from "../../game";
import { HandTrackingRuntime } from "../../game/classes/hand-tracking-runtime";
import { LocalArenaSimulation } from "../../game/classes/local-arena-simulation";
import { WebGpuGameplayRuntime } from "../../game/classes/webgpu-gameplay-runtime";
import {
  GameplayDebugOverlay,
  GameplayDeveloperPanel,
  GameplayHudOverlay
} from "../../ui";

import { ImmersiveStageFrame } from "./immersive-stage-frame";

interface GameplayStageScreenProps {
  readonly aimCalibration: AffineAimTransformSnapshot;
  readonly audioStatusLabel: string;
  readonly bestScore: number;
  readonly debugPanelMode: GameplayDebugPanelMode;
  readonly handTrackingRuntime: HandTrackingRuntime;
  readonly onBestScoreChange: (bestScore: number) => void;
  readonly onGameplaySignal: (signal: GameplaySignal) => void;
  readonly onOpenMenu: () => void;
  readonly selectedReticleLabel: string;
  readonly triggerCalibration: HandTriggerCalibrationSnapshot | null;
  readonly username: string;
  readonly weaponLabel: string;
}

export function GameplayStageScreen({
  aimCalibration,
  audioStatusLabel,
  bestScore,
  debugPanelMode,
  handTrackingRuntime,
  onBestScoreChange,
  onGameplaySignal,
  onOpenMenu,
  selectedReticleLabel,
  triggerCalibration,
  username,
  weaponLabel
}: GameplayStageScreenProps) {
  const showDeveloperUi = import.meta.env.DEV;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bestScoreRef = useRef(bestScore);
  const runtimeStartVersionRef = useRef(0);
  const handleGameplaySignal = useEffectEvent((signal: GameplaySignal) => {
    onGameplaySignal(signal);
  });
  const [arenaSimulation] = useState(
    () =>
      new LocalArenaSimulation(aimCalibration, undefined, {
        emitGameplaySignal: handleGameplaySignal,
        triggerCalibration
      })
  );
  const [gameplayRuntime] = useState(
    () => new WebGpuGameplayRuntime(handTrackingRuntime, arenaSimulation)
  );
  const [hudSnapshot, setHudSnapshot] = useState(() => gameplayRuntime.hudSnapshot);
  const [gameplayTelemetry, setGameplayTelemetry] = useState<GameplayTelemetrySnapshot>(
    () => gameplayRuntime.telemetrySnapshot
  );
  const [trackingTelemetry, setTrackingTelemetry] = useState<HandTrackingTelemetrySnapshot>(
    () => handTrackingRuntime.telemetrySnapshot
  );
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void handTrackingRuntime.ensureStarted().then(
      () => {
        if (cancelled) {
          return;
        }

        setTrackingTelemetry(handTrackingRuntime.telemetrySnapshot);
      },
      (error) => {
        if (cancelled) {
          return;
        }

        setTrackingTelemetry(handTrackingRuntime.telemetrySnapshot);
        setRuntimeError((currentValue) =>
          currentValue ??
          handTrackingRuntime.snapshot.failureReason ??
          (error instanceof Error ? error.message : "Hand tracking runtime failed.")
        );
      }
    );

    return () => {
      cancelled = true;
    };
  }, [handTrackingRuntime]);

  const handleStartRuntime = useEffectEvent(async () => {
    if (canvasRef.current === null) {
      return;
    }

    const startVersion = runtimeStartVersionRef.current + 1;

    runtimeStartVersionRef.current = startVersion;

    try {
      const snapshot = await gameplayRuntime.start(canvasRef.current);

      if (startVersion !== runtimeStartVersionRef.current) {
        return;
      }

      setHudSnapshot(snapshot);
      setGameplayTelemetry(gameplayRuntime.telemetrySnapshot);
      setTrackingTelemetry(handTrackingRuntime.telemetrySnapshot);
      setRuntimeError(null);
    } catch (error) {
      if (startVersion !== runtimeStartVersionRef.current) {
        return;
      }

      setHudSnapshot(gameplayRuntime.hudSnapshot);
      setGameplayTelemetry(gameplayRuntime.telemetrySnapshot);
      setTrackingTelemetry(handTrackingRuntime.telemetrySnapshot);
      setRuntimeError(
        gameplayRuntime.hudSnapshot.failureReason ??
          (error instanceof Error ? error.message : "Gameplay runtime failed.")
      );
    }
  });

  const handleRetryRuntime = useEffectEvent(() => {
    gameplayRuntime.dispose();
    setHudSnapshot(gameplayRuntime.hudSnapshot);
    setGameplayTelemetry(gameplayRuntime.telemetrySnapshot);
    setTrackingTelemetry(handTrackingRuntime.telemetrySnapshot);
    setRuntimeError(null);
    void handleStartRuntime();
  });

  const handleRestartSession = useEffectEvent(() => {
    setRuntimeError(null);
    setHudSnapshot(gameplayRuntime.restartSession());
    setGameplayTelemetry(gameplayRuntime.telemetrySnapshot);
  });

  useEffect(() => {
    bestScoreRef.current = bestScore;
  }, [bestScore]);

  useEffect(() => {
    void handleStartRuntime();

    const intervalHandle = window.setInterval(() => {
      setHudSnapshot(gameplayRuntime.hudSnapshot);
      setGameplayTelemetry(gameplayRuntime.telemetrySnapshot);
      setTrackingTelemetry(handTrackingRuntime.telemetrySnapshot);
    }, 150);

    return () => {
      runtimeStartVersionRef.current += 1;
      window.clearInterval(intervalHandle);
      gameplayRuntime.dispose();
    };
    // Effect events must stay out of dependency arrays or the runtime gets
    // torn down on the first post-boot rerender before RAF can advance.
  }, [gameplayRuntime, handTrackingRuntime]);

  useEffect(() => {
    const nextBestScore = hudSnapshot.session.score;

    if (nextBestScore <= bestScoreRef.current) {
      return;
    }

    bestScoreRef.current = nextBestScore;
    onBestScoreChange(nextBestScore);
  }, [hudSnapshot.session.score, onBestScoreChange]);

  return (
    <ImmersiveStageFrame>
      <div className="relative flex-1 overflow-hidden">
        <canvas className="absolute inset-0 h-full w-full" ref={canvasRef} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgb(56_189_248_/_0.08),_transparent_28%)]" />
        {showDeveloperUi ? (
          <>
            <GameplayDeveloperPanel gameplayTelemetry={gameplayTelemetry} />
            <GameplayDebugOverlay
              gameplayTelemetry={gameplayTelemetry}
              mode={debugPanelMode}
              trackingTelemetry={trackingTelemetry}
            />
          </>
        ) : null}
        <GameplayHudOverlay
          audioStatusLabel={audioStatusLabel}
          bestScore={bestScore}
          hudSnapshot={hudSnapshot}
          onOpenMenu={onOpenMenu}
          onRestartSession={handleRestartSession}
          onRetryRuntime={handleRetryRuntime}
          runtimeError={runtimeError}
          selectedReticleLabel={selectedReticleLabel}
          username={username}
          weaponLabel={weaponLabel}
        />
      </div>
    </ImmersiveStageFrame>
  );
}
