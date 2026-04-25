import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { createMetaversePlayerId } from "@webgpu-metaverse/shared";

import {
  createConnectedStatusSnapshot,
  createManualTimerScheduler,
  createWorldEvent,
  flushAsyncWork,
  readLocalPlayerSnapshot
} from "./fixtures/metaverse-world-network-test-fixtures.mjs";
import { createClientModuleLoader } from "./load-client-module.mjs";

let clientLoader;

before(async () => {
  clientLoader = await createClientModuleLoader();
});

after(async () => {
  await clientLoader?.close();
});

test("MetaverseWorldPlayerActionSync sequences and retires reliable player actions from receipts", async () => {
  const { MetaverseWorldPlayerActionSync } = await clientLoader.load(
    "/src/network/classes/metaverse-world-player-action-sync.ts"
  );
  const playerId = createMetaversePlayerId("player-action-sync-1");

  assert.notEqual(playerId, null);

  const scheduler = createManualTimerScheduler();
  const sentCommands = [];
  let nowMs = 10_000;
  let localPlayerSnapshot = readLocalPlayerSnapshot(
    createWorldEvent({
      currentTick: 10,
      highestProcessedPlayerActionSequence: 7,
      playerId,
      serverTimeMs: 10_000,
      snapshotSequence: 1
    })
  );
  const actionSync = new MetaverseWorldPlayerActionSync({
    acceptWorldEvent() {},
    applyWorldAccessError(error) {
      throw error;
    },
    clearTimeout: scheduler.clearTimeout,
    readLatestLocalPlayerSnapshot: () => localPlayerSnapshot,
    readPlayerId: () => playerId,
    readStatusSnapshot: () => createConnectedStatusSnapshot(playerId, true),
    readWallClockMs: () => nowMs,
    resolveCommandDelayMs: () => 50,
    async sendIssuePlayerActionCommand(command) {
      sentCommands.push(command);
      return null;
    },
    setTimeout: scheduler.setTimeout
  });

  actionSync.issuePlayerAction({
    action: {
      aimMode: "hip-fire",
      aimSnapshot: Object.freeze({
        pitchRadians: 0,
        yawRadians: 0
      }),
      issuedAtAuthoritativeTimeMs: 10_000,
      kind: "fire-weapon",
      weaponId: "metaverse-service-pistol-v2"
    },
    playerId
  });

  scheduler.runNext(0);
  await flushAsyncWork();

  assert.equal(sentCommands.length, 1);
  assert.equal(sentCommands[0]?.action.actionSequence, 8);
  assert.equal(scheduler.pendingTasks.length, 1);

  nowMs = 10_050;
  localPlayerSnapshot = readLocalPlayerSnapshot(
    createWorldEvent({
      currentTick: 11,
      highestProcessedPlayerActionSequence: 8,
      playerId,
      recentPlayerActionReceipts: Object.freeze([
        Object.freeze({
          actionSequence: 8,
          kind: "fire-weapon",
          processedAtTimeMs: 10_040,
          sourceProjectileId: `${playerId}:8`,
          status: "accepted",
          weaponId: "metaverse-service-pistol-v2"
        })
      ]),
      serverTimeMs: 10_050,
      snapshotSequence: 2
    })
  );

  actionSync.syncFromAuthoritativeWorld();

  assert.equal(scheduler.pendingTasks.length, 0);

  actionSync.dispose();
});

