import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaverseJoinPresenceCommand,
  createMetaverseLeavePresenceCommand,
  createMetaversePlayerId,
  createMetaverseSyncDriverVehicleControlCommand,
  createMetaverseSyncMountedOccupancyCommand,
  createMetaverseSyncPlayerLookIntentCommand,
  createMetaverseSyncPlayerTraversalIntentCommand,
  createMetaverseSyncPlayerWeaponStateCommand,
  createMetaverseSyncPresenceCommand,
  createUsername
} from "@webgpu-metaverse/shared";

import { MetaverseAuthoritativeWorldCommandIntake } from "../../../../server/dist/metaverse/authority/commands/metaverse-authoritative-world-command-intake.js";

function createCommandIntakeHarness({ playerAlive = true } = {}) {
  const presenceEvent = Object.freeze({ kind: "presence-event" });
  const worldEvent = Object.freeze({ kind: "world-event" });
  const calls = [];
  const commandIntake = new MetaverseAuthoritativeWorldCommandIntake({
    advanceToTime: (nowMs) => {
      calls.push(["advance", nowMs]);
    },
    combatAuthority: {
      acceptIssuePlayerActionCommand(command, nowMs) {
        calls.push(["combat-action", command.type, nowMs]);
      },
      isPlayerAlive() {
        return playerAlive;
      }
    },
    mountedOccupancyAuthority: {
      acceptSyncMountedOccupancyCommand(command, nowMs) {
        calls.push(["mounted", command.type, nowMs]);
      }
    },
    playerLifecycleAuthority: {
      acceptLeaveCommand(command) {
        calls.push(["leave", command.type]);
      }
    },
    playerPoseAuthority: {
      acceptJoinCommand(command, nowMs) {
        calls.push(["join", command.type, nowMs]);
      },
      acceptSyncCommand(command, nowMs) {
        calls.push(["sync", command.type, nowMs]);
      }
    },
    playerTraversalAuthority: {
      acceptSyncPlayerLookIntentCommand(command, nowMs) {
        calls.push(["look", command.type, nowMs]);
      },
      acceptSyncPlayerTraversalIntentCommand(command, nowMs) {
        calls.push(["traversal", command.type, nowMs]);
      }
    },
    playerWeaponStateAuthority: {
      acceptSyncPlayerWeaponStateCommand(command, nowMs) {
        calls.push(["weapon-state", command.type, nowMs]);
      }
    },
    readPresenceRosterEvent: (nowMs) => {
      calls.push(["read-presence", nowMs]);
      return presenceEvent;
    },
    resourceAuthority: {
      acceptInteractWeaponResourceAction(command, nowMs) {
        calls.push(["resource-action", command.type, nowMs]);
      }
    },
    readWorldEvent: (nowMs) => {
      calls.push(["read-world", nowMs]);
      return worldEvent;
    },
    vehicleDriveAuthority: {
      acceptSyncDriverVehicleControlCommand(command, nowMs) {
        calls.push(["driver", command.type, nowMs]);
      }
    }
  });

  return {
    calls,
    commandIntake,
    presenceEvent,
    worldEvent
  };
}

test("MetaverseAuthoritativeWorldCommandIntake routes presence commands through the delegated owners", () => {
  const { calls, commandIntake, presenceEvent } = createCommandIntakeHarness();
  const playerId = createMetaversePlayerId("command-intake-presence-player");
  const username = createUsername("Presence Pilot");

  assert.notEqual(playerId, null);
  assert.notEqual(username, null);

  assert.equal(
    commandIntake.acceptPresenceCommand(
      createMetaverseJoinPresenceCommand({
        characterId: "mesh2motion-humanoid-v1",
        playerId,
        pose: {
          animationVocabulary: "idle",
          locomotionMode: "grounded",
          position: { x: 0, y: 0.6, z: 24 },
          stateSequence: 1,
          yawRadians: 0
        },
        username
      }),
      -10
    ),
    presenceEvent
  );
  assert.equal(
    commandIntake.acceptPresenceCommand(
      createMetaverseSyncPresenceCommand({
        playerId,
        pose: {
          animationVocabulary: "walk",
          locomotionMode: "grounded",
          position: { x: 1, y: 0.6, z: 24 },
          stateSequence: 2,
          yawRadians: 0.4
        }
      }),
      25
    ),
    presenceEvent
  );
  assert.equal(
    commandIntake.acceptPresenceCommand(
      createMetaverseLeavePresenceCommand({ playerId }),
      Number.NaN
    ),
    presenceEvent
  );

  assert.deepEqual(calls, [
    ["advance", 0],
    ["join", "join-presence", 0],
    ["read-presence", 0],
    ["advance", 25],
    ["sync", "sync-presence", 25],
    ["read-presence", 25],
    ["advance", 0],
    ["leave", "leave-presence"],
    ["read-presence", 0]
  ]);
});

