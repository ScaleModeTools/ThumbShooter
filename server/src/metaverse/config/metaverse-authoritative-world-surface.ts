import {
  metaverseWorldStaticSurfaceAssets,
  resolveMetaverseWorldDynamicSurfaceColliders,
  resolveMetaverseWorldPlacedSurfaceColliders,
  type MetaverseWorldPlacedSurfaceColliderSnapshot,
  type MetaverseWorldSurfaceVector3Snapshot
} from "@webgpu-metaverse/shared";

export type MetaverseAuthoritativeSurfaceColliderSnapshot =
  MetaverseWorldPlacedSurfaceColliderSnapshot;

const emptyMetaverseAuthoritativeSurfaceColliders = Object.freeze(
  []
) as readonly MetaverseAuthoritativeSurfaceColliderSnapshot[];

export const metaverseAuthoritativeStaticSurfaceColliders = Object.freeze(
  metaverseWorldStaticSurfaceAssets.flatMap((surfaceAsset) =>
    resolveMetaverseWorldPlacedSurfaceColliders(surfaceAsset)
  )
) satisfies readonly MetaverseAuthoritativeSurfaceColliderSnapshot[];

export function resolveMetaverseAuthoritativeDynamicSurfaceColliders(
  environmentAssetId: string,
  poseSnapshot: {
    readonly position: MetaverseWorldSurfaceVector3Snapshot;
    readonly yawRadians: number;
  }
): readonly MetaverseAuthoritativeSurfaceColliderSnapshot[] {
  const surfaceColliders = resolveMetaverseWorldDynamicSurfaceColliders(
    environmentAssetId,
    poseSnapshot
  );

  return surfaceColliders.length > 0
    ? surfaceColliders
    : emptyMetaverseAuthoritativeSurfaceColliders;
}
