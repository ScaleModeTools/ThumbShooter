import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaverseFireWeaponCommand,
  createMetaversePlayerId,
  createMetaverseRealtimePlayerWeaponStateSnapshot,
  createMetaverseUnmountedTraversalStateSnapshot
} from "@webgpu-metaverse/shared";

import { MetaverseAuthoritativeCombatAuthority } from "../../../server/dist/metaverse/authority/combat/metaverse-authoritative-combat-authority.js";

function createPlayerRuntimeState(playerId, teamId, position, yawRadians = 0) {
  return {
    linearVelocityX: 0,
    linearVelocityY: 0,
    linearVelocityZ: 0,
    locomotionMode: "grounded",
    lookPitchRadians: 0,
    lookYawRadians: yawRadians,
    mountedOccupancy: null,
    playerId,
    positionX: position.x,
    positionY: position.y,
    positionZ: position.z,
    stateSequence: 0,
    teamId,
    unmountedTraversalState: createMetaverseUnmountedTraversalStateSnapshot({
      locomotionMode: "grounded"
    }),
    weaponState: createMetaverseRealtimePlayerWeaponStateSnapshot({
      aimMode: "hip-fire",
      weaponId: "metaverse-service-pistol-v2"
    }),
    yawRadians
  };
}

function createForwardDirection(origin, target) {
  const deltaX = target.x - origin.x;
  const deltaY = target.y - origin.y;
  const deltaZ = target.z - origin.z;
  const length = Math.hypot(deltaX, deltaY, deltaZ);

  return Object.freeze({
    x: deltaX / length,
    y: deltaY / length,
    z: deltaZ / length
  });
}

