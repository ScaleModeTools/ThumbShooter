import { useEffect, useState } from "react";

import { createCoopRoomId } from "@thumbshooter/shared";
import type { CoopRoomDirectoryEntrySnapshot } from "@thumbshooter/shared";

import {
  gameplaySessionModes,
  gameplayInputModes,
  resolveGameplayInputMode,
  type GameplayInputModeId,
  type GameplaySessionMode
} from "../../game";
import {
  CoopRoomDirectoryClient,
  coopRoomDirectoryClientConfig
} from "../../network";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  readonly coopRoomIdDraft: string;
  readonly inputMode: GameplayInputModeId;
  readonly nextGameplayStep: GameplayEntryStepId | null;
  readonly onCoopRoomIdDraftChange: (coopRoomIdDraft: string) => void;
  readonly onInputModeChange: (inputMode: GameplayInputModeId) => void;
  readonly onRecalibrationRequest: () => void;
  readonly onSessionModeChange: (mode: GameplaySessionMode) => void;
  readonly onStartGame: () => void;
  readonly sessionMode: GameplaySessionMode;
}

function resolveStartButtonLabel(
  capabilityStatus: WebGpuGameplayCapabilitySnapshot["status"],
  nextGameplayStep: GameplayEntryStepId | null,
  roomSelectionValid: boolean,
  sessionMode: GameplaySessionMode
): string {
  if (!roomSelectionValid) {
    return "Enter a room code";
  }

  if (nextGameplayStep === "gameplay") {
    return sessionMode === "co-op" ? "Enter room" : "Start game";
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

function resolveCoopRoomActionLabel(
  nextGameplayStep: GameplayEntryStepId | null,
  action: "create" | "join"
): string {
  if (nextGameplayStep === "calibration") {
    return "Continue to calibration";
  }

  if (nextGameplayStep === "permissions") {
    return "Continue to webcam setup";
  }

  if (nextGameplayStep === "gameplay") {
    return action === "create" ? "Create room" : "Join room";
  }

  return "Launch unavailable";
}

function createSuggestedCoopRoomIdDraft(): string {
  const suffix =
    globalThis.crypto?.randomUUID?.().slice(0, 6) ??
    Math.random().toString(36).slice(2, 8);

  return `co-op-${suffix}`;
}

function resolveCoopRoomPhaseLabel(
  roomEntry: CoopRoomDirectoryEntrySnapshot
): string {
  if (roomEntry.phase === "waiting-for-players") {
    return "Lobby";
  }

  if (roomEntry.phase === "active") {
    if (roomEntry.roundPhase === "cooldown") {
      return "Cooldown";
    }

    return "Live";
  }

  if (roomEntry.phase === "failed") {
    return "Failed";
  }

  return "Cleared";
}

function formatDirectoryRoundTime(roundTimeRemainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(roundTimeRemainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatCoopRoomStatus(
  roomEntry: CoopRoomDirectoryEntrySnapshot
): string {
  if (roomEntry.phase === "active") {
    if (roomEntry.roundPhase === "cooldown") {
      return `Round ${roomEntry.roundNumber + 1} starts in ${formatDirectoryRoundTime(
        roomEntry.roundPhaseRemainingMs
      )}`;
    }

    return `Round ${roomEntry.roundNumber} • ${roomEntry.birdsRemaining} birds remaining`;
  }

  if (roomEntry.phase === "failed") {
    return `Round ${roomEntry.roundNumber} failed with ${roomEntry.birdsRemaining} birds remaining`;
  }

  return `${roomEntry.connectedPlayerCount}/${roomEntry.capacity} connected • ${roomEntry.readyPlayerCount}/${roomEntry.requiredReadyPlayerCount} ready`;
}

export function MainMenuStageScreen({
  audioStatusLabel,
  calibrationQualityLabel,
  capabilityReasonLabel,
  capabilityStatus,
  coopRoomIdDraft,
  inputMode,
  nextGameplayStep,
  onCoopRoomIdDraftChange,
  onInputModeChange,
  onRecalibrationRequest,
  onSessionModeChange,
  onStartGame,
  sessionMode
}: MainMenuStageScreenProps) {
  const selectedInputMode = resolveGameplayInputMode(inputMode);
  const [coopRoomDirectoryClient] = useState(
    () => new CoopRoomDirectoryClient(coopRoomDirectoryClientConfig)
  );
  const [coopRoomEntries, setCoopRoomEntries] = useState<
    readonly CoopRoomDirectoryEntrySnapshot[]
  >([]);
  const [coopRoomDirectoryError, setCoopRoomDirectoryError] = useState<string | null>(
    null
  );
  const [coopRoomDirectoryLoading, setCoopRoomDirectoryLoading] = useState(false);
  const normalizedCoopRoomIdDraft =
    sessionMode === "co-op" ? createCoopRoomId(coopRoomIdDraft) : null;
  const coopRoomIdValid =
    sessionMode !== "co-op" || normalizedCoopRoomIdDraft !== null;
  const startButtonDisabled =
    nextGameplayStep === null || !coopRoomIdValid;
  const coopLaunchUnavailable = nextGameplayStep === null;
  const sortedCoopRoomEntries = [...coopRoomEntries].sort((leftRoom, rightRoom) => {
    const phasePriority = (roomEntry: CoopRoomDirectoryEntrySnapshot): number => {
      if (roomEntry.phase === "active") {
        return 0;
      }

      if (roomEntry.phase === "waiting-for-players") {
        return 1;
      }

      if (roomEntry.phase === "failed") {
        return 2;
      }

      return 3;
    };

    const priorityDelta = phasePriority(leftRoom) - phasePriority(rightRoom);

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return leftRoom.roomId.localeCompare(rightRoom.roomId);
  });
  const selectedExistingRoom =
    normalizedCoopRoomIdDraft === null
      ? null
      : sortedCoopRoomEntries.find(
          (roomEntry) => roomEntry.roomId === normalizedCoopRoomIdDraft
        ) ?? null;
  const createRoomActionDisabled =
    coopLaunchUnavailable ||
    normalizedCoopRoomIdDraft === null ||
    selectedExistingRoom !== null;
  const showActionRow =
    sessionMode === "single-player" || selectedInputMode.requiresCalibration;

  useEffect(() => {
    if (sessionMode !== "co-op") {
      setCoopRoomEntries([]);
      setCoopRoomDirectoryError(null);
      setCoopRoomDirectoryLoading(false);
      return;
    }

    let cancelled = false;

    const loadDirectory = async () => {
      if (!cancelled) {
        setCoopRoomDirectoryLoading(true);
      }

      try {
        const roomDirectorySnapshot = await coopRoomDirectoryClient.fetchSnapshot();

        if (cancelled) {
          return;
        }

        setCoopRoomEntries(roomDirectorySnapshot.coOpRooms);
        setCoopRoomDirectoryError(null);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setCoopRoomEntries([]);
        setCoopRoomDirectoryError(
          error instanceof Error
            ? error.message
            : "Co-op room directory fetch failed."
        );
      } finally {
        if (!cancelled) {
          setCoopRoomDirectoryLoading(false);
        }
      }
    };

    void loadDirectory();
    const refreshHandle = globalThis.setInterval(() => {
      void loadDirectory();
    }, 3_000);

    return () => {
      cancelled = true;
      globalThis.clearInterval(refreshHandle);
    };
  }, [coopRoomDirectoryClient, sessionMode]);

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

            {sessionMode === "co-op" ? (
              <div className="grid gap-4">
                <div className="rounded-xl border border-border/70 bg-background/70 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <Label>Sessions in progress</Label>
                      <p className="text-sm text-muted-foreground">
                        Join an active room directly, or create a new code below.
                      </p>
                    </div>
                    {coopRoomDirectoryLoading ? (
                      <Badge variant="secondary">Refreshing</Badge>
                    ) : null}
                  </div>

                  {coopRoomDirectoryError !== null ? (
                    <p className="mt-3 text-sm text-destructive">
                      {coopRoomDirectoryError}
                    </p>
                  ) : null}

                  {sortedCoopRoomEntries.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-border/70 bg-muted/35 px-4 py-4 text-sm text-muted-foreground">
                      No live co-op rooms yet. Use the room code below to start a
                      new one.
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-3">
                      {sortedCoopRoomEntries.map((roomEntry) => {
                        const selectedRoom =
                          normalizedCoopRoomIdDraft !== null &&
                          roomEntry.roomId === normalizedCoopRoomIdDraft;

                        return (
                          <div
                            className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/35 px-4 py-4 md:flex-row md:items-center md:justify-between"
                            key={roomEntry.roomId}
                          >
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-foreground">
                                  {roomEntry.roomId}
                                </p>
                                <Badge
                                  variant={selectedRoom ? "secondary" : "outline"}
                                >
                                  {resolveCoopRoomPhaseLabel(roomEntry)}
                                </Badge>
                                {selectedRoom ? (
                                  <Badge variant="secondary">Selected</Badge>
                                ) : null}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {formatCoopRoomStatus(roomEntry)}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                disabled={coopLaunchUnavailable}
                                onClick={() => {
                                  onCoopRoomIdDraftChange(roomEntry.roomId);
                                  onStartGame();
                                }}
                                type="button"
                              >
                                {resolveCoopRoomActionLabel(nextGameplayStep, "join")}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/70 px-4 py-4">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="main-menu-coop-room-id">Create fresh room</Label>
                    <p className="text-sm text-muted-foreground">
                      Pick a code that is not already live. A fresh lobby is created
                      when you enter it.
                    </p>
                  </div>
                  <Input
                    aria-invalid={!coopRoomIdValid}
                    id="main-menu-coop-room-id"
                    onChange={(event) => {
                      onCoopRoomIdDraftChange(event.target.value);
                    }}
                    placeholder="co-op-harbor"
                    value={coopRoomIdDraft}
                  />
                  <p
                    className={`text-sm ${
                      coopRoomIdValid && selectedExistingRoom === null
                        ? "text-muted-foreground"
                        : "text-destructive"
                    }`}
                  >
                    {!coopRoomIdValid
                      ? "Enter a non-empty room code before creating a room."
                      : selectedExistingRoom !== null
                        ? "This code is already live. Join it from the list above or generate another code for a fresh lobby."
                        : "This code is available for a fresh lobby."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={createRoomActionDisabled}
                      onClick={onStartGame}
                      type="button"
                    >
                      {resolveCoopRoomActionLabel(nextGameplayStep, "create")}
                    </Button>
                    <Button
                      onClick={() => {
                        onCoopRoomIdDraftChange(createSuggestedCoopRoomIdDraft());
                      }}
                      type="button"
                      variant="outline"
                    >
                      New code
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

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

            {showActionRow ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                {sessionMode === "single-player" ? (
                  <Button
                    disabled={startButtonDisabled}
                    onClick={onStartGame}
                    type="button"
                  >
                    {resolveStartButtonLabel(
                      capabilityStatus,
                      nextGameplayStep,
                      coopRoomIdValid,
                      sessionMode
                    )}
                  </Button>
                ) : null}

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
            ) : null}
          </CardContent>
        </Card>
      </div>
    </StageScreenLayout>
  );
}
