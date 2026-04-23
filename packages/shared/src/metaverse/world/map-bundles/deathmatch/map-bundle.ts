import { stagingGroundMapBundle } from "../staging-ground/map-bundle.js";
import type { MetaverseMapBundleSnapshot } from "../metaverse-map-bundle.js";

export const deathmatchMapBundle = Object.freeze({
  ...stagingGroundMapBundle,
  description:
    "Dedicated shell team-deathmatch bundle over the current authored surface slice with the Duck Hunt portal removed.",
  label: "Deathmatch",
  launchVariations: Object.freeze([
    Object.freeze({
      description:
        "Boot the deathmatch shell instance into authoritative red-vs-blue team deathmatch.",
      experienceId: null,
      gameplayVariationId: "metaverse-shell-team-deathmatch-v1",
      label: "Shell Team Deathmatch",
      matchMode: "team-deathmatch",
      variationId: "shell-team-deathmatch",
      vehicleLayoutId: null,
      weaponLayoutId: "duck-hunt-default-pistol-layout"
    })
  ]),
  mapId: "deathmatch",
  sceneObjects: Object.freeze(
    stagingGroundMapBundle.sceneObjects.filter(
      (sceneObject) => sceneObject.objectId !== "duck-hunt-launch-portal"
    )
  )
} satisfies MetaverseMapBundleSnapshot);
