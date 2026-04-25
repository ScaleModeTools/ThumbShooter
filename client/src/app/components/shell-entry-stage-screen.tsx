import {
  startTransition,
  useEffect,
  useEffectEvent,
  useState,
  type FormEvent
} from "react";

import type {
  GameplayInputModeId,
  MetaverseMatchModeId,
  MetaverseRoomDirectoryEntrySnapshot
} from "@webgpu-metaverse/shared";

import { EngineToolLauncher } from "../../engine-tool";
import {
  createMetaverseRoomDirectoryClient,
  createSuggestedMetaverseTeamDeathmatchRoomIdDraft,
  metaverseRoomDirectoryRefreshIntervalMs,
  resolveMetaverseTeamDeathmatchRoomIdDraft
} from "../../metaverse/config/metaverse-room-network";
import type { WebGpuMetaverseCapabilitySnapshot } from "../../metaverse/types/webgpu-capability";
import type { MetaverseEntryStepId } from "../../navigation";
import { StableInlineText } from "@/components/text-stability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/class-name";
import { XIcon } from "lucide-react";

interface ShellEntryStageScreenProps {
  readonly capabilityStatus: WebGpuMetaverseCapabilitySnapshot["status"];
  readonly hasConfirmedProfile: boolean;
  readonly hasStoredProfile: boolean;
  readonly inputMode: GameplayInputModeId;
  readonly loginError: string | null;
  readonly matchMode: MetaverseMatchModeId;
  readonly metaverseLaunchError: string | null;
  readonly metaverseLaunchPending: boolean;
  readonly metaverseRoomIdDraft: string;
  readonly nextMetaverseStep: MetaverseEntryStepId | null;
  readonly onClearProfile: () => void;
  readonly onEditProfile: () => void;
  readonly onEnterMetaverse: (matchMode: MetaverseMatchModeId) => void;
  readonly onMatchModeChange: (matchMode: MetaverseMatchModeId) => void;
  readonly onMetaverseRoomIdDraftChange: (metaverseRoomIdDraft: string) => void;
  readonly onOpenToolRequest: () => void;
  readonly onRequestPermission: () => void;
  readonly onRecalibrationRequest: () => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly setUsernameDraft: (value: string) => void;
  readonly usernameDraft: string;
}

const profileSubmitLabels = [
  "Save local profile",
  "Update local profile"
] as const;
const freeRoamLaunchActionLabels = [
  "Enter Free Roam",
  "Camera setup",
  "Calibration",
  "Checking WebGPU",
  "Metaverse unavailable"
] as const;
const teamDeathmatchLaunchActionLabels = [
  "Join Team Deathmatch",
  "Camera setup",
  "Calibration",
  "Checking WebGPU",
  "Metaverse unavailable"
] as const;

function resolveLaunchActionLabel(
  matchMode: MetaverseMatchModeId,
  capabilityStatus: WebGpuMetaverseCapabilitySnapshot["status"],
  nextMetaverseStep: MetaverseEntryStepId | null
): string {
  if (nextMetaverseStep === "metaverse") {
    return matchMode === "team-deathmatch"
      ? "Join Team Deathmatch"
      : "Enter Free Roam";
  }

  if (nextMetaverseStep === "permissions") {
    return "Camera setup";
  }

  if (nextMetaverseStep === "calibration") {
    return "Calibration";
  }

  if (capabilityStatus === "checking") {
    return "Checking WebGPU";
  }

  return "Metaverse unavailable";
}

function resolveStageDescription(
  hasConfirmedProfile: boolean,
  nextMetaverseStep: MetaverseEntryStepId | null
): string {
  if (!hasConfirmedProfile) {
    return "Start with a stored profile, type a name to save locally, or continue as Unknown.";
  }

  if (nextMetaverseStep === "permissions") {
    return "Camera setup is ready when you want it.";
  }

  if (nextMetaverseStep === "calibration") {
    return "Calibration is available before launch.";
  }

  return "Launch into free roam or team deathmatch.";
}

function resolveLaunchCardClassName(selected: boolean): string {
  return selected
    ? "border-sky-300/55 bg-[rgb(14_165_233_/_0.14)] shadow-[0_20px_48px_rgb(14_165_233_/_0.18)]"
    : "border-border/70 bg-card/58";
}

