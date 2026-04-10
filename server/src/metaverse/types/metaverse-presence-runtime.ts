import type { Milliseconds } from "@webgpu-metaverse/shared";

export interface MetaversePresenceRuntimeConfig {
  readonly playerInactivityTimeoutMs: Milliseconds;
  readonly tickIntervalMs: Milliseconds;
}
