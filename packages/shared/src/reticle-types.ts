export const reticleIds = ["default-ring", "precision-ring"] as const;

export type ReticleId = (typeof reticleIds)[number];

export const reticleColors = ["white", "red"] as const;

export type ReticleColor = (typeof reticleColors)[number];

export type ReticleStyle = "hollow-ring";
