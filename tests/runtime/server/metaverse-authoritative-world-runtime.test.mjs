import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaverseJoinPresenceCommand,
  createMetaversePlayerId,
  createMetaverseSyncDriverVehicleControlCommand,
  createMetaverseSyncMountedOccupancyCommand,
  createMetaverseSyncPlayerTraversalIntentCommand,
  createMetaverseSyncPresenceCommand,
  createMilliseconds,
  createUsername
} from "@webgpu-metaverse/shared";

import { MetaverseAuthoritativeWorldRuntime } from "../../../server/dist/metaverse/classes/metaverse-authoritative-world-runtime.js";

function requireValue(value, label) {
  assert.notEqual(value, null, `${label} should resolve`);
  return value;
}

test("MetaverseAuthoritativeWorldRuntime simulates driver-controlled vehicles from authoritative world commands", () => {
  const runtime = new MetaverseAuthoritativeWorldRuntime({
    playerInactivityTimeoutMs: createMilliseconds(5_000),
    tickIntervalMs: createMilliseconds(100)
  });
  const playerId = requireValue(
    createMetaversePlayerId("harbor-pilot"),
    "playerId"
  );
  const username = requireValue(createUsername("Harbor Pilot"), "username");

  runtime.acceptPresenceCommand(
    createMetaverseJoinPresenceCommand({
      characterId: "metaverse-mannequin-v1",
      playerId,
      pose: {
        animationVocabulary: "idle",
        locomotionMode: "mounted",
        mountedOccupancy: {
          environmentAssetId: "metaverse-hub-skiff-v1",
          entryId: null,
          occupancyKind: "seat",
          occupantRole: "driver",
          seatId: "driver-seat"
        },
        position: {
          x: 0,
          y: 0.4,
          z: 24
        },
        stateSequence: 1,
        yawRadians: 0
      }
    }),
    0
  );
  runtime.acceptWorldCommand(
    createMetaverseSyncDriverVehicleControlCommand({
      controlIntent: {
        boost: false,
        environmentAssetId: "metaverse-hub-skiff-v1",
        moveAxis: 1,
        strafeAxis: 0,
        yawAxis: 0
      },
      controlSequence: 1,
      playerId,
    }),
    100
  );
  runtime.advanceToTime(1_000);

  const worldSnapshot = runtime.readWorldSnapshot(1_000, playerId);

  assert.equal(worldSnapshot.tick.currentTick, 10);
  assert.equal(worldSnapshot.tick.emittedAtServerTimeMs, 1_000);
  assert.equal(worldSnapshot.tick.simulationTimeMs, 1_000);
  assert.equal(worldSnapshot.players.length, 1);
  assert.equal(worldSnapshot.players[0]?.animationVocabulary, "seated");
  assert.equal(worldSnapshot.players[0]?.locomotionMode, "mounted");
  assert.equal(worldSnapshot.players[0]?.position.x, 0);
  assert.equal(worldSnapshot.players[0]?.position.y, 0.4);
  assert.ok(Math.abs(worldSnapshot.players[0]?.position.z - 18.63) < 0.000001);
  assert.equal(worldSnapshot.players[0]?.linearVelocity.x, 0);
  assert.ok(
    Math.abs(worldSnapshot.players[0]?.linearVelocity.z + 10.5) < 0.000001
  );
  assert.equal(
    worldSnapshot.players[0]?.mountedOccupancy?.environmentAssetId,
    "metaverse-hub-skiff-v1"
  );
  assert.equal(worldSnapshot.players[0]?.mountedOccupancy?.seatId, "driver-seat");
  assert.equal(
    worldSnapshot.players[0]?.mountedOccupancy?.vehicleId,
    worldSnapshot.vehicles[0]?.vehicleId
  );
  assert.equal(worldSnapshot.vehicles.length, 1);
  assert.equal(
    worldSnapshot.vehicles[0]?.seats[0]?.occupantPlayerId,
    playerId
  );
  assert.equal(worldSnapshot.vehicles[0]?.position.x, 0);
  assert.ok(Math.abs(worldSnapshot.vehicles[0]?.position.z - 18.63) < 0.000001);
  assert.equal(worldSnapshot.vehicles[0]?.yawRadians, 0);
  assert.ok(
    Math.abs(worldSnapshot.vehicles[0]?.linearVelocity.z + 10.5) < 0.000001
  );
});

