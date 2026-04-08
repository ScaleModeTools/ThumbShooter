import { useEffect, useEffectEvent } from "react";
import type { Dispatch } from "react";

import type { BrowserAudioSession } from "../../audio";
import type { ShellNavigationSnapshot } from "../../navigation";

import type {
  ThumbShooterShellControllerAction,
  ThumbShooterShellControllerState
} from "../types/thumbshooter-shell-controller";

interface ThumbShooterShellGameplayMenuPolicyDependencies {
  readonly audioSession: BrowserAudioSession;
  readonly dispatch: Dispatch<ThumbShooterShellControllerAction>;
  readonly navigationSnapshot: ShellNavigationSnapshot;
  readonly state: ThumbShooterShellControllerState;
}

interface ThumbShooterShellGameplayMenuPolicy {
  readonly onGameplayMenuOpen: (open: boolean) => void;
}

export function useThumbShooterShellGameplayMenuPolicy({
  audioSession,
  dispatch,
  navigationSnapshot,
  state
}: ThumbShooterShellGameplayMenuPolicyDependencies): ThumbShooterShellGameplayMenuPolicy {
  const handleEscapeToggle = useEffectEvent(() => {
    if (navigationSnapshot.activeStep !== "gameplay") {
      return;
    }

    const nextOpen = !state.isMenuOpen;

    dispatch({
      type: "gameplayMenuSetOpen",
      open: nextOpen
    });
    dispatch({
      type: "audioSnapshotChanged",
      audioSnapshot: audioSession.playCue(
        nextOpen ? "ui-menu-open" : "ui-menu-close"
      )
    });
  });

  useEffect(() => {
    if (navigationSnapshot.activeStep === "gameplay" || !state.isMenuOpen) {
      return;
    }

    dispatch({
      type: "gameplayExited"
    });
  }, [dispatch, navigationSnapshot.activeStep, state.isMenuOpen]);

  useEffect(() => {
    if (navigationSnapshot.activeStep !== "gameplay") {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      handleEscapeToggle();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleEscapeToggle, navigationSnapshot.activeStep]);

  const onGameplayMenuOpen = useEffectEvent((open: boolean) => {
    if (open === state.isMenuOpen) {
      return;
    }

    dispatch({
      type: "gameplayMenuSetOpen",
      open
    });
    dispatch({
      type: "audioSnapshotChanged",
      audioSnapshot: audioSession.playCue(
        open ? "ui-menu-open" : "ui-menu-close"
      )
    });
  });

  return {
    onGameplayMenuOpen
  };
}
