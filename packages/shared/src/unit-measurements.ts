import type { TypeBrand } from "./type-branding.js";

export type Milliseconds = TypeBrand<number, "Milliseconds">;
export type Degrees = TypeBrand<number, "Degrees">;
export type Radians = TypeBrand<number, "Radians">;

function normalizeFiniteNumber(rawValue: number): number {
  if (!Number.isFinite(rawValue)) {
    return 0;
  }

  return rawValue;
}

export function createMilliseconds(rawValue: number): Milliseconds {
  return Math.max(0, normalizeFiniteNumber(rawValue)) as Milliseconds;
}

export function createDegrees(rawValue: number): Degrees {
  return normalizeFiniteNumber(rawValue) as Degrees;
}

export function createRadians(rawValue: number): Radians {
  return normalizeFiniteNumber(rawValue) as Radians;
}
