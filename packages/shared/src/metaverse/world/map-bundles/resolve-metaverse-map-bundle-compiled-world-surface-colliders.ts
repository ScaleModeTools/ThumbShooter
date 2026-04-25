import {
  createMetaverseWorldPlacedSurfaceHeightfieldSupportSnapshot,
  createMetaverseWorldPlacedSurfaceTriMeshSnapshot,
  type MetaverseWorldPlacedSurfaceColliderSnapshot,
  type MetaverseWorldSurfaceQuaternionSnapshot,
  type MetaverseWorldSurfaceVector3Snapshot
} from "../../metaverse-world-surface-query.js";

import type {
  MetaverseMapBundleCompiledCollisionBoxSnapshot,
  MetaverseMapBundleCompiledCollisionHeightfieldSnapshot,
  MetaverseMapBundleCompiledCollisionTriMeshSnapshot,
  MetaverseMapBundleCompiledWorldSnapshot
} from "./metaverse-map-bundle.js";

function freezeVector3(
  x: number,
  y: number,
  z: number
): MetaverseWorldSurfaceVector3Snapshot {
  return Object.freeze({
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
    z: Number.isFinite(z) ? z : 0
  });
}

function freezeQuaternion(
  x: number,
  y: number,
  z: number,
  w: number
): MetaverseWorldSurfaceQuaternionSnapshot {
  const magnitude = Math.hypot(x, y, z, w);

  if (magnitude <= 0.000001) {
    return Object.freeze({
      x: 0,
      y: 0,
      z: 0,
      w: 1
    });
  }

  return Object.freeze({
    x: x / magnitude,
    y: y / magnitude,
    z: z / magnitude,
    w: w / magnitude
  });
}

function createYawQuaternion(
  rotationYRadians: number
): MetaverseWorldSurfaceQuaternionSnapshot {
  const halfAngle = rotationYRadians * 0.5;

  return freezeQuaternion(0, Math.sin(halfAngle), 0, Math.cos(halfAngle));
}

function resolveCompiledCollisionBoxSurfaceCollider(
  box: MetaverseMapBundleCompiledCollisionBoxSnapshot
): MetaverseWorldPlacedSurfaceColliderSnapshot {
  return Object.freeze({
    halfExtents: freezeVector3(
      Math.max(0.01, Math.abs(box.size.x) * 0.5),
      Math.max(0.01, Math.abs(box.size.y) * 0.5),
      Math.max(0.01, Math.abs(box.size.z) * 0.5)
    ),
    ownerEnvironmentAssetId: null,
    rotation: createYawQuaternion(box.rotationYRadians),
    rotationYRadians: box.rotationYRadians,
    shape: "box",
    translation: freezeVector3(box.center.x, box.center.y, box.center.z),
    traversalAffordance: box.traversalAffordance
  });
}

function resolveCompiledCollisionHeightfieldSurfaceCollider(
  heightfield: MetaverseMapBundleCompiledCollisionHeightfieldSnapshot
): MetaverseWorldPlacedSurfaceColliderSnapshot | null {
  return createMetaverseWorldPlacedSurfaceHeightfieldSupportSnapshot(
    null,
    {
      heightSamples: heightfield.heightSamples,
      sampleCountX: heightfield.sampleCountX,
      sampleCountZ: heightfield.sampleCountZ,
      sampleSpacingMeters: heightfield.sampleSpacingMeters
    },
    {
      position: heightfield.translation,
      yawRadians: heightfield.rotationYRadians
    }
  );
}

function resolveCompiledCollisionTriMeshSurfaceCollider(
  triMesh: MetaverseMapBundleCompiledCollisionTriMeshSnapshot
): MetaverseWorldPlacedSurfaceColliderSnapshot | null {
  return createMetaverseWorldPlacedSurfaceTriMeshSnapshot(
    null,
    {
      indices: Uint32Array.from(triMesh.indices),
      vertices: Float32Array.from(triMesh.vertices)
    },
    {
      position: triMesh.translation,
      yawRadians: triMesh.rotationYRadians
    },
    triMesh.traversalAffordance
  );
}

export function resolveMetaverseMapBundleCompiledWorldSurfaceColliders(
  compiledWorld: MetaverseMapBundleCompiledWorldSnapshot
): readonly MetaverseWorldPlacedSurfaceColliderSnapshot[] {
  const dynamicModuleOwnerIds = new Set(
    compiledWorld.compatibilityEnvironmentAssets.flatMap((environmentAsset) =>
      environmentAsset.placementMode === "dynamic"
        ? environmentAsset.placements.map((placement) => placement.placementId)
        : []
    )
  );

  return Object.freeze(
    compiledWorld.chunks.flatMap((chunk) => [
      ...chunk.collision.boxes.flatMap((box) =>
        box.ownerKind === "module" && dynamicModuleOwnerIds.has(box.ownerId)
          ? []
          : [resolveCompiledCollisionBoxSurfaceCollider(box)]
      ),
      ...chunk.collision.heightfields.flatMap((heightfield) => {
        const collider =
          resolveCompiledCollisionHeightfieldSurfaceCollider(heightfield);

        return collider === null ? [] : [collider];
      }),
      ...chunk.collision.triMeshes.flatMap((triMesh) => {
        const collider = resolveCompiledCollisionTriMeshSurfaceCollider(triMesh);

        return collider === null ? [] : [collider];
      })
    ])
  );
}
