import type {
  MetaverseMapBundleEnvironmentPresentationSnapshot
} from "@webgpu-metaverse/shared/metaverse/world";

export interface MetaverseEnvironmentPresentationProfileSnapshot
  extends MetaverseMapBundleEnvironmentPresentationSnapshot {
  readonly id: string;
  readonly label: string;
}

export function createMetaverseEnvironmentPresentationRgbTuple(
  red: number,
  green: number,
  blue: number
): readonly [number, number, number] {
  return Object.freeze([red, green, blue]);
}

export function cloneMetaverseEnvironmentPresentationSnapshot(
  snapshot: MetaverseMapBundleEnvironmentPresentationSnapshot
): MetaverseMapBundleEnvironmentPresentationSnapshot {
  return Object.freeze({
    environment: Object.freeze({
      cloudCoverage: snapshot.environment.cloudCoverage,
      cloudDensity: snapshot.environment.cloudDensity,
      cloudElevation: snapshot.environment.cloudElevation,
      cloudScale: snapshot.environment.cloudScale,
      cloudSpeed: snapshot.environment.cloudSpeed,
      domeRadius: snapshot.environment.domeRadius,
      fogColor: createMetaverseEnvironmentPresentationRgbTuple(
        snapshot.environment.fogColor[0],
        snapshot.environment.fogColor[1],
        snapshot.environment.fogColor[2]
      ),
      fogDensity: snapshot.environment.fogDensity,
      fogEnabled: snapshot.environment.fogEnabled,
      groundColor: createMetaverseEnvironmentPresentationRgbTuple(
        snapshot.environment.groundColor[0],
        snapshot.environment.groundColor[1],
        snapshot.environment.groundColor[2]
      ),
      groundFalloff: snapshot.environment.groundFalloff,
      horizonColor: createMetaverseEnvironmentPresentationRgbTuple(
        snapshot.environment.horizonColor[0],
        snapshot.environment.horizonColor[1],
        snapshot.environment.horizonColor[2]
      ),
      horizonSoftness: snapshot.environment.horizonSoftness,
      mieCoefficient: snapshot.environment.mieCoefficient,
      mieDirectionalG: snapshot.environment.mieDirectionalG,
      rayleigh: snapshot.environment.rayleigh,
      skyExposure: snapshot.environment.skyExposure,
      skyExposureCurve: snapshot.environment.skyExposureCurve,
      sunAzimuthDegrees: snapshot.environment.sunAzimuthDegrees,
      sunColor: createMetaverseEnvironmentPresentationRgbTuple(
        snapshot.environment.sunColor[0],
        snapshot.environment.sunColor[1],
        snapshot.environment.sunColor[2]
      ),
      sunElevationDegrees: snapshot.environment.sunElevationDegrees,
      toneMappingExposure: snapshot.environment.toneMappingExposure,
      turbidity: snapshot.environment.turbidity
    }),
    ocean: Object.freeze({
      emissiveColor: createMetaverseEnvironmentPresentationRgbTuple(
        snapshot.ocean.emissiveColor[0],
        snapshot.ocean.emissiveColor[1],
        snapshot.ocean.emissiveColor[2]
      ),
      farColor: createMetaverseEnvironmentPresentationRgbTuple(
        snapshot.ocean.farColor[0],
        snapshot.ocean.farColor[1],
        snapshot.ocean.farColor[2]
      ),
      height: snapshot.ocean.height,
      nearColor: createMetaverseEnvironmentPresentationRgbTuple(
        snapshot.ocean.nearColor[0],
        snapshot.ocean.nearColor[1],
        snapshot.ocean.nearColor[2]
      ),
      planeDepth: snapshot.ocean.planeDepth,
      planeWidth: snapshot.ocean.planeWidth,
      roughness: snapshot.ocean.roughness,
      segmentCount: snapshot.ocean.segmentCount,
      waveAmplitude: snapshot.ocean.waveAmplitude,
      waveFrequencies: Object.freeze({
        primary: snapshot.ocean.waveFrequencies.primary,
        ripple: snapshot.ocean.waveFrequencies.ripple,
        secondary: snapshot.ocean.waveFrequencies.secondary
      }),
      waveSpeeds: Object.freeze({
        primary: snapshot.ocean.waveSpeeds.primary,
        ripple: snapshot.ocean.waveSpeeds.ripple,
        secondary: snapshot.ocean.waveSpeeds.secondary
      })
    })
  });
}

export function createMetaverseEnvironmentPresentationSnapshotFromProfile(
  profile: MetaverseEnvironmentPresentationProfileSnapshot
): MetaverseMapBundleEnvironmentPresentationSnapshot {
  return cloneMetaverseEnvironmentPresentationSnapshot(profile);
}

export const shellDefaultEnvironmentPresentationProfile = Object.freeze({
  environment: Object.freeze({
    domeRadius: 360,
    cloudCoverage: 0.2,
    cloudDensity: 0.28,
    cloudElevation: 0.68,
    cloudScale: 0.00016,
    cloudSpeed: 0.00006,
    fogColor: createMetaverseEnvironmentPresentationRgbTuple(0.63, 0.76, 0.88),
    fogDensity: 0.0023,
    fogEnabled: false,
    groundColor: createMetaverseEnvironmentPresentationRgbTuple(0.23, 0.28, 0.35),
    groundFalloff: 1.15,
    horizonColor: createMetaverseEnvironmentPresentationRgbTuple(0.8, 0.85, 0.9),
    horizonSoftness: 0.24,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.8,
    rayleigh: 2.1,
    skyExposure: 0.33,
    skyExposureCurve: 1,
    sunAzimuthDegrees: 132,
    sunColor: createMetaverseEnvironmentPresentationRgbTuple(1, 0.91, 0.74),
    sunElevationDegrees: 28,
    toneMappingExposure: 0.88,
    turbidity: 9.5
  }),
  id: "shell-default-environment-presentation",
  label: "Shell Default Environment",
  ocean: Object.freeze({
    emissiveColor: createMetaverseEnvironmentPresentationRgbTuple(
      0.08,
      0.28,
      0.37
    ),
    farColor: createMetaverseEnvironmentPresentationRgbTuple(0.05, 0.22, 0.34),
    height: 0,
    nearColor: createMetaverseEnvironmentPresentationRgbTuple(0.12, 0.45, 0.58),
    planeDepth: 72,
    planeWidth: 72,
    roughness: 0.16,
    segmentCount: 96,
    waveAmplitude: 0.32,
    waveFrequencies: Object.freeze({
      primary: 0.11,
      ripple: 0.38,
      secondary: 0.18
    }),
    waveSpeeds: Object.freeze({
      primary: 0.62,
      ripple: 1.28,
      secondary: 0.87
    })
  })
} satisfies MetaverseEnvironmentPresentationProfileSnapshot);
