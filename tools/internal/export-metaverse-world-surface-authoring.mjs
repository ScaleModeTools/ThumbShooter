import {
  metaverseWorldDynamicSurfaceAssets,
  metaverseWorldStaticSurfaceAssets,
  metaverseWorldSurfaceAssets,
  resolveMetaverseWorldPlacedSurfaceColliders
} from "../../packages/shared/dist/index.js";

const exportSnapshot = Object.freeze({
  dynamicAssets: metaverseWorldDynamicSurfaceAssets,
  staticAssets: metaverseWorldStaticSurfaceAssets,
  staticPlacedSurfaceColliders: Object.freeze(
    metaverseWorldStaticSurfaceAssets.flatMap((surfaceAsset) =>
      resolveMetaverseWorldPlacedSurfaceColliders(surfaceAsset)
    )
  ),
  surfaceAssets: metaverseWorldSurfaceAssets
});

process.stdout.write(`${JSON.stringify(exportSnapshot, null, 2)}\n`);
