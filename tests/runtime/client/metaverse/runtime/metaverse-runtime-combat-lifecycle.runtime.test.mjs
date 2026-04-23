import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { createClientModuleLoader } from "../../load-client-module.mjs";

let clientLoader;

function createCameraSnapshot({
  x = 0,
  y = 1.62,
  z = 0
} = {}) {
  return Object.freeze({
    lookDirection: Object.freeze({
      x: 0,
      y: 0,
      z: -1
    }),
    pitchRadians: 0,
    position: Object.freeze({
      x,
      y,
      z
    }),
    yawRadians: 0
  });
}

before(async () => {
  clientLoader = await createClientModuleLoader();
});

after(async () => {
  await clientLoader?.close();
});

test("MetaverseRuntimeCombatLifecycle freezes on death, resets weapon presentation, and rearms respawn snap on authoritative respawn", async () => {
  const { MetaverseRuntimeCombatLifecycle } = await clientLoader.load(
    "/src/metaverse/classes/metaverse-runtime-combat-lifecycle.ts"
  );
  const deathCameraCalls = [];
  const respawnLockCalls = [];
  let spawnBootstrapCount = 0;
  let weaponResetCount = 0;
  let combatSnapshot = Object.freeze({
    alive: true,
    health: 100
  });
  const combatLifecycle = new MetaverseRuntimeCombatLifecycle({
    authoritativeWorldSync: {
      armLocalSpawnBootstrap() {
        spawnBootstrapCount += 1;
      }
    },
    bootLifecycle: {
      setDeathCameraSnapshot(snapshot) {
        deathCameraCalls.push(snapshot);
      },
      setRespawnControlLocked(locked) {
        respawnLockCalls.push(locked);
      }
    },
    remoteWorldRuntime: {
      readFreshAuthoritativeLocalPlayerSnapshot() {
        return Object.freeze({
          combat: combatSnapshot
        });
      }
    },
    weaponPresentationRuntime: {
      reset() {
        weaponResetCount += 1;
      }
    }
  });

  const liveCameraSnapshot = createCameraSnapshot({
    x: 4,
    y: 2,
    z: 8
  });

  combatLifecycle.syncLocalCombatState(liveCameraSnapshot);

  assert.deepEqual(deathCameraCalls, []);
  assert.deepEqual(respawnLockCalls, []);
  assert.equal(spawnBootstrapCount, 0);
  assert.equal(weaponResetCount, 0);

  combatSnapshot = Object.freeze({
    alive: false,
    health: 0,
    respawnRemainingMs: 3_000
  });
  combatLifecycle.syncLocalCombatState(liveCameraSnapshot);

  assert.equal(deathCameraCalls.length, 1);
  assert.equal(deathCameraCalls[0], liveCameraSnapshot);
  assert.deepEqual(respawnLockCalls, [true]);
  assert.equal(spawnBootstrapCount, 0);
  assert.equal(weaponResetCount, 1);

  combatLifecycle.syncLocalCombatState(
    createCameraSnapshot({
      x: 30,
      y: 7,
      z: -12
    })
  );

  assert.equal(deathCameraCalls.length, 1);
  assert.deepEqual(respawnLockCalls, [true]);
  assert.equal(weaponResetCount, 1);

  combatSnapshot = Object.freeze({
    alive: true,
    health: 100,
    spawnProtectionRemainingMs: 1_000
  });
  combatLifecycle.syncLocalCombatState(
    createCameraSnapshot({
      x: 12,
      y: 2,
      z: 18
    })
  );

  assert.equal(deathCameraCalls.length, 2);
  assert.equal(deathCameraCalls[1], null);
  assert.deepEqual(respawnLockCalls, [true, false]);
  assert.equal(spawnBootstrapCount, 1);
  assert.equal(weaponResetCount, 1);
});
