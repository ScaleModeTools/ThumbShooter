interface MetaverseAuthoritativeVector3Snapshot {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

interface MetaverseAuthoritativeWorldSurfaceColliderDefinition {
  readonly center: MetaverseAuthoritativeVector3Snapshot;
  readonly size: MetaverseAuthoritativeVector3Snapshot;
  readonly traversalAffordance: "blocker" | "support";
}

interface MetaverseAuthoritativeWorldSurfacePlacement {
  readonly position: MetaverseAuthoritativeVector3Snapshot;
  readonly rotationYRadians: number;
  readonly scale: number;
}

interface MetaverseAuthoritativeStaticWorldSurfaceAssetDefinition {
  readonly colliders: readonly MetaverseAuthoritativeWorldSurfaceColliderDefinition[];
  readonly environmentAssetId: string;
  readonly placements: readonly MetaverseAuthoritativeWorldSurfacePlacement[];
}

interface MetaverseAuthoritativeDynamicWorldSurfaceAssetDefinition {
  readonly colliders: readonly MetaverseAuthoritativeWorldSurfaceColliderDefinition[];
  readonly environmentAssetId: string;
  readonly scale: number;
}

export interface MetaverseAuthoritativeSurfaceColliderSnapshot {
  readonly halfExtents: MetaverseAuthoritativeVector3Snapshot;
  readonly ownerEnvironmentAssetId: string | null;
  readonly rotationYRadians: number;
  readonly translation: MetaverseAuthoritativeVector3Snapshot;
  readonly traversalAffordance: "blocker" | "support";
}

const emptyMetaverseAuthoritativeSurfaceColliders = Object.freeze(
  []
) as readonly MetaverseAuthoritativeSurfaceColliderSnapshot[];

function freezeVector3(
  x: number,
  y: number,
  z: number
): MetaverseAuthoritativeVector3Snapshot {
  return Object.freeze({
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
    z: Number.isFinite(z) ? z : 0
  });
}

function applyPlacementToLocalCenter(
  localCenter: MetaverseAuthoritativeWorldSurfaceColliderDefinition["center"],
  placement: MetaverseAuthoritativeWorldSurfacePlacement
): MetaverseAuthoritativeVector3Snapshot {
  const scaledCenterX = localCenter.x * placement.scale;
  const scaledCenterY = localCenter.y * placement.scale;
  const scaledCenterZ = localCenter.z * placement.scale;
  const sine = Math.sin(placement.rotationYRadians);
  const cosine = Math.cos(placement.rotationYRadians);

  return freezeVector3(
    placement.position.x + scaledCenterX * cosine + scaledCenterZ * sine,
    placement.position.y + scaledCenterY,
    placement.position.z - scaledCenterX * sine + scaledCenterZ * cosine
  );
}

function createPlacedSurfaceColliderSnapshot(
  environmentAssetId: string,
  collider: MetaverseAuthoritativeWorldSurfaceColliderDefinition,
  placement: MetaverseAuthoritativeWorldSurfacePlacement
): MetaverseAuthoritativeSurfaceColliderSnapshot {
  return Object.freeze({
    halfExtents: freezeVector3(
      Math.abs(collider.size.x * placement.scale) * 0.5,
      Math.abs(collider.size.y * placement.scale) * 0.5,
      Math.abs(collider.size.z * placement.scale) * 0.5
    ),
    ownerEnvironmentAssetId: environmentAssetId,
    rotationYRadians: placement.rotationYRadians,
    translation: applyPlacementToLocalCenter(collider.center, placement),
    traversalAffordance: collider.traversalAffordance
  });
}

const metaverseHubCrateSurfaceColliders = Object.freeze([
  Object.freeze({
    center: freezeVector3(0, 0, 0),
    size: freezeVector3(0.92, 0.92, 0.92),
    traversalAffordance: "blocker"
  })
] satisfies readonly MetaverseAuthoritativeWorldSurfaceColliderDefinition[]);

const metaverseHubDockSurfaceColliders = Object.freeze([
  Object.freeze({
    center: freezeVector3(0, 0, 0),
    size: freezeVector3(8.4, 0.34, 4.2),
    traversalAffordance: "support"
  })
] satisfies readonly MetaverseAuthoritativeWorldSurfaceColliderDefinition[]);

const metaverseHubSkiffSurfaceColliders = Object.freeze([
  Object.freeze({
    center: freezeVector3(0, 0.28, 0),
    size: freezeVector3(5.8, 0.56, 2.6),
    traversalAffordance: "blocker"
  }),
  Object.freeze({
    center: freezeVector3(0, 0.62, 0),
    size: freezeVector3(5.2, 0.12, 2),
    traversalAffordance: "support"
  }),
  Object.freeze({
    center: freezeVector3(1.35, 0.94, 0),
    size: freezeVector3(0.9, 0.18, 0.8),
    traversalAffordance: "support"
  }),
  Object.freeze({
    center: freezeVector3(1.72, 1.18, 0),
    size: freezeVector3(0.62, 0.58, 0.84),
    traversalAffordance: "blocker"
  }),
  Object.freeze({
    center: freezeVector3(0, 0.92, -0.74),
    size: freezeVector3(2.6, 0.16, 0.52),
    traversalAffordance: "support"
  }),
  Object.freeze({
    center: freezeVector3(0, 1.12, -0.88),
    size: freezeVector3(2.6, 0.42, 0.24),
    traversalAffordance: "blocker"
  }),
  Object.freeze({
    center: freezeVector3(0, 0.92, 0.74),
    size: freezeVector3(2.6, 0.16, 0.52),
    traversalAffordance: "support"
  }),
  Object.freeze({
    center: freezeVector3(0, 1.12, 0.88),
    size: freezeVector3(2.6, 0.42, 0.24),
    traversalAffordance: "blocker"
  })
] satisfies readonly MetaverseAuthoritativeWorldSurfaceColliderDefinition[]);

const metaverseHubDiveBoatSurfaceColliders = Object.freeze([
  Object.freeze({
    center: freezeVector3(0, 0.28, 0),
    size: freezeVector3(10.8, 0.56, 3.6),
    traversalAffordance: "blocker"
  }),
  Object.freeze({
    center: freezeVector3(0, 0.64, 0),
    size: freezeVector3(9.8, 0.12, 2.6),
    traversalAffordance: "support"
  }),
  Object.freeze({
    center: freezeVector3(-4.2, 0.64, 0),
    size: freezeVector3(1.6, 0.12, 2.2),
    traversalAffordance: "support"
  }),
  Object.freeze({
    center: freezeVector3(2.6, 0.96, 0.52),
    size: freezeVector3(1.1, 0.16, 0.9),
    traversalAffordance: "support"
  }),
  Object.freeze({
    center: freezeVector3(-0.3, 0.92, -1.02),
    size: freezeVector3(5.8, 0.16, 0.56),
    traversalAffordance: "support"
  }),
  Object.freeze({
    center: freezeVector3(-0.3, 1.14, -1.18),
    size: freezeVector3(5.8, 0.46, 0.26),
    traversalAffordance: "blocker"
  }),
  Object.freeze({
    center: freezeVector3(-0.3, 0.92, 1.02),
    size: freezeVector3(5.8, 0.16, 0.56),
    traversalAffordance: "support"
  }),
  Object.freeze({
    center: freezeVector3(-0.3, 1.14, 1.18),
    size: freezeVector3(5.8, 0.46, 0.26),
    traversalAffordance: "blocker"
  }),
  Object.freeze({
    center: freezeVector3(3.15, 1.18, 0.45),
    size: freezeVector3(0.9, 0.72, 0.92),
    traversalAffordance: "blocker"
  })
] satisfies readonly MetaverseAuthoritativeWorldSurfaceColliderDefinition[]);

const metaverseAuthoritativeStaticWorldSurfaceAssets = Object.freeze([
  Object.freeze({
    colliders: metaverseHubDockSurfaceColliders,
    environmentAssetId: "metaverse-hub-dock-v1",
    placements: Object.freeze([
      Object.freeze({
        position: freezeVector3(-8.2, -0.02, -14.8),
        rotationYRadians: Math.PI * 0.06,
        scale: 1
      })
    ])
  }),
  Object.freeze({
    colliders: metaverseHubCrateSurfaceColliders,
    environmentAssetId: "metaverse-hub-crate-v1",
    placements: Object.freeze([
      Object.freeze({
        position: freezeVector3(-9.5, 0, -10.5),
        rotationYRadians: Math.PI * 0.08,
        scale: 1
      }),
      Object.freeze({
        position: freezeVector3(-8, 0, -12.2),
        rotationYRadians: Math.PI * 0.17,
        scale: 0.96
      }),
      Object.freeze({
        position: freezeVector3(-6.4, 0, -11),
        rotationYRadians: Math.PI * 0.28,
        scale: 1.08
      }),
      Object.freeze({
        position: freezeVector3(-7.1, 0, -8.8),
        rotationYRadians: Math.PI * -0.12,
        scale: 0.92
      })
    ])
  })
] satisfies readonly MetaverseAuthoritativeStaticWorldSurfaceAssetDefinition[]);

const metaverseAuthoritativeDynamicWorldSurfaceAssets = new Map<
  string,
  MetaverseAuthoritativeDynamicWorldSurfaceAssetDefinition
>(
  [
    Object.freeze({
      colliders: metaverseHubSkiffSurfaceColliders,
      environmentAssetId: "metaverse-hub-skiff-v1",
      scale: 1
    }),
    Object.freeze({
      colliders: metaverseHubDiveBoatSurfaceColliders,
      environmentAssetId: "metaverse-hub-dive-boat-v1",
      scale: 1
    })
  ].map((asset) => [asset.environmentAssetId, asset])
);

export const metaverseAuthoritativeStaticSurfaceColliders = Object.freeze(
  metaverseAuthoritativeStaticWorldSurfaceAssets.flatMap((environmentAsset) =>
    environmentAsset.placements.flatMap((placement) =>
      environmentAsset.colliders.map((collider) =>
        createPlacedSurfaceColliderSnapshot(
          environmentAsset.environmentAssetId,
          collider,
          placement
        )
      )
    )
  )
) satisfies readonly MetaverseAuthoritativeSurfaceColliderSnapshot[];

export function resolveMetaverseAuthoritativeDynamicSurfaceColliders(
  environmentAssetId: string,
  poseSnapshot: {
    readonly position: MetaverseAuthoritativeVector3Snapshot;
    readonly yawRadians: number;
  }
): readonly MetaverseAuthoritativeSurfaceColliderSnapshot[] {
  const dynamicEnvironmentAsset =
    metaverseAuthoritativeDynamicWorldSurfaceAssets.get(environmentAssetId);

  if (dynamicEnvironmentAsset === undefined) {
    return emptyMetaverseAuthoritativeSurfaceColliders;
  }

  const placement = Object.freeze({
    position: freezeVector3(
      poseSnapshot.position.x,
      poseSnapshot.position.y,
      poseSnapshot.position.z
    ),
    rotationYRadians: poseSnapshot.yawRadians,
    scale: dynamicEnvironmentAsset.scale
  } satisfies MetaverseAuthoritativeWorldSurfacePlacement);

  return Object.freeze(
    dynamicEnvironmentAsset.colliders.map((collider) =>
      createPlacedSurfaceColliderSnapshot(
        dynamicEnvironmentAsset.environmentAssetId,
        collider,
        placement
      )
    )
  );
}