test("MetaverseAuthoritativeWorldCommandIntake routes world commands through the delegated owners", () => {
  const { calls, commandIntake, worldEvent } = createCommandIntakeHarness();
  const playerId = createMetaversePlayerId("command-intake-world-player");

  assert.notEqual(playerId, null);

  assert.equal(
    commandIntake.acceptWorldCommand(
      createMetaverseSyncPlayerTraversalIntentCommand({
        intent: {
          actionIntent: { kind: "jump", pressed: true, sequence: 3 },
          bodyControl: {
            boost: false,
            moveAxis: 1,
            strafeAxis: 0,
            turnAxis: 0
          },
          facing: { pitchRadians: 0, yawRadians: 0.2 },
          sequence: 3,
          locomotionMode: "grounded"
        },
        playerId
      }),
      50
    ),
    worldEvent
  );
  assert.equal(
    commandIntake.acceptWorldCommand(
      createMetaverseSyncPlayerLookIntentCommand({
        lookIntent: { pitchRadians: 0.1, yawRadians: 0.3 },
        lookSequence: 1,
        playerId
      }),
      75
    ),
    worldEvent
  );
  assert.equal(
    commandIntake.acceptWorldCommand(
      createMetaverseSyncMountedOccupancyCommand({
        mountedOccupancy: {
          environmentAssetId: "metaverse-hub-skiff-v1",
          entryId: null,
          occupancyKind: "seat",
          occupantRole: "driver",
          seatId: "driver-seat"
        },
        playerId
      }),
      100
    ),
    worldEvent
  );
  assert.equal(
    commandIntake.acceptWorldCommand(
      createMetaverseSyncDriverVehicleControlCommand({
        controlIntent: {
          boost: true,
          environmentAssetId: "metaverse-hub-skiff-v1",
          moveAxis: 1,
          strafeAxis: 0,
          yawAxis: -0.5
        },
        controlSequence: 1,
        playerId,
      }),
      125
    ),
    worldEvent
  );
  assert.equal(
    commandIntake.acceptWorldCommand(
      createMetaverseSyncPlayerWeaponStateCommand({
        playerId,
        weaponSequence: 1,
        weaponState: {
          activeSlotId: "primary",
          aimMode: "hip-fire",
          slots: [
            {
              attachmentId: "metaverse-service-pistol-v2",
              equipped: true,
              slotId: "primary",
              weaponId: "metaverse-service-pistol-v2",
              weaponInstanceId: `${playerId}:primary:metaverse-service-pistol-v2`
            }
          ],
          weaponId: "metaverse-service-pistol-v2"
        }
      }),
      150
    ),
    worldEvent
  );

  assert.deepEqual(calls, [
    ["advance", 50],
    ["traversal", "sync-player-traversal-intent", 50],
    ["read-world", 50],
    ["advance", 75],
    ["look", "sync-player-look-intent", 75],
    ["read-world", 75],
    ["advance", 100],
    ["mounted", "sync-mounted-occupancy", 100],
    ["read-world", 100],
    ["advance", 125],
    ["driver", "sync-driver-vehicle-control", 125],
    ["read-world", 125],
    ["advance", 150],
    ["weapon-state", "sync-player-weapon-state", 150],
    ["read-world", 150]
  ]);
});

test("MetaverseAuthoritativeWorldCommandIntake ignores play-state sync commands from dead players", () => {
  const { calls, commandIntake, worldEvent } = createCommandIntakeHarness({
    playerAlive: false
  });
  const playerId = createMetaversePlayerId("command-intake-dead-player");

  assert.notEqual(playerId, null);

  assert.equal(
    commandIntake.acceptWorldCommand(
      createMetaverseSyncPlayerTraversalIntentCommand({
        intent: {
          actionIntent: { kind: "jump", pressed: true, sequence: 3 },
          bodyControl: {
            boost: false,
            moveAxis: 1,
            strafeAxis: 0,
            turnAxis: 0
          },
          facing: { pitchRadians: 0, yawRadians: 0.2 },
          locomotionMode: "grounded",
          sequence: 3
        },
        playerId
      }),
      50
    ),
    worldEvent
  );
  assert.equal(
    commandIntake.acceptWorldCommand(
      createMetaverseSyncPlayerLookIntentCommand({
        lookIntent: { pitchRadians: 0.1, yawRadians: 0.3 },
        lookSequence: 1,
        playerId
      }),
      75
    ),
    worldEvent
  );
  assert.equal(
    commandIntake.acceptWorldCommand(
      createMetaverseSyncMountedOccupancyCommand({
        mountedOccupancy: {
          environmentAssetId: "metaverse-hub-skiff-v1",
          entryId: null,
          occupancyKind: "seat",
          occupantRole: "driver",
          seatId: "driver-seat"
        },
        playerId
      }),
      100
    ),
    worldEvent
  );
  assert.equal(
    commandIntake.acceptWorldCommand(
      createMetaverseSyncDriverVehicleControlCommand({
        controlIntent: {
          boost: true,
          environmentAssetId: "metaverse-hub-skiff-v1",
          moveAxis: 1,
          strafeAxis: 0,
          yawAxis: -0.5
        },
        controlSequence: 1,
        playerId
      }),
      125
    ),
    worldEvent
  );
  assert.equal(
    commandIntake.acceptWorldCommand(
      createMetaverseSyncPlayerWeaponStateCommand({
        playerId,
        weaponSequence: 1,
        weaponState: null
      }),
      150
    ),
    worldEvent
  );

  assert.deepEqual(calls, [
    ["advance", 50],
    ["read-world", 50],
    ["advance", 75],
    ["read-world", 75],
    ["advance", 100],
    ["read-world", 100],
    ["advance", 125],
    ["read-world", 125],
    ["advance", 150],
    ["read-world", 150]
  ]);
});

test("MetaverseAuthoritativeWorldCommandIntake rejects unsupported command types", () => {
  const { commandIntake } = createCommandIntakeHarness();

  assert.throws(
    () =>
      commandIntake.acceptPresenceCommand(
        { type: "not-a-real-command" },
        0
      ),
    /Unsupported metaverse presence command type/
  );
  assert.throws(
    () =>
      commandIntake.acceptWorldCommand(
        { type: "not-a-real-world-command" },
        0
      ),
    /Unsupported metaverse realtime world command type/
  );
});
