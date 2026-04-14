import {
  metaverseWorldPlacedWaterRegions,
  metaverseWorldSurfaceAssets,
  resolveMetaverseWorldDynamicSurfaceColliders,
  resolveMetaverseWorldPlacedSurfaceColliders,
  type MetaverseWorldPlacedSurfaceColliderSnapshot,
  type MetaverseWorldPlacedWaterRegionSnapshot,
  type MetaverseWorldSurfaceAssetAuthoring,
  type MetaverseWorldSurfacePlacementId,
  type MetaverseWorldSurfacePlacementSnapshot,
  type MetaverseWorldSurfaceVector3Snapshot
} from "./metaverse-world-surface-authoring.js";

export interface MetaverseWorldRenderPlacementAssetSnapshot {
  readonly environmentAssetId: string;
  readonly placement: MetaverseWorldSurfacePlacementId;
  readonly placements: readonly MetaverseWorldSurfacePlacementSnapshot[];
}

const emptyMetaverseWorldPlacedSurfaceColliders = Object.freeze(
  []
) as readonly MetaverseWorldPlacedSurfaceColliderSnapshot[];

export class MetaverseWorldLayout {
  readonly #renderPlacementAssets: readonly MetaverseWorldRenderPlacementAssetSnapshot[];
  readonly #renderPlacementAssetsById: ReadonlyMap<
    string,
    MetaverseWorldRenderPlacementAssetSnapshot
  >;
  readonly #staticSurfaceColliderSnapshots: readonly MetaverseWorldPlacedSurfaceColliderSnapshot[];
  readonly #surfaceAssets: readonly MetaverseWorldSurfaceAssetAuthoring[];
  readonly #surfaceAssetsById: ReadonlyMap<
    string,
    MetaverseWorldSurfaceAssetAuthoring
  >;
  readonly #waterRegionSnapshots: readonly MetaverseWorldPlacedWaterRegionSnapshot[];

  constructor(
    surfaceAssets: readonly MetaverseWorldSurfaceAssetAuthoring[] =
      metaverseWorldSurfaceAssets,
    waterRegionSnapshots: readonly MetaverseWorldPlacedWaterRegionSnapshot[] =
      metaverseWorldPlacedWaterRegions
  ) {
    this.#surfaceAssets = Object.freeze([...surfaceAssets]);
    this.#surfaceAssetsById = new Map(
      this.#surfaceAssets.map((surfaceAsset) => [
        surfaceAsset.environmentAssetId,
        surfaceAsset
      ])
    );
    this.#renderPlacementAssets = Object.freeze(
      this.#surfaceAssets.map((surfaceAsset) =>
        Object.freeze({
          environmentAssetId: surfaceAsset.environmentAssetId,
          placement: surfaceAsset.placement,
          placements: surfaceAsset.placements
        } satisfies MetaverseWorldRenderPlacementAssetSnapshot)
      )
    );
    this.#renderPlacementAssetsById = new Map(
      this.#renderPlacementAssets.map((renderPlacementAsset) => [
        renderPlacementAsset.environmentAssetId,
        renderPlacementAsset
      ])
    );
    this.#staticSurfaceColliderSnapshots = Object.freeze(
      this.#surfaceAssets
        .filter(
          (surfaceAsset) =>
            surfaceAsset.placement === "static" ||
            surfaceAsset.placement === "instanced"
        )
        .flatMap((surfaceAsset) =>
          resolveMetaverseWorldPlacedSurfaceColliders(surfaceAsset)
        )
    );
    this.#waterRegionSnapshots = Object.freeze([...waterRegionSnapshots]);
  }

  get renderPlacementAssets():
    readonly MetaverseWorldRenderPlacementAssetSnapshot[] {
    return this.#renderPlacementAssets;
  }

  get staticSurfaceColliderSnapshots():
    readonly MetaverseWorldPlacedSurfaceColliderSnapshot[] {
    return this.#staticSurfaceColliderSnapshots;
  }

  get surfaceAssets(): readonly MetaverseWorldSurfaceAssetAuthoring[] {
    return this.#surfaceAssets;
  }

  get waterRegionSnapshots(): readonly MetaverseWorldPlacedWaterRegionSnapshot[] {
    return this.#waterRegionSnapshots;
  }

  readRenderPlacementAsset(
    environmentAssetId: string
  ): MetaverseWorldRenderPlacementAssetSnapshot | null {
    return this.#renderPlacementAssetsById.get(environmentAssetId) ?? null;
  }

  readSurfaceAsset(
    environmentAssetId: string
  ): MetaverseWorldSurfaceAssetAuthoring | null {
    return this.#surfaceAssetsById.get(environmentAssetId) ?? null;
  }

  resolveSurfaceColliderSnapshots(
    environmentAssetId: string,
    poseSnapshot?: {
      readonly position: MetaverseWorldSurfaceVector3Snapshot;
      readonly yawRadians: number;
    } | null
  ): readonly MetaverseWorldPlacedSurfaceColliderSnapshot[] {
    const surfaceAsset = this.#surfaceAssetsById.get(environmentAssetId);

    if (surfaceAsset === undefined) {
      return emptyMetaverseWorldPlacedSurfaceColliders;
    }

    if (surfaceAsset.placement === "dynamic") {
      if (poseSnapshot === undefined || poseSnapshot === null) {
        return emptyMetaverseWorldPlacedSurfaceColliders;
      }

      return resolveMetaverseWorldDynamicSurfaceColliders(
        environmentAssetId,
        poseSnapshot
      );
    }

    return resolveMetaverseWorldPlacedSurfaceColliders(surfaceAsset);
  }
}

export const metaverseWorldLayout = new MetaverseWorldLayout();
