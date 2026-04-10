import type {
  MetaversePlayerId,
  MetaversePresenceCommand,
  MetaversePresenceRosterEvent,
  MetaversePresenceRosterSnapshotInput
} from "@webgpu-metaverse/shared";
import { createMetaversePresenceRosterEvent } from "@webgpu-metaverse/shared";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCurrentRosterPayload(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    Array.isArray(value.players) &&
    typeof value.snapshotSequence === "number" &&
    typeof value.tickIntervalMs === "number"
  );
}

export function resolveMetaversePresenceSnapshotUrl(
  serverOrigin: string,
  presencePath: string,
  playerId?: MetaversePlayerId
): string {
  const snapshotUrl = new URL(presencePath, serverOrigin);

  if (playerId !== undefined) {
    snapshotUrl.searchParams.set("playerId", playerId);
  }

  return snapshotUrl.toString();
}

export function resolveMetaversePresenceCommandUrl(
  serverOrigin: string,
  presencePath: string
): string {
  return new URL(`${presencePath}/commands`, serverOrigin).toString();
}

export function serializeMetaversePresenceCommand(
  command: MetaversePresenceCommand
): string {
  return JSON.stringify(command);
}

export function parseMetaversePresenceServerEvent(
  payload: unknown
): MetaversePresenceRosterEvent {
  if (
    isRecord(payload) &&
    payload.type === "presence-roster" &&
    isRecord(payload.roster) &&
    isCurrentRosterPayload(payload.roster)
  ) {
    return createMetaversePresenceRosterEvent(
      payload.roster as unknown as MetaversePresenceRosterSnapshotInput
    );
  }

  if (isCurrentRosterPayload(payload)) {
    return createMetaversePresenceRosterEvent(
      payload as unknown as MetaversePresenceRosterSnapshotInput
    );
  }

  throw new Error("Metaverse presence response did not include a roster snapshot.");
}

export function parseMetaversePresenceErrorMessage(
  payload: unknown,
  fallbackMessage: string
): string {
  if (isRecord(payload) && typeof payload.error === "string") {
    const normalizedMessage = payload.error.trim();

    if (normalizedMessage.length > 0) {
      return normalizedMessage;
    }
  }

  return fallbackMessage;
}
