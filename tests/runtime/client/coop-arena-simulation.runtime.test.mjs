import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import {
  createCoopPlayerId,
  createCoopRoomId,
  createCoopRoomSnapshot,
  createCoopSessionId,
  createUsername
} from "@thumbshooter/shared";

import { createClientModuleLoader } from "./load-client-module.mjs";
import { createTrackedHandSnapshot } from "./tracked-hand-pose-fixture.mjs";

let clientLoader;

before(async () => {
  clientLoader = await createClientModuleLoader();
});

after(async () => {
  await clientLoader?.close();
});

function createRoomSnapshot({
  playerId,
  roomId,
  sessionId,
  tick,
  playerHits = 0,
  playerShots = 0,
  lastAcknowledgedShotSequence = 0,
  lastOutcome = null,
  birdBehavior = "glide"
}) {
  return createCoopRoomSnapshot({
    birds: [
      {
        behavior: birdBehavior,
        birdId: "shared-bird-1",
        headingRadians: 0,
        label: "Shared Bird 1",
        position: {
          x: 0.25,
          y: 0.4
        },
        radius: 0.08,
        scale: 1,
        visible: true,
        wingPhase: tick * 0.3
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
        ready: true,
        username: "coop-user"
      }
    ],
    roomId,
    session: {
      birdsCleared: birdBehavior === "downed" ? 1 : 0,
      birdsRemaining: birdBehavior === "downed" ? 0 : 1,
      phase: "active",
      requiredReadyPlayerCount: 2,
      sessionId,
      teamHitsLanded: playerHits,
      teamShotsFired: playerShots
    },
    tick: {
      currentTick: tick,
      tickIntervalMs: 50
    }
  });
}

test("CoopArenaSimulation projects authoritative birds and confirms hits from room snapshots", async () => {
  const { CoopArenaSimulation } = await clientLoader.load("/src/game/index.ts");
  const roomId = createCoopRoomId("co-op-harbor");
  const sessionId = createCoopSessionId("co-op-harbor-session-1");
  const playerId = createCoopPlayerId("coop-player-1");
  const username = createUsername("coop-user");

  assert.notEqual(roomId, null);
  assert.notEqual(sessionId, null);
  assert.notEqual(playerId, null);
  assert.notEqual(username, null);

  const firedShots = [];
  const emittedSignals = [];
  const roomSource = {
    roomId,
    roomSnapshot: createRoomSnapshot({
      playerId,
      roomId,
      sessionId,
      tick: 0
    }),
    fireShot(aimPoint) {
      firedShots.push(aimPoint);
    }
  };
  const simulation = new CoopArenaSimulation(
    {
      xCoefficients: [1, 0, 0],
      yCoefficients: [0, 1, 0]
    },
    roomSource,
    undefined,
    {
      emitGameplaySignal(signal) {
        emittedSignals.push(signal);
      },
      playerId
    }
  );

  const targetedSnapshot = simulation.advance(
    createTrackedHandSnapshot(1, 0.25, 0.4),
    0
  );

  assert.equal(targetedSnapshot.session.mode, "co-op");
  assert.equal(targetedSnapshot.session.phase, "active");
  assert.equal(targetedSnapshot.targetFeedback.state, "targeted");
  assert.equal(simulation.enemyRenderStates[0]?.behavior, "glide");

  const firedSnapshot = simulation.advance(
    createTrackedHandSnapshot(2, 0.25, 0.4, 1),
    16
  );

  assert.equal(firedSnapshot.weapon.shotsFired, 1);
  assert.equal(firedShots.length, 1);
  assert.deepEqual(emittedSignals, [
    {
      type: "weapon-fired",
      weaponId: "semiautomatic-pistol"
    }
  ]);

  roomSource.roomSnapshot = createRoomSnapshot({
    playerId,
    roomId,
    sessionId,
    tick: 1,
    playerHits: 1,
    playerShots: 1,
    lastAcknowledgedShotSequence: 1,
    lastOutcome: "hit",
    birdBehavior: "downed"
  });

  const resolvedSnapshot = simulation.advance(
    createTrackedHandSnapshot(3, 0.25, 0.4),
    64
  );

  assert.equal(resolvedSnapshot.weapon.hitsLanded, 1);
  assert.equal(resolvedSnapshot.targetFeedback.state, "hit");
  assert.equal(simulation.enemyRenderStates[0]?.behavior, "downed");
  assert.equal(simulation.worldTimeMs, 50);
  assert.deepEqual(emittedSignals, [
    {
      type: "weapon-fired",
      weaponId: "semiautomatic-pistol"
    },
    {
      enemyId: "shared-bird-1",
      type: "enemy-hit-confirmed"
    }
  ]);
});
