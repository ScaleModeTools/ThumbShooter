import {
  createMetaverseEnvironmentPresentationRgbTuple,
  type MetaverseEnvironmentPresentationProfileSnapshot
} from "./shell-default-environment-presentation";

export const shellGoldenHourEnvironmentPresentationProfile = Object.freeze({
  environment: Object.freeze({
    domeRadius: 380,
    cloudCoverage: 0.24,
    cloudDensity: 0.34,
    cloudElevation: 0.62,
    cloudScale: 0.00017,
    cloudSpeed: 0.00005,
    fogColor: createMetaverseEnvironmentPresentationRgbTuple(0.78, 0.6, 0.48),
    fogDensity: 0.0031,
    fogEnabled: false,
    groundColor: createMetaverseEnvironmentPresentationRgbTuple(0.19, 0.16, 0.2),
    groundFalloff: 1.35,
    horizonColor: createMetaverseEnvironmentPresentationRgbTuple(0.96, 0.66, 0.46),
    horizonSoftness: 0.28,
    mieCoefficient: 0.0065,
    mieDirectionalG: 0.82,
    rayleigh: 2.4,
    skyExposure: 0.3,
    skyExposureCurve: 1,
    sunAzimuthDegrees: 156,
    sunColor: createMetaverseEnvironmentPresentationRgbTuple(1, 0.78, 0.56),
    sunElevationDegrees: 12,
    toneMappingExposure: 0.34,
    turbidity: 12
  }),
  id: "shell-golden-hour-environment-presentation",
  label: "Shell Golden Hour Environment",
  ocean: Object.freeze({
    emissiveColor: createMetaverseEnvironmentPresentationRgbTuple(
      0.17,
      0.16,
      0.24
    ),
    farColor: createMetaverseEnvironmentPresentationRgbTuple(0.18, 0.21, 0.33),
    height: 0,
    nearColor: createMetaverseEnvironmentPresentationRgbTuple(0.34, 0.41, 0.58),
    planeDepth: 72,
    planeWidth: 72,
    roughness: 0.22,
    segmentCount: 96,
    waveAmplitude: 0.26,
    waveFrequencies: Object.freeze({
      primary: 0.09,
      ripple: 0.29,
      secondary: 0.14
    }),
    waveSpeeds: Object.freeze({
      primary: 0.43,
      ripple: 0.94,
      secondary: 0.63
    })
  })
} satisfies MetaverseEnvironmentPresentationProfileSnapshot);
