import type { FirstPlayableWeaponId } from "../types/game-foundation";
import type { WeaponDefinition } from "../types/weapon-contract";

export const weaponManifest = {
  "semiautomatic-pistol": {
    weaponId: "semiautomatic-pistol",
    displayName: "Semiautomatic pistol",
    triggerMode: "single",
    cadence: {
      shotIntervalMs: 260
    },
    reload: {
      clipCapacity: 6,
      durationMs: 420,
      rule: "reticle-offscreen"
    },
    spread: {
      baseRadius: 0,
      maxRadius: 0.02,
      sprayGrowthPerShot: 0.0025,
      sprayRecoveryPerSecond: 6
    }
  }
} as const satisfies Record<FirstPlayableWeaponId, WeaponDefinition>;

export const firstPlayableWeaponDefinition =
  weaponManifest["semiautomatic-pistol"];
