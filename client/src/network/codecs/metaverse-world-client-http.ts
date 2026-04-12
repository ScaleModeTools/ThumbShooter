import type {
  MetaversePlayerId,
  MetaverseRealtimeWorldClientCommand,
  MetaverseRealtimeWorldEvent,
  MetaverseRealtimeWorldSnapshotInput
} from "@webgpu-metaverse/shared";
import { createMetaverseRealtimeWorldEvent } from "@webgpu-metaverse/shared";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCurrentWorldPayload(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    isRecord(value.tick) &&
    Array.isArray(value.players) &&
    Array.isArray(value.vehicles) &&
    typeof value.snapshotSequence === "number"
  );
}

export function resolveMetaverseWorldSnapshotUrl(
  serverOrigin: string,
  worldPath: string,
  playerId?: MetaversePlayerId
): string {
  const snapshotUrl = new URL(worldPath, serverOrigin);

  if (playerId !== undefined) {
    snapshotUrl.searchParams.set("playerId", playerId);
  }

  return snapshotUrl.toString();
}

export function resolveMetaverseWorldCommandUrl(
  serverOrigin: string,
  worldCommandPath: string
): string {
  return new URL(worldCommandPath, serverOrigin).toString();
}

export function serializeMetaverseWorldCommand(
  command: MetaverseRealtimeWorldClientCommand
): string {
  return JSON.stringify(command);
}

export function parseMetaverseWorldServerEvent(
  payload: unknown
): MetaverseRealtimeWorldEvent {
  if (
    isRecord(payload) &&
    payload.type === "world-snapshot" &&
    isRecord(payload.world) &&
    isCurrentWorldPayload(payload.world)
  ) {
    return createMetaverseRealtimeWorldEvent({
      world: payload.world as unknown as MetaverseRealtimeWorldSnapshotInput
    });
  }

  if (isCurrentWorldPayload(payload)) {
    return createMetaverseRealtimeWorldEvent({
      world: payload as unknown as MetaverseRealtimeWorldSnapshotInput
    });
  }

  throw new Error(
    "Metaverse world response did not include a realtime world snapshot."
  );
}

export function parseMetaverseWorldErrorMessage(
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
