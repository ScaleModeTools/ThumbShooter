import { createAnimationClipId } from "../types/asset-id";
import {
  animationVocabularyIds,
  canonicalAnimationClipNamesByVocabulary,
  defineAnimationClipManifest
} from "../types/animation-clip-manifest";

export const metaverseMannequinCanonicalAnimationPackSourcePath =
  "/models/metaverse/characters/metaverse-mannequin-canonical-animations.glb";

export const metaverseMannequinIdleAnimationClipId = createAnimationClipId(
  "metaverse-mannequin-idle-v1"
);

export const metaverseMannequinWalkAnimationClipId = createAnimationClipId(
  "metaverse-mannequin-walk-v1"
);

export const metaverseMannequinAimAnimationClipId = createAnimationClipId(
  "metaverse-mannequin-aim-v1"
);

export const metaverseMannequinInteractAnimationClipId = createAnimationClipId(
  "metaverse-mannequin-interact-v1"
);

export const metaverseMannequinSeatedAnimationClipId = createAnimationClipId(
  "metaverse-mannequin-seated-v1"
);

const metaverseMannequinLoopModeByVocabulary = Object.freeze({
  idle: "repeat",
  walk: "repeat",
  aim: "repeat",
  interact: "once",
  seated: "repeat"
} as const);

export const animationClipManifest = defineAnimationClipManifest([
  ...animationVocabularyIds.map((vocabulary) => ({
    id:
      vocabulary === "idle"
        ? metaverseMannequinIdleAnimationClipId
        : vocabulary === "walk"
          ? metaverseMannequinWalkAnimationClipId
          : vocabulary === "aim"
            ? metaverseMannequinAimAnimationClipId
            : vocabulary === "interact"
              ? metaverseMannequinInteractAnimationClipId
              : metaverseMannequinSeatedAnimationClipId,
    label: `Metaverse mannequin ${vocabulary}`,
    sourcePath: metaverseMannequinCanonicalAnimationPackSourcePath,
    clipName: canonicalAnimationClipNamesByVocabulary[vocabulary],
    targetSkeleton: "humanoid_v1" as const,
    vocabulary,
    loopMode: metaverseMannequinLoopModeByVocabulary[vocabulary]
  }))
] as const);
