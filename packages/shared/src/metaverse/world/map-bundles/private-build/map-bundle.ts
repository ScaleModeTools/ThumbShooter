import { stagingGroundMapBundle } from "../staging-ground/map-bundle.js";
import type { MetaverseMapBundleSnapshot } from "../metaverse-map-bundle.js";

export const privateBuildMapBundle = Object.freeze({
  ...stagingGroundMapBundle,
  environmentPresentation: null,
  label: "Private",
  mapId: "private-build"
} satisfies MetaverseMapBundleSnapshot);
