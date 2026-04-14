import {
  metaverseWorldLayout,
  type MetaverseWorldPlacedSurfaceColliderSnapshot,
  type MetaverseWorldSurfaceVector3Snapshot
} from "@webgpu-metaverse/shared";

export type MetaverseAuthoritativeSurfaceColliderSnapshot =
  MetaverseWorldPlacedSurfaceColliderSnapshot;

const emptyMetaverseAuthoritativeSurfaceColliders = Object.freeze(
  []
) as readonly MetaverseAuthoritativeSurfaceColliderSnapshot[];

export const metaverseAuthoritativeStaticSurfaceColliders = Object.freeze(
  metaverseWorldLayout.staticSurfaceColliderSnapshots
) satisfies readonly MetaverseAuthoritativeSurfaceColliderSnapshot[];

export function resolveMetaverseAuthoritativeDynamicSurfaceColliders(
  environmentAssetId: string,
  poseSnapshot: {
    readonly position: MetaverseWorldSurfaceVector3Snapshot;
    readonly yawRadians: number;
  }
): readonly MetaverseAuthoritativeSurfaceColliderSnapshot[] {
  const surfaceColliders = metaverseWorldLayout.resolveSurfaceColliderSnapshots(
    environmentAssetId,
    poseSnapshot
  );

  return surfaceColliders.length > 0
    ? surfaceColliders
    : emptyMetaverseAuthoritativeSurfaceColliders;
}
