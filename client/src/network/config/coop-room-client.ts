import {
  createCoopRoomId,
  createMilliseconds
} from "@thumbshooter/shared";

import type { CoopRoomClientConfig } from "../types/coop-room-client";

function requireCoopRoomId(rawValue: string) {
  const roomId = createCoopRoomId(rawValue);

  if (roomId === null) {
    throw new Error(`Invalid co-op room id: ${rawValue}`);
  }

  return roomId;
}

export const defaultCoopRoomId = requireCoopRoomId("co-op-harbor");

function resolveDefaultServerOrigin(): string {
  const configuredOrigin = import.meta.env?.VITE_SERVER_ORIGIN?.trim();

  if (configuredOrigin !== undefined && configuredOrigin.length > 0) {
    return configuredOrigin;
  }

  const browserOrigin = globalThis.window?.location.origin;

  if (browserOrigin === undefined) {
    return "http://127.0.0.1:3210";
  }

  return browserOrigin;
}

export const coopRoomClientConfig = {
  defaultPollIntervalMs: createMilliseconds(75),
  roomId: defaultCoopRoomId,
  serverOrigin: resolveDefaultServerOrigin()
} as const satisfies CoopRoomClientConfig;
