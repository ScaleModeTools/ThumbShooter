import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { stagingGroundMapBundle } from "@webgpu-metaverse/shared/metaverse/world";

import { MetaverseWorldPreviewHttpAdapter } from "../../../../server/dist/metaverse/adapters/metaverse-world-preview-http-adapter.js";
import { createMetaverseAuthoritativeWorldBundleInputs } from "../../../../server/dist/metaverse/world/map-bundles/metaverse-authoritative-world-bundle-inputs.js";
import {
  loadAuthoritativeMetaverseMapBundle,
  registerAuthoritativeMetaverseMapBundlePreview
} from "../../../../server/dist/metaverse/world/map-bundles/load-authoritative-metaverse-map-bundle.js";

function createPreviewBundle(mapId) {
  return Object.freeze({
    ...stagingGroundMapBundle,
    gameplayProfileId: "shell-arcade-gameplay",
    label: `Preview ${mapId}`,
    mapId,
    playerSpawnNodes: Object.freeze(
      stagingGroundMapBundle.playerSpawnNodes.map((spawnNode, spawnIndex) =>
        spawnIndex === 0
          ? Object.freeze({
              ...spawnNode,
              position: Object.freeze({
                ...spawnNode.position,
                x: spawnNode.position.x + 18,
                y: spawnNode.position.y + 2.75
              })
            })
          : spawnNode
      )
    ),
    waterRegions: Object.freeze(
      stagingGroundMapBundle.waterRegions.map((waterRegion, waterRegionIndex) =>
        waterRegionIndex === 0
          ? Object.freeze({
              ...waterRegion,
              center: Object.freeze({
                ...waterRegion.center,
                z: waterRegion.center.z + 12
              })
            })
          : waterRegion
      )
    )
  });
}

function createResponseCapture() {
  let body = "";
  let statusCode = null;

  return {
    end(chunk = "") {
      body = String(chunk);
    },
    get json() {
      return body.length === 0 ? null : JSON.parse(body);
    },
    get statusCode() {
      return statusCode;
    },
    setHeader() {},
    writeHead(nextStatusCode) {
      statusCode = nextStatusCode;
    }
  };
}

function createJsonRequest(payload) {
  return {
    method: "POST",
    on(eventName, listener) {
      if (eventName === "data") {
        listener(JSON.stringify(payload));
      }

      if (eventName === "end") {
        listener();
      }
    }
  };
}

test("authoritative preview registration derives spawn and water inputs from the registered bundle instead of the shipped staging-ground defaults", () => {
  const previewBundle = createPreviewBundle("server-preview-registration-test");
  const previewEntry = registerAuthoritativeMetaverseMapBundlePreview(
    previewBundle,
    "staging-ground"
  );
  const loadedPreviewBundle = loadAuthoritativeMetaverseMapBundle(
    "server-preview-registration-test"
  );
  const previewInputs = createMetaverseAuthoritativeWorldBundleInputs(
    "server-preview-registration-test"
  );

  assert.equal(previewEntry.bundleId, "server-preview-registration-test");
  assert.equal(previewEntry.sourceBundleId, "staging-ground");
  assert.equal(loadedPreviewBundle.bundle.label, "Preview server-preview-registration-test");
  assert.equal(previewInputs.gameplayProfile.id, "shell-arcade-gameplay");
  assert.deepEqual(
    previewInputs.defaultSpawn.position,
    previewBundle.playerSpawnNodes[0].position
  );
  assert.equal(
    previewInputs.waterRegionSnapshots[0]?.translation.z,
    previewBundle.waterRegions[0]?.center.z
  );
});