test("MetaverseAuthoritativeWorldRuntime prunes inactive players while keeping vehicle state and presence projection coherent", () => {
  const runtime = new MetaverseAuthoritativeWorldRuntime({
    playerInactivityTimeoutMs: createMilliseconds(500),
    tickIntervalMs: createMilliseconds(100)
  });
  const playerId = requireValue(
    createMetaversePlayerId("watchful-harbor-pilot"),
    "playerId"
  );
  const username = requireValue(createUsername("Watchful Pilot"), "username");

  runtime.acceptPresenceCommand(
    createMetaverseJoinPresenceCommand({
      characterId: "metaverse-mannequin-v1",
      playerId,
      pose: {
        animationVocabulary: "idle",
        locomotionMode: "mounted",
        mountedOccupancy: {
          environmentAssetId: "metaverse-hub-skiff-v1",
          entryId: null,
          occupancyKind: "seat",
          occupantRole: "driver",
          seatId: "driver-seat"
        },
        position: {
          x: 0,
          y: 0.4,
          z: 24
        },
        stateSequence: 1,
        yawRadians: 0
      },
      username
    }),
    0
  );
  runtime.advanceToTime(200);

  assert.equal(runtime.readPresenceRosterSnapshot(200, playerId).players.length, 1);

  runtime.advanceToTime(800);
  const prunedWorldSnapshot = runtime.readWorldSnapshot(800);

  assert.equal(prunedWorldSnapshot.players.length, 0);
  assert.equal(prunedWorldSnapshot.vehicles.length, 1);
  assert.equal(
    prunedWorldSnapshot.vehicles[0]?.seats[0]?.occupantPlayerId,
    null
  );
  assert.equal(runtime.readPresenceRosterSnapshot(800).players.length, 0);
  assert.throws(
    () => runtime.readWorldSnapshot(800, playerId),
    /Unknown metaverse player: watchful-harbor-pilot/
  );
});

test("MetaverseAuthoritativeWorldRuntime includes player turn rate in authoritative world snapshots", () => {
  const runtime = new MetaverseAuthoritativeWorldRuntime({
    playerInactivityTimeoutMs: createMilliseconds(5_000),
    tickIntervalMs: createMilliseconds(100)
  });
  const playerId = requireValue(
    createMetaversePlayerId("turn-rate-harbor-pilot"),
    "playerId"
  );
  const username = requireValue(createUsername("Turn Rate Pilot"), "username");

  runtime.acceptPresenceCommand(
    createMetaverseJoinPresenceCommand({
      characterId: "metaverse-mannequin-v1",
      playerId,
      pose: {
        position: {
          x: -8.2,
          y: 0.15,
          z: -14.8
        },
        stateSequence: 1,
        yawRadians: 0
      },
      username
    }),
    0
  );
  runtime.acceptWorldCommand(
    createMetaverseSyncPlayerTraversalIntentCommand({
      intent: {
        boost: false,
        inputSequence: 2,
        jump: false,
        locomotionMode: "grounded",
        moveAxis: 0,
        strafeAxis: 0,
        yawAxis: 1
      },
      playerId
    }),
    0
  );
  runtime.advanceToTime(100);

  const worldSnapshot = runtime.readWorldSnapshot(100, playerId);

  assert.ok(
    Math.abs(
      (worldSnapshot.players[0]?.angularVelocityRadiansPerSecond ?? 0) - 3.6
    ) < 0.000001
  );
});

