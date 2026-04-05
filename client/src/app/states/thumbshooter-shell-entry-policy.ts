import { startTransition, useEffect, useEffectEvent } from "react";
import type { Dispatch, FormEvent } from "react";

import { PlayerProfile, createUsername } from "@thumbshooter/shared";

import type { BrowserAudioSession } from "../../audio";
import { WebGpuGameplayCapabilityProbe } from "../../game/classes/webgpu-gameplay-capability-probe";
import { WebcamPermissionGateway } from "../../navigation";

import type {
  ThumbShooterShellControllerAction,
  ThumbShooterShellControllerState
} from "../types/thumbshooter-shell-controller";

interface ThumbShooterShellEntryPolicyDependencies {
  readonly audioSession: BrowserAudioSession;
  readonly capabilityProbe: WebGpuGameplayCapabilityProbe;
  readonly dispatch: Dispatch<ThumbShooterShellControllerAction>;
  readonly permissionGateway: WebcamPermissionGateway;
  readonly state: ThumbShooterShellControllerState;
}

interface ThumbShooterShellEntryPolicy {
  readonly onLoginSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onRequestPermission: () => void;
  readonly onRetryCapabilityProbe: () => void;
  readonly setUsernameDraft: (value: string) => void;
}

export function useThumbShooterShellEntryPolicy({
  audioSession,
  capabilityProbe,
  dispatch,
  permissionGateway,
  state
}: ThumbShooterShellEntryPolicyDependencies): ThumbShooterShellEntryPolicy {
  useEffect(() => {
    let didCancel = false;

    void capabilityProbe.probe(window.navigator).then((nextSnapshot) => {
      if (!didCancel) {
        dispatch({
          type: "capabilitySnapshotReceived",
          capabilitySnapshot: nextSnapshot
        });
      }
    });

    return () => {
      didCancel = true;
    };
  }, [capabilityProbe, dispatch]);

  const setUsernameDraft = useEffectEvent((value: string) => {
    dispatch({
      type: "usernameDraftChanged",
      usernameDraft: value
    });
  });

  const onLoginSubmit = useEffectEvent((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const username = createUsername(state.usernameDraft);

    if (username === null) {
      dispatch({
        type: "loginRejected",
        loginError: "Enter a non-empty username to create the local profile."
      });
      return;
    }

    const nextProfile =
      state.profile !== null && state.profile.snapshot.username === username
        ? state.profile
        : PlayerProfile.create({
            username
          });

    void audioSession.unlock().then((unlockSnapshot) => {
      dispatch({
        type: "audioSnapshotChanged",
        audioSnapshot: unlockSnapshot
      });

      startTransition(() => {
        dispatch({
          type: "profileConfirmed",
          profile: nextProfile
        });
      });

      dispatch({
        type: "audioSnapshotChanged",
        audioSnapshot: audioSession.playCue("ui-confirm")
      });
    });
  });

  const onRequestPermission = useEffectEvent(() => {
    dispatch({
      type: "permissionRequestStarted"
    });

    void audioSession.unlock().then(async (unlockSnapshot) => {
      dispatch({
        type: "audioSnapshotChanged",
        audioSnapshot: unlockSnapshot
      });

      const permissionSnapshot = await permissionGateway.request(
        window.navigator.mediaDevices
      );

      if (permissionSnapshot.state === "granted") {
        startTransition(() => {
          dispatch({
            type: "permissionResolved",
            permissionError: null,
            permissionState: "granted"
          });
        });
        dispatch({
          type: "audioSnapshotChanged",
          audioSnapshot: audioSession.playCue("ui-confirm")
        });
        return;
      }

      dispatch({
        type: "permissionResolved",
        permissionError: permissionSnapshot.failureReason,
        permissionState: permissionSnapshot.state
      });
    });
  });

  const onRetryCapabilityProbe = useEffectEvent(() => {
    dispatch({
      type: "capabilityProbeStarted"
    });

    void capabilityProbe.probe(window.navigator).then((nextSnapshot) => {
      dispatch({
        type: "capabilitySnapshotReceived",
        capabilitySnapshot: nextSnapshot
      });
    });
  });

  return {
    onLoginSubmit,
    onRequestPermission,
    onRetryCapabilityProbe,
    setUsernameDraft
  };
}