function resolveLaunchReserveTexts(
  matchMode: MetaverseMatchModeId
): readonly string[] {
  return matchMode === "team-deathmatch"
    ? teamDeathmatchLaunchActionLabels
    : freeRoamLaunchActionLabels;
}

function formatTeamDeathmatchRoomStatus(
  roomEntry: MetaverseRoomDirectoryEntrySnapshot
): string {
  if (roomEntry.phase === "active") {
    const totalSeconds = Math.max(0, Math.ceil(Number(roomEntry.timeRemainingMs ?? 0) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${roomEntry.redTeamScore}-${roomEntry.blueTeamScore} · ${minutes}:${seconds
      .toString()
      .padStart(2, "0")} remaining`;
  }

  if (roomEntry.phase === "completed") {
    return `${roomEntry.redTeamScore}-${roomEntry.blueTeamScore} final`;
  }

  return `${roomEntry.connectedPlayerCount}/${roomEntry.capacity} connected`;
}

function teamDeathmatchRoomEntriesMatch(
  leftEntries: readonly MetaverseRoomDirectoryEntrySnapshot[],
  rightEntries: readonly MetaverseRoomDirectoryEntrySnapshot[]
): boolean {
  if (leftEntries === rightEntries) {
    return true;
  }

  if (leftEntries.length !== rightEntries.length) {
    return false;
  }

  for (let entryIndex = 0; entryIndex < leftEntries.length; entryIndex += 1) {
    const leftEntry = leftEntries[entryIndex];
    const rightEntry = rightEntries[entryIndex];

    if (
      leftEntry?.roomId !== rightEntry?.roomId ||
      leftEntry?.roomSessionId !== rightEntry?.roomSessionId ||
      leftEntry?.phase !== rightEntry?.phase ||
      leftEntry?.status !== rightEntry?.status ||
      leftEntry?.connectedPlayerCount !== rightEntry?.connectedPlayerCount ||
      leftEntry?.capacity !== rightEntry?.capacity ||
      leftEntry?.redTeamScore !== rightEntry?.redTeamScore ||
      leftEntry?.blueTeamScore !== rightEntry?.blueTeamScore ||
      leftEntry?.redTeamPlayerCount !== rightEntry?.redTeamPlayerCount ||
      leftEntry?.blueTeamPlayerCount !== rightEntry?.blueTeamPlayerCount ||
      leftEntry?.timeRemainingMs !== rightEntry?.timeRemainingMs ||
      leftEntry?.leaderPlayerId !== rightEntry?.leaderPlayerId
    ) {
      return false;
    }
  }

  return true;
}

export function ShellEntryStageScreen({
  capabilityStatus,
  hasConfirmedProfile,
  hasStoredProfile,
  inputMode,
  loginError,
  matchMode,
  metaverseLaunchError,
  metaverseLaunchPending,
  metaverseRoomIdDraft,
  nextMetaverseStep,
  onClearProfile,
  onEnterMetaverse,
  onMatchModeChange,
  onMetaverseRoomIdDraftChange,
  onOpenToolRequest,
  onRequestPermission,
  onRecalibrationRequest,
  onSubmit,
  setUsernameDraft,
  usernameDraft
}: ShellEntryStageScreenProps) {
  const [roomDirectoryClient] = useState(createMetaverseRoomDirectoryClient);
  const [teamDeathmatchRoomEntries, setTeamDeathmatchRoomEntries] = useState<
    readonly MetaverseRoomDirectoryEntrySnapshot[]
  >([]);
  const [teamDeathmatchRoomDirectoryError, setTeamDeathmatchRoomDirectoryError] =
    useState<string | null>(null);
  const [teamDeathmatchRoomDirectoryLoading, setTeamDeathmatchRoomDirectoryLoading] =
    useState(false);
  const [teamDeathmatchRoomDirectoryReady, setTeamDeathmatchRoomDirectoryReady] =
    useState(false);
  const profileSubmitLabel = hasStoredProfile
    ? "Update local profile"
    : "Save local profile";
  const canLaunch = nextMetaverseStep !== null;
  const canLaunchFreeRoam = canLaunch && !metaverseLaunchPending;
  const normalizedTeamDeathmatchRoomId =
    resolveMetaverseTeamDeathmatchRoomIdDraft(metaverseRoomIdDraft);
  const canLaunchTeamDeathmatch =
    canLaunch &&
    !metaverseLaunchPending &&
    normalizedTeamDeathmatchRoomId !== null;
  const showRecalibrationButton =
    hasConfirmedProfile &&
    inputMode === "camera-thumb-trigger" &&
    nextMetaverseStep === "metaverse";
  const showToolLauncher = import.meta.env.DEV;
  const teamDeathmatchDirectoryStatusLabel = teamDeathmatchRoomDirectoryLoading &&
    !teamDeathmatchRoomDirectoryReady
    ? "Loading"
    : teamDeathmatchRoomDirectoryError !== null
      ? "Retrying"
      : `${teamDeathmatchRoomEntries.length} live`;
  const teamDeathmatchDirectoryHint = teamDeathmatchRoomDirectoryError !== null
    ? teamDeathmatchRoomDirectoryError
    : normalizedTeamDeathmatchRoomId === null
      ? "Enter a valid room code before joining."
      : "\u00a0";
  const teamDeathmatchEmptyStateLabel = teamDeathmatchRoomDirectoryLoading &&
    !teamDeathmatchRoomDirectoryReady
    ? "Loading live rooms..."
    : "No live rooms yet. Launch with the current code to create one.";

  const applyTeamDeathmatchRoomDirectorySnapshot = useEffectEvent(
    (
      roomEntries:
        | readonly MetaverseRoomDirectoryEntrySnapshot[]
        | null,
      errorMessage: string | null
    ) => {
      startTransition(() => {
        if (roomEntries !== null) {
          setTeamDeathmatchRoomEntries((currentRoomEntries) =>
            teamDeathmatchRoomEntriesMatch(currentRoomEntries, roomEntries)
              ? currentRoomEntries
              : roomEntries
          );
        }
        setTeamDeathmatchRoomDirectoryError((currentErrorMessage) =>
          currentErrorMessage === errorMessage ? currentErrorMessage : errorMessage
        );
        setTeamDeathmatchRoomDirectoryLoading(false);
        setTeamDeathmatchRoomDirectoryReady(true);
      });
    }
  );

  useEffect(() => {
    let cancelled = false;

    const loadDirectory = async (isInitialLoad: boolean) => {
      if (!cancelled && isInitialLoad) {
        startTransition(() => {
          setTeamDeathmatchRoomDirectoryLoading(true);
        });
      }

      try {
        const roomDirectorySnapshot = await roomDirectoryClient.fetchSnapshot(
          "team-deathmatch"
        );

        if (cancelled) {
          return;
        }

        applyTeamDeathmatchRoomDirectorySnapshot(roomDirectorySnapshot.rooms, null);
      } catch (error) {
        if (cancelled) {
          return;
        }

        applyTeamDeathmatchRoomDirectorySnapshot(
          null,
          error instanceof Error
            ? error.message
            : "Team Deathmatch room directory fetch failed."
        );
      }
    };

    void loadDirectory(!teamDeathmatchRoomDirectoryReady);
    const refreshHandle = globalThis.setInterval(() => {
      void loadDirectory(false);
    }, metaverseRoomDirectoryRefreshIntervalMs);

    return () => {
      cancelled = true;
      globalThis.clearInterval(refreshHandle);
    };
  }, [
    applyTeamDeathmatchRoomDirectorySnapshot,
    roomDirectoryClient,
    teamDeathmatchRoomDirectoryReady
  ]);

  function handleLaunchRequest(selectedMatchMode: MetaverseMatchModeId): void {
    onMatchModeChange(selectedMatchMode);

    if (nextMetaverseStep === "permissions") {
      onRequestPermission();
      return;
    }

    if (nextMetaverseStep === "calibration") {
      onRecalibrationRequest();
      return;
    }

    onEnterMetaverse(selectedMatchMode);
  }

  return (
    <section className="relative overflow-x-hidden bg-game-stage text-game-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgb(125_211_252/0.16),transparent_26%),radial-gradient(circle_at_80%_20%,rgb(251_146_60/0.12),transparent_18%),linear-gradient(180deg,rgb(2_6_23/0.26),transparent_42%)]" />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-5xl items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex w-full max-w-4xl flex-col gap-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="type-game-banner">WebGPU Metaverse</p>
            <h1 className="font-heading text-4xl font-semibold tracking-tight text-game-foreground sm:text-5xl">
              {hasConfirmedProfile ? "Ready." : "Start."}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-game-muted sm:text-base">
              {resolveStageDescription(hasConfirmedProfile, nextMetaverseStep)}
            </p>
          </div>

          <section className="surface-game-overlay rounded-[1.35rem] border border-border/70 bg-card/68 px-5 py-5 text-game-foreground">
            <div className="mb-4 flex flex-col gap-2">
              <p className="font-heading text-2xl font-semibold text-game-foreground">
                {hasConfirmedProfile ? usernameDraft || "Unknown" : "Continue"}
              </p>
              <p className="text-sm leading-6 text-game-muted">
                {hasConfirmedProfile
                  ? "Profile and shell access."
                  : "Start immediately or save a local name first."}
              </p>
            </div>

            <form className="flex flex-col gap-3" onSubmit={onSubmit}>
              <div className="flex flex-col gap-2">
                <Label className="text-game-foreground" htmlFor="login-username">
                  Player name
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    aria-invalid={loginError !== null}
                    autoComplete="nickname"
                    className="h-11 flex-1"
                    id="login-username"
                    onChange={(event) => setUsernameDraft(event.target.value)}
                    placeholder="Unknown"
                    value={usernameDraft}
                  />
                  {hasStoredProfile || hasConfirmedProfile ? (
                    <Button
                      aria-label="Clear local profile"
                      onClick={onClearProfile}
                      size="icon"
                      type="button"
                      variant="outline"
                    >
                      <XIcon />
                    </Button>
                  ) : null}
                </div>
                {loginError !== null ? (
                  <div className="surface-game-danger rounded-xl px-3 py-2 text-sm leading-6">
                    {loginError}
                  </div>
                ) : null}
              </div>

              {!hasConfirmedProfile ? (
                <Button className="w-full" size="lg" type="submit" variant="outline">
                  <StableInlineText
                    reserveTexts={profileSubmitLabels}
                    text={profileSubmitLabel}
                  />
                </Button>
              ) : null}
            </form>

            {showRecalibrationButton ? (
              <Button
                className="mt-3 w-full"
                onClick={onRecalibrationRequest}
                size="lg"
                type="button"
                variant="outline"
              >
                Recalibrate
              </Button>
            ) : null}

            {showToolLauncher ? (
              <div className="mt-3">
                <EngineToolLauncher
                  className="w-full"
                  onOpenToolRequest={onOpenToolRequest}
                />
              </div>
            ) : null}
          </section>

          {metaverseLaunchError !== null ? (
            <div className="surface-game-danger rounded-[1.5rem] px-4 py-4 text-sm leading-6">
              {metaverseLaunchError}
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-2">
            {(["free-roam", "team-deathmatch"] as const).map((launchMode) => {
              const selected = matchMode === launchMode;
              const title =
                launchMode === "team-deathmatch"
                  ? "Team Deathmatch"
                  : "Free Roam";
              const description =
                launchMode === "team-deathmatch"
                  ? "Join the shell combat room directly. Match diagnostics stay in-world and the Duck Hunt portal is removed from this map."
                  : "Launch the starter shell bundle for traversal, vehicles, and portal access without deathmatch-specific HUDs.";
              const badgeLabel =
                launchMode === "team-deathmatch"
                  ? "Deathmatch map"
                  : "Starter bundle";
              const badgeClassName =
                launchMode === "team-deathmatch"
                  ? "text-rose-200/75"
                  : "text-sky-200/75";
              const detail =
                launchMode === "team-deathmatch"
                  ? "Authoritative shell PvP on the new deathmatch bundle, with the rest of the staging-ground layout kept intact."
                  : "Staging Ground with the Duck Hunt portal intact and the existing free-roam shell flow.";

              return (
                <section
                  className={[
                    "rounded-[1.35rem] border p-4 text-game-foreground transition-colors",
                    resolveLaunchCardClassName(selected)
                  ].join(" ")}
                  key={launchMode}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="font-heading text-lg font-semibold tracking-tight text-game-foreground">
                          {title}
                        </p>
                        <p className="text-sm leading-6 text-game-muted">
                          {detail}
                        </p>
                      </div>
                      <Button
                        className="shrink-0"
                        disabled={
                          launchMode === "team-deathmatch"
                            ? !canLaunchTeamDeathmatch
                            : !canLaunchFreeRoam
                        }
                        onClick={() => {
                          handleLaunchRequest(launchMode);
                        }}
                        size="sm"
                        type="button"
                        variant={selected ? "default" : "outline"}
                      >
                        {metaverseLaunchPending ? (
                          "Connecting..."
                        ) : (
                          <StableInlineText
                            reserveTexts={resolveLaunchReserveTexts(launchMode)}
                            text={resolveLaunchActionLabel(
                              launchMode,
                              capabilityStatus,
                              nextMetaverseStep
                            )}
                          />
                        )}
                      </Button>
                    </div>
                    <p
                      className={[
                        "text-xs font-semibold uppercase tracking-[0.24em]",
                        badgeClassName
                      ].join(" ")}
                    >
                      {badgeLabel}
                    </p>
                    <p className="text-sm leading-6 text-game-muted">
                      {description}
                    </p>
                    {launchMode === "team-deathmatch" ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-200/70">
                            Room code
                          </p>
                          <p
                            aria-live="polite"
                            className="text-xs uppercase tracking-[0.2em] text-game-muted"
                          >
                            <StableInlineText
                              reserveTexts={["Loading", "Retrying", "88 live"]}
                              text={teamDeathmatchDirectoryStatusLabel}
                            />
                          </p>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Input
                            className="h-11"
                            onChange={(event) => {
                              onMatchModeChange("team-deathmatch");
                              onMetaverseRoomIdDraftChange(event.target.value);
                            }}
                            onFocus={() => {
                              onMatchModeChange("team-deathmatch");
                            }}
                            placeholder="team-deathmatch-room"
                            value={metaverseRoomIdDraft}
                          />
                          <Button
                            className="shrink-0"
                            onClick={() => {
                              onMatchModeChange("team-deathmatch");
                              onMetaverseRoomIdDraftChange(
                                createSuggestedMetaverseTeamDeathmatchRoomIdDraft()
                              );
                            }}
                            type="button"
                            variant="outline"
                          >
                            Suggest
                          </Button>
                        </div>
                        <p
                          className={cn(
                            "mt-3 min-h-6 text-sm leading-6",
                            teamDeathmatchRoomDirectoryError !== null ||
                              normalizedTeamDeathmatchRoomId === null
                              ? "text-rose-200/88"
                              : "text-transparent"
                          )}
                        >
                          {teamDeathmatchDirectoryHint}
                        </p>
                        <div className="mt-3 rounded-xl border border-white/10">
                          <div className="grid grid-cols-[minmax(0,1fr)_72px_120px] border-b border-white/10 bg-[rgb(15_23_42_/_0.2)] px-3 py-2 text-xs uppercase tracking-[0.2em] text-game-muted">
                            <span>Room</span>
                            <span>Players</span>
                            <span>Status</span>
                          </div>
                          {teamDeathmatchRoomEntries.length === 0 ? (
                            <p className="px-3 py-3 text-sm leading-6 text-game-muted">
                              {teamDeathmatchEmptyStateLabel}
                            </p>
                          ) : (
                            teamDeathmatchRoomEntries.map((roomEntry) => {
                              const selectedRoom =
                                normalizedTeamDeathmatchRoomId !== null &&
                                roomEntry.roomId === normalizedTeamDeathmatchRoomId;

                              return (
                                <button
                                  className={[
                                    "grid w-full grid-cols-[minmax(0,1fr)_72px_120px] cursor-pointer px-3 py-3 text-left transition-colors",
                                    selectedRoom
                                      ? "border-rose-300/40 bg-[rgb(244_63_94_/_0.14)]"
                                      : "border-transparent hover:bg-[rgb(15_23_42_/_0.15)]"
                                  ].join(" ")}
                                  key={roomEntry.roomId}
                                  onClick={() => {
                                    onMatchModeChange("team-deathmatch");
                                    onMetaverseRoomIdDraftChange(roomEntry.roomId);
                                  }}
                                  type="button"
                                >
                                  <span className="truncate text-sm font-semibold text-game-foreground">
                                    {roomEntry.roomId}
                                  </span>
                                  <span className="text-xs tabular-nums text-game-muted">
                                    {roomEntry.connectedPlayerCount}/{roomEntry.capacity}
                                  </span>
                                  <span className="text-xs uppercase tracking-[0.2em] text-game-muted">
                                    {formatTeamDeathmatchRoomStatus(roomEntry)}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
