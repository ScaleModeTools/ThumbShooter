import type { Milliseconds } from "@webgpu-metaverse/shared";

export interface MetaverseAuthoritativeWorldRuntimeConfig {
  readonly authoritativeCombatRewindEnabled: boolean;
  readonly playerInactivityTimeoutMs: Milliseconds;
  readonly tickIntervalMs: Milliseconds;
}