test("MetaverseAuthoritativeWorldRuntime simulates unmounted grounded and swim traversal from authoritative traversal intent commands", () => {
  const groundedRuntime = new MetaverseAuthoritativeWorldRuntime({
    playerInactivityTimeoutMs: createMilliseconds(5_000),
    tickIntervalMs: createMilliseconds(100)
  });
  const groundedPlayerId = requireValue(
    createMetaversePlayerId("world-traversal-harbor-pilot"),
    "playerId"
  );
  const groundedUsername = requireValue(
    createUsername("World Traversal Pilot"),
    "username"
  );

  groundedRuntime.acceptPresenceCommand(
    createMetaverseJoinPresenceCommand({
      characterId: "metaverse-mannequin-v1",
      playerId: groundedPlayerId,
      pose: {
        position: {
          x: -8.2,
          y: 0.15,
          z: -14.8
        },
        stateSequence: 1,
        yawRadians: 0
      },
      username: groundedUsername
    }),
    0
  );
  groundedRuntime.acceptWorldCommand(
    createMetaverseSyncPlayerTraversalIntentCommand({
      intent: {
        boost: false,
        inputSequence: 2,
        jump: false,
        locomotionMode: "swim",
        moveAxis: 1,
        strafeAxis: 0,
        yawAxis: 0
      },
      playerId: groundedPlayerId
    }),
    0
  );
  groundedRuntime.advanceToTime(200);

  const groundedWorldSnapshot =
    groundedRuntime.readWorldSnapshot(200, groundedPlayerId);

  assert.equal(groundedWorldSnapshot.tick.currentTick, 2);
  assert.equal(groundedWorldSnapshot.players[0]?.animationVocabulary, "walk");
  assert.equal(groundedWorldSnapshot.players[0]?.lastProcessedInputSequence, 2);
  assert.equal(groundedWorldSnapshot.players[0]?.locomotionMode, "grounded");
  assert.ok(
    Math.abs((groundedWorldSnapshot.players[0]?.position.y ?? 0) - 0.15) <
      0.000001
  );
  assert.ok((groundedWorldSnapshot.players[0]?.position.z ?? -14.8) < -14.8);
  assert.ok((groundedWorldSnapshot.players[0]?.linearVelocity.z ?? 0) < 0);
  assert.equal(groundedWorldSnapshot.players[0]?.stateSequence, 2);

  const swimRuntime = new MetaverseAuthoritativeWorldRuntime({
    playerInactivityTimeoutMs: createMilliseconds(5_000),
    tickIntervalMs: createMilliseconds(100)
  });
  const swimPlayerId = requireValue(
    createMetaversePlayerId("world-swim-harbor-pilot"),
    "swimPlayerId"
  );
  const swimUsername = requireValue(createUsername("World Swim Pilot"), "swimUsername");

  swimRuntime.acceptPresenceCommand(
    createMetaverseJoinPresenceCommand({
      characterId: "metaverse-mannequin-v1",
      playerId: swimPlayerId,
      pose: {
        position: {
          x: 0,
          y: 1.62,
          z: 24
        },
        stateSequence: 1,
        yawRadians: 0
      },
      username: swimUsername
    }),
    0
  );
  swimRuntime.acceptWorldCommand(
    createMetaverseSyncPlayerTraversalIntentCommand({
      intent: {
        boost: true,
        inputSequence: 3,
        jump: false,
        locomotionMode: "grounded",
        moveAxis: 1,
        strafeAxis: 0,
        yawAxis: 0
      },
      playerId: swimPlayerId
    }),
    0
  );
  swimRuntime.advanceToTime(500);

  const swimWorldSnapshot = swimRuntime.readWorldSnapshot(500, swimPlayerId);

  assert.equal(swimWorldSnapshot.players[0]?.animationVocabulary, "swim");
  assert.equal(swimWorldSnapshot.players[0]?.lastProcessedInputSequence, 3);
  assert.equal(swimWorldSnapshot.players[0]?.locomotionMode, "swim");
  assert.equal(swimWorldSnapshot.players[0]?.position.y, 0);
  assert.ok(
    (swimWorldSnapshot.players[0]?.position.z ?? Number.POSITIVE_INFINITY) <
      24
  );
  assert.ok((swimWorldSnapshot.players[0]?.linearVelocity.z ?? 0) < 0);
  assert.equal(swimWorldSnapshot.players[0]?.stateSequence, 3);
});

