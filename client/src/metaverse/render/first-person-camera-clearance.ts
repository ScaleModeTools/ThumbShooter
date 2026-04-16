import { Vector3, type Object3D } from "three/webgpu";

import type {
  MetaverseCameraSnapshot,
  MetaverseCharacterPresentationSnapshot,
  MetaverseRuntimeConfig
} from "../types/metaverse-runtime";

const headToCameraScratch = new Vector3();
const headWorldPositionScratch = new Vector3();
const lookDirectionScratch = new Vector3();

function usesGroundedFirstPersonCamera(
  characterPresentation: MetaverseCharacterPresentationSnapshot | null
): boolean {
  if (characterPresentation === null) {
    return false;
  }

  return (
    characterPresentation.animationVocabulary !== "swim" &&
    characterPresentation.animationVocabulary !== "swim-idle" &&
    characterPresentation.animationVocabulary !== "seated"
  );
}

export function resolveFirstPersonHeadClearanceCameraSnapshot(
  cameraSnapshot: MetaverseCameraSnapshot,
  characterPresentation: MetaverseCharacterPresentationSnapshot | null,
  headAnchorNodes: readonly Object3D[],
  config: Pick<
    MetaverseRuntimeConfig["bodyPresentation"],
    | "groundedFirstPersonHeadClearanceMeters"
    | "groundedFirstPersonHeadOcclusionRadiusMeters"
  >
): MetaverseCameraSnapshot {
  if (
    !usesGroundedFirstPersonCamera(characterPresentation) ||
    headAnchorNodes.length === 0
  ) {
    return cameraSnapshot;
  }

  lookDirectionScratch.set(
    cameraSnapshot.lookDirection.x,
    cameraSnapshot.lookDirection.y,
    cameraSnapshot.lookDirection.z
  );

  if (lookDirectionScratch.lengthSq() <= 0.000001) {
    return cameraSnapshot;
  }

  lookDirectionScratch.normalize();
  let selectedForwardDistanceMeters = Number.NEGATIVE_INFINITY;
  let selectedLateralDistanceMeters = Number.POSITIVE_INFINITY;

  for (const headAnchorNode of headAnchorNodes) {
    headAnchorNode.getWorldPosition(headWorldPositionScratch);
    headToCameraScratch.set(
      headWorldPositionScratch.x - cameraSnapshot.position.x,
      headWorldPositionScratch.y - cameraSnapshot.position.y,
      headWorldPositionScratch.z - cameraSnapshot.position.z
    );

    const forwardDistanceMeters = headToCameraScratch.dot(lookDirectionScratch);
    const lateralDistanceMeters = Math.sqrt(
      Math.max(
        0,
        headToCameraScratch.lengthSq() - forwardDistanceMeters * forwardDistanceMeters
      )
    );

    if (lateralDistanceMeters > selectedLateralDistanceMeters) {
      continue;
    }

    if (
      lateralDistanceMeters === selectedLateralDistanceMeters &&
      forwardDistanceMeters <= selectedForwardDistanceMeters
    ) {
      continue;
    }

    selectedForwardDistanceMeters = forwardDistanceMeters;
    selectedLateralDistanceMeters = lateralDistanceMeters;
  }

  if (
    !Number.isFinite(selectedLateralDistanceMeters) ||
    selectedLateralDistanceMeters >
      config.groundedFirstPersonHeadOcclusionRadiusMeters
  ) {
    return cameraSnapshot;
  }

  const requiredForwardShiftMeters =
    selectedForwardDistanceMeters +
    config.groundedFirstPersonHeadClearanceMeters;

  if (requiredForwardShiftMeters <= 0) {
    return cameraSnapshot;
  }

  return Object.freeze({
    ...cameraSnapshot,
    position: Object.freeze({
      x:
        cameraSnapshot.position.x +
        lookDirectionScratch.x * requiredForwardShiftMeters,
      y:
        cameraSnapshot.position.y +
        lookDirectionScratch.y * requiredForwardShiftMeters,
      z:
        cameraSnapshot.position.z +
        lookDirectionScratch.z * requiredForwardShiftMeters
    })
  });
}
