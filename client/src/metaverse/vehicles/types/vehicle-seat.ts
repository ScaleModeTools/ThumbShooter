export const mountedVehicleSeatRoleIds = [
  "driver",
  "passenger",
  "turret"
] as const;

export type MountedVehicleSeatRoleId =
  (typeof mountedVehicleSeatRoleIds)[number];

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

export const mountedVehicleLookLimitPolicyIds = [
  "driver-forward",
  "passenger-bench",
  "turret-arc"
] as const;

export type MountedVehicleLookLimitPolicyId =
  (typeof mountedVehicleLookLimitPolicyIds)[number];

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
  "driver-forward" satisfies MountedVehicleLookLimitPolicyId;
export const defaultMountedVehicleOccupancyAnimationId =
  "seated" satisfies MountedVehicleOccupancyAnimationId;
