export const vehicleRelativeDirectionIds = [
  "bow",
  "stern",
  "port",
  "starboard"
] as const;

export type VehicleRelativeDirectionId =
  (typeof vehicleRelativeDirectionIds)[number];

export interface VehicleOrientationDescriptor {
  readonly forwardModelYawRadians: number;
}

export function normalizePlanarYawRadians(rawValue: number): number {
  if (!Number.isFinite(rawValue)) {
    return 0;
  }

  let nextValue = rawValue;

  while (nextValue > Math.PI) {
    nextValue -= Math.PI * 2;
  }

  while (nextValue <= -Math.PI) {
    nextValue += Math.PI * 2;
  }

  return nextValue;
}

export function resolveVehicleRelativeYawOffsetRadians(
  direction: VehicleRelativeDirectionId
): number {
  switch (direction) {
    case "bow":
      return 0;
    case "stern":
      return Math.PI;
    case "starboard":
      return Math.PI * 0.5;
    case "port":
      return Math.PI * -0.5;
  }
}
