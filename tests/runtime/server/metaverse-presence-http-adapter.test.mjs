import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import {
  createMetaversePlayerId,
  createUsername
} from "@webgpu-metaverse/shared";

import { MetaversePresenceHttpAdapter } from "../../../server/dist/metaverse/adapters/metaverse-presence-http-adapter.js";
import { MetaversePresenceRuntime } from "../../../server/dist/metaverse/classes/metaverse-presence-runtime.js";

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

test("MetaversePresenceHttpAdapter handles join commands and snapshot polling", async () => {
  const adapter = new MetaversePresenceHttpAdapter(new MetaversePresenceRuntime());
  const playerId = createMetaversePlayerId("harbor-pilot-1");
  const username = createUsername("Harbor Pilot");

  assert.notEqual(playerId, null);
  assert.notEqual(username, null);

  const joinRequest = createRequest("POST", {
    characterId: "metaverse-mannequin-v1",
    playerId,
    position: {
      x: 0,
      y: 1.62,
      z: 24
    },
    stateSequence: 1,
    type: "join-presence",
    username,
    yawRadians: 0
  });
  const joinResponse = createResponseCapture();
  const joinPromise = adapter.handleRequest(
    joinRequest,
    joinResponse,
    new URL("http://127.0.0.1:3210/metaverse/presence/commands"),
    0
  );

  joinRequest.emitBody();

  const joinHandled = await joinPromise;

  assert.equal(joinHandled, true);
  assert.equal(joinResponse.statusCode, 200);
  assert.equal(joinResponse.json.type, "presence-roster");
  assert.equal(joinResponse.json.roster.players[0]?.playerId, "harbor-pilot-1");

  const pollResponse = createResponseCapture();
  const pollHandled = await adapter.handleRequest(
    { method: "GET" },
    pollResponse,
    new URL("http://127.0.0.1:3210/metaverse/presence?playerId=harbor-pilot-1"),
    100
  );

  assert.equal(pollHandled, true);
  assert.equal(pollResponse.statusCode, 200);
  assert.equal(pollResponse.json.type, "presence-roster");
  assert.equal(pollResponse.json.roster.players.length, 1);
});

test("MetaversePresenceHttpAdapter returns conflict for unknown observers", async () => {
  const adapter = new MetaversePresenceHttpAdapter(new MetaversePresenceRuntime());
  const response = createResponseCapture();
  const handled = await adapter.handleRequest(
    { method: "GET" },
    response,
    new URL("http://127.0.0.1:3210/metaverse/presence?playerId=missing-player"),
    0
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 409);
  assert.equal(response.json.error, "Unknown metaverse player: missing-player");
});
