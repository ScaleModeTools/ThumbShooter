import type {
  MetaverseWorldPlacedSurfaceColliderSnapshot,
  MetaverseWorldSurfaceTraversalAffordanceId
} from "./metaverse-world-surface-query.js";

export interface MetaverseTraversalColliderMetadataSnapshot {
  readonly ownerEnvironmentAssetId: string | null;
  readonly traversalAffordance: MetaverseWorldSurfaceTraversalAffordanceId;
}

export function createMetaverseTraversalColliderMetadataSnapshot(
  colliderSnapshot: Pick<
    MetaverseWorldPlacedSurfaceColliderSnapshot,
    "ownerEnvironmentAssetId" | "traversalAffordance"
  >
): MetaverseTraversalColliderMetadataSnapshot {
  return Object.freeze({
    ownerEnvironmentAssetId: colliderSnapshot.ownerEnvironmentAssetId,
    traversalAffordance: colliderSnapshot.traversalAffordance
  });
}

export function shouldConsiderMetaverseWaterborneTraversalCollider(
  colliderMetadata: MetaverseTraversalColliderMetadataSnapshot | null,
  excludedOwnerEnvironmentAssetId: string | null = null
): boolean {
  if (colliderMetadata === null) {
    return true;
  }

  if (colliderMetadata.traversalAffordance === "support") {
    return false;
  }

  return (
    excludedOwnerEnvironmentAssetId === null ||
    colliderMetadata.ownerEnvironmentAssetId !== excludedOwnerEnvironmentAssetId
  );
}
