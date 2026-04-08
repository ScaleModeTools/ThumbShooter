import {
  createCoopBirdId,
  createCoopRoomId,
  createCoopSessionId,
  createMilliseconds,
  type CoopRoomId
} from "@thumbshooter/shared";

import type { CoopRoomRuntimeConfig } from "../types/coop-room-runtime.js";

function requireCoopRoomId(rawValue: string) {
  const roomId = createCoopRoomId(rawValue);

  if (roomId === null) {
    throw new Error(`Invalid co-op room id: ${rawValue}`);
  }

  return roomId;
}

function requireCoopSessionId(rawValue: string) {
  const sessionId = createCoopSessionId(rawValue);

  if (sessionId === null) {
    throw new Error(`Invalid co-op session id: ${rawValue}`);
  }

  return sessionId;
}

function requireCoopBirdId(rawValue: string) {
  const birdId = createCoopBirdId(rawValue);

  if (birdId === null) {
    throw new Error(`Invalid co-op bird id: ${rawValue}`);
  }

  return birdId;
}

const defaultCoopRoomId = requireCoopRoomId("co-op-harbor");

const baseCoopRoomRuntimeConfig = {
  arenaBounds: {
    minX: 0.08,
    maxX: 0.92,
    minY: 0.14,
    maxY: 0.86
  },
  birds: [
    {
      birdId: requireCoopBirdId("shared-bird-1"),
      label: "Shared Bird 1",
      spawn: { x: 0.22, y: 0.28 },
      glideVelocity: { x: 0.12, y: 0.03 },
      radius: 0.08,
      scale: 1.05,
      wingSpeed: 6.4
    },
    {
      birdId: requireCoopBirdId("shared-bird-2"),
      label: "Shared Bird 2",
      spawn: { x: 0.78, y: 0.24 },
      glideVelocity: { x: -0.11, y: 0.04 },
      radius: 0.082,
      scale: 0.98,
      wingSpeed: 5.8
    },
    {
      birdId: requireCoopBirdId("shared-bird-3"),
      label: "Shared Bird 3",
      spawn: { x: 0.32, y: 0.7 },
      glideVelocity: { x: 0.1, y: -0.05 },
      radius: 0.078,
      scale: 1.1,
      wingSpeed: 6.9
    },
    {
      birdId: requireCoopBirdId("shared-bird-4"),
      label: "Shared Bird 4",
      spawn: { x: 0.74, y: 0.74 },
      glideVelocity: { x: -0.12, y: -0.03 },
      radius: 0.08,
      scale: 1.02,
      wingSpeed: 6.1
    }
  ],
  capacity: 4,
  hitRadius: 0.09,
  movement: {
    scatterDurationMs: createMilliseconds(820),
    scatterSpeed: 0.24,
    downedDurationMs: createMilliseconds(960),
    downedDriftVelocityY: 0.18
  },
  requiredReadyPlayerCount: 2,
  scatterRadius: 0.24,
  tickIntervalMs: createMilliseconds(50)
} as const satisfies Omit<CoopRoomRuntimeConfig, "roomId" | "sessionId">;

function normalizeSessionOrdinal(rawValue: number): number {
  if (!Number.isFinite(rawValue)) {
    return 1;
  }

  return Math.max(1, Math.floor(rawValue));
}

function createRoomSessionId(
  roomId: CoopRoomId,
  sessionOrdinal: number
) {
  return requireCoopSessionId(
    `${roomId}-session-${normalizeSessionOrdinal(sessionOrdinal)}`
  );
}

export function createCoopRoomRuntimeConfig(
  roomId: CoopRoomId = defaultCoopRoomId,
  sessionOrdinal = 1
): CoopRoomRuntimeConfig {
  return {
    ...baseCoopRoomRuntimeConfig,
    roomId,
    sessionId: createRoomSessionId(roomId, sessionOrdinal)
  };
}

export const coopRoomRuntimeConfig = createCoopRoomRuntimeConfig();
