import type { MetaverseCombatAudioCueId } from "../audio";

export type MetaverseRespawnCountdownSecond = 0 | 1 | 2 | 3;
export type MetaverseRespawnVisibleCountdownSecond = 1 | 2 | 3;

export function resolveMetaverseRespawnCountdownSecond(
  respawnRemainingMs: number
): MetaverseRespawnCountdownSecond | null {
  if (!Number.isFinite(respawnRemainingMs) || respawnRemainingMs <= 0) {
    return null;
  }

  const countdownSecond = Math.ceil(respawnRemainingMs / 1_000) - 1;

  if (countdownSecond < 0 || countdownSecond > 3) {
    return null;
  }

  return countdownSecond as MetaverseRespawnCountdownSecond;
}

export function resolveMetaverseRespawnVisibleCountdownSecond(
  respawnRemainingMs: number
): MetaverseRespawnVisibleCountdownSecond | null {
  const countdownSecond =
    resolveMetaverseRespawnCountdownSecond(respawnRemainingMs);

  return countdownSecond === 1 ||
    countdownSecond === 2 ||
    countdownSecond === 3
    ? countdownSecond
    : null;
}

export function resolveMetaverseRespawnCountdownAudioCueId(
  countdownSecond: MetaverseRespawnCountdownSecond
): MetaverseCombatAudioCueId {
  return countdownSecond === 0
    ? "metaverse-respawn-countdown-ready"
    : "metaverse-respawn-countdown";
}
