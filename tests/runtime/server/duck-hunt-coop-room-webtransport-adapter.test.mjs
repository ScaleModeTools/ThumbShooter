import assert from "node:assert/strict";
import test from "node:test";

import {
  createCoopJoinRoomCommand,
  createCoopPlayerId,
  createCoopRoomId,
  createDuckHuntCoopRoomWebTransportCommandRequest,
  createDuckHuntCoopRoomWebTransportSnapshotRequest,
  createUsername
} from "@webgpu-metaverse/shared";

import { DuckHuntCoopRoomWebTransportAdapter } from "../../../server/dist/experiences/duck-hunt/adapters/duck-hunt-coop-room-webtransport-adapter.js";
import { CoopRoomDirectory } from "../../../server/dist/experiences/duck-hunt/classes/coop-room-directory.js";

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
