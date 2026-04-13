import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import {
  createCoopPlayerId,
  createCoopRoomId,
  createCoopRoomSnapshotEvent,
  createCoopSessionId,
  createCoopSyncPlayerPresenceCommand,
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

function createManualTimerScheduler() {
  const clearedHandles = new Set();
  const scheduledTasks = [];
  let nextHandle = 1;

  return Object.freeze({
    clearTimeout(handle) {
      clearedHandles.add(handle);
    },
    get pendingTasks() {
      return scheduledTasks.filter(
        (task) => !clearedHandles.has(task.handle)
      );
    },
    runNext(delay) {
      const taskIndex = scheduledTasks.findIndex(
        (task) =>
          !clearedHandles.has(task.handle) &&
          (delay === undefined || task.delay === delay)
      );

      assert.notEqual(taskIndex, -1);

      const [task] = scheduledTasks.splice(taskIndex, 1);

      assert.notEqual(task, undefined);
      clearedHandles.add(task.handle);
      task.callback();
    },
    setTimeout(callback, delay) {
      const handle = nextHandle;

      nextHandle += 1;
      scheduledTasks.push({
        callback,
        delay,
        handle
      });

      return handle;
    }
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
  assert.equal(requests[4]?.command?.clientEstimatedSimulationTimeMs, 50);
  assert.equal(requests[4]?.command?.weaponId, "semiautomatic-pistol");
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

test("CoopRoomClient exposes Duck Hunt player-presence datagram support as a separate seam", async () => {
  const { CoopRoomClient } = await clientLoader.load("/src/network/index.ts");
  const roomId = createCoopRoomId("co-op-harbor");
  const sessionId = createCoopSessionId("co-op-harbor-session-1");
  const playerId = createCoopPlayerId("coop-player-1");

  assert.notEqual(roomId, null);
  assert.notEqual(sessionId, null);
  assert.notEqual(playerId, null);

  let datagramTransportDisposed = false;
  const roomClient = new CoopRoomClient(
    {
      defaultPollIntervalMs: createMilliseconds(75),
      roomCollectionPath: "/experiences/duck-hunt/coop/rooms",
      roomId,
      serverOrigin: "http://127.0.0.1:3210"
    },
    {
      playerPresenceDatagramTransport: {
        async sendPlayerPresenceDatagram() {},
        dispose() {
          datagramTransportDisposed = true;
        }
      },
      transport: {
        async pollRoomSnapshot() {
          return createRoomSnapshotEvent({
            playerId,
            roomId,
            sessionId,
            tick: 0
          });
        },
        async sendCommand() {
          return createRoomSnapshotEvent({
            playerId,
            roomId,
            sessionId,
            tick: 0
          });
        }
      }
    }
  );

  assert.equal(roomClient.supportsCoopPlayerPresenceDatagrams, true);

  roomClient.dispose();
  await flushAsyncWork();

  assert.equal(datagramTransportDisposed, true);
});

test("CoopRoomClient prefers player-presence datagrams over reliable command transport when available", async () => {
  const { CoopRoomClient } = await clientLoader.load("/src/network/index.ts");
  const roomId = createCoopRoomId("co-op-harbor");
  const sessionId = createCoopSessionId("co-op-harbor-session-1");
  const playerId = createCoopPlayerId("coop-player-1");
  const username = createUsername("coop-user");

  assert.notEqual(roomId, null);
  assert.notEqual(sessionId, null);
  assert.notEqual(playerId, null);
  assert.notEqual(username, null);

  const scheduledTasks = [];
  const sentCommands = [];
  const sentDatagrams = [];
  const roomClient = new CoopRoomClient(
    {
      defaultPollIntervalMs: createMilliseconds(75),
      roomCollectionPath: "/experiences/duck-hunt/coop/rooms",
      roomId,
      serverOrigin: "http://127.0.0.1:3210"
    },
    {
      playerPresenceDatagramTransport: {
        async sendPlayerPresenceDatagram(command) {
          sentDatagrams.push(command);
        }
      },
      transport: {
        async pollRoomSnapshot() {
          return createRoomSnapshotEvent({
            playerId,
            roomId,
            sessionId,
            tick: 0
          });
        },
        async sendCommand(command) {
          sentCommands.push(command);
          return createRoomSnapshotEvent({
            playerId,
            roomId,
            sessionId,
            tick: 0
          });
        }
      },
      setTimeout(callback, delay) {
        scheduledTasks.push({
          callback,
          delay
        });
        return scheduledTasks.length;
      },
      clearTimeout() {}
    }
  );

  await roomClient.ensureJoined({
    playerId,
    ready: true,
    username
  });

  roomClient.syncPlayerPresence({
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
  });
  roomClient.syncPlayerPresence({
    aimDirection: {
      x: 0.1,
      y: 0.2,
      z: -1
    },
    pitchRadians: 0.2,
    position: {
      x: 1,
      y: 1.5,
      z: -2
    },
    weaponId: "semiautomatic-pistol",
    yawRadians: 0.4
  });

  assert.equal(scheduledTasks.at(-1)?.delay, 50);

  scheduledTasks.pop()?.callback();
  await flushAsyncWork();

  assert.equal(sentDatagrams.length, 1);
  assert.equal(sentCommands.length, 1);
  assert.equal(sentCommands[0]?.type, "join-room");
  assert.equal(roomClient.roomSnapshot?.tick.currentTick, 0);
  assert.equal(roomClient.roomSnapshot?.players[0]?.presence.position.x, 0);
  assert.equal(roomClient.roomSnapshot?.players[0]?.presence.stateSequence, 0);
  assert.equal(roomClient.telemetrySnapshot.playerPresenceDatagramSendFailureCount, 0);
  assert.equal(
    roomClient.telemetrySnapshot.playerPresenceReliableFallbackActive,
    false
  );
  assert.deepEqual(
    sentDatagrams[0],
    createCoopSyncPlayerPresenceCommand({
      aimDirection: {
        x: 0.1,
        y: 0.2,
        z: -1
      },
      pitchRadians: 0.2,
      playerId,
      position: {
        x: 1,
        y: 1.5,
        z: -2
      },
      roomId,
      stateSequence: 2,
      weaponId: "semiautomatic-pistol",
      yawRadians: 0.4
    })
  );
});

test("CoopRoomClient falls back to reliable commands after a player-presence datagram send failure and recovers datagram sends after the cooldown", async () => {
  const { CoopRoomClient } = await clientLoader.load("/src/network/index.ts");
  const roomId = createCoopRoomId("co-op-harbor");
  const sessionId = createCoopSessionId("co-op-harbor-session-1");
  const playerId = createCoopPlayerId("coop-player-1");
  const username = createUsername("coop-user");

  assert.notEqual(roomId, null);
  assert.notEqual(sessionId, null);
  assert.notEqual(playerId, null);
  assert.notEqual(username, null);

  const scheduler = createManualTimerScheduler();
  const sentCommands = [];
  const sentDatagrams = [];
  let remainingDatagramFailures = 1;
  const roomClient = new CoopRoomClient(
    {
      defaultPollIntervalMs: createMilliseconds(75),
      roomCollectionPath: "/experiences/duck-hunt/coop/rooms",
      roomId,
      serverOrigin: "http://127.0.0.1:3210"
    },
    {
      playerPresenceDatagramTransport: {
        async sendPlayerPresenceDatagram(command) {
          sentDatagrams.push(command);
          if (remainingDatagramFailures > 0) {
            remainingDatagramFailures -= 1;
            throw new Error("Datagram transport unavailable.");
          }
        }
      },
      transport: {
        async pollRoomSnapshot() {
          return createRoomSnapshotEvent({
            playerId,
            roomId,
            sessionId,
            tick: 0
          });
        },
        async sendCommand(command) {
          sentCommands.push(command);
          return createRoomSnapshotEvent({
            playerId,
            roomId,
            sessionId,
            tick: 0
          });
        }
      },
      clearTimeout: scheduler.clearTimeout,
      setTimeout: scheduler.setTimeout
    }
  );

  await roomClient.ensureJoined({
    playerId,
    ready: true,
    username
  });

  roomClient.syncPlayerPresence({
    aimDirection: {
      x: 0.1,
      y: 0.2,
      z: -1
    },
    pitchRadians: 0.2,
    position: {
      x: 1,
      y: 1.5,
      z: -2
    },
    weaponId: "semiautomatic-pistol",
    yawRadians: 0.4
  });

  scheduler.runNext(50);
  await flushAsyncWork();

  assert.equal(sentDatagrams.length, 1);
  assert.equal(sentCommands.length, 2);
  assert.equal(sentCommands[1]?.type, "sync-player-presence");
  assert.equal(roomClient.supportsCoopPlayerPresenceDatagrams, false);
  assert.equal(roomClient.roomSnapshot?.tick.currentTick, 0);
  assert.equal(roomClient.telemetrySnapshot.playerPresenceDatagramSendFailureCount, 1);
  assert.equal(
    roomClient.telemetrySnapshot.playerPresenceReliableFallbackActive,
    true
  );
  assert.equal(
    roomClient.telemetrySnapshot.playerPresenceLastTransportError,
    "Datagram transport unavailable."
  );

  scheduler.runNext(50);

  assert.equal(roomClient.supportsCoopPlayerPresenceDatagrams, true);
  assert.equal(
    roomClient.telemetrySnapshot.playerPresenceReliableFallbackActive,
    false
  );
  assert.equal(
    roomClient.telemetrySnapshot.playerPresenceLastTransportError,
    "Datagram transport unavailable."
  );

  roomClient.syncPlayerPresence({
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
  });

  scheduler.runNext(50);
  await flushAsyncWork();

  assert.equal(sentDatagrams.length, 2);
  assert.equal(sentCommands.length, 2);
  assert.equal(sentCommands[1]?.type, "sync-player-presence");
  assert.equal(roomClient.supportsCoopPlayerPresenceDatagrams, true);
  assert.equal(roomClient.telemetrySnapshot.playerPresenceDatagramSendFailureCount, 1);
  assert.equal(
    roomClient.telemetrySnapshot.playerPresenceReliableFallbackActive,
    false
  );
  assert.equal(
    roomClient.telemetrySnapshot.playerPresenceLastTransportError,
    null
  );
  assert.equal(roomClient.roomSnapshot?.tick.currentTick, 0);
  assert.equal(roomClient.roomSnapshot?.players[0]?.presence.position.x, 0);
  assert.equal(roomClient.roomSnapshot?.players[0]?.presence.stateSequence, 0);
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

test("CoopRoomClient prefers snapshot streams, falls back to polling on stream failure, and reconnects with a buffered room timeline", async () => {
  const { CoopRoomClient } = await clientLoader.load("/src/network/index.ts");
  const roomId = createCoopRoomId("co-op-harbor");
  const sessionId = createCoopSessionId("co-op-harbor-session-1");
  const playerId = createCoopPlayerId("coop-player-stream");
  const username = createUsername("coop-stream-user");

  assert.notEqual(roomId, null);
  assert.notEqual(sessionId, null);
  assert.notEqual(playerId, null);
  assert.notEqual(username, null);

  const scheduler = createManualTimerScheduler();
  const streamSubscriptions = [];
  const sentRequests = [];
  const pollResponses = [
    createRoomSnapshotEvent({
      playerId,
      roomId,
      sessionId,
      tick: 2
    })
  ];
  const roomClient = new CoopRoomClient(
    {
      defaultPollIntervalMs: createMilliseconds(75),
      maxBufferedSnapshots: 2,
      roomCollectionPath: "/experiences/duck-hunt/coop/rooms",
      roomId,
      serverOrigin: "http://127.0.0.1:3210",
      snapshotStreamReconnectDelayMs: createMilliseconds(20)
    },
    {
      clearTimeout: scheduler.clearTimeout,
      playerPresenceDatagramTransport: {
        async sendPlayerPresenceDatagram() {},
        dispose() {}
      },
      setTimeout: scheduler.setTimeout,
      snapshotStreamTransport: {
        dispose() {},
        subscribeRoomSnapshots(nextPlayerId, handlers) {
          const subscription = {
            closeCallCount: 0,
            handlers,
            playerId: nextPlayerId
          };

          streamSubscriptions.push(subscription);

          return {
            closed: Promise.resolve(),
            close() {
              subscription.closeCallCount += 1;
            }
          };
        }
      },
      transport: {
        async pollRoomSnapshot(nextPlayerId) {
          const response = pollResponses.shift();

          assert.notEqual(response, undefined);
          sentRequests.push({
            playerId: nextPlayerId,
            type: "poll"
          });
          return response;
        },
        async sendCommand(command, options) {
          sentRequests.push({
            command,
            options: options ?? null,
            type: "command"
          });

          if (command.type === "join-room") {
            return createRoomSnapshotEvent({
              playerId,
              roomId,
              sessionId,
              tick: 0,
              phase: "waiting-for-players"
            });
          }

          if (command.type === "leave-room") {
            return createRoomSnapshotEvent({
              playerId,
              roomId,
              sessionId,
              tick: 2
            });
          }

          throw new Error(`Unexpected command: ${command.type}`);
        }
      }
    }
  );

  await roomClient.ensureJoined({
    playerId,
    ready: false,
    username
  });

  assert.equal(streamSubscriptions.length, 1);
  assert.equal(streamSubscriptions[0]?.playerId, playerId);
  assert.equal(scheduler.pendingTasks.length, 0);
  assert.equal(
    roomClient.telemetrySnapshot.snapshotStream.path,
    "reliable-snapshot-stream"
  );
  assert.equal(roomClient.telemetrySnapshot.snapshotStream.liveness, "subscribed");
  assert.equal(roomClient.telemetrySnapshot.snapshotStream.reconnectCount, 0);

  streamSubscriptions[0]?.handlers.onRoomEvent(
    createRoomSnapshotEvent({
      playerId,
      roomId,
      sessionId,
      tick: 1
    })
  );

  assert.equal(roomClient.roomSnapshotBuffer.length, 2);
  assert.equal(roomClient.roomSnapshotBuffer[1]?.tick.currentTick, 1);

  streamSubscriptions[0]?.handlers.onRoomEvent(
    createRoomSnapshotEvent({
      playerId,
      roomId,
      sessionId,
      tick: 0
    })
  );

  assert.equal(roomClient.roomSnapshotBuffer[1]?.tick.currentTick, 1);

  streamSubscriptions[0]?.handlers.onError(
    new Error("Co-op room snapshot stream failed.")
  );

  assert.equal(roomClient.statusSnapshot.state, "error");
  assert.equal(roomClient.statusSnapshot.joined, true);
  assert.equal(scheduler.pendingTasks.filter((task) => task.delay === 0).length, 1);
  assert.equal(
    scheduler.pendingTasks.filter((task) => task.delay === 20).length,
    1
  );
  assert.equal(roomClient.telemetrySnapshot.snapshotStream.path, "fallback-polling");
  assert.equal(roomClient.telemetrySnapshot.snapshotStream.liveness, "reconnecting");
  assert.equal(roomClient.telemetrySnapshot.snapshotStream.reconnectCount, 1);
  assert.equal(
    roomClient.telemetrySnapshot.snapshotStream.lastTransportError,
    "Co-op room snapshot stream failed."
  );

  scheduler.runNext(0);
  await flushAsyncWork();

  assert.equal(sentRequests[1]?.type, "poll");
  assert.equal(roomClient.statusSnapshot.state, "connected");
  assert.equal(roomClient.roomSnapshotBuffer.length, 2);
  assert.equal(roomClient.roomSnapshotBuffer[0]?.tick.currentTick, 1);
  assert.equal(roomClient.roomSnapshotBuffer[1]?.tick.currentTick, 2);
  assert.equal(
    scheduler.pendingTasks.filter((task) => task.delay === 50).length,
    1
  );

  scheduler.runNext(20);

  assert.equal(streamSubscriptions.length, 2);
  assert.equal(
    scheduler.pendingTasks.filter((task) => task.delay === 50).length,
    0
  );
  assert.equal(
    roomClient.telemetrySnapshot.snapshotStream.path,
    "reliable-snapshot-stream"
  );
  assert.equal(roomClient.telemetrySnapshot.snapshotStream.liveness, "subscribed");

  streamSubscriptions[1]?.handlers.onRoomEvent(
    createRoomSnapshotEvent({
      playerId,
      roomId,
      sessionId,
      tick: 3
    })
  );

  assert.equal(roomClient.statusSnapshot.state, "connected");
  assert.equal(roomClient.roomSnapshotBuffer[0]?.tick.currentTick, 2);
  assert.equal(roomClient.roomSnapshotBuffer[1]?.tick.currentTick, 3);
  assert.equal(roomClient.telemetrySnapshot.snapshotStream.lastTransportError, null);

  roomClient.dispose();
  await flushAsyncWork();

  assert.equal(streamSubscriptions[1]?.closeCallCount, 1);
  assert.equal(sentRequests[2]?.type, "command");
  assert.equal(sentRequests[2]?.command?.type, "leave-room");
});