test("MetaverseAuthoritativeWorldRuntime simulates grounded jump ascent, descent, and landing on authoritative ticks", () => {
  const runtime = new MetaverseAuthoritativeWorldRuntime({
    playerInactivityTimeoutMs: createMilliseconds(5_000),
    tickIntervalMs: createMilliseconds(100)
  });
  const playerId = requireValue(
    createMetaversePlayerId("world-jump-harbor-pilot"),
    "playerId"
  );
  const username = requireValue(createUsername("World Jump Pilot"), "username");

  runtime.acceptPresenceCommand(
    createMetaverseJoinPresenceCommand({
      characterId: "metaverse-mannequin-v1",
      playerId,
      pose: {
        position: {
          x: -8.2,
          y: 0.15,
          z: -14.8
        },
        stateSequence: 1,
        yawRadians: 0
      },
      username
    }),
    0
  );
  runtime.acceptWorldCommand(
    createMetaverseSyncPlayerTraversalIntentCommand({
      intent: {
        boost: false,
        inputSequence: 2,
        jump: true,
        locomotionMode: "grounded",
        moveAxis: 0,
        strafeAxis: 0,
        yawAxis: 0
      },
      playerId
    }),
    0
  );
  runtime.advanceToTime(100);

  const jumpAscentSnapshot = runtime.readWorldSnapshot(100, playerId);

  assert.equal(jumpAscentSnapshot.players[0]?.locomotionMode, "grounded");
  assert.equal(jumpAscentSnapshot.players[0]?.animationVocabulary, "jump-up");
  assert.ok((jumpAscentSnapshot.players[0]?.position.y ?? 0) > 0.15);
  assert.ok((jumpAscentSnapshot.players[0]?.linearVelocity.y ?? 0) > 0);
  assert.equal(jumpAscentSnapshot.players[0]?.lastProcessedInputSequence, 2);

  runtime.acceptWorldCommand(
    createMetaverseSyncPlayerTraversalIntentCommand({
      intent: {
        boost: false,
        inputSequence: 3,
        jump: false,
        locomotionMode: "grounded",
        moveAxis: 0,
        strafeAxis: 0,
        yawAxis: 0
      },
      playerId
    }),
    100
  );
  runtime.advanceToTime(500);

  const jumpDescentSnapshot = runtime.readWorldSnapshot(500, playerId);

  assert.equal(jumpDescentSnapshot.players[0]?.animationVocabulary, "jump-down");
  assert.ok((jumpDescentSnapshot.players[0]?.position.y ?? 0) > 0.15);
  assert.ok((jumpDescentSnapshot.players[0]?.linearVelocity.y ?? 0) < 0);
  assert.equal(jumpDescentSnapshot.players[0]?.lastProcessedInputSequence, 3);
  assert.equal(jumpDescentSnapshot.players[0]?.stateSequence, 3);

  runtime.advanceToTime(1_000);

  const landedSnapshot = runtime.readWorldSnapshot(1_000, playerId);

  assert.equal(landedSnapshot.players[0]?.animationVocabulary, "idle");
  assert.equal(landedSnapshot.players[0]?.linearVelocity.y, 0);
  assert.ok(
    Math.abs((landedSnapshot.players[0]?.position.y ?? 0) - 0.15) < 0.000001
  );
});

