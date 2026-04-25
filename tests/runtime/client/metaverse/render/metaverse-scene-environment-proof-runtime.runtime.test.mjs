import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { createClientModuleLoader } from "../../load-client-module.mjs";
import {
  createSkiffMountProofSlice
} from "../../metaverse-runtime-proof-slice-fixtures.mjs";

let clientLoader;

before(async () => {
  clientLoader = await createClientModuleLoader();
});

after(async () => {
  await clientLoader?.close();
});

function findNamedNode(scene, nodeName, label) {
  const node = scene.getObjectByName(nodeName);

  assert.ok(node, `${label} should include node ${nodeName}.`);

  return node;
}

test("loadMetaverseEnvironmentProofRuntime does not create a scene asset loader for fully procedural support assets", async () => {
  const { loadMetaverseEnvironmentProofRuntime } = await clientLoader.load(
    "/src/metaverse/render/environment/metaverse-scene-environment-proof-loader.ts"
  );
  let sceneAssetLoaderCreated = false;

  const runtime = await loadMetaverseEnvironmentProofRuntime(
    {
      assets: [
        {
          collisionPath: null,
          collider: null,
          entries: null,
          environmentAssetId: "metaverse-playground-range-floor-v1",
          label: "Metaverse playground range floor",
          lods: [
            {
              kind: "procedural-box",
              materialPreset: "training-range-surface",
              maxDistanceMeters: null,
              size: { x: 72, y: 0.6, z: 82 },
              tier: "high"
            }
          ],
          orientation: null,
          physicsColliders: null,
          placement: "static",
          placements: [
            {
              position: { x: 0, y: 0, z: 0 },
              rotationYRadians: 0,
              scale: 1
            }
          ],
          seats: null,
          traversalAffordance: "support"
        }
      ]
    },
    () => {
      sceneAssetLoaderCreated = true;
      throw new Error("Procedural support assets should not create a scene asset loader.");
    },
    () => {
      throw new Error("Static procedural support assets should not resolve authored nodes.");
    },
    false
  );

  assert.equal(sceneAssetLoaderCreated, false);
  assert.equal(runtime.staticPlacements.length, 1);
  assert.equal(runtime.dynamicAssets.length, 0);
  assert.equal(runtime.instancedAssets.length, 0);
});

test("loadMetaverseEnvironmentProofRuntime applies authored semantic materials to procedural asset placements", async () => {
  const { loadMetaverseEnvironmentProofRuntime } = await clientLoader.load(
    "/src/metaverse/render/environment/metaverse-scene-environment-proof-loader.ts"
  );
  const runtime = await loadMetaverseEnvironmentProofRuntime(
    {
      assets: [
        {
          collisionPath: null,
          collider: null,
          dynamicBody: null,
          entries: null,
          environmentAssetId: "materialized-procedural-floor",
          label: "Materialized procedural floor",
          lods: [
            {
              kind: "procedural-box",
              materialPreset: "training-range-surface",
              maxDistanceMeters: null,
              size: { x: 4, y: 0.5, z: 4 },
              tier: "high"
            }
          ],
          orientation: null,
          physicsColliders: null,
          placement: "instanced",
          placements: [
            {
              materialReferenceId: "glass",
              position: { x: 0, y: 0, z: 0 },
              rotationYRadians: 0,
              scale: 1
            },
            {
              materialReferenceId: "metal",
              position: { x: 6, y: 0, z: 0 },
              rotationYRadians: 0,
              scale: 1
            }
          ],
          seats: null,
          traversalAffordance: "support"
        }
      ],
      gameplayVolumes: [],
      lights: [],
      materialDefinitions: [],
      proceduralStructures: [],
      surfaceMeshes: [],
      terrainPatches: []
    },
    () => {
      throw new Error("Procedural support assets should not create a scene asset loader.");
    },
    () => {
      throw new Error("Procedural support assets should not resolve authored nodes.");
    },
    false
  );
  const meshes = [];

  runtime.anchorGroup.traverse((node) => {
    if (node.isMesh === true) {
      meshes.push(node);
    }
  });

  const glassMesh = meshes.find(
    (mesh) => mesh.material?.transmissionNode !== undefined
  );
  const metalMesh = meshes.find(
    (mesh) => mesh.material?.metalnessNode !== undefined &&
      mesh.material?.transmissionNode === undefined
  );

  assert.equal(runtime.instancedAssets.length, 1);
  assert.ok(meshes.length >= 2);
  assert.ok(glassMesh);
  assert.equal(glassMesh.material.transparent, true);
  assert.equal(glassMesh.material.alphaHash, false);
  assert.equal(glassMesh.material.depthWrite, false);
  assert.notEqual(glassMesh.material.map ?? null, null);
  assert.ok(metalMesh);
  assert.notEqual(metalMesh.material.map ?? null, null);
});

