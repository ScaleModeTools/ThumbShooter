import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import {
  createCoopJoinRoomCommand,
  createCoopPlayerId,
  createCoopRoomId,
  createCoopRoomSnapshotEvent,
  createCoopSessionId,
  createDuckHuntCoopRoomWebTransportErrorMessage,
  createDuckHuntCoopRoomWebTransportServerEventMessage,
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

test("createCoopRoomWebTransportTransport sends explicit Duck Hunt co-op request envelopes", async () => {
  const { createCoopRoomWebTransportTransport } = await clientLoader.load(
    "/src/network/index.ts"
  );
  const playerId = createCoopPlayerId("coop-player-1");
  const roomId = createCoopRoomId("co-op-harbor");
  const sessionId = createCoopSessionId("co-op-harbor-session-1");
  const username = createUsername("Co-op Harbor");

  assert.notEqual(playerId, null);
  assert.notEqual(roomId, null);
  assert.notEqual(sessionId, null);
  assert.notEqual(username, null);

  const requests = [];
  const transport = createCoopRoomWebTransportTransport(
    {
      roomId,
      webTransportUrl: "https://example.test/duck-hunt/coop"
    },
    {
      channel: {
        dispose() {},
        async sendRequest(request) {
          requests.push(request);
          return createDuckHuntCoopRoomWebTransportServerEventMessage({
            event: createCoopRoomSnapshotEvent(
              {
              birds: [],
              capacity: 4,
              players: [],
              roomId,
              session: {
                birdsCleared: 0,
                birdsRemaining: 1,
                requiredReadyPlayerCount: 1,
                sessionId,
                teamHitsLanded: 0,
                teamShotsFired: 0
              },
              tick: {
                currentTick: 0,
                serverTimeMs: 0,
                tickIntervalMs: 50
              }
              }
            )
          });
        }
      }
    }
  );

  await transport.sendCommand(
    createCoopJoinRoomCommand({
      playerId,
      ready: false,
      roomId,
      username
    })
  );
  await transport.pollRoomSnapshot(playerId);

  assert.equal(requests[0]?.type, "coop-room-command-request");
  assert.equal(requests[0]?.command.type, "join-room");
  assert.equal(requests[1]?.type, "coop-room-snapshot-request");
  assert.equal(requests[1]?.observerPlayerId, playerId);
  assert.equal(requests[1]?.roomId, roomId);
});

test("createCoopRoomWebTransportTransport surfaces typed Duck Hunt co-op error frames as errors", async () => {
  const { createCoopRoomWebTransportTransport } = await clientLoader.load(
    "/src/network/index.ts"
  );
  const playerId = createCoopPlayerId("missing-player");
  const roomId = createCoopRoomId("co-op-harbor");

  assert.notEqual(playerId, null);
  assert.notEqual(roomId, null);

  const transport = createCoopRoomWebTransportTransport(
    {
      roomId,
      webTransportUrl: "https://example.test/duck-hunt/coop"
    },
    {
      channel: {
        dispose() {},
        async sendRequest() {
          return createDuckHuntCoopRoomWebTransportErrorMessage({
            message: "Unknown co-op player: missing-player"
          });
        }
      }
    }
  );

  await assert.rejects(
    () => transport.pollRoomSnapshot(playerId),
    /Unknown co-op player/
  );
});
