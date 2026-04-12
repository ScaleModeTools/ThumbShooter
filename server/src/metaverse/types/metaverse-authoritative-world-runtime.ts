import type { Milliseconds } from "@webgpu-metaverse/shared";

export interface MetaverseAuthoritativeWorldRuntimeConfig {
  readonly playerInactivityTimeoutMs: Milliseconds;
  readonly tickIntervalMs: Milliseconds;
}
