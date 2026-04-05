import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { createClientModuleLoader } from "./load-client-module.mjs";

let clientLoader;

before(async () => {
  clientLoader = await createClientModuleLoader();
});

after(async () => {
  await clientLoader?.close();
});

test("LocalCombatSession tracks hits, kills, score, streaks, and completion", async () => {
  const { LocalCombatSession } = await clientLoader.load("/src/game/index.ts");
  const session = new LocalCombatSession(2, {
    roundDurationMs: 4_000,
    scorePerKill: 100
  });

  session.beginFrame(100);
  session.recordShotOutcome({
    hitConfirmed: true,
    killConfirmed: true
  });
  session.recordShotOutcome({
    hitConfirmed: false,
    killConfirmed: false
  });
  session.recordShotOutcome({
    hitConfirmed: true,
    killConfirmed: true
  });
  const completedSnapshot = session.syncEnemyProgress(2);

  assert.equal(completedSnapshot.hitsThisSession, 2);
  assert.equal(completedSnapshot.killsThisSession, 2);
  assert.equal(completedSnapshot.score, 200);
  assert.equal(completedSnapshot.streak, 1);
  assert.equal(completedSnapshot.phase, "completed");
  assert.equal(completedSnapshot.restartReady, true);
});

test("LocalCombatSession fails on timer expiry and reset starts a fresh round", async () => {
  const { LocalCombatSession } = await clientLoader.load("/src/game/index.ts");
  const session = new LocalCombatSession(3, {
    roundDurationMs: 1_000,
    scorePerKill: 100
  });

  session.beginFrame(0);
  session.recordShotOutcome({
    hitConfirmed: true,
    killConfirmed: true
  });

  const failedSnapshot = session.beginFrame(1_100);

  assert.equal(failedSnapshot.phase, "failed");
  assert.equal(failedSnapshot.roundTimeRemainingMs, 0);
  assert.equal(failedSnapshot.streak, 0);

  session.recordShotOutcome({
    hitConfirmed: true,
    killConfirmed: true
  });

  assert.equal(session.snapshot.score, 100);
  assert.equal(session.snapshot.killsThisSession, 1);

  session.reset();

  assert.equal(session.snapshot.phase, "active");
  assert.equal(session.snapshot.score, 0);
  assert.equal(session.snapshot.killsThisSession, 0);
  assert.equal(session.snapshot.roundTimeRemainingMs, 1_000);
});
