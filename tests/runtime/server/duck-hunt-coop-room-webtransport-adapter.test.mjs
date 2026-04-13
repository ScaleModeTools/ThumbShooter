import assert from "node:assert/strict";
import test from "node:test";

import {
  createCoopFireShotCommand,
  createCoopJoinRoomCommand,
  createCoopPlayerId,
  createCoopRoomId,
  createDuckHuntCoopRoomWebTransportCommandRequest,
  createDuckHuntCoopRoomWebTransportSnapshotRequest,
  createUsername
} from "@webgpu-metaverse/shared";

import { DuckHuntCoopRoomWebTransportAdapter } from "../../../server/dist/experiences/duck-hunt/adapters/duck-hunt-coop-room-webtransport-adapter.js";
import { CoopRoomDirectory } from "../../../server/dist/experiences/duck-hunt/classes/coop-room-directory.js";

function createDeferred() {
  let resolve = () => {};
  let reject = () => {};
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return {
    promise,
    reject,
    resolve
  };
}

function flushAsyncWork() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

test("DuckHuntCoopRoomWebTransportAdapter serves room commands and snapshot reads through one session owner", () => {
  const roomDirectory = new CoopRoomDirectory();
  const adapter = new DuckHuntCoopRoomWebTransportAdapter(roomDirectory);
  const session = adapter.openSession();
  const playerId = createCoopPlayerId("coop-player-1");
  const roomId = createCoopRoomId("co-op-harbor");
  const username = createUsername("Co-op Harbor");

  assert.notEqual(playerId, null);
  assert.notEqual(roomId, null);
  assert.notEqual(username, null);

  const joinResponse = session.receiveClientMessage(
    createDuckHuntCoopRoomWebTransportCommandRequest({
      command: createCoopJoinRoomCommand({
        playerId,
        ready: false,
        roomId,
        username
      })
    }),
    0
  );
  const snapshotResponse = session.receiveClientMessage(
    createDuckHuntCoopRoomWebTransportSnapshotRequest({
      observerPlayerId: playerId,
      roomId
    }),
    25
  );

  assert.equal(joinResponse.type, "coop-room-server-event");
  assert.equal(joinResponse.event.room.roomId, roomId);
  assert.equal(snapshotResponse.type, "coop-room-server-event");
  assert.equal(snapshotResponse.event.room.players[0]?.playerId, playerId);
});

test("DuckHuntCoopRoomWebTransportAdapter returns typed error frames for missing rooms", () => {
  const adapter = new DuckHuntCoopRoomWebTransportAdapter(new CoopRoomDirectory());
  const session = adapter.openSession();
  const playerId = createCoopPlayerId("missing-player");
  const roomId = createCoopRoomId("missing-room");

  assert.notEqual(playerId, null);
  assert.notEqual(roomId, null);

  const response = session.receiveClientMessage(
    createDuckHuntCoopRoomWebTransportSnapshotRequest({
      observerPlayerId: playerId,
      roomId
    }),
    0
  );

  assert.equal(response.type, "coop-room-error");
  assert.match(response.message, /Unknown co-op room/);
});

test("DuckHuntCoopRoomWebTransportAdapter keeps a persistent room subscription alive and pushes newer snapshots", async () => {
  const roomDirectory = new CoopRoomDirectory();
  const adapter = new DuckHuntCoopRoomWebTransportAdapter(roomDirectory);
  const session = adapter.openSession();
  const playerId = createCoopPlayerId("stream-coop-player");
  const roomId = createCoopRoomId("co-op-stream-room");
  const username = createUsername("Stream Co-op Player");
  const writes = [];
  const closed = createDeferred();

  assert.notEqual(playerId, null);
  assert.notEqual(roomId, null);
  assert.notEqual(username, null);

  session.receiveClientMessage(
    createDuckHuntCoopRoomWebTransportCommandRequest({
      command: createCoopJoinRoomCommand({
        playerId,
        ready: false,
        roomId,
        username
      })
    }),
    0
  );

  const streamPromise = session.handleClientStream(
    {
      observerPlayerId: playerId,
      roomId,
      type: "coop-room-snapshot-subscribe"
    },
    {
      closed: closed.promise,
      async writeResponse(response) {
        writes.push(response);
      }
    },
    0
  );

  await flushAsyncWork();

  assert.equal(writes.length, 1);
  assert.equal(writes[0]?.type, "coop-room-server-event");
  assert.equal(writes[0]?.event.room.tick.currentTick, 0);

  roomDirectory.advanceToTime(75);
  adapter.publishRoomSnapshots(75);
  await flushAsyncWork();

  assert.equal(writes.length, 2);
  assert.equal(writes[1]?.type, "coop-room-server-event");
  assert.equal(writes[1]?.event.room.tick.currentTick, 2);

  closed.resolve();
  await streamPromise;
});

