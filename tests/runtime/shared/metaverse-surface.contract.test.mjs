import assert from "node:assert/strict";
import test from "node:test";

import {
  metaverseHubShorelineEnvironmentAssetId,
  metaverseWorldStaticSurfaceAssets,
  readMetaverseWorldSurfaceAssetAuthoring,
  resolveMetaverseWorldAutomaticSurfaceLocomotion,
  resolveMetaverseWorldPlacedSurfaceColliders
} from "@webgpu-metaverse/shared";

const metaverseSurfacePolicyConfig = Object.freeze({
  capsuleHalfHeightMeters: 0.48,
  capsuleRadiusMeters: 0.34,
  gravityUnitsPerSecond: 18,
  jumpImpulseUnitsPerSecond: 6.8,
  oceanHeightMeters: 0,
  stepHeightMeters: 0.28
});

const staticSurfaceColliders = Object.freeze(
  metaverseWorldStaticSurfaceAssets.flatMap((surfaceAsset) =>
    resolveMetaverseWorldPlacedSurfaceColliders(surfaceAsset)
  )
);

test("shared metaverse surface authoring exposes the shipped shoreline slice with static placements", () => {
  const shorelineSurfaceAsset = readMetaverseWorldSurfaceAssetAuthoring(
    metaverseHubShorelineEnvironmentAssetId
  );

  assert.notEqual(shorelineSurfaceAsset, null);
  assert.equal(shorelineSurfaceAsset?.placement, "static");
  assert.equal(shorelineSurfaceAsset?.placements.length, 1);
  assert.equal(
    shorelineSurfaceAsset?.surfaceColliders.filter(
      (collider) => collider.traversalAffordance === "support"
    ).length,
    3
  );
  assert.equal(
    shorelineSurfaceAsset?.surfaceColliders.filter(
      (collider) => collider.traversalAffordance === "blocker"
    ).length,
    3
  );
});

test("shared metaverse surface policy keeps dock support, open water, shoreline exit, and side-lane swim distinct", () => {
  const dockDecision = resolveMetaverseWorldAutomaticSurfaceLocomotion(
    metaverseSurfacePolicyConfig,
    staticSurfaceColliders,
    {
      x: -8.2,
      y: 0.15,
      z: -14.8
    },
    Math.PI * 0.06,
    "grounded"
  );
  const openWaterDecision = resolveMetaverseWorldAutomaticSurfaceLocomotion(
    metaverseSurfacePolicyConfig,
    staticSurfaceColliders,
    {
      x: -8.2,
      y: 0,
      z: -20
    },
    Math.PI * 0.06,
    "swim"
  );
  const shorelineExitDecision = resolveMetaverseWorldAutomaticSurfaceLocomotion(
    metaverseSurfacePolicyConfig,
    staticSurfaceColliders,
    {
      x: -8.45,
      y: 0,
      z: -24
    },
    Math.PI * 0.06,
    "swim"
  );
  const blockedSideDecision = resolveMetaverseWorldAutomaticSurfaceLocomotion(
    metaverseSurfacePolicyConfig,
    staticSurfaceColliders,
    {
      x: -4.2,
      y: 0,
      z: -23.5
    },
    Math.PI * 0.06,
    "swim"
  );

  assert.equal(dockDecision.decision.locomotionMode, "grounded");
  assert.equal(dockDecision.debug.reason, "grounded-hold");

  assert.equal(openWaterDecision.decision.locomotionMode, "swim");
  assert.equal(openWaterDecision.debug.reason, "shoreline-exit-blocked");
  assert.equal(openWaterDecision.debug.blockerOverlap, false);

  assert.equal(shorelineExitDecision.decision.locomotionMode, "grounded");
  assert.equal(shorelineExitDecision.debug.reason, "shoreline-exit-success");

  assert.equal(blockedSideDecision.decision.locomotionMode, "swim");
  assert.equal(blockedSideDecision.debug.reason, "shoreline-exit-blocked");
  assert.equal(blockedSideDecision.debug.blockerOverlap, false);
  assert.ok(blockedSideDecision.debug.stepSupportedProbeCount > 0);
});