test("MetaverseAuthoritativeWorldRuntime accepts mounted occupancy updates through reliable world commands", () => {
  const runtime = new MetaverseAuthoritativeWorldRuntime({
    playerInactivityTimeoutMs: createMilliseconds(5_000),
    tickIntervalMs: createMilliseconds(100)
  });
  const playerId = requireValue(
    createMetaversePlayerId("world-mounted-occupancy-harbor-pilot"),
    "playerId"
  );
  const username = requireValue(
    createUsername("World Mounted Occupancy Pilot"),
    "username"
  );

  runtime.acceptPresenceCommand(
    createMetaverseJoinPresenceCommand({
      characterId: "metaverse-mannequin-v1",
      playerId,
      pose: {
        position: {
          x: 12.2,
          y: 0.4,
          z: -13.8
        },
        stateSequence: 1,
        yawRadians: 0
      },
      username
    }),
    0
  );
  runtime.acceptWorldCommand(
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
  );

  const mountedWorldSnapshot = runtime.readWorldSnapshot(100, playerId);

  assert.equal(mountedWorldSnapshot.players[0]?.lastProcessedInputSequence, 1);
  assert.equal(mountedWorldSnapshot.players[0]?.locomotionMode, "mounted");
  assert.equal(
    mountedWorldSnapshot.players[0]?.mountedOccupancy?.seatId,
    "driver-seat"
  );
  assert.equal(
    mountedWorldSnapshot.vehicles[0]?.seats[0]?.occupantPlayerId,
    playerId
  );

  runtime.acceptWorldCommand(
    createMetaverseSyncMountedOccupancyCommand({
      mountedOccupancy: null,
      playerId
    }),
    200
  );

  const dismountedWorldSnapshot = runtime.readWorldSnapshot(200, playerId);

  assert.equal(dismountedWorldSnapshot.players[0]?.locomotionMode, "swim");
  assert.equal(dismountedWorldSnapshot.players[0]?.mountedOccupancy, null);
  assert.equal(dismountedWorldSnapshot.players[0]?.position.y, 0);
  assert.equal(
    dismountedWorldSnapshot.vehicles[0]?.seats[0]?.occupantPlayerId,
    null
  );
});

test("MetaverseAuthoritativeWorldRuntime keeps simulation time stable between repeated reads inside one tick", () => {
  const runtime = new MetaverseAuthoritativeWorldRuntime({
    playerInactivityTimeoutMs: createMilliseconds(5_000),
    tickIntervalMs: createMilliseconds(100)
  });
  const playerId = requireValue(
    createMetaversePlayerId("stable-tick-harbor-pilot"),
    "playerId"
  );
  const username = requireValue(createUsername("Stable Tick Pilot"), "username");

  runtime.acceptPresenceCommand(
    createMetaverseJoinPresenceCommand({
      characterId: "metaverse-mannequin-v1",
      playerId,
      pose: {
        position: {
          x: 0,
          y: 1.62,
          z: 24
        },
        stateSequence: 1,
        yawRadians: 0
      },
      username
    }),
    0
  );

  runtime.advanceToTime(150);

  const firstSnapshot = runtime.readWorldSnapshot(160, playerId);
  const secondSnapshot = runtime.readWorldSnapshot(190, playerId);

  assert.equal(firstSnapshot.tick.currentTick, 1);
  assert.equal(secondSnapshot.tick.currentTick, 1);
  assert.equal(firstSnapshot.tick.simulationTimeMs, 100);
  assert.equal(secondSnapshot.tick.simulationTimeMs, 100);
  assert.equal(firstSnapshot.tick.emittedAtServerTimeMs, 160);
  assert.equal(secondSnapshot.tick.emittedAtServerTimeMs, 190);
});

