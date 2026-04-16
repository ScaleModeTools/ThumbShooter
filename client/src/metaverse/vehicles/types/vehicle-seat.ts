import {
  defaultMetaverseMountedLookLimitPolicyId,
  metaverseMountedLookLimitPolicyIds,
  metaversePresenceMountedOccupantRoleIds
} from "@webgpu-metaverse/shared";
import type {
  MetaverseMountedLookLimitPolicyId,
  MetaversePresenceMountedOccupantRoleId
} from "@webgpu-metaverse/shared";

export const mountedVehicleSeatRoleIds =
  metaversePresenceMountedOccupantRoleIds;

export type MountedVehicleSeatRoleId = MetaversePresenceMountedOccupantRoleId;

export const mountedVehicleControlRoutingPolicyIds = [
  "vehicle-surface-drive",
  "look-only",
  "turret-station"
] as const;

export type MountedVehicleControlRoutingPolicyId =
  (typeof mountedVehicleControlRoutingPolicyIds)[number];

export const mountedVehicleCameraPolicyIds = [
  "vehicle-follow",
  "seat-follow",
  "turret-follow"
] as const;

export type MountedVehicleCameraPolicyId =
  (typeof mountedVehicleCameraPolicyIds)[number];

export const mountedVehicleLookLimitPolicyIds =
  metaverseMountedLookLimitPolicyIds;

export type MountedVehicleLookLimitPolicyId = MetaverseMountedLookLimitPolicyId;

export const mountedVehicleOccupancyAnimationIds = [
  "seated",
  "standing"
] as const;

export type MountedVehicleOccupancyAnimationId =
  (typeof mountedVehicleOccupancyAnimationIds)[number];

export const defaultMountedVehicleSeatId = "driver-seat";
export const defaultMountedVehicleSeatRole =
  "driver" satisfies MountedVehicleSeatRoleId;
export const defaultMountedVehicleControlRoutingPolicyId =
  "vehicle-surface-drive" satisfies MountedVehicleControlRoutingPolicyId;
export const defaultMountedVehicleCameraPolicyId =
  "vehicle-follow" satisfies MountedVehicleCameraPolicyId;
export const defaultMountedVehicleLookLimitPolicyId =
  defaultMetaverseMountedLookLimitPolicyId;
export const defaultMountedVehicleOccupancyAnimationId =
  "seated" satisfies MountedVehicleOccupancyAnimationId;
