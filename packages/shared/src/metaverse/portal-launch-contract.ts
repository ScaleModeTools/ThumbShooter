import type { GameplayInputModeId } from "../gameplay-input-mode.js";
import type { GameplayTickOwner } from "../experiences/duck-hunt/duck-hunt-room-contract.js";
import type { MetaverseMatchModeId } from "./metaverse-match-mode.js";

import {
  type ExperienceId
} from "./experience-catalog.js";

export interface PortalLaunchSelectionSnapshot {
  readonly experienceId: ExperienceId;
  readonly inputMode: GameplayInputModeId;
  readonly matchMode: MetaverseMatchModeId;
  readonly tickOwner: GameplayTickOwner;
}

export interface PortalLaunchSelectionSnapshotInput {
  readonly experienceId: ExperienceId;
  readonly inputMode: GameplayInputModeId;
  readonly matchMode: MetaverseMatchModeId;
}

export function createPortalLaunchSelectionSnapshot({
  experienceId,
  inputMode,
  matchMode
}: PortalLaunchSelectionSnapshotInput): PortalLaunchSelectionSnapshot {
  return Object.freeze({
    experienceId,
    inputMode,
    matchMode,
    tickOwner: matchMode === "free-roam" ? "client" : "server"
  });
}
