import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaverseJoinPresenceCommand,
  createMetaversePlayerId,
  createMetaverseRoomId,
  createMetaverseRoomSessionId,
  createUsername
} from "@webgpu-metaverse/shared";

import { MetaverseRoomRuntime } from "../../../server/dist/metaverse/classes/metaverse-room-runtime.js";

function requireValue(value, label) {
  assert.notEqual(value, null, `${label} should resolve`);
  return value;
}

function createGroundedJoinPresenceCommand(playerId, username, x = 0) {
  return createMetaverseJoinPresenceCommand({
    characterId: "mesh2motion-humanoid-v1",
    playerId,
    pose: {
      position: {
        x,
        y: 1.62,
        z: 24
      },
      stateSequence: 1,
      yawRadians: 0
    },
    username
  });
}

function createTeamDeathmatchRoomRuntime() {
  return new MetaverseRoomRuntime({
    bundleId: "deathmatch",
    capacity: 8,
    launchVariationId: "shell-team-deathmatch",
    leaderPlayerId: requireValue(
      createMetaversePlayerId("tdm-leader"),
      "leaderPlayerId"
    ),
    matchMode: "team-deathmatch",
    roomId: requireValue(createMetaverseRoomId("tdm-room-runtime"), "roomId"),
    roomSessionId: requireValue(
      createMetaverseRoomSessionId("tdm-room-runtime-session-1"),
      "roomSessionId"
    )
  });
}

test("MetaverseRoomRuntime exposes assignment and directory metadata for team deathmatch rooms", () => {
  const roomRuntime = createTeamDeathmatchRoomRuntime();
  const firstPlayerId = requireValue(
    createMetaversePlayerId("tdm-first"),
    "firstPlayerId"
  );
  const secondPlayerId = requireValue(
    createMetaversePlayerId("tdm-second"),
    "secondPlayerId"
  );

  roomRuntime.acceptPresenceCommand(
    createGroundedJoinPresenceCommand(
      firstPlayerId,
      requireValue(createUsername("alpha"), "alphaUsername")
    ),
    0
  );
  roomRuntime.acceptPresenceCommand(
    createGroundedJoinPresenceCommand(
      secondPlayerId,
      requireValue(createUsername("bravo"), "bravoUsername"),
      4
    ),
    0
  );

  const assignmentSnapshot = roomRuntime.readAssignmentSnapshot(2);
  const directoryEntry = roomRuntime.readDirectoryEntry(0, 2, "available");

  assert.equal(assignmentSnapshot.bundleId, "deathmatch");
  assert.equal(assignmentSnapshot.launchVariationId, "shell-team-deathmatch");
  assert.equal(assignmentSnapshot.matchMode, "team-deathmatch");
  assert.equal(assignmentSnapshot.connectedPlayerCount, 2);
  assert.equal(directoryEntry.roomId, assignmentSnapshot.roomId);
  assert.equal(directoryEntry.leaderPlayerId, assignmentSnapshot.leaderPlayerId);
  assert.equal(directoryEntry.connectedPlayerCount, 2);
  assert.equal(directoryEntry.phase !== null, true);
  assert.equal(
    directoryEntry.redTeamPlayerCount + directoryEntry.blueTeamPlayerCount,
    2
  );
});

test("MetaverseRoomRuntime forceRemovePlayer clears the authoritative room roster", () => {
  const roomRuntime = createTeamDeathmatchRoomRuntime();
  const playerId = requireValue(
    createMetaversePlayerId("tdm-removable"),
    "playerId"
  );

  roomRuntime.acceptPresenceCommand(
    createGroundedJoinPresenceCommand(
      playerId,
      requireValue(createUsername("solo"), "soloUsername")
    ),
    0
  );

  assert.equal(roomRuntime.readWorldSnapshot(0).players.length, 1);

  roomRuntime.forceRemovePlayer(playerId, 10);

  assert.equal(roomRuntime.readWorldSnapshot(10).players.length, 0);
});
