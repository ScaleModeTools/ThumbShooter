import { createMilliseconds } from "@webgpu-metaverse/shared";

import type { MetaversePresenceRuntimeConfig } from "../types/metaverse-presence-runtime.js";

export const metaversePresenceRuntimeConfig = {
  playerInactivityTimeoutMs: createMilliseconds(10_000),
  tickIntervalMs: createMilliseconds(150)
} as const satisfies MetaversePresenceRuntimeConfig;
