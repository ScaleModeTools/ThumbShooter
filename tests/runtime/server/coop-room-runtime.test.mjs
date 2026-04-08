import assert from "node:assert/strict";
import test from "node:test";

import {
  createCoopBirdId,
  createCoopFireShotCommand,
  createCoopJoinRoomCommand,
  createCoopLeaveRoomCommand,
  createCoopPlayerId,
  createCoopRoomId,
  createCoopSessionId,
  createCoopSetPlayerReadyCommand,
  createMilliseconds,
  createUsername
} from "@thumbshooter/shared";

import { CoopRoomRuntime } from "../../../server/dist/classes/coop-room-runtime.js";

function requireValue(value, label) {
  assert.notEqual(value, null, `${label} should resolve`);
  return value;
}

function createBirdSeed(id, label, x, y, velocityX = 0, velocityY = 0) {
  return {
    birdId: requireValue(createCoopBirdId(id), "birdId"),
    glideVelocity: {
      x: velocityX,
      y: velocityY
    },
    label,
    radius: 0.08,
    scale: 1,
    spawn: {
      x,
      y
    },
    wingSpeed: 6
  };
}

function createRuntimeConfig(overrides = {}) {
  return {
    arenaBounds: {
      minX: 0.05,
      maxX: 0.95,
      minY: 0.05,
      maxY: 0.95
    },
    birds: [
      createBirdSeed("bird-1", "Bird 1", 0.25, 0.25),
      createBirdSeed("bird-2", "Bird 2", 0.75, 0.7, -0.04, 0.03)
    ],
    capacity: 4,
    hitRadius: 0.09,
    movement: {
      downedDriftVelocityY: 0.18,
      downedDurationMs: createMilliseconds(320),
      scatterDurationMs: createMilliseconds(180),
      scatterSpeed: 0.22
    },
    requiredReadyPlayerCount: 1,
    roomId: requireValue(createCoopRoomId("harbor-room"), "roomId"),
    scatterRadius: 0.24,
    sessionId: requireValue(
      createCoopSessionId("harbor-room-session"),
      "sessionId"
    ),
    tickIntervalMs: createMilliseconds(50),
    ...overrides
  };
}

test("CoopRoomRuntime advances only on server ticks and waits for ready players before activation", () => {
  const runtime = new CoopRoomRuntime(
    createRuntimeConfig({
      birds: [createBirdSeed("bird-1", "Bird 1", 0.25, 0.25)],
      requiredReadyPlayerCount: 2
    })
  );
  const roomId = runtime.roomId;
  const playerOneId = requireValue(createCoopPlayerId("player-1"), "playerOneId");
  const playerTwoId = requireValue(createCoopPlayerId("player-2"), "playerTwoId");

  runtime.acceptCommand(
    createCoopJoinRoomCommand({
      playerId: playerOneId,
      ready: true,
      roomId,
      username: requireValue(createUsername("alpha"), "username")
    }),
    0
  );
  runtime.acceptCommand(
    createCoopJoinRoomCommand({
      playerId: playerTwoId,
      ready: false,
      roomId,
      username: requireValue(createUsername("bravo"), "username")
    }),
    0
  );

  const waitingSnapshot = runtime.advanceTo(50);

  assert.equal(waitingSnapshot.tick.currentTick, 1);
  assert.equal(waitingSnapshot.tick.owner, "server");
  assert.equal(waitingSnapshot.session.phase, "waiting-for-players");

  runtime.acceptCommand(
    createCoopSetPlayerReadyCommand({
      playerId: playerTwoId,
      ready: true,
      roomId
    }),
    60
  );

  const activeSnapshot = runtime.advanceTo(100);

  assert.equal(activeSnapshot.tick.currentTick, 2);
  assert.equal(activeSnapshot.session.phase, "active");
  assert.equal(activeSnapshot.players.filter((player) => player.ready).length, 2);
});

