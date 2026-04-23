import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaverseJoinPresenceCommand,
  createMetaversePlayerId,
  createMetaverseQuickJoinRoomRequest,
  createMetaversePresenceWebTransportCommandRequest,
  createMetaversePresenceWebTransportRosterRequest,
  createUsername
} from "@webgpu-metaverse/shared";

import { MetaversePresenceWebTransportAdapter } from "../../../server/dist/metaverse/adapters/metaverse-presence-webtransport-adapter.js";
import { MetaverseRoomDirectory } from "../../../server/dist/metaverse/classes/metaverse-room-directory.js";

function createPresenceSessionContext(playerId, nowMs = 0) {
  const roomDirectory = new MetaverseRoomDirectory();
  const roomAssignment = roomDirectory.quickJoinRoom(
    createMetaverseQuickJoinRoomRequest({
      matchMode: "free-roam",
      playerId
    }),
    nowMs
  );

  return {
    adapter: new MetaversePresenceWebTransportAdapter(roomDirectory),
    roomAssignment
  };
}

test("MetaversePresenceWebTransportAdapter serves presence commands and roster reads through one session owner", () => {
  const playerId = createMetaversePlayerId("harbor-pilot-1");
  const username = createUsername("Harbor Pilot");

  assert.notEqual(playerId, null);
  assert.notEqual(username, null);

  const { adapter, roomAssignment } = createPresenceSessionContext(playerId);
  const session = adapter.openSession();

  const joinResponse = session.receiveClientMessage(
    createMetaversePresenceWebTransportCommandRequest({
      roomId: roomAssignment.roomId,
      command: createMetaverseJoinPresenceCommand({
        characterId: "mesh2motion-humanoid-v1",
        playerId,
        pose: {
          look: {
            pitchRadians: -0.1,
            yawRadians: 0.4
          },
          position: {
            x: 0,
            y: 1.62,
            z: 24
          },
          yawRadians: 0
        },
        username
      })
    }),
    0
  );
  const rosterResponse = session.receiveClientMessage(
    createMetaversePresenceWebTransportRosterRequest({
      observerPlayerId: playerId,
      roomId: roomAssignment.roomId
    }),
    50
  );

  assert.equal(joinResponse.type, "presence-server-event");
  assert.equal(joinResponse.event.roster.players[0]?.playerId, "harbor-pilot-1");
  assert.equal(joinResponse.event.roster.players[0]?.pose.look.pitchRadians, -0.1);
  assert.equal(joinResponse.event.roster.players[0]?.pose.look.yawRadians, 0.4);
  assert.equal(rosterResponse.type, "presence-server-event");
  assert.equal(rosterResponse.event.roster.players[0]?.pose.look.pitchRadians, -0.1);
  assert.equal(rosterResponse.event.roster.players[0]?.pose.look.yawRadians, 0.4);
  assert.equal(rosterResponse.event.roster.snapshotSequence >= 1, true);
});

test("MetaversePresenceWebTransportAdapter returns typed error frames for unknown observers", () => {
  const playerId = createMetaversePlayerId("missing-player");

  assert.notEqual(playerId, null);

  const { adapter, roomAssignment } = createPresenceSessionContext(playerId);
  const session = adapter.openSession();

  const response = session.receiveClientMessage(
    createMetaversePresenceWebTransportRosterRequest({
      observerPlayerId: playerId,
      roomId: roomAssignment.roomId
    }),
    0
  );

  assert.equal(response.type, "presence-error");
  assert.match(response.message, /Unknown metaverse player/);
});