test("MetaverseAuthoritativeCombatAuthority resolves floor-root body/head hits and respawns players after 3 seconds", () => {
  const redPlayerId = createMetaversePlayerId("combat-red-1");
  const bluePlayerId = createMetaversePlayerId("combat-blue-1");

  assert.notEqual(redPlayerId, null);
  assert.notEqual(bluePlayerId, null);

  const redRootPosition = Object.freeze({
    x: 0,
    y: 0,
    z: 0
  });
  const blueRootPosition = Object.freeze({
    x: 0,
    y: 0,
    z: -9
  });
  const blueInitialSpawnPosition = blueRootPosition;
  const blueRespawnPosition = Object.freeze({
    x: 12,
    y: 0,
    z: -4
  });
  const blueRespawnYawRadians = Math.PI * 0.25;
  const redMuzzleOrigin = Object.freeze({
    x: 0,
    y: 1.62,
    z: 0
  });
  const blueBodyTarget = Object.freeze({
    x: 0,
    y: 0.95,
    z: -9
  });
  const blueHeadTarget = Object.freeze({
    x: 0,
    y: 1.58,
    z: -9
  });
  const blueRespawnHeadTarget = Object.freeze({
    x: blueRespawnPosition.x,
    y: 1.58,
    z: blueRespawnPosition.z
  });

  const playersById = new Map([
    [
      redPlayerId,
      createPlayerRuntimeState(redPlayerId, "red", redRootPosition)
    ],
    [
      bluePlayerId,
      createPlayerRuntimeState(bluePlayerId, "blue", blueRootPosition)
    ]
  ]);
  let blueRespawnCount = 0;
  const combatAuthority = new MetaverseAuthoritativeCombatAuthority({
    clearDriverVehicleControl() {},
    clearPlayerTraversalIntent() {},
    clearPlayerVehicleOccupancy() {},
    incrementSnapshotSequence() {},
    physicsRuntime: {
      castRay() {
        return null;
      }
    },
    playerTraversalColliderHandles: new Set(),
    playersById,
    readTickIntervalMs: () => 33,
    resolveRespawnPose(_playerId, teamId) {
      return {
        position:
          teamId === "red"
            ? redRootPosition
            : blueRespawnCount++ === 0
              ? blueInitialSpawnPosition
              : blueRespawnPosition,
        yawRadians: teamId === "red" ? 0 : blueRespawnYawRadians
      };
    },
    syncAuthoritativePlayerLookToCurrentFacing() {},
    syncPlayerTraversalAuthorityState() {},
    syncPlayerTraversalBodyRuntimes() {}
  });

  combatAuthority.syncCombatState(0);
  combatAuthority.advanceCombatRuntimes(1.1, 1_100);

  combatAuthority.acceptFireWeaponCommand(
    createMetaverseFireWeaponCommand({
      aimMode: "hip-fire",
      clientFireTimeMs: 1_050,
      fireSequence: 1,
      forwardDirection: createForwardDirection(redMuzzleOrigin, blueBodyTarget),
      muzzleOrigin: redMuzzleOrigin,
      playerId: redPlayerId,
      weaponId: "metaverse-service-pistol-v2"
    }),
    1_200
  );
  combatAuthority.acceptFireWeaponCommand(
    createMetaverseFireWeaponCommand({
      aimMode: "hip-fire",
      clientFireTimeMs: 1_250,
      fireSequence: 2,
      forwardDirection: createForwardDirection(redMuzzleOrigin, blueHeadTarget),
      muzzleOrigin: redMuzzleOrigin,
      playerId: redPlayerId,
      weaponId: "metaverse-service-pistol-v2"
    }),
    1_400
  );
  combatAuthority.acceptFireWeaponCommand(
    createMetaverseFireWeaponCommand({
      aimMode: "hip-fire",
      clientFireTimeMs: 1_450,
      fireSequence: 3,
      forwardDirection: createForwardDirection(redMuzzleOrigin, blueHeadTarget),
      muzzleOrigin: redMuzzleOrigin,
      playerId: redPlayerId,
      weaponId: "metaverse-service-pistol-v2"
    }),
    1_600
  );

  const preRespawnRedCombatSnapshot =
    combatAuthority.readPlayerCombatSnapshot(redPlayerId);
  const preRespawnBlueCombatSnapshot =
    combatAuthority.readPlayerCombatSnapshot(bluePlayerId);
  const combatMatchSnapshot = combatAuthority.readCombatMatchSnapshot();
  const damageFeedEvents = combatAuthority
    .readCombatFeedSnapshots()
    .filter((eventSnapshot) => eventSnapshot.type === "damage");
  const killFeedEvent = combatAuthority
    .readCombatFeedSnapshots()
    .find((eventSnapshot) => eventSnapshot.type === "kill");

  assert.equal(preRespawnRedCombatSnapshot?.kills, 1);
  assert.equal(preRespawnRedCombatSnapshot?.headshotKills, 1);
  assert.equal(
    preRespawnRedCombatSnapshot?.weaponStats.find(
      (weaponStats) => weaponStats.weaponId === "metaverse-service-pistol-v2"
    )?.shotsHit,
    3
  );
  assert.equal(damageFeedEvents.length, 2);
  assert.equal(damageFeedEvents[0]?.hitZone, "body");
  assert.equal(damageFeedEvents[1]?.hitZone, "head");
  assert.equal(preRespawnBlueCombatSnapshot?.alive, false);
  assert.equal(preRespawnBlueCombatSnapshot?.deaths, 1);
  assert.equal(preRespawnBlueCombatSnapshot?.health, 0);
  assert.equal(preRespawnBlueCombatSnapshot?.respawnRemainingMs, 3_000);
  assert.equal(combatMatchSnapshot.respawnDelayMs, 3_000);
  assert.equal(combatMatchSnapshot.teams[0]?.score, 1);
  assert.equal(combatMatchSnapshot.teams[1]?.score, 0);
  assert.equal(killFeedEvent?.type, "kill");
  assert.equal(killFeedEvent?.attackerPlayerId, redPlayerId);
  assert.equal(killFeedEvent?.headshot, true);
  assert.equal(killFeedEvent?.targetPlayerId, bluePlayerId);

  combatAuthority.acceptFireWeaponCommand(
    createMetaverseFireWeaponCommand({
      aimMode: "hip-fire",
      clientFireTimeMs: 1_650,
      fireSequence: 4,
      forwardDirection: createForwardDirection(redMuzzleOrigin, blueHeadTarget),
      muzzleOrigin: redMuzzleOrigin,
      playerId: redPlayerId,
      weaponId: "metaverse-service-pistol-v2"
    }),
    1_800
  );

  assert.equal(
    combatAuthority
      .readPlayerCombatSnapshot(redPlayerId)
      ?.weaponStats.find(
        (weaponStats) => weaponStats.weaponId === "metaverse-service-pistol-v2"
      )?.shotsHit,
    3
  );

  combatAuthority.advanceCombatRuntimes(3.1, 4_700);

  const respawnedBlueCombatSnapshot =
    combatAuthority.readPlayerCombatSnapshot(bluePlayerId);
  const bluePlayerRuntime = playersById.get(bluePlayerId);

  assert.equal(respawnedBlueCombatSnapshot?.alive, true);
  assert.equal(respawnedBlueCombatSnapshot?.health, 100);
  assert.equal(respawnedBlueCombatSnapshot?.respawnRemainingMs, 0);
  assert.equal(respawnedBlueCombatSnapshot?.spawnProtectionRemainingMs, 1_000);
  assert.equal(respawnedBlueCombatSnapshot?.activeWeapon?.ammoInMagazine, 12);
  assert.equal(respawnedBlueCombatSnapshot?.activeWeapon?.ammoInReserve, 48);
  assert.notEqual(bluePlayerRuntime, undefined);
  assert.equal(bluePlayerRuntime?.linearVelocityX, 0);
  assert.equal(bluePlayerRuntime?.linearVelocityY, 0);
  assert.equal(bluePlayerRuntime?.linearVelocityZ, 0);
  assert.equal(bluePlayerRuntime?.locomotionMode, "grounded");
  assert.equal(bluePlayerRuntime?.mountedOccupancy, null);
  assert.equal(bluePlayerRuntime?.lookPitchRadians, 0);
  assert.equal(bluePlayerRuntime?.lookYawRadians, blueRespawnYawRadians);
  assert.equal(bluePlayerRuntime?.positionX, blueRespawnPosition.x);
  assert.equal(bluePlayerRuntime?.positionY, blueRespawnPosition.y);
  assert.equal(bluePlayerRuntime?.positionZ, blueRespawnPosition.z);
  assert.equal(bluePlayerRuntime?.yawRadians, blueRespawnYawRadians);
  assert.ok((bluePlayerRuntime?.stateSequence ?? 0) > 0);

  combatAuthority.acceptFireWeaponCommand(
    createMetaverseFireWeaponCommand({
      aimMode: "hip-fire",
      clientFireTimeMs: 4_560,
      fireSequence: 5,
      forwardDirection: createForwardDirection(
        redMuzzleOrigin,
        blueRespawnHeadTarget
      ),
      muzzleOrigin: redMuzzleOrigin,
      playerId: redPlayerId,
      weaponId: "metaverse-service-pistol-v2"
    }),
    4_710
  );

  assert.equal(combatAuthority.readPlayerCombatSnapshot(bluePlayerId)?.health, 100);
  assert.equal(
    combatAuthority
      .readPlayerCombatSnapshot(redPlayerId)
      ?.weaponStats.find(
        (weaponStats) => weaponStats.weaponId === "metaverse-service-pistol-v2"
      )?.shotsHit,
    3
  );
});
