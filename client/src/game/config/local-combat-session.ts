import type { LocalCombatSessionConfig } from "../types/local-combat-session";

export const localCombatSessionConfig = {
  roundDurationMs: 20_000,
  scorePerKill: 100
} as const satisfies LocalCombatSessionConfig;