test("loadMetaverseEnvironmentProofRuntime renders authored terrain and surface meshes with shared semantic textures", async () => {
  const { loadMetaverseEnvironmentProofRuntime } = await clientLoader.load(
    "/src/metaverse/render/environment/metaverse-scene-environment-proof-loader.ts"
  );
  const runtime = await loadMetaverseEnvironmentProofRuntime(
    {
      assets: [],
      gameplayVolumes: [],
      lights: [],
      proceduralStructures: [
        {
          center: { x: 0, y: 0, z: 24 },
          materialId: "metal",
          materialReferenceId: null,
          rotationYRadians: 0,
          size: { x: 8, y: 4, z: 4 },
          structureId: "metal-structure",
          structureKind: "cover",
          traversalAffordance: "blocker"
        }
      ],
      surfaceMeshes: [
        {
          indices: [0, 1, 2, 0, 2, 3],
          materialId: "concrete",
          materialReferenceId: "shell-floor-grid",
          regionId: "floor-region",
          regionKind: "floor",
          rotationYRadians: 0,
          translation: { x: 0, y: 0, z: 0 },
          vertices: [-4, 0, -4, 4, 0, -4, 4, 0, 4, -4, 0, 4]
        }
      ],
      terrainPatches: [
        {
          heightSamples: [0, 1, 0.25, 0.5],
          materialLayers: [
            {
              layerId: "terrain:grass",
              materialId: "terrain-grass",
              weightSamples: [1, 0.6, 1, 0.3]
            },
            {
              layerId: "terrain:rock",
              materialId: "terrain-rock",
              weightSamples: [0, 0.4, 0, 0.7]
            }
          ],
          origin: { x: 0, y: 0, z: 12 },
          rotationYRadians: 0,
          sampleCountX: 2,
          sampleCountZ: 2,
          sampleSpacingMeters: 4,
          terrainPatchId: "terrain-patch",
          waterLevelMeters: null
        }
      ]
    },
    () => {
      throw new Error("Semantic proof-only geometry should not create a scene asset loader.");
    },
    () => {
      throw new Error("Semantic proof-only geometry should not resolve authored nodes.");
    },
    false
  );
  const terrainMesh = findNamedNode(
    runtime.anchorGroup,
    "metaverse_environment_terrain_patch/terrain-patch/mesh",
    "runtime"
  );
  const surfaceMesh = findNamedNode(
    runtime.anchorGroup,
    "metaverse_environment_surface_mesh/floor-region/mesh",
    "runtime"
  );
  const structureMesh = findNamedNode(
    runtime.anchorGroup,
    "metaverse_environment_procedural_structure/metal-structure/mesh",
    "runtime"
  );

  assert.notEqual(terrainMesh.material.map ?? null, null);
  assert.notEqual(surfaceMesh.material.map ?? null, null);
  assert.notEqual(structureMesh.material.map ?? null, null);
  assert.notEqual(terrainMesh.geometry.getAttribute("uv") ?? null, null);
  assert.notEqual(surfaceMesh.geometry.getAttribute("uv") ?? null, null);
});

test("syncEnvironmentProofRuntime applies dynamic pose overrides through the loaded mount runtime", async () => {
  const [
    { loadMetaverseEnvironmentProofRuntime },
    { resolveDynamicEnvironmentBasePose, syncEnvironmentProofRuntime },
    { resolveEnvironmentRenderYawFromSimulationYaw }
  ] = await Promise.all([
    clientLoader.load(
      "/src/metaverse/render/environment/metaverse-scene-environment-proof-loader.ts"
    ),
    clientLoader.load(
      "/src/metaverse/render/environment/metaverse-scene-environment-proof-runtime.ts"
    ),
    clientLoader.load(
      "/src/metaverse/traversal/presentation/mount-presentation.ts"
    )
  ]);
  const { createSceneAssetLoader, environmentProofConfig } =
    await createSkiffMountProofSlice();
  const runtime = await loadMetaverseEnvironmentProofRuntime(
    environmentProofConfig,
    createSceneAssetLoader,
    findNamedNode,
    false
  );
  const skiffRuntime = runtime.dynamicAssets.find(
    (candidate) => candidate.environmentAssetId === "metaverse-hub-skiff-v1"
  );

  assert.ok(skiffRuntime);
  assert.ok((skiffRuntime.entries?.length ?? 0) >= 1);
  assert.ok((skiffRuntime.seats?.length ?? 0) >= 1);
  assert.equal(
    resolveDynamicEnvironmentBasePose(skiffRuntime, new Map()).yawRadians,
    skiffRuntime.basePlacement.rotationYRadians
  );
  assert.ok(
    Math.abs(
      skiffRuntime.anchorGroup.rotation.y -
        resolveEnvironmentRenderYawFromSimulationYaw(
          skiffRuntime,
          skiffRuntime.basePlacement.rotationYRadians
        )
    ) < 0.0001
  );

  syncEnvironmentProofRuntime(
    runtime,
    {
      lookDirection: { x: 0, y: 0, z: -1 },
      pitchRadians: 0,
      position: { x: 0, y: 1.62, z: 28 },
      yawRadians: 0
    },
    1_000,
    new Map([
      [
        "metaverse-hub-skiff-v1",
        Object.freeze({
          position: Object.freeze({ x: 0, y: 0.12, z: 24 }),
          yawRadians: 0.4
        })
      ]
    ])
  );

  assert.equal(skiffRuntime.anchorGroup.position.x, 0);
  assert.equal(skiffRuntime.anchorGroup.position.y, 0.12);
  assert.equal(skiffRuntime.anchorGroup.position.z, 24);
  assert.ok(
    Math.abs(
      skiffRuntime.anchorGroup.rotation.y -
        resolveEnvironmentRenderYawFromSimulationYaw(skiffRuntime, 0.4)
    ) < 0.0001
  );
  assert.notEqual(skiffRuntime.presentationGroup.position.y, 0);
});