test("DuckHuntCoopRoomWebTransportAdapter binds room subscriptions to one player identity and keeps only the latest buffered publish for slow subscribers", async () => {
  const roomDirectory = new CoopRoomDirectory();
  const adapter = new DuckHuntCoopRoomWebTransportAdapter(roomDirectory);
  const session = adapter.openSession();
  const playerId = createCoopPlayerId("latest-wins-coop-player");
  const otherPlayerId = createCoopPlayerId("other-coop-player");
  const roomId = createCoopRoomId("co-op-latest-room");
  const username = createUsername("Latest Wins Co-op");
  const blockedWrite = createDeferred();
  const closed = createDeferred();
  const writes = [];
  let writeCount = 0;

  assert.notEqual(playerId, null);
  assert.notEqual(otherPlayerId, null);
  assert.notEqual(roomId, null);
  assert.notEqual(username, null);

  session.receiveClientMessage(
    createDuckHuntCoopRoomWebTransportCommandRequest({
      command: createCoopJoinRoomCommand({
        playerId,
        ready: false,
        roomId,
        username
      })
    }),
    0
  );

  const streamPromise = session.handleClientStream(
    {
      observerPlayerId: playerId,
      roomId,
      type: "coop-room-snapshot-subscribe"
    },
    {
      closed: closed.promise,
      async writeResponse(response) {
        writes.push(response);
        writeCount += 1;

        if (writeCount === 1) {
          await blockedWrite.promise;
        }
      }
    },
    0
  );

  await flushAsyncWork();

  const identityMismatchResponse = session.receiveClientMessage(
    createDuckHuntCoopRoomWebTransportSnapshotRequest({
      observerPlayerId: otherPlayerId,
      roomId
    }),
    0
  );

  assert.equal(identityMismatchResponse.type, "coop-room-error");
  assert.match(identityMismatchResponse.message, /already bound/);

  roomDirectory.advanceToTime(75);
  adapter.publishRoomSnapshots(75);
  roomDirectory.advanceToTime(150);
  adapter.publishRoomSnapshots(150);
  await flushAsyncWork();

  assert.equal(writes.length, 1);

  blockedWrite.resolve();
  await flushAsyncWork();
  await flushAsyncWork();

  assert.equal(writes.length, 2);
  assert.equal(writes[1]?.type, "coop-room-server-event");
  assert.equal(writes[1]?.event.room.tick.currentTick, 4);

  closed.resolve();
  await streamPromise;
});

test("DuckHuntCoopRoomWebTransportAdapter rejects fire-shot commands that do not match the bound session player", () => {
  const roomDirectory = new CoopRoomDirectory();
  const adapter = new DuckHuntCoopRoomWebTransportAdapter(roomDirectory);
  const session = adapter.openSession();
  const playerId = createCoopPlayerId("bound-coop-player");
  const otherPlayerId = createCoopPlayerId("other-bound-coop-player");
  const roomId = createCoopRoomId("co-op-combat-room");
  const username = createUsername("Bound Co-op");

  assert.notEqual(playerId, null);
  assert.notEqual(otherPlayerId, null);
  assert.notEqual(roomId, null);
  assert.notEqual(username, null);

  session.receiveClientMessage(
    createDuckHuntCoopRoomWebTransportCommandRequest({
      command: createCoopJoinRoomCommand({
        playerId,
        ready: true,
        roomId,
        username
      })
    }),
    0
  );

  const response = session.receiveClientMessage(
    createDuckHuntCoopRoomWebTransportCommandRequest({
      command: createCoopFireShotCommand({
        aimDirection: {
          x: 0,
          y: 0,
          z: -1
        },
        clientEstimatedSimulationTimeMs: 50,
        clientShotSequence: 1,
        origin: {
          x: 0,
          y: 1.35,
          z: 0
        },
        playerId: otherPlayerId,
        roomId,
        weaponId: "semiautomatic-pistol"
      })
    }),
    50
  );

  assert.equal(response.type, "coop-room-error");
  assert.match(response.message, /already bound/);
});
