import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaverseIssuePlayerActionCommand,
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

function createFireWeaponPlayerActionCommand({
  actionSequence,
  aimMode,
  issuedAtAuthoritativeTimeMs,
  origin,
  playerId,
  target,
  weaponId
}) {
  const forwardDirection = createForwardDirection(origin, target);
  const planarMagnitude = Math.hypot(forwardDirection.x, forwardDirection.z);

  return createMetaverseIssuePlayerActionCommand({
    action: {
      ...(aimMode === undefined ? {} : { aimMode }),
      actionSequence,
      aimSnapshot: {
        pitchRadians: Math.atan2(forwardDirection.y, planarMagnitude),
        yawRadians: Math.atan2(forwardDirection.x, -forwardDirection.z)
      },
      issuedAtAuthoritativeTimeMs,
      kind: "fire-weapon",
      weaponId
    },
    playerId
  });
}

function createKillFloorVolume({
  centerY = -5,
  sizeX = 64,
  sizeZ = 64
} = {}) {
  return Object.freeze({
    center: Object.freeze({
      x: 0,
      y: centerY,
      z: 0
    }),
    label: "Kill Floor",
    priority: -1,
    rotationYRadians: 0,
    routePoints: Object.freeze([]),
    size: Object.freeze({
      x: sizeX,
      y: 0.5,
      z: sizeZ
    }),
    tags: Object.freeze(["environment", "kill-floor"]),
    teamId: null,
    volumeId: "kill-floor",
    volumeKind: "kill-floor"
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
        position: teamId === "red" ? redRootPosition : blueRespawnPosition,
        yawRadians: teamId === "red" ? 0 : blueRespawnYawRadians
      };
    },
    syncAuthoritativePlayerLookToCurrentFacing() {},
    syncPlayerTraversalAuthorityState() {},
    syncPlayerTraversalBodyRuntimes() {}
  });

  combatAuthority.syncCombatState(0);
  combatAuthority.advanceCombatRuntimes(1.1, 1_100);

  combatAuthority.acceptIssuePlayerActionCommand(
    createFireWeaponPlayerActionCommand({
      aimMode: "hip-fire",
      actionSequence: 1,
      issuedAtAuthoritativeTimeMs: 1_050,
      origin: redMuzzleOrigin,
      playerId: redPlayerId,
      target: blueBodyTarget,
      weaponId: "metaverse-service-pistol-v2"
    }),
    1_200
  );
  combatAuthority.acceptIssuePlayerActionCommand(
    createFireWeaponPlayerActionCommand({
      aimMode: "hip-fire",
      actionSequence: 2,
      issuedAtAuthoritativeTimeMs: 1_250,
      origin: redMuzzleOrigin,
      playerId: redPlayerId,
      target: blueHeadTarget,
      weaponId: "metaverse-service-pistol-v2"
    }),
    1_400
  );
  combatAuthority.acceptIssuePlayerActionCommand(
    createFireWeaponPlayerActionCommand({
      aimMode: "hip-fire",
      actionSequence: 3,
      issuedAtAuthoritativeTimeMs: 1_450,
      origin: redMuzzleOrigin,
      playerId: redPlayerId,
      target: blueHeadTarget,
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
  assert.equal(damageFeedEvents[0]?.sourceActionSequence, 1);
  assert.equal(damageFeedEvents[0]?.sourceProjectileId, `${redPlayerId}:1`);
  assert.equal(damageFeedEvents[1]?.hitZone, "head");
  assert.equal(damageFeedEvents[1]?.sourceActionSequence, 2);
  assert.equal(damageFeedEvents[1]?.sourceProjectileId, `${redPlayerId}:2`);
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
  assert.equal(killFeedEvent?.sourceActionSequence, 3);
  assert.equal(killFeedEvent?.sourceProjectileId, `${redPlayerId}:3`);
  assert.equal(killFeedEvent?.targetPlayerId, bluePlayerId);

  combatAuthority.acceptIssuePlayerActionCommand(
    createFireWeaponPlayerActionCommand({
      aimMode: "hip-fire",
      actionSequence: 4,
      issuedAtAuthoritativeTimeMs: 1_650,
      origin: redMuzzleOrigin,
      playerId: redPlayerId,
      target: blueHeadTarget,
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

  combatAuthority.acceptIssuePlayerActionCommand(
    createFireWeaponPlayerActionCommand({
      aimMode: "hip-fire",
      actionSequence: 5,
      issuedAtAuthoritativeTimeMs: 4_560,
      origin: redMuzzleOrigin,
      playerId: redPlayerId,
      target: blueRespawnHeadTarget,
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

test("MetaverseAuthoritativeCombatAuthority publishes exactly-once combat action receipts for accepted and rejected fire commands", () => {
  const redPlayerId = createMetaversePlayerId("combat-receipt-red-1");
  const bluePlayerId = createMetaversePlayerId("combat-receipt-blue-1");

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
  let snapshotSequence = 0;

  const combatAuthority = new MetaverseAuthoritativeCombatAuthority({
    clearDriverVehicleControl() {},
    clearPlayerTraversalIntent() {},
    clearPlayerVehicleOccupancy() {},
    incrementSnapshotSequence() {
      snapshotSequence += 1;
    },
    physicsRuntime: {
      castRay() {
        return null;
      }
    },
    playerTraversalColliderHandles: new Set(),
    playersById: new Map([
      [
        redPlayerId,
        createPlayerRuntimeState(redPlayerId, "red", redRootPosition)
      ],
      [
        bluePlayerId,
        createPlayerRuntimeState(bluePlayerId, "blue", blueRootPosition)
      ]
    ]),
    readTickIntervalMs: () => 33,
    resolveRespawnPose(_playerId, teamId) {
      return {
        position: teamId === "red" ? redRootPosition : blueRootPosition,
        yawRadians: 0
      };
    },
    syncAuthoritativePlayerLookToCurrentFacing() {},
    syncPlayerTraversalAuthorityState() {},
    syncPlayerTraversalBodyRuntimes() {}
  });

  combatAuthority.syncCombatState(0);
  combatAuthority.advanceCombatRuntimes(1.1, 1_100);
  const snapshotSequenceBeforeFirstShot = snapshotSequence;

  combatAuthority.acceptIssuePlayerActionCommand(
    createFireWeaponPlayerActionCommand({
      actionSequence: 1,
      issuedAtAuthoritativeTimeMs: 1_050,
      origin: redMuzzleOrigin,
      playerId: redPlayerId,
      target: blueBodyTarget,
      weaponId: "metaverse-service-pistol-v2"
    }),
    1_200
  );

  const acceptedReceiptSnapshot =
    combatAuthority.readPlayerCombatActionObserverSnapshot(redPlayerId);
  const snapshotSequenceAfterAcceptedShot = snapshotSequence;

  assert.ok(snapshotSequenceAfterAcceptedShot > snapshotSequenceBeforeFirstShot);
  assert.equal(
    acceptedReceiptSnapshot?.highestProcessedPlayerActionSequence,
    1
  );
  assert.equal(
    acceptedReceiptSnapshot?.recentPlayerActionReceipts[0]?.status,
    "accepted"
  );
  assert.equal(
    acceptedReceiptSnapshot?.recentPlayerActionReceipts[0]?.sourceProjectileId,
    `${redPlayerId}:1`
  );

  combatAuthority.acceptIssuePlayerActionCommand(
    createFireWeaponPlayerActionCommand({
      actionSequence: 1,
      issuedAtAuthoritativeTimeMs: 1_150,
      origin: redMuzzleOrigin,
      playerId: redPlayerId,
      target: blueBodyTarget,
      weaponId: "metaverse-service-pistol-v2"
    }),
    1_220
  );

  assert.equal(snapshotSequence, snapshotSequenceAfterAcceptedShot);
  assert.equal(
    combatAuthority.readPlayerCombatActionObserverSnapshot(redPlayerId)
      ?.recentPlayerActionReceipts[0]?.status,
    "accepted"
  );

  combatAuthority.acceptIssuePlayerActionCommand(
    createFireWeaponPlayerActionCommand({
      actionSequence: 2,
      issuedAtAuthoritativeTimeMs: 1_250,
      origin: redMuzzleOrigin,
      playerId: redPlayerId,
      target: blueBodyTarget,
      weaponId: "metaverse-service-pistol-v2"
    }),
    1_250
  );

  const rejectedReceiptSnapshot =
    combatAuthority.readPlayerCombatActionObserverSnapshot(redPlayerId);

  assert.equal(snapshotSequence, snapshotSequenceAfterAcceptedShot + 1);
  assert.equal(
    rejectedReceiptSnapshot?.highestProcessedPlayerActionSequence,
    2
  );
  assert.equal(
    rejectedReceiptSnapshot?.recentPlayerActionReceipts[1]?.status,
    "rejected"
  );
  assert.equal(
    rejectedReceiptSnapshot?.recentPlayerActionReceipts[1]?.rejectionReason,
    "cooldown"
  );
  assert.equal(
    rejectedReceiptSnapshot?.recentPlayerActionReceipts[1]?.sourceProjectileId,
    null
  );
});

test("MetaverseAuthoritativeCombatAuthority applies kill-floor suicides as deaths with minus one kill and negative team score", () => {
  const redPlayerId = createMetaversePlayerId("combat-kill-floor-red-1");
  const bluePlayerId = createMetaversePlayerId("combat-kill-floor-blue-1");

  assert.notEqual(redPlayerId, null);
  assert.notEqual(bluePlayerId, null);

  const combatAuthority = new MetaverseAuthoritativeCombatAuthority({
    clearDriverVehicleControl() {},
    clearPlayerTraversalIntent() {},
    clearPlayerVehicleOccupancy() {},
    incrementSnapshotSequence() {},
    killFloorVolumes: Object.freeze([createKillFloorVolume()]),
    physicsRuntime: {
      castRay() {
        return null;
      }
    },
    playerTraversalColliderHandles: new Set(),
    playersById: new Map([
      [
        redPlayerId,
        createPlayerRuntimeState(redPlayerId, "red", Object.freeze({ x: 16, y: 0, z: 0 }))
      ],
      [
        bluePlayerId,
        createPlayerRuntimeState(bluePlayerId, "blue", Object.freeze({ x: 0, y: -6, z: 0 }))
      ]
    ]),
    readTickIntervalMs: () => 33,
    resolveRespawnPose(_playerId, teamId) {
      return {
        position: teamId === "red"
          ? Object.freeze({ x: 16, y: 0, z: 0 })
          : Object.freeze({ x: 0, y: 0, z: 0 }),
        yawRadians: 0
      };
    },
    syncAuthoritativePlayerLookToCurrentFacing() {},
    syncPlayerTraversalAuthorityState() {},
    syncPlayerTraversalBodyRuntimes() {}
  });

  combatAuthority.syncCombatState(0);
  combatAuthority.advanceCombatRuntimes(1.1, 1_100);

  const blueCombatSnapshot = combatAuthority.readPlayerCombatSnapshot(bluePlayerId);
  const combatMatchSnapshot = combatAuthority.readCombatMatchSnapshot();
  const killFeedEvent = combatAuthority
    .readCombatFeedSnapshots()
    .find((eventSnapshot) => eventSnapshot.type === "kill");

  assert.equal(blueCombatSnapshot?.alive, false);
  assert.equal(blueCombatSnapshot?.deaths, 1);
  assert.equal(blueCombatSnapshot?.kills, -1);
  assert.equal(killFeedEvent?.type, "kill");
  assert.equal(killFeedEvent?.attackerPlayerId, bluePlayerId);
  assert.equal(killFeedEvent?.targetPlayerId, bluePlayerId);
  assert.equal(killFeedEvent?.weaponId, "metaverse-environment-kill-floor-v1");
  assert.equal(combatMatchSnapshot.teams[0]?.score, 0);
  assert.equal(combatMatchSnapshot.teams[1]?.score, -1);
});

test("MetaverseAuthoritativeCombatAuthority credits prior attacker damage when a player falls into the kill floor", () => {
  const redPlayerId = createMetaversePlayerId("combat-kill-floor-credit-red-1");
  const bluePlayerId = createMetaversePlayerId("combat-kill-floor-credit-blue-1");

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
  const combatAuthority = new MetaverseAuthoritativeCombatAuthority({
    clearDriverVehicleControl() {},
    clearPlayerTraversalIntent() {},
    clearPlayerVehicleOccupancy() {},
    incrementSnapshotSequence() {},
    killFloorVolumes: Object.freeze([createKillFloorVolume()]),
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
        position: teamId === "red" ? redRootPosition : blueRootPosition,
        yawRadians: 0
      };
    },
    syncAuthoritativePlayerLookToCurrentFacing() {},
    syncPlayerTraversalAuthorityState() {},
    syncPlayerTraversalBodyRuntimes() {}
  });

  combatAuthority.syncCombatState(0);
  combatAuthority.advanceCombatRuntimes(1.1, 1_100);
  combatAuthority.acceptIssuePlayerActionCommand(
    createFireWeaponPlayerActionCommand({
      actionSequence: 1,
      issuedAtAuthoritativeTimeMs: 1_050,
      origin: redMuzzleOrigin,
      playerId: redPlayerId,
      target: blueBodyTarget,
      weaponId: "metaverse-service-pistol-v2"
    }),
    1_200
  );
  playersById.get(bluePlayerId).positionY = -6;
  combatAuthority.advanceCombatRuntimes(0.1, 1_300);

  const redCombatSnapshot = combatAuthority.readPlayerCombatSnapshot(redPlayerId);
  const blueCombatSnapshot = combatAuthority.readPlayerCombatSnapshot(bluePlayerId);
  const combatMatchSnapshot = combatAuthority.readCombatMatchSnapshot();
  const killFeedEvent = combatAuthority
    .readCombatFeedSnapshots()
    .findLast((eventSnapshot) => eventSnapshot.type === "kill");

  assert.equal(redCombatSnapshot?.kills, 1);
  assert.equal(blueCombatSnapshot?.alive, false);
  assert.equal(blueCombatSnapshot?.deaths, 1);
  assert.equal(killFeedEvent?.attackerPlayerId, redPlayerId);
  assert.equal(killFeedEvent?.targetPlayerId, bluePlayerId);
  assert.equal(killFeedEvent?.weaponId, "metaverse-environment-kill-floor-v1");
  assert.equal(combatMatchSnapshot.teams[0]?.score, 1);
  assert.equal(combatMatchSnapshot.teams[1]?.score, 0);
});
