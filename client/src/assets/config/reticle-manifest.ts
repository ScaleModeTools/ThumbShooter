import { defineReticleManifest } from "../types/asset-manifest";

export const reticleManifest = defineReticleManifest([
    {
      id: "default-ring",
      label: "Default ring",
      style: "hollow-ring",
      color: "white"
    },
    {
      id: "precision-ring",
      label: "Precision ring",
      style: "hollow-ring",
      color: "red"
    }
  ] as const);
