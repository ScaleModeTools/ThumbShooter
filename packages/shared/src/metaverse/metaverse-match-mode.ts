export const metaverseMatchModeIds = [
  "free-roam",
  "team-deathmatch"
] as const;

export type MetaverseMatchModeId = (typeof metaverseMatchModeIds)[number];

export function normalizeMetaverseMatchModeId(
  value: string | null | undefined
): MetaverseMatchModeId | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  return metaverseMatchModeIds.includes(normalizedValue as MetaverseMatchModeId)
    ? (normalizedValue as MetaverseMatchModeId)
    : null;
}
