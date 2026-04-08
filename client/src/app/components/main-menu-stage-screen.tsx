import {
  gameplaySessionModes,
  gameplayInputModes,
  resolveGameplayInputMode,
  type GameplayInputModeId,
  type GameplaySessionMode
} from "../../game";
import type { GameplayEntryStepId } from "../../navigation";
import type { WebGpuGameplayCapabilitySnapshot } from "../../game/types/webgpu-capability";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ToggleGroup,
  ToggleGroupItem
} from "@/components/ui/toggle-group";

import { StageScreenLayout } from "./stage-screen-layout";

interface MainMenuStageScreenProps {
  readonly audioStatusLabel: string;
  readonly calibrationQualityLabel: string;
  readonly capabilityReasonLabel: string;
  readonly capabilityStatus: WebGpuGameplayCapabilitySnapshot["status"];
  readonly inputMode: GameplayInputModeId;
  readonly nextGameplayStep: GameplayEntryStepId | null;
  readonly onInputModeChange: (inputMode: GameplayInputModeId) => void;
  readonly onRecalibrationRequest: () => void;
  readonly onSessionModeChange: (mode: GameplaySessionMode) => void;
  readonly onStartGame: () => void;
  readonly sessionMode: GameplaySessionMode;
}

function resolveStartButtonLabel(
  capabilityStatus: WebGpuGameplayCapabilitySnapshot["status"],
  nextGameplayStep: GameplayEntryStepId | null
): string {
  if (nextGameplayStep === "gameplay") {
    return "Start game";
  }

  if (nextGameplayStep === "calibration") {
    return "Continue to calibration";
  }

  if (nextGameplayStep === "permissions") {
    return "Continue to webcam setup";
  }

  if (capabilityStatus === "checking") {
    return "Checking gameplay support";
  }

  return "Start game unavailable";
}

export function MainMenuStageScreen({
  audioStatusLabel,
  calibrationQualityLabel,
  capabilityReasonLabel,
  capabilityStatus,
  inputMode,
  nextGameplayStep,
  onInputModeChange,
  onRecalibrationRequest,
  onSessionModeChange,
  onStartGame,
  sessionMode
}: MainMenuStageScreenProps) {
  const selectedInputMode = resolveGameplayInputMode(inputMode);

  return (
    <StageScreenLayout
      description="Choose an input mode, launch gameplay, or enter optional camera setup for thumb-shooter mode."
      eyebrow="Main menu"
      title="Choose input and start gameplay"
    >
      <div className="flex flex-wrap gap-2">
        <Badge>{selectedInputMode.label}</Badge>
        <Badge variant="secondary">{audioStatusLabel}</Badge>
        <Badge variant="outline">{`WebGPU ${capabilityStatus}`}</Badge>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[1.5rem] border-border/70 bg-muted/35">
          <CardHeader className="gap-3">
            <CardTitle>Input mode</CardTitle>
            <CardDescription>
              Choose one control path for the session. Mouse mode keeps webcam
              permission and MediaPipe off.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ToggleGroup
              className="w-full"
              onValueChange={(nextValue) => {
                if (nextValue.length === 0) {
                  return;
                }

                onInputModeChange(nextValue as GameplayInputModeId);
              }}
              type="single"
              value={inputMode}
              variant="outline"
            >
              {gameplayInputModes.map((mode) => (
                <ToggleGroupItem className="flex-1" key={mode.id} value={mode.id}>
                  {mode.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <div className="rounded-xl border border-border/70 bg-background/70 px-4 py-4 text-sm text-muted-foreground">
              {selectedInputMode.description}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {selectedInputMode.controlsSummary.map((instruction) => (
                <div
                  className="rounded-xl border border-border/70 bg-background/70 px-3 py-3 text-sm text-muted-foreground"
                  key={instruction}
                >
                  {instruction}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-border/70 bg-muted/35">
          <CardHeader className="gap-3">
            <CardTitle>Session mode</CardTitle>
            <CardDescription>
              Pick the authority model before booting gameplay. Co-op joins the
              shared server room and uses server-owned bird state.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ToggleGroup
              className="w-full"
              onValueChange={(nextValue) => {
                if (nextValue.length === 0) {
                  return;
                }

                onSessionModeChange(nextValue as GameplaySessionMode);
              }}
              type="single"
              value={sessionMode}
              variant="outline"
            >
              {gameplaySessionModes.map((mode) => (
                <ToggleGroupItem className="flex-1" key={mode} value={mode}>
                  {mode === "single-player" ? "Single player" : "Co-op"}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <div className="rounded-xl border border-border/70 bg-background/70 px-4 py-4 text-sm text-muted-foreground">
              {sessionMode === "single-player"
                ? "Client-owned arena progression with local best-score tracking."
                : "Server-owned room snapshots, shared birds, and team shooting progression."}
            </div>

            <Separator />

            <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-background/70 px-4 py-4">
              <p className="text-sm font-medium text-foreground">Ready check</p>
              <p className="text-sm text-muted-foreground">
                Gameplay stays explicit. Unsupported hardware still fails into a
                clear route instead of auto-downgrading.
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-background/70 px-4 py-4 text-sm text-muted-foreground">
              {capabilityReasonLabel}
            </div>

            <div className="rounded-xl border border-border/70 bg-background/70 px-4 py-4">
              <p className="text-sm font-medium text-foreground">Calibration</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedInputMode.requiresCalibration
                  ? calibrationQualityLabel
                  : "Not required while mouse input is selected."}
              </p>
            </div>

            <Separator />

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                disabled={nextGameplayStep === null}
                onClick={onStartGame}
                type="button"
              >
                {resolveStartButtonLabel(capabilityStatus, nextGameplayStep)}
              </Button>

              {selectedInputMode.requiresCalibration ? (
                <Button
                  onClick={onRecalibrationRequest}
                  type="button"
                  variant="outline"
                >
                  Recalibrate
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </StageScreenLayout>
  );
}
