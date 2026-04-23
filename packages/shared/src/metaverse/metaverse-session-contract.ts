import type { GameplayTickOwner } from "../experiences/duck-hunt/duck-hunt-room-contract.js";

import type { ExperienceId } from "./experience-catalog.js";
import type { MetaverseMatchModeId } from "./metaverse-match-mode.js";

export interface MetaverseSessionSnapshot {
  readonly activeExperienceId: ExperienceId | null;
  readonly availableExperienceIds: readonly ExperienceId[];
  readonly selectedMatchMode: MetaverseMatchModeId | null;
  readonly tickOwner: GameplayTickOwner;
}

export interface MetaverseSessionSnapshotInput {
  readonly activeExperienceId?: ExperienceId | null;
  readonly availableExperienceIds: readonly ExperienceId[];
  readonly selectedMatchMode?: MetaverseMatchModeId | null;
  readonly tickOwner: GameplayTickOwner;
}

export function createMetaverseSessionSnapshot({
  activeExperienceId = null,
  availableExperienceIds,
  selectedMatchMode = null,
  tickOwner
}: MetaverseSessionSnapshotInput): MetaverseSessionSnapshot {
  return Object.freeze({
    activeExperienceId,
    availableExperienceIds: Object.freeze([...availableExperienceIds]),
    selectedMatchMode,
    tickOwner
  });
}
