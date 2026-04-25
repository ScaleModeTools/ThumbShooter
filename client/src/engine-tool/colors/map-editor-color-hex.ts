export type MapEditorColorRgbTuple = readonly [number, number, number];

function clampColorChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function toHexChannel(value: number): string {
  return clampColorChannel(value).toString(16).padStart(2, "0");
}

export function formatMapEditorColorHex(
  color: MapEditorColorRgbTuple
): string {
  return `#${toHexChannel(color[0] * 255)}${toHexChannel(color[1] * 255)}${toHexChannel(color[2] * 255)}`;
}

export function parseMapEditorColorHex(
  value: string,
  fallback: MapEditorColorRgbTuple
): MapEditorColorRgbTuple {
  const trimmedValue = value.trim();
  const normalizedValue =
    trimmedValue.startsWith("#") ? trimmedValue.slice(1) : trimmedValue;

  if (!/^[0-9a-fA-F]{6}$/.test(normalizedValue)) {
    return Object.freeze([...fallback] as const);
  }

  return Object.freeze([
    parseInt(normalizedValue.slice(0, 2), 16) / 255,
    parseInt(normalizedValue.slice(2, 4), 16) / 255,
    parseInt(normalizedValue.slice(4, 6), 16) / 255
  ] as const);
}
