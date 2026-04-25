import type {
  MetaverseCharacterProofConfig,
  MetaverseEnvironmentProofConfig
} from "@/metaverse/types/metaverse-runtime";

import { resolveDefaultMetaverseWorldBundleId } from "../bundle-registry";
import { loadMetaverseMapBundle } from "../map-bundles";
import { createMetaverseEnvironmentProofConfig } from "./create-metaverse-environment-proof-config";
import { metaverseCharacterProofConfig } from "./metaverse-character-proof-config";

export { createMetaverseEnvironmentProofConfig } from "./create-metaverse-environment-proof-config";

export function loadMetaverseEnvironmentProofConfig(
  bundleId: string,
  characterProofConfig: MetaverseCharacterProofConfig = metaverseCharacterProofConfig
): MetaverseEnvironmentProofConfig {
  return createMetaverseEnvironmentProofConfig(
    loadMetaverseMapBundle(bundleId),
    characterProofConfig
  );
}

export const metaverseEnvironmentProofConfig = loadMetaverseEnvironmentProofConfig(
  resolveDefaultMetaverseWorldBundleId(),
  metaverseCharacterProofConfig
);
