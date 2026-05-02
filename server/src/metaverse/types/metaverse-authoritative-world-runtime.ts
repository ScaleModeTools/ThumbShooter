import type { Milliseconds } from "@webgpu-metaverse/shared";

export interface MetaverseAuthoritativeWorldRuntimeConfig {
  readonly authoritativeCombatRewindEnabled: boolean;
  readonly playerInactivityTimeoutMs: Milliseconds;
  readonly teamDeathmatchStartCountdownMs: Milliseconds;
  readonly tickIntervalMs: Milliseconds;
}
