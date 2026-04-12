import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import {
  createCoopPlayerId,
  createCoopRoomId,
  createCoopRoomSnapshotEvent,
  createCoopSessionId,
  createMilliseconds,
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

function flushAsyncWork() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

function createRoomSnapshotEvent({
  playerId,
  roomId,
  sessionId,
  tick,
  phase = "active",
  playerHits = 0,
  playerShots = 0,
  lastAcknowledgedShotSequence = 0,
  lastOutcome = null,
  birdBehavior = "glide"
}) {
  return createCoopRoomSnapshotEvent({
    birds: [
      {
        behavior: birdBehavior,
        birdId: "shared-bird-1",
        headingRadians: 0,
        label: "Shared Bird 1",
        position: {
          x: 0,
          y: 1.35,
          z: -18
        },
        radius: 0.9,
        scale: 1,
        visible: true,
        wingPhase: tick * 0.4
      }
    ],
    capacity: 4,
    players: [
      {
        activity: {
          hitsLanded: playerHits,
          lastAcknowledgedShotSequence,
          lastHitBirdId: playerHits > 0 ? "shared-bird-1" : null,
          lastOutcome,
          lastShotTick: lastAcknowledgedShotSequence > 0 ? tick : null,
          scatterEventsCaused: lastOutcome === "scatter" ? 1 : 0,
          shotsFired: playerShots
        },
        connected: true,
        playerId,
        presence: {
          aimDirection: {
            x: 0,
            y: 0,
            z: -1
          },
          pitchRadians: 0,
          position: {
            x: 0,
            y: 1.35,
            z: 0
          },
          weaponId: "semiautomatic-pistol",
          yawRadians: 0
        },
        ready: true,
        username: "coop-user"
      }
    ],
    roomId,
    session: {
      birdsCleared: birdBehavior === "downed" ? 1 : 0,
      birdsRemaining: birdBehavior === "downed" ? 0 : 1,
      leaderPlayerId: playerId,
      phase,
      requiredReadyPlayerCount: 2,
      sessionId,
      teamHitsLanded: playerHits,
      teamShotsFired: playerShots
    },
    tick: {
      currentTick: tick,
      serverTimeMs: tick * 50,
      tickIntervalMs: 50
    }
  });
}

test("CoopRoomClient joins, polls shared snapshots, and posts fire-shot commands", async () => {
  const { CoopRoomClient } = await clientLoader.load("/src/network/index.ts");
  const roomId = createCoopRoomId("co-op-harbor");
  const sessionId = createCoopSessionId("co-op-harbor-session-1");
  const playerId = createCoopPlayerId("coop-player-1");
  const username = createUsername("coop-user");

  assert.notEqual(roomId, null);
  assert.notEqual(sessionId, null);
  assert.notEqual(playerId, null);
  assert.notEqual(username, null);

  const requests = [];
  const scheduledPolls = [];
  const clearedTimers = [];
  const responseQueue = [
    createRoomSnapshotEvent({
      playerId,
      roomId,
      sessionId,
      tick: 0,
      phase: "waiting-for-players"
    }),
    createRoomSnapshotEvent({
      playerId,
      roomId,
      sessionId,
      tick: 0,
      phase: "waiting-for-players"
    }),
    createRoomSnapshotEvent({
      playerId,
      roomId,
      sessionId,
      tick: 0,
      phase: "active"
    }),
    createRoomSnapshotEvent({
      playerId,
      roomId,
      sessionId,
      tick: 1
    }),
    createRoomSnapshotEvent({
      playerId,
      roomId,
      sessionId,
      tick: 2,
      playerHits: 1,
      playerShots: 1,
      lastAcknowledgedShotSequence: 1,
      lastOutcome: "hit",
      birdBehavior: "downed"
    }),
    createRoomSnapshotEvent({
      playerId,
      roomId,
      sessionId,
      tick: 2,
      playerHits: 1,
      playerShots: 1,
      lastAcknowledgedShotSequence: 1,
      lastOutcome: "hit",
      birdBehavior: "downed"
    })
  ];
  const roomClient = new CoopRoomClient(
    {
      defaultPollIntervalMs: createMilliseconds(75),
      roomCollectionPath: "/experiences/duck-hunt/coop/rooms",
      roomId,
      serverOrigin: "http://127.0.0.1:3210"
    },
    {
      transport: {
        async pollRoomSnapshot(nextPlayerId) {
          const queuedResponse = responseQueue.shift();

          assert.notEqual(queuedResponse, undefined);
          requests.push({
            playerId: nextPlayerId,
            type: "poll"
          });

          return queuedResponse;
        },
        async sendCommand(command, options) {
          const queuedResponse = responseQueue.shift();

          assert.notEqual(queuedResponse, undefined);
          requests.push({
            command,
            options: options ?? null,
            type: "command"
          });

          return queuedResponse;
        }
      },
      clearTimeout(handle) {
        clearedTimers.push(handle);
      },
      setTimeout(callback, delay) {
        scheduledPolls.push({
          callback,
          delay
        });
        return scheduledPolls.length;
      }
    }
  );

  const joinedSnapshot = await roomClient.ensureJoined({
    playerId,
    ready: false,
    username
  });

  assert.equal(joinedSnapshot.session.phase, "waiting-for-players");
  assert.equal(roomClient.statusSnapshot.joined, true);
  assert.equal(roomClient.statusSnapshot.state, "connected");
  assert.equal(requests[0]?.type, "command");
  assert.equal(requests[0]?.command?.type, "join-room");
  assert.equal(requests[0]?.command?.ready, false);
  assert.equal(scheduledPolls[0]?.delay, 0);

  const readySnapshot = await roomClient.setPlayerReady(true);

  assert.equal(readySnapshot.session.phase, "waiting-for-players");
  assert.equal(requests[1]?.type, "command");
  assert.equal(requests[1]?.command?.type, "set-player-ready");

  const startedSnapshot = await roomClient.startSession();

  assert.equal(startedSnapshot.session.phase, "active");
  assert.equal(requests[2]?.type, "command");
  assert.equal(requests[2]?.command?.type, "start-session");

  scheduledPolls.shift()?.callback();
  await flushAsyncWork();

  assert.equal(roomClient.roomSnapshot?.tick.currentTick, 1);
  assert.equal(roomClient.roomSnapshot?.tick.serverTimeMs, 50);
  assert.equal(requests[3]?.type, "poll");
  assert.equal(requests[3]?.playerId, playerId);
  assert.equal(scheduledPolls[0]?.delay, 50);

  roomClient.fireShot(
    { x: 0, y: 1.35, z: 0 },
    { x: 0, y: 0, z: -1 }
  );
  await flushAsyncWork();

  assert.equal(requests[4]?.type, "command");
  assert.equal(requests[4]?.command?.type, "fire-shot");
  assert.equal(
    roomClient.roomSnapshot?.players[0]?.activity.lastAcknowledgedShotSequence,
    1
  );
  assert.equal(roomClient.roomSnapshot?.players[0]?.activity.lastOutcome, "hit");

  roomClient.dispose();
  await flushAsyncWork();

  assert.equal(roomClient.statusSnapshot.state, "disposed");
  assert.ok(clearedTimers.length >= 1);
  assert.equal(requests[5]?.type, "command");
  assert.equal(requests[5]?.command?.type, "leave-room");
  assert.equal(requests[5]?.options?.deliveryHint, "best-effort-disconnect");
});

test("CoopRoomClient posts leader kick-player commands", async () => {
  const { CoopRoomClient } = await clientLoader.load("/src/network/index.ts");
  const roomId = createCoopRoomId("co-op-harbor");
  const sessionId = createCoopSessionId("co-op-harbor-session-1");
  const playerId = createCoopPlayerId("leader-player-1");
  const targetPlayerId = createCoopPlayerId("player-2");
  const username = createUsername("coop-user");

  assert.notEqual(roomId, null);
  assert.notEqual(sessionId, null);
  assert.notEqual(playerId, null);
  assert.notEqual(targetPlayerId, null);
  assert.notEqual(username, null);

  const requests = [];
  const responseQueue = [
    createRoomSnapshotEvent({
      playerId,
      roomId,
      sessionId,
      tick: 0,
      phase: "waiting-for-players"
    }),
    createRoomSnapshotEvent({
      playerId,
      roomId,
      sessionId,
      tick: 0,
      phase: "waiting-for-players"
    }),
    createRoomSnapshotEvent({
      playerId,
      roomId,
      sessionId,
      tick: 0,
      phase: "waiting-for-players"
    })
  ];
  const roomClient = new CoopRoomClient(
    {
      defaultPollIntervalMs: createMilliseconds(75),
      roomCollectionPath: "/experiences/duck-hunt/coop/rooms",
      roomId,
      serverOrigin: "http://127.0.0.1:3210"
    },
    {
      transport: {
        async pollRoomSnapshot() {
          throw new Error("Unexpected co-op room poll.");
        },
        async sendCommand(command) {
          const queuedResponse = responseQueue.shift();

          assert.notEqual(queuedResponse, undefined);
          requests.push({
            command,
            type: "command"
          });

          return queuedResponse;
        }
      },
      setTimeout() {
        return 1;
      },
      clearTimeout() {}
    }
  );

  await roomClient.ensureJoined({
    playerId,
    ready: true,
    username
  });
  await roomClient.kickPlayer(targetPlayerId);
  roomClient.dispose();
  await flushAsyncWork();

  assert.equal(requests[1]?.command?.type, "kick-player");
  assert.equal(requests[1]?.command?.targetPlayerId, targetPlayerId);
});

test("CoopRoomClient accepts a new room session even when its tick restarts", async () => {
  const { CoopRoomClient } = await clientLoader.load("/src/network/index.ts");
  const roomId = createCoopRoomId("co-op-harbor");
  const activeSessionId = createCoopSessionId("co-op-harbor-session-1");
  const freshSessionId = createCoopSessionId("co-op-harbor-session-2");
  const playerId = createCoopPlayerId("coop-player-1");
  const username = createUsername("coop-user");

  assert.notEqual(roomId, null);
  assert.notEqual(activeSessionId, null);
  assert.notEqual(freshSessionId, null);
  assert.notEqual(playerId, null);
  assert.notEqual(username, null);

  const requests = [];
  const scheduledPolls = [];
  const responseQueue = [
    createRoomSnapshotEvent({
      playerId,
      roomId,
      sessionId: activeSessionId,
      tick: 4,
      phase: "active"
    }),
    createRoomSnapshotEvent({
      playerId,
      roomId,
      sessionId: freshSessionId,
      tick: 0,
      phase: "waiting-for-players"
    })
  ];
  const roomClient = new CoopRoomClient(
    {
      defaultPollIntervalMs: createMilliseconds(75),
      roomCollectionPath: "/experiences/duck-hunt/coop/rooms",
      roomId,
      serverOrigin: "http://127.0.0.1:3210"
    },
    {
      transport: {
        async pollRoomSnapshot(nextPlayerId) {
          const queuedResponse = responseQueue.shift();

          assert.notEqual(queuedResponse, undefined);
          requests.push({
            playerId: nextPlayerId,
            type: "poll"
          });

          return queuedResponse;
        },
        async sendCommand(command) {
          const queuedResponse = responseQueue.shift();

          assert.notEqual(queuedResponse, undefined);
          requests.push({
            command,
            type: "command"
          });

          return queuedResponse;
        }
      },
      setTimeout(callback, delay) {
        scheduledPolls.push({
          callback,
          delay
        });
        return scheduledPolls.length;
      },
      clearTimeout() {}
    }
  );

  await roomClient.ensureJoined({
    playerId,
    ready: false,
    username
  });

  scheduledPolls.shift()?.callback();
  await flushAsyncWork();

  assert.equal(requests[1]?.type, "poll");
  assert.equal(requests[1]?.playerId, playerId);
  assert.equal(roomClient.roomSnapshot?.session.sessionId, freshSessionId);
  assert.equal(roomClient.roomSnapshot?.tick.currentTick, 0);
  assert.equal(roomClient.roomSnapshot?.session.phase, "waiting-for-players");
});

test("CoopRoomClient stops polling when the server reports local room membership loss", async () => {
  const { CoopRoomClient } = await clientLoader.load("/src/network/index.ts");
  const roomId = createCoopRoomId("co-op-harbor");
  const sessionId = createCoopSessionId("co-op-harbor-session-1");
  const playerId = createCoopPlayerId("coop-player-1");
  const username = createUsername("coop-user");

  assert.notEqual(roomId, null);
  assert.notEqual(sessionId, null);
  assert.notEqual(playerId, null);
  assert.notEqual(username, null);

  const scheduledPolls = [];
  const roomClient = new CoopRoomClient(
    {
      defaultPollIntervalMs: createMilliseconds(75),
      roomCollectionPath: "/experiences/duck-hunt/coop/rooms",
      roomId,
      serverOrigin: "http://127.0.0.1:3210"
    },
    {
      transport: {
        async pollRoomSnapshot(nextPlayerId) {
          throw new Error(`Unknown co-op player: ${nextPlayerId}`);
        },
        async sendCommand() {
          return createRoomSnapshotEvent({
            playerId,
            roomId,
            sessionId,
            tick: 0,
            phase: "waiting-for-players"
          });
        }
      },
      setTimeout(callback, delay) {
        scheduledPolls.push({
          callback,
          delay
        });
        return scheduledPolls.length;
      },
      clearTimeout() {}
    }
  );

  await roomClient.ensureJoined({
    playerId,
    ready: false,
    username
  });

  assert.equal(scheduledPolls.length, 1);

  scheduledPolls.shift()?.callback();
  await flushAsyncWork();

  assert.equal(roomClient.statusSnapshot.joined, false);
  assert.equal(roomClient.statusSnapshot.state, "error");
  assert.equal(
    roomClient.statusSnapshot.lastError,
    "You are no longer in the co-op room."
  );
  assert.equal(scheduledPolls.length, 0);
});

test("CoopRoomClient reports an outdated room snapshot contract instead of accepting it", async () => {
  const { CoopRoomClient } = await clientLoader.load("/src/network/index.ts");
  const roomId = createCoopRoomId("co-op-harbor");
  const sessionId = createCoopSessionId("co-op-harbor-session-1");
  const playerId = createCoopPlayerId("coop-player-1");
  const username = createUsername("coop-user");

  assert.notEqual(roomId, null);
  assert.notEqual(sessionId, null);
  assert.notEqual(playerId, null);
  assert.notEqual(username, null);

  const roomClient = new CoopRoomClient(
    {
      defaultPollIntervalMs: createMilliseconds(75),
      roomCollectionPath: "/experiences/duck-hunt/coop/rooms",
      roomId,
      serverOrigin: "http://127.0.0.1:3210"
    },
    {
      transport: {
        async pollRoomSnapshot() {
          throw new Error("Unexpected co-op room poll.");
        },
        async sendCommand() {
          throw new Error(
            "Co-op room response did not include the current room snapshot fields."
          );
        }
      },
      setTimeout() {
        return 1;
      },
      clearTimeout() {}
    }
  );

  await assert.rejects(
    () =>
      roomClient.ensureJoined({
        playerId,
        ready: false,
        username
      }),
    /current room snapshot fields/
  );
  assert.equal(roomClient.statusSnapshot.state, "error");
  assert.match(roomClient.statusSnapshot.lastError ?? "", /current room snapshot fields/);
});
