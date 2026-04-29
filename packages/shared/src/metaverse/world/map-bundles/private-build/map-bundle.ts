import { stagingGroundMapBundle } from "../staging-ground/map-bundle.js";
import type { MetaverseMapBundleSnapshot } from "../metaverse-map-bundle.js";

export const privateBuildMapBundle = Object.freeze({
  ...stagingGroundMapBundle,
  environmentPresentation: null,
  label: "Private",
  launchVariations: Object.freeze(
    stagingGroundMapBundle.launchVariations.map((variation) =>
      variation.variationId === "shell-team-deathmatch"
        ? Object.freeze({
            ...variation,
            weaponLayoutId: "metaverse-tdm-pistol-rocket-layout"
          })
        : variation
    )
  ),
  mapId: "private-build",
  resourceSpawns: Object.freeze([
    Object.freeze({
      ammoGrantRounds: 48,
      assetId: "metaverse-service-pistol-v2",
      label: "Pistol north",
      modeTags: Object.freeze(["team-deathmatch"]),
      pickupRadiusMeters: 1.4,
      position: Object.freeze({
        x: -8.2,
        y: 0.6,
        z: -22.2
      }),
      resourceKind: "weapon-pickup" as const,
      respawnCooldownMs: 30_000,
      spawnId: "private-build:resource:pistol-north",
      weaponId: "metaverse-service-pistol-v2",
      yawRadians: 0.18849555921538758
    }),
    Object.freeze({
      ammoGrantRounds: 48,
      assetId: "metaverse-service-pistol-v2",
      label: "Pistol south",
      modeTags: Object.freeze(["team-deathmatch"]),
      pickupRadiusMeters: 1.4,
      position: Object.freeze({
        x: -8.2,
        y: 0.6,
        z: -7.4
      }),
      resourceKind: "weapon-pickup" as const,
      respawnCooldownMs: 30_000,
      spawnId: "private-build:resource:pistol-south",
      weaponId: "metaverse-service-pistol-v2",
      yawRadians: 0.18849555921538758
    }),
    Object.freeze({
      ammoGrantRounds: 6,
      assetId: "metaverse-rocket-launcher-v1",
      label: "Rocket west",
      modeTags: Object.freeze(["team-deathmatch"]),
      pickupRadiusMeters: 1.4,
      position: Object.freeze({
        x: -14.2,
        y: 0.6,
        z: -14.8
      }),
      resourceKind: "weapon-pickup" as const,
      respawnCooldownMs: 45_000,
      spawnId: "private-build:resource:rocket-west",
      weaponId: "metaverse-rocket-launcher-v1",
      yawRadians: 1.5707963267948966
    }),
    Object.freeze({
      ammoGrantRounds: 6,
      assetId: "metaverse-rocket-launcher-v1",
      label: "Rocket east",
      modeTags: Object.freeze(["team-deathmatch"]),
      pickupRadiusMeters: 1.4,
      position: Object.freeze({
        x: -2.2,
        y: 0.6,
        z: -14.8
      }),
      resourceKind: "weapon-pickup" as const,
      respawnCooldownMs: 45_000,
      spawnId: "private-build:resource:rocket-east",
      weaponId: "metaverse-rocket-launcher-v1",
      yawRadians: -1.5707963267948966
    })
  ])
} satisfies MetaverseMapBundleSnapshot);
