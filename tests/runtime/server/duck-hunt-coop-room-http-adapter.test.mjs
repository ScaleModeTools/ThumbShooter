import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import test from "node:test";

import { createCoopRoomId, createUsername } from "@webgpu-metaverse/shared";

import { DuckHuntCoopRoomHttpAdapter } from "../../../server/dist/experiences/duck-hunt/adapters/duck-hunt-coop-room-http-adapter.js";
import { CoopRoomDirectory } from "../../../server/dist/experiences/duck-hunt/classes/coop-room-directory.js";

function createResponseCapture() {
  const headers = new Map();
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
    setHeader(name, value) {
      headers.set(String(name).toLowerCase(), value);
    },
    writeHead(nextStatusCode, nextHeaders = {}) {
      statusCode = nextStatusCode;

      for (const [name, value] of Object.entries(nextHeaders)) {
        headers.set(name.toLowerCase(), value);
      }
    }
  };
}

function createRequest(method) {
  const request = new PassThrough();
  request.method = method;
  return request;
}

async function dispatchJsonRequest(adapter, { body, method, pathname, nowMs }) {
  const request = createRequest(method);
  const response = createResponseCapture();
  const handlePromise = adapter.handleRequest(
    request,
    response,
    new URL(`http://127.0.0.1:3210${pathname}`),
    nowMs
  );

  if (body === undefined) {
    request.end();
  } else {
    request.end(JSON.stringify(body));
  }

  const handled = await handlePromise;

  return {
    handled,
    response
  };
}

test("DuckHuntCoopRoomHttpAdapter accepts join commands and lists room snapshots", async () => {
  const adapter = new DuckHuntCoopRoomHttpAdapter(new CoopRoomDirectory());
  const roomId = createCoopRoomId("co-op-harbor");
  const username = createUsername("harbor");

  assert.notEqual(roomId, null);
  assert.notEqual(username, null);

  const joinResult = await dispatchJsonRequest(adapter, {
    body: {
      playerId: "harbor-player",
      ready: false,
      type: "join-room",
      username
    },
    method: "POST",
    nowMs: 0,
    pathname: `/experiences/duck-hunt/coop/rooms/${roomId}/commands`
  });

  assert.equal(joinResult.handled, true);
  assert.equal(joinResult.response.statusCode, 200);
  assert.equal(joinResult.response.json.room.roomId, roomId);

  const directoryResult = await dispatchJsonRequest(adapter, {
    method: "GET",
    nowMs: 10,
    pathname: "/experiences/duck-hunt/coop/rooms"
  });

  assert.equal(directoryResult.handled, true);
  assert.equal(directoryResult.response.statusCode, 200);
  assert.equal(directoryResult.response.json.coOpRooms.length, 1);
  assert.equal(directoryResult.response.json.coOpRooms[0].roomId, roomId);
});

test("DuckHuntCoopRoomHttpAdapter returns a room snapshot event for room polling", async () => {
  const adapter = new DuckHuntCoopRoomHttpAdapter(new CoopRoomDirectory());
  const roomId = createCoopRoomId("co-op-pier");

  assert.notEqual(roomId, null);

  await dispatchJsonRequest(adapter, {
    body: {
      playerId: "pier-player",
      ready: false,
      type: "join-room",
      username: "pier"
    },
    method: "POST",
    nowMs: 0,
    pathname: `/experiences/duck-hunt/coop/rooms/${roomId}/commands`
  });

  const pollResult = await dispatchJsonRequest(adapter, {
    method: "GET",
    nowMs: 5,
    pathname: `/experiences/duck-hunt/coop/rooms/${roomId}?playerId=pier-player`
  });

  assert.equal(pollResult.handled, true);
  assert.equal(pollResult.response.statusCode, 200);
  assert.equal(pollResult.response.json.room.roomId, roomId);
  assert.equal(pollResult.response.json.room.players[0].playerId, "pier-player");
});

test("DuckHuntCoopRoomHttpAdapter accepts fire-shot rewind metadata on the HTTP fallback path", async () => {
  const adapter = new DuckHuntCoopRoomHttpAdapter(new CoopRoomDirectory());
  const roomId = createCoopRoomId("co-op-combat-http");

  assert.notEqual(roomId, null);

  await dispatchJsonRequest(adapter, {
    body: {
      playerId: "leader-player",
      ready: true,
      type: "join-room",
      username: "leader"
    },
    method: "POST",
    nowMs: 0,
    pathname: `/experiences/duck-hunt/coop/rooms/${roomId}/commands`
  });
  await dispatchJsonRequest(adapter, {
    body: {
      playerId: "wing-player",
      ready: true,
      type: "join-room",
      username: "wing"
    },
    method: "POST",
    nowMs: 0,
    pathname: `/experiences/duck-hunt/coop/rooms/${roomId}/commands`
  });
  await dispatchJsonRequest(adapter, {
    body: {
      playerId: "leader-player",
      type: "start-session"
    },
    method: "POST",
    nowMs: 10,
    pathname: `/experiences/duck-hunt/coop/rooms/${roomId}/commands`
  });

  const fireShotResult = await dispatchJsonRequest(adapter, {
    body: {
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
      playerId: "leader-player",
      type: "fire-shot",
      weaponId: "semiautomatic-pistol"
    },
    method: "POST",
    nowMs: 60,
    pathname: `/experiences/duck-hunt/coop/rooms/${roomId}/commands`
  });
  const nextFireShotResult = await dispatchJsonRequest(adapter, {
    body: {
      aimDirection: {
        x: 0,
        y: 0,
        z: -1
      },
      clientEstimatedSimulationTimeMs: 100,
      clientShotSequence: 2,
      origin: {
        x: 0,
        y: 1.35,
        z: 0
      },
      playerId: "leader-player",
      type: "fire-shot",
      weaponId: "semiautomatic-pistol"
    },
    method: "POST",
    nowMs: 110,
    pathname: `/experiences/duck-hunt/coop/rooms/${roomId}/commands`
  });

  assert.equal(fireShotResult.handled, true);
  assert.equal(fireShotResult.response.statusCode, 200);
  assert.equal(nextFireShotResult.handled, true);
  assert.equal(nextFireShotResult.response.statusCode, 200);
  const leaderSnapshot = nextFireShotResult.response.json.room.players.find(
    (playerSnapshot) => playerSnapshot.playerId === "leader-player"
  );

  assert.notEqual(leaderSnapshot, undefined);
  assert.equal(
    leaderSnapshot.activity.lastAcknowledgedShotSequence,
    1
  );
  assert.equal(nextFireShotResult.response.json.room.session.teamShotsFired, 1);
});
