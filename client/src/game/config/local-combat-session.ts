import { createMilliseconds } from "@thumbshooter/shared";

import type { LocalCombatSessionConfig } from "../types/local-combat-session";

export const localCombatSessionConfig = {
  roundDurationMs: createMilliseconds(20_000),
  scorePerKill: 100
} as const satisfies LocalCombatSessionConfig;
