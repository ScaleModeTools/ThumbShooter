import { resolveGameplayInputMode } from "@thumbshooter/shared";
import type {
  GameplayEntryStepId,
  ShellNavigationProgress,
  ShellNavigationSnapshot
} from "../types/shell-navigation";

function resolveNextGameplayStep(
  progress: ShellNavigationProgress
): GameplayEntryStepId | null {
  const inputMode = resolveGameplayInputMode(progress.inputMode);

  if (progress.gameplayCapability !== "supported") {
    return null;
  }

  if (
    inputMode.requiresWebcamPermission &&
    progress.webcamPermission !== "granted"
  ) {
    return "permissions";
  }

  if (
    inputMode.requiresCalibration &&
    progress.calibrationShell !== "reviewed"
  ) {
    return "calibration";
  }

  return "gameplay";
}

export function resolveShellNavigation(
  progress: ShellNavigationProgress
): ShellNavigationSnapshot {
  if (!progress.hasConfirmedProfile) {
    return {
      activeStep: "login",
      canAdvanceFromPermissions: false,
      canEnterGameplayShell: false,
      isUnsupportedRoute: false,
      nextGameplayStep: null
    };
  }

  if (progress.gameplayCapability === "unsupported") {
    return {
      activeStep: "unsupported",
      canAdvanceFromPermissions: false,
      canEnterGameplayShell: false,
      isUnsupportedRoute: true,
      nextGameplayStep: null
    };
  }

  const nextGameplayStep = resolveNextGameplayStep(progress);

  if (
    progress.gameplayShell === "main-menu" ||
    nextGameplayStep === null
  ) {
    return {
      activeStep: "main-menu",
      canAdvanceFromPermissions: true,
      canEnterGameplayShell: nextGameplayStep === "gameplay",
      isUnsupportedRoute: false,
      nextGameplayStep
    };
  }

  return {
    activeStep: nextGameplayStep,
    canAdvanceFromPermissions: true,
    canEnterGameplayShell: nextGameplayStep === "gameplay",
    isUnsupportedRoute: false,
    nextGameplayStep
  };
}