test("MetaverseAuthoritativeWorldRuntime does not advance simulation when snapshots are only read", () => {
  const runtime = new MetaverseAuthoritativeWorldRuntime({
    playerInactivityTimeoutMs: createMilliseconds(5_000),
    tickIntervalMs: createMilliseconds(100)
  });
  const playerId = requireValue(
    createMetaversePlayerId("read-only-harbor-pilot"),
    "playerId"
  );
  const username = requireValue(createUsername("Read Only Pilot"), "username");

  runtime.acceptPresenceCommand(
    createMetaverseJoinPresenceCommand({
      characterId: "metaverse-mannequin-v1",
      playerId,
      pose: {
        position: {
          x: 0,
          y: 1.62,
          z: 24
        },
        stateSequence: 1,
        yawRadians: 0
      },
      username
    }),
    0
  );
  runtime.advanceToTime(150);

  const firstSnapshot = runtime.readWorldSnapshot(260, playerId);
  const secondSnapshot = runtime.readWorldSnapshot(290, playerId);

  assert.equal(firstSnapshot.tick.currentTick, 1);
  assert.equal(secondSnapshot.tick.currentTick, 1);
  assert.equal(firstSnapshot.tick.simulationTimeMs, 100);
  assert.equal(secondSnapshot.tick.simulationTimeMs, 100);
});

test("MetaverseAuthoritativeWorldRuntime coalesces driver control per tick and rejects duplicate or stale sequences", () => {
  const runtime = new MetaverseAuthoritativeWorldRuntime({
    playerInactivityTimeoutMs: createMilliseconds(5_000),
    tickIntervalMs: createMilliseconds(100)
  });
  const playerId = requireValue(
    createMetaversePlayerId("coalesced-harbor-pilot"),
    "playerId"
  );
  const username = requireValue(createUsername("Coalesced Pilot"), "username");

  runtime.acceptPresenceCommand(
    createMetaverseJoinPresenceCommand({
      characterId: "metaverse-mannequin-v1",
      playerId,
      pose: {
        animationVocabulary: "idle",
        locomotionMode: "mounted",
        mountedOccupancy: {
          environmentAssetId: "metaverse-hub-skiff-v1",
          entryId: null,
          occupancyKind: "seat",
          occupantRole: "driver",
          seatId: "driver-seat"
        },
        position: {
          x: 0,
          y: 0.4,
          z: 24
        },
        stateSequence: 1,
        yawRadians: 0
      },
      username
    }),
    0
  );

  runtime.acceptWorldCommand(
    createMetaverseSyncDriverVehicleControlCommand({
      controlIntent: {
        boost: false,
        environmentAssetId: "metaverse-hub-skiff-v1",
        moveAxis: 1,
        strafeAxis: 0,
        yawAxis: 0
      },
      controlSequence: 1,
      playerId
    }),
    10
  );
  runtime.acceptWorldCommand(
    createMetaverseSyncDriverVehicleControlCommand({
      controlIntent: {
        boost: false,
        environmentAssetId: "metaverse-hub-skiff-v1",
        moveAxis: -1,
        strafeAxis: 0,
        yawAxis: 0
      },
      controlSequence: 2,
      playerId
    }),
    20
  );
  runtime.acceptWorldCommand(
    createMetaverseSyncDriverVehicleControlCommand({
      controlIntent: {
        boost: false,
        environmentAssetId: "metaverse-hub-skiff-v1",
        moveAxis: 1,
        strafeAxis: 0,
        yawAxis: 0
      },
      controlSequence: 2,
      playerId
    }),
    30
  );
  runtime.acceptWorldCommand(
    createMetaverseSyncDriverVehicleControlCommand({
      controlIntent: {
        boost: false,
        environmentAssetId: "metaverse-hub-skiff-v1",
        moveAxis: 1,
        strafeAxis: 0,
        yawAxis: 0
      },
      controlSequence: 1,
      playerId
    }),
    40
  );
  runtime.advanceToTime(100);

  const worldSnapshot = runtime.readWorldSnapshot(100, playerId);

  assert.equal(worldSnapshot.tick.currentTick, 1);
  assert.ok((worldSnapshot.vehicles[0]?.position.z ?? 0) > 24);
  assert.ok((worldSnapshot.vehicles[0]?.linearVelocity.z ?? 0) > 0);
  assert.ok((worldSnapshot.players[0]?.position.z ?? 0) > 24);
  assert.ok((worldSnapshot.players[0]?.linearVelocity.z ?? 0) > 0);
});

