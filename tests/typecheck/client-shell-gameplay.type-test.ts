import type { PlayerProfile } from "@thumbshooter/shared";

import type { ThumbShooterShellControllerAction } from "../../client/src/app/types/thumbshooter-shell-controller";
import {
  gameplayRuntimeLifecycleStates,
  localArenaEnemyBehaviorStates,
  localArenaTargetFeedbackStates,
  type FirstPlayableWeaponId,
  type GameplayHudSnapshot,
  type GameplayRuntimeLifecycleState,
  type GameplaySignal,
  type GameplaySignalType,
  type LocalArenaEnemyBehaviorState,
  type LocalArenaTargetFeedbackState
} from "../../client/src/game/index";
import type { AssertTrue, IsEqual } from "./type-assertions";

type ThumbShooterShellControllerActionType =
  ThumbShooterShellControllerAction["type"];

type ExpectedShellActionType =
  | "audioSnapshotChanged"
  | "bestScoreRaised"
  | "calibrationProgressRecorded"
  | "calibrationResetRequested"
  | "capabilityProbeStarted"
  | "capabilitySnapshotReceived"
  | "gameplayExited"
  | "gameplayMenuAutoOpened"
  | "gameplayMenuSetOpen"
  | "loginRejected"
  | "musicVolumeChanged"
  | "permissionRequestStarted"
  | "permissionResolved"
  | "profileCleared"
  | "profileConfirmed"
  | "profileEditRequested"
  | "sfxVolumeChanged"
  | "usernameDraftChanged";
type ExpectedGameplayRuntimeLifecycleState =
  | "idle"
  | "booting"
  | "running"
  | "failed";
type ExpectedLocalArenaEnemyBehaviorState =
  | "glide"
  | "scatter"
  | "downed";
type ExpectedLocalArenaTargetFeedbackState =
  | "tracking-lost"
  | "clear"
  | "targeted"
  | "hit"
  | "miss";

type ShellActionTypesMatch = AssertTrue<
  IsEqual<ThumbShooterShellControllerActionType, ExpectedShellActionType>
>;
type GameplayRuntimeLifecycleMatches = AssertTrue<
  IsEqual<
    GameplayRuntimeLifecycleState,
    ExpectedGameplayRuntimeLifecycleState
  >
>;
type GameplayRuntimeLifecycleCatalogMatches = AssertTrue<
  IsEqual<
    (typeof gameplayRuntimeLifecycleStates)[number],
    GameplayRuntimeLifecycleState
  >
>;
type GameplayHudLifecycleUsesRuntimeLifecycle = AssertTrue<
  IsEqual<GameplayHudSnapshot["lifecycle"], GameplayRuntimeLifecycleState>
>;
type LocalArenaEnemyBehaviorMatches = AssertTrue<
  IsEqual<
    LocalArenaEnemyBehaviorState,
    ExpectedLocalArenaEnemyBehaviorState
  >
>;
type LocalArenaEnemyBehaviorCatalogMatches = AssertTrue<
  IsEqual<
    (typeof localArenaEnemyBehaviorStates)[number],
    LocalArenaEnemyBehaviorState
  >
>;
type LocalArenaTargetFeedbackMatches = AssertTrue<
  IsEqual<
    LocalArenaTargetFeedbackState,
    ExpectedLocalArenaTargetFeedbackState
  >
>;
type LocalArenaTargetFeedbackCatalogMatches = AssertTrue<
  IsEqual<
    (typeof localArenaTargetFeedbackStates)[number],
    LocalArenaTargetFeedbackState
  >
>;
type GameplayHudFeedbackUsesTargetFeedbackState = AssertTrue<
  IsEqual<
    GameplayHudSnapshot["targetFeedback"]["state"],
    LocalArenaTargetFeedbackState
  >
>;
type GameplayHudWeaponUsesFirstPlayableWeaponId = AssertTrue<
  IsEqual<GameplayHudSnapshot["weapon"]["weaponId"], FirstPlayableWeaponId>
>;
type MusicVolumePayloadIsNumber = AssertTrue<
  IsEqual<
    Extract<
      ThumbShooterShellControllerAction,
      { readonly type: "musicVolumeChanged" }
    >["sliderValue"],
    number
  >
>;
type GameplayMenuTogglePayloadIsBoolean = AssertTrue<
  IsEqual<
    Extract<
      ThumbShooterShellControllerAction,
      { readonly type: "gameplayMenuSetOpen" }
    >["open"],
    boolean
  >
>;
type ProfileConfirmedPayloadUsesPlayerProfile = AssertTrue<
  IsEqual<
    Extract<
      ThumbShooterShellControllerAction,
      { readonly type: "profileConfirmed" }
    >["profile"],
    PlayerProfile
  >
>;
type GameplaySignalTypeMatches = AssertTrue<
  IsEqual<GameplaySignalType, "weapon-fired">
>;
type GameplaySignalWeaponIdMatches = AssertTrue<
  IsEqual<GameplaySignal["weaponId"], FirstPlayableWeaponId>
>;

export type ClientShellGameplayTypeTests =
  | ShellActionTypesMatch
  | GameplayRuntimeLifecycleMatches
  | GameplayRuntimeLifecycleCatalogMatches
  | GameplayHudLifecycleUsesRuntimeLifecycle
  | LocalArenaEnemyBehaviorMatches
  | LocalArenaEnemyBehaviorCatalogMatches
  | LocalArenaTargetFeedbackMatches
  | LocalArenaTargetFeedbackCatalogMatches
  | GameplayHudFeedbackUsesTargetFeedbackState
  | GameplayHudWeaponUsesFirstPlayableWeaponId
  | MusicVolumePayloadIsNumber
  | GameplayMenuTogglePayloadIsBoolean
  | ProfileConfirmedPayloadUsesPlayerProfile
  | GameplaySignalTypeMatches
  | GameplaySignalWeaponIdMatches;