test("CoopRoomRuntime applies shared hits once per acknowledged client shot sequence", () => {
  const runtime = new CoopRoomRuntime(
    createRuntimeConfig({
      birds: [createBirdSeed("bird-1", "Bird 1", 0.25, 0.25)]
    })
  );
  const roomId = runtime.roomId;
  const playerId = requireValue(createCoopPlayerId("player-1"), "playerId");

  runtime.acceptCommand(
    createCoopJoinRoomCommand({
      playerId,
      ready: true,
      roomId,
      username: requireValue(createUsername("alpha"), "username")
    }),
    0
  );
  runtime.advanceTo(50);
  runtime.acceptCommand(
    createCoopFireShotCommand({
      aimPoint: {
        x: 0.25,
        y: 0.25
      },
      clientShotSequence: 1,
      playerId,
      roomId
    }),
    60
  );
  runtime.acceptCommand(
    createCoopFireShotCommand({
      aimPoint: {
        x: 0.25,
        y: 0.25
      },
      clientShotSequence: 1,
      playerId,
      roomId
    }),
    65
  );

  const resolvedSnapshot = runtime.advanceTo(100);
  const playerSnapshot = resolvedSnapshot.players[0];
  const birdSnapshot = resolvedSnapshot.birds[0];

  assert.equal(resolvedSnapshot.session.phase, "completed");
  assert.equal(resolvedSnapshot.session.teamShotsFired, 1);
  assert.equal(resolvedSnapshot.session.teamHitsLanded, 1);
  assert.equal(playerSnapshot?.activity.shotsFired, 1);
  assert.equal(playerSnapshot?.activity.hitsLanded, 1);
  assert.equal(playerSnapshot?.activity.lastAcknowledgedShotSequence, 1);
  assert.equal(playerSnapshot?.activity.lastOutcome, "hit");
  assert.equal(birdSnapshot?.behavior, "downed");
  assert.equal(birdSnapshot?.lastInteractionByPlayerId, playerId);
  assert.equal(birdSnapshot?.lastInteractionTick, 2);
});

test("CoopRoomRuntime records scatter outcomes against the shared bird field", () => {
  const runtime = new CoopRoomRuntime(
    createRuntimeConfig({
      hitRadius: 0.03,
      scatterRadius: 0.22
    })
  );
  const roomId = runtime.roomId;
  const playerId = requireValue(createCoopPlayerId("player-9"), "playerId");

  runtime.acceptCommand(
    createCoopJoinRoomCommand({
      playerId,
      ready: true,
      roomId,
      username: requireValue(createUsername("charlie"), "username")
    }),
    0
  );
  runtime.advanceTo(50);
  runtime.acceptCommand(
    createCoopFireShotCommand({
      aimPoint: {
        x: 0.18,
        y: 0.22
      },
      clientShotSequence: 3,
      playerId,
      roomId
    }),
    60
  );

  const scatterSnapshot = runtime.advanceTo(100);
  const playerSnapshot = scatterSnapshot.players[0];
  const scatteredBird = scatterSnapshot.birds.find(
    (bird) => bird.lastInteractionByPlayerId === playerId
  );

  assert.equal(scatterSnapshot.session.phase, "active");
  assert.equal(scatterSnapshot.session.teamShotsFired, 1);
  assert.equal(scatterSnapshot.session.teamHitsLanded, 0);
  assert.equal(playerSnapshot?.activity.lastOutcome, "scatter");
  assert.equal(playerSnapshot?.activity.scatterEventsCaused, 1);
  assert.equal(scatteredBird?.behavior, "scatter");
  assert.equal(scatteredBird?.lastInteractionTick, 2);
});

test("CoopRoomRuntime removes waiting-room leavers and marks active-session leavers disconnected", () => {
  const runtime = new CoopRoomRuntime(
    createRuntimeConfig({
      birds: [createBirdSeed("bird-1", "Bird 1", 0.25, 0.25)],
      requiredReadyPlayerCount: 2
    })
  );
  const roomId = runtime.roomId;
  const playerOneId = requireValue(createCoopPlayerId("player-1"), "playerOneId");
  const playerTwoId = requireValue(createCoopPlayerId("player-2"), "playerTwoId");

  runtime.acceptCommand(
    createCoopJoinRoomCommand({
      playerId: playerOneId,
      ready: true,
      roomId,
      username: requireValue(createUsername("alpha"), "username")
    }),
    0
  );
  runtime.acceptCommand(
    createCoopJoinRoomCommand({
      playerId: playerTwoId,
      ready: false,
      roomId,
      username: requireValue(createUsername("bravo"), "username")
    }),
    0
  );
  runtime.acceptCommand(
    createCoopLeaveRoomCommand({
      playerId: playerTwoId,
      roomId
    }),
    10
  );

  const waitingSnapshot = runtime.advanceTo(50);

  assert.equal(waitingSnapshot.session.phase, "waiting-for-players");
  assert.equal(waitingSnapshot.players.length, 1);

  runtime.acceptCommand(
    createCoopJoinRoomCommand({
      playerId: playerTwoId,
      ready: true,
      roomId,
      username: requireValue(createUsername("bravo"), "username")
    }),
    60
  );

  const activeSnapshot = runtime.advanceTo(100);

  assert.equal(activeSnapshot.session.phase, "active");

  runtime.acceptCommand(
    createCoopLeaveRoomCommand({
      playerId: playerTwoId,
      roomId
    }),
    110
  );

  const disconnectedSnapshot = runtime.advanceTo(150);
  const disconnectedPlayer = disconnectedSnapshot.players.find(
    (playerSnapshot) => playerSnapshot.playerId === playerTwoId
  );

  assert.equal(disconnectedPlayer?.connected, false);
  assert.equal(disconnectedPlayer?.ready, false);
  assert.equal(disconnectedSnapshot.session.phase, "active");
});