test("MetaverseAuthoritativeWorldRuntime keeps a claimed driver seat exclusive and ignores conflicting driver control", () => {
  const runtime = new MetaverseAuthoritativeWorldRuntime({
    playerInactivityTimeoutMs: createMilliseconds(5_000),
    tickIntervalMs: createMilliseconds(100)
  });
  const firstDriverPlayerId = requireValue(
    createMetaversePlayerId("first-harbor-pilot"),
    "first driver playerId"
  );
  const conflictingDriverPlayerId = requireValue(
    createMetaversePlayerId("conflicting-harbor-pilot"),
    "conflicting driver playerId"
  );
  const firstDriverUsername = requireValue(
    createUsername("First Harbor Pilot"),
    "first driver username"
  );
  const conflictingDriverUsername = requireValue(
    createUsername("Conflicting Harbor Pilot"),
    "conflicting driver username"
  );

  runtime.acceptPresenceCommand(
    createMetaverseJoinPresenceCommand({
      characterId: "metaverse-mannequin-v1",
      playerId: firstDriverPlayerId,
      pose: {
        animationVocabulary: "idle",
        locomotionMode: "mounted",
        mountedOccupancy: {
          environmentAssetId: "metaverse-hub-skiff-v1",
          entryId: null,
          occupancyKind: "seat",
          occupantRole: "driver",
          seatId: "driver-seat"
        },
        position: {
          x: 0,
          y: 0.4,
          z: 24
        },
        stateSequence: 1,
        yawRadians: 0
      },
      username: firstDriverUsername
    }),
    0
  );
  runtime.acceptPresenceCommand(
    createMetaverseJoinPresenceCommand({
      characterId: "metaverse-mannequin-v1",
      playerId: conflictingDriverPlayerId,
      pose: {
        animationVocabulary: "idle",
        locomotionMode: "mounted",
        mountedOccupancy: {
          environmentAssetId: "metaverse-hub-skiff-v1",
          entryId: null,
          occupancyKind: "seat",
          occupantRole: "driver",
          seatId: "driver-seat"
        },
        position: {
          x: 1,
          y: 0.4,
          z: 24
        },
        stateSequence: 1,
        yawRadians: 0
      },
      username: conflictingDriverUsername
    }),
    10
  );
  runtime.acceptWorldCommand(
    createMetaverseSyncDriverVehicleControlCommand({
      controlIntent: {
        boost: false,
        environmentAssetId: "metaverse-hub-skiff-v1",
        moveAxis: 1,
        strafeAxis: 0,
        yawAxis: 0
      },
      controlSequence: 1,
      playerId: conflictingDriverPlayerId
    }),
    20
  );
  runtime.advanceToTime(200);

  const worldSnapshot = runtime.readWorldSnapshot(200, firstDriverPlayerId);
  const firstDriverSnapshot = worldSnapshot.players.find(
    (playerSnapshot) => playerSnapshot.playerId === firstDriverPlayerId
  );
  const conflictingDriverSnapshot = worldSnapshot.players.find(
    (playerSnapshot) => playerSnapshot.playerId === conflictingDriverPlayerId
  );

  assert.equal(worldSnapshot.vehicles[0]?.seats[0]?.occupantPlayerId, firstDriverPlayerId);
  assert.equal(worldSnapshot.vehicles[0]?.position.z, 24);
  assert.equal(worldSnapshot.vehicles[0]?.linearVelocity.z, 0);
  assert.equal(firstDriverSnapshot?.mountedOccupancy?.seatId, "driver-seat");
  assert.equal(conflictingDriverSnapshot?.mountedOccupancy, null);
  assert.equal(conflictingDriverSnapshot?.locomotionMode, "swim");
});
