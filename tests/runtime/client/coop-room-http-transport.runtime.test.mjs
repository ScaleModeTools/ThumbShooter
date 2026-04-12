import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import {
  createCoopJoinRoomCommand,
  createCoopPlayerId,
  createCoopRoomId,
  createCoopRoomSnapshotEvent,
  createCoopSessionId,
  createUsername
} from "@webgpu-metaverse/shared";

import { createClientModuleLoader } from "./load-client-module.mjs";

let clientLoader;

before(async () => {
  clientLoader = await createClientModuleLoader();
});

after(async () => {
  await clientLoader?.close();
});

function createJsonResponse(ok, payload) {
  return {
    ok,
    async json() {
      return payload;
    }
  };
}

test("createCoopRoomHttpTransport serializes commands and polls typed room snapshots", async () => {
  const { createCoopRoomHttpTransport } = await clientLoader.load(
    "/src/network/index.ts"
  );
  const roomId = createCoopRoomId("co-op-harbor");
  const playerId = createCoopPlayerId("coop-player-1");
  const sessionId = createCoopSessionId("co-op-harbor-session-1");
  const username = createUsername("coop-user");

  assert.notEqual(roomId, null);
  assert.notEqual(playerId, null);
  assert.notEqual(sessionId, null);
  assert.notEqual(username, null);

  const requests = [];
  const responseQueue = [
    createCoopRoomSnapshotEvent({
      birds: [],
      capacity: 4,
      players: [],
      roomId,
      session: {
        birdsCleared: 0,
        birdsRemaining: 1,
        leaderPlayerId: playerId,
        phase: "waiting-for-players",
        requiredReadyPlayerCount: 2,
        sessionId,
        teamHitsLanded: 0,
        teamShotsFired: 0
      },
      tick: {
        currentTick: 0,
        serverTimeMs: 0,
        tickIntervalMs: 50
      }
    }),
    createCoopRoomSnapshotEvent({
      birds: [],
      capacity: 4,
      players: [],
      roomId,
      session: {
        birdsCleared: 0,
        birdsRemaining: 1,
        leaderPlayerId: playerId,
        phase: "waiting-for-players",
        requiredReadyPlayerCount: 2,
        roundDurationMs: 10_000,
        roundNumber: 1,
        roundPhase: "ready",
        roundPhaseRemainingMs: 10_000,
        sessionId,
        teamHitsLanded: 0,
        teamShotsFired: 0
      },
      tick: {
        currentTick: 1,
        serverTimeMs: 50,
        tickIntervalMs: 50
      }
    })
  ];
  const transport = createCoopRoomHttpTransport(
    {
      roomCollectionPath: "/experiences/duck-hunt/coop/rooms",
      roomId,
      serverOrigin: "http://127.0.0.1:3210"
    },
    {
      async fetch(input, init) {
        const queuedResponse = responseQueue.shift();

        assert.notEqual(queuedResponse, undefined);
        requests.push({
          body: init?.body ?? null,
          cache: init?.cache ?? null,
          keepalive: init?.keepalive ?? false,
          method: init?.method ?? "GET",
          url: String(input)
        });

        return createJsonResponse(true, queuedResponse);
      }
    }
  );

  await transport.sendCommand(
    createCoopJoinRoomCommand({
      playerId,
      ready: false,
      roomId,
      username
    }),
    {
      deliveryHint: "best-effort-disconnect"
    }
  );
  await transport.pollRoomSnapshot(playerId);

  assert.equal(requests[0]?.method, "POST");
  assert.equal(
    requests[0]?.url,
    "http://127.0.0.1:3210/experiences/duck-hunt/coop/rooms/co-op-harbor/commands"
  );
  assert.deepEqual(
    JSON.parse(String(requests[0]?.body)),
    createCoopJoinRoomCommand({
      playerId,
      ready: false,
      roomId,
      username
    })
  );
  assert.equal(requests[0]?.keepalive, true);
  assert.equal(requests[1]?.method, "GET");
  assert.equal(requests[1]?.cache, "no-store");
  assert.equal(
    requests[1]?.url,
    "http://127.0.0.1:3210/experiences/duck-hunt/coop/rooms/co-op-harbor?playerId=coop-player-1"
  );
});

test("createCoopRoomHttpTransport rejects outdated room snapshot payloads", async () => {
  const { createCoopRoomHttpTransport } = await clientLoader.load(
    "/src/network/index.ts"
  );
  const roomId = createCoopRoomId("co-op-harbor");
  const playerId = createCoopPlayerId("coop-player-1");

  assert.notEqual(roomId, null);
  assert.notEqual(playerId, null);

  const transport = createCoopRoomHttpTransport(
    {
      roomCollectionPath: "/experiences/duck-hunt/coop/rooms",
      roomId,
      serverOrigin: "http://127.0.0.1:3210"
    },
    {
      async fetch() {
        return createJsonResponse(true, {
          room: {
            birds: [],
            capacity: 4,
            players: [],
            roomId,
            session: {
              birdsCleared: 4,
              birdsRemaining: 0,
              phase: "completed",
              requiredReadyPlayerCount: 2
            },
            tick: {
              currentTick: 84,
              serverTimeMs: 4_200,
              tickIntervalMs: 50
            }
          },
          type: "room-snapshot"
        });
      }
    }
  );

  await assert.rejects(
    () => transport.pollRoomSnapshot(playerId),
    /current room snapshot fields/
  );
});
