import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import {
  createMetaverseJoinPresenceCommand,
  createMetaversePlayerId,
  createMetaverseQuickJoinRoomRequest,
  createMetaverseSyncPresenceCommand,
  createUsername
} from "@webgpu-metaverse/shared";

import { MetaversePresenceHttpAdapter } from "../../../server/dist/metaverse/adapters/metaverse-presence-http-adapter.js";
import { MetaverseRoomDirectory } from "../../../server/dist/metaverse/classes/metaverse-room-directory.js";

function createResponseCapture() {
  let body = "";
  let statusCode = null;

  return {
    end(chunk = "") {
      body = String(chunk);
    },
    get json() {
      return body.length === 0 ? null : JSON.parse(body);
    },
    get statusCode() {
      return statusCode;
    },
    setHeader() {},
    writeHead(nextStatusCode) {
      statusCode = nextStatusCode;
    }
  };
}

function createRequest(method, body = null) {
  const request = new EventEmitter();

  request.method = method;
  request.emitBody = () => {
    if (body !== null) {
      request.emit("data", Buffer.from(JSON.stringify(body)));
    }

    request.emit("end");
  };

  return request;
}

function createPresenceTestContext(playerId) {
  const roomDirectory = new MetaverseRoomDirectory();
  const roomAssignment = roomDirectory.quickJoinRoom(
    createMetaverseQuickJoinRoomRequest({
      matchMode: "free-roam",
      playerId
    }),
    0
  );

  return {
    adapter: new MetaversePresenceHttpAdapter(roomDirectory),
    roomAssignment,
    roomDirectory
  };
}

function resolvePresenceCommandUrl(roomId) {
  return new URL(
    `http://127.0.0.1:3210/metaverse/rooms/${roomId}/presence/commands`
  );
}

function resolvePresenceSnapshotUrl(roomId, playerId) {
  return new URL(
    `http://127.0.0.1:3210/metaverse/rooms/${roomId}/presence?playerId=${playerId}`
  );
}

test("MetaversePresenceHttpAdapter keeps nested pose sync from overriding server-owned join pose", async () => {
  const playerId = createMetaversePlayerId("harbor-pilot-1");
  const username = createUsername("Harbor Pilot");

  assert.notEqual(playerId, null);
  assert.notEqual(username, null);

  const { adapter, roomAssignment } = createPresenceTestContext(playerId);

  const joinRequest = createRequest("POST", createMetaverseJoinPresenceCommand({
    characterId: "mesh2motion-humanoid-v1",
    playerId,
      pose: {
        animationVocabulary: "idle",
        look: {
          pitchRadians: -0.15,
          yawRadians: 0.25
        },
        locomotionMode: "grounded",
        mountedOccupancy: null,
        position: {
          x: 0,
          y: 1.62,
        z: 24
      },
      yawRadians: 0
    },
    username
  }));
  const joinResponse = createResponseCapture();
  const joinPromise = adapter.handleRequest(
    joinRequest,
    joinResponse,
    resolvePresenceCommandUrl(roomAssignment.roomId),
    0
  );

  joinRequest.emitBody();

  const joinHandled = await joinPromise;

  assert.equal(joinHandled, true);
  assert.equal(joinResponse.statusCode, 200);
  assert.equal(joinResponse.json.type, "presence-roster");
  assert.equal(joinResponse.json.roster.players[0]?.playerId, "harbor-pilot-1");
  assert.equal(joinResponse.json.roster.players[0]?.pose.look.pitchRadians, -0.15);
  assert.equal(joinResponse.json.roster.players[0]?.pose.look.yawRadians, 0.25);
  assert.equal(joinResponse.json.roster.players[0]?.pose.position.x, 0);
  assert.equal(joinResponse.json.roster.players[0]?.pose.stateSequence, 0);

  const syncRequest = createRequest(
    "POST",
    createMetaverseSyncPresenceCommand({
      playerId,
      pose: {
        animationVocabulary: "walk",
        look: {
          pitchRadians: 0.3,
          yawRadians: 1.1
        },
        locomotionMode: "mounted",
        mountedOccupancy: {
          environmentAssetId: "metaverse-hub-skiff-v1",
          entryId: null,
          occupancyKind: "seat",
          occupantRole: "driver",
          seatId: "driver-seat"
        },
        position: {
          x: 2.5,
          y: 1.62,
          z: 22
        },
        stateSequence: 1,
        yawRadians: 0.6
      }
    })
  );
  const syncResponse = createResponseCapture();
  const syncPromise = adapter.handleRequest(
    syncRequest,
    syncResponse,
    resolvePresenceCommandUrl(roomAssignment.roomId),
    50
  );

  syncRequest.emitBody();

  const syncHandled = await syncPromise;

  assert.equal(syncHandled, true);
  assert.equal(syncResponse.statusCode, 200);
  assert.equal(syncResponse.json.roster.players[0]?.pose.position.x, 0);
  assert.equal(syncResponse.json.roster.players[0]?.pose.position.z, 24);
  assert.equal(syncResponse.json.roster.players[0]?.pose.stateSequence, 0);
  assert.equal(
    syncResponse.json.roster.players[0]?.pose.look.pitchRadians,
    -0.15
  );
  assert.equal(syncResponse.json.roster.players[0]?.pose.look.yawRadians, 0.25);
  assert.equal(syncResponse.json.roster.players[0]?.pose.locomotionMode, "grounded");
  assert.equal(
    syncResponse.json.roster.players[0]?.pose.mountedOccupancy,
    null
  );

  const pollResponse = createResponseCapture();
  const pollHandled = await adapter.handleRequest(
    { method: "GET" },
    pollResponse,
    resolvePresenceSnapshotUrl(roomAssignment.roomId, "harbor-pilot-1"),
    100
  );

  assert.equal(pollHandled, true);
  assert.equal(pollResponse.statusCode, 200);
  assert.equal(pollResponse.json.type, "presence-roster");
  assert.equal(pollResponse.json.roster.players.length, 1);
  assert.equal(pollResponse.json.roster.players[0]?.pose.look.pitchRadians, -0.15);
  assert.equal(pollResponse.json.roster.players[0]?.pose.look.yawRadians, 0.25);
  assert.equal(pollResponse.json.roster.players[0]?.pose.position.x, 0);
  assert.equal(pollResponse.json.roster.players[0]?.pose.position.z, 24);
  assert.equal(
    pollResponse.json.roster.players[0]?.pose.mountedOccupancy,
    null
  );
});

test("MetaversePresenceHttpAdapter returns conflict for unknown observers", async () => {
  const playerId = createMetaversePlayerId("bound-player");
  assert.notEqual(playerId, null);

  const { adapter, roomAssignment } = createPresenceTestContext(playerId);
  const response = createResponseCapture();
  const handled = await adapter.handleRequest(
    { method: "GET" },
    response,
    resolvePresenceSnapshotUrl(roomAssignment.roomId, "missing-player"),
    0
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 409);
  assert.equal(
    response.json.error,
    `Metaverse player missing-player is not bound to room ${roomAssignment.roomId}.`
  );
});
