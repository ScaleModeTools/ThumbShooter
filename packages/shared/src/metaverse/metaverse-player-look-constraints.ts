import type { MetaversePresenceMountedOccupantRoleId } from "./metaverse-presence-contract.js";

export interface MetaversePlayerLookConstraintBounds {
  readonly maxPitchRadians: number;
  readonly maxYawOffsetRadians: number | null;
  readonly minPitchRadians: number;
}

export interface MetaverseMountedLookConstraintBounds
  extends MetaversePlayerLookConstraintBounds {
  readonly maxYawOffsetRadians: number;
}

export const metaverseMountedLookLimitPolicyIds = [
  "driver-forward",
  "passenger-bench",
  "turret-arc"
] as const;

export type MetaverseMountedLookLimitPolicyId =
  (typeof metaverseMountedLookLimitPolicyIds)[number];

export const defaultMetaverseMountedLookLimitPolicyId =
  "driver-forward" satisfies MetaverseMountedLookLimitPolicyId;

export const metaverseUnmountedPlayerLookConstraintBounds = Object.freeze({
  maxPitchRadians: 0.6,
  maxYawOffsetRadians: null,
  minPitchRadians: -0.6
} as const satisfies MetaversePlayerLookConstraintBounds);

const metaverseMountedDriverLookConstraintBounds = Object.freeze({
  maxPitchRadians: metaverseUnmountedPlayerLookConstraintBounds.maxPitchRadians,
  maxYawOffsetRadians: 0,
  minPitchRadians: metaverseUnmountedPlayerLookConstraintBounds.minPitchRadians
} as const satisfies MetaverseMountedLookConstraintBounds);

const metaverseMountedPassengerLookConstraintBounds = Object.freeze({
  maxPitchRadians: 0.42,
  maxYawOffsetRadians: Math.PI * 0.45,
  minPitchRadians: -0.42
} as const satisfies MetaverseMountedLookConstraintBounds);

const metaverseMountedTurretLookConstraintBounds = Object.freeze({
  maxPitchRadians: 0.55,
  maxYawOffsetRadians: Math.PI * 0.6,
  minPitchRadians: -0.5
} as const satisfies MetaverseMountedLookConstraintBounds);

export function resolveMetaverseMountedLookConstraintBounds(
  lookLimitPolicyId: MetaverseMountedLookLimitPolicyId
): MetaverseMountedLookConstraintBounds {
  switch (lookLimitPolicyId) {
    case "driver-forward":
      return metaverseMountedDriverLookConstraintBounds;
    case "passenger-bench":
      return metaverseMountedPassengerLookConstraintBounds;
    case "turret-arc":
      return metaverseMountedTurretLookConstraintBounds;
  }
}

export function resolveMetaverseMountedOccupantRoleLookConstraintBounds(
  occupantRole: MetaversePresenceMountedOccupantRoleId
): MetaverseMountedLookConstraintBounds {
  switch (occupantRole) {
    case "driver":
      return metaverseMountedDriverLookConstraintBounds;
    case "passenger":
      return metaverseMountedPassengerLookConstraintBounds;
    case "turret":
      return metaverseMountedTurretLookConstraintBounds;
  }
}