test("MetaverseWorldPreviewHttpAdapter registers preview bundles for later room launches", async () => {
  const adapter = new MetaverseWorldPreviewHttpAdapter();
  const previewBundle = createPreviewBundle("server-preview-http-adapter-test");
  const response = createResponseCapture();
  const handled = await adapter.handleRequest(
    createJsonRequest({
      bundle: previewBundle,
      sourceBundleId: "staging-ground"
    }),
    response,
    new URL("http://127.0.0.1:3210/metaverse/world/preview-bundles")
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.equal(response.json.status, "registered");
  assert.equal(response.json.bundleId, "server-preview-http-adapter-test");
  assert.equal(response.json.sourceBundleId, "staging-ground");
  assert.equal(
    loadAuthoritativeMetaverseMapBundle("server-preview-http-adapter-test").bundle
      .mapId,
    "server-preview-http-adapter-test"
  );
});

test("MetaverseWorldPreviewHttpAdapter persists public map bundles for authoring projects", async () => {
  const publicProjectRootPath = mkdtempSync(
    join(tmpdir(), "webgpu-metaverse-public-map-")
  );
  const adapter = new MetaverseWorldPreviewHttpAdapter({
    publicProjectRootPath
  });
  const previewBundle = createPreviewBundle("server-public-map-bundle-test");
  const response = createResponseCapture();

  try {
    const handled = await adapter.handleRequest(
      createJsonRequest({
        bundle: previewBundle,
        mapEditorProjectSettings: Object.freeze({
          helperGridSizeMeters: 320
        }),
        sourceBundleId: "staging-ground"
      }),
      response,
      new URL("http://127.0.0.1:3210/metaverse/world/public-map-bundles")
    );

    assert.equal(handled, true);
    assert.equal(response.statusCode, 200);
    assert.equal(response.json.status, "persisted");
    assert.equal(response.json.bundleId, "server-public-map-bundle-test");
    assert.equal(
      response.json.path,
      "/map-editor/projects/server-public-map-bundle-test.json"
    );

    const savedBundle = JSON.parse(
      readFileSync(
        join(publicProjectRootPath, "server-public-map-bundle-test.json"),
        "utf8"
      )
    );
    const savedManifest = JSON.parse(
      readFileSync(join(publicProjectRootPath, "manifest.json"), "utf8")
    );

    assert.equal(savedBundle.mapId, "server-public-map-bundle-test");
    assert.equal(savedBundle.label, "Preview server-public-map-bundle-test");
    assert.equal(savedManifest.version, 1);
    assert.deepEqual(savedManifest.projects.map((entry) => entry.bundleId), [
      "server-public-map-bundle-test"
    ]);
    assert.equal(
      savedManifest.projects[0]?.mapEditorProjectSettings?.helperGridSizeMeters,
      320
    );
    assert.equal(
      loadAuthoritativeMetaverseMapBundle("server-public-map-bundle-test").bundle
        .mapId,
      "server-public-map-bundle-test"
    );
  } finally {
    rmSync(publicProjectRootPath, {
      force: true,
      recursive: true
    });
  }
});

test("authoritative preview inputs expose compiled procedural structures as static colliders", () => {
  const previewBundle = Object.freeze({
    ...createPreviewBundle("server-preview-procedural-structure-test"),
    compiledWorld: null,
    semanticWorld: Object.freeze({
      ...stagingGroundMapBundle.semanticWorld,
      structures: Object.freeze([
        Object.freeze({
          center: Object.freeze({ x: 80, y: 4, z: -40 }),
          grid: Object.freeze({
            cellX: 20,
            cellZ: -10,
            cellsX: 2,
            cellsZ: 1,
            layer: 1
          }),
          label: "Authoritative Wall",
          materialId: "concrete",
          rotationYRadians: 0,
          size: Object.freeze({ x: 8, y: 4, z: 1 }),
          structureId: "authoritative-wall",
          structureKind: "wall",
          traversalAffordance: "blocker"
        })
      ])
    })
  });

  registerAuthoritativeMetaverseMapBundlePreview(previewBundle, "staging-ground");

  const previewInputs = createMetaverseAuthoritativeWorldBundleInputs(
    "server-preview-procedural-structure-test"
  );
  const proceduralCollider = previewInputs.staticSurfaceColliders.find(
    (collider) =>
      collider.ownerEnvironmentAssetId === null &&
      collider.translation.x === 80 &&
      collider.translation.z === -40
  );

  assert.notEqual(proceduralCollider, undefined);
  assert.equal(proceduralCollider?.traversalAffordance, "blocker");
  assert.equal(proceduralCollider?.halfExtents.y, 2);
});

test("authoritative preview inputs expose compiled terrain as heightfield support", () => {
  const previewBundle = Object.freeze({
    ...createPreviewBundle("server-preview-terrain-patch-test"),
    compiledWorld: null,
    semanticWorld: Object.freeze({
      ...stagingGroundMapBundle.semanticWorld,
      terrainPatches: Object.freeze([
        Object.freeze({
          grid: Object.freeze({
            cellX: 24,
            cellZ: -12,
            cellsX: 1,
            cellsZ: 1,
            layer: 0
          }),
          heightSamples: Object.freeze([0, 0.75, 0.25, 1]),
          label: "Authoritative Terrain",
          materialLayers: Object.freeze([
            Object.freeze({
              layerId: "authoritative-terrain:terrain-rock",
              materialId: "terrain-rock",
              weightSamples: Object.freeze([1, 1, 1, 1])
            })
          ]),
          origin: Object.freeze({ x: 96, y: 0, z: -48 }),
          rotationYRadians: 0,
          sampleCountX: 2,
          sampleCountZ: 2,
          sampleSpacingMeters: 4,
          terrainPatchId: "authoritative-terrain",
          waterLevelMeters: null
        })
      ])
    })
  });

  registerAuthoritativeMetaverseMapBundlePreview(previewBundle, "staging-ground");

  const previewInputs = createMetaverseAuthoritativeWorldBundleInputs(
    "server-preview-terrain-patch-test"
  );
  const terrainCollider = previewInputs.staticSurfaceColliders.find(
    (collider) =>
      collider.ownerEnvironmentAssetId === null &&
      collider.shape === "heightfield" &&
      collider.translation.x === 96 &&
      collider.translation.z === -48
  );

  assert.notEqual(terrainCollider, undefined);
  assert.equal(terrainCollider?.traversalAffordance, "support");
  assert.equal(terrainCollider?.sampleCountX, 2);
  assert.equal(terrainCollider?.sampleCountZ, 2);
  assert.equal(terrainCollider?.heightSamples?.length, 4);
});
