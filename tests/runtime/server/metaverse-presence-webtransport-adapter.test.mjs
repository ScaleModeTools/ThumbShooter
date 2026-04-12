import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaverseJoinPresenceCommand,
  createMetaversePlayerId,
  createMetaversePresenceWebTransportCommandRequest,
  createMetaversePresenceWebTransportRosterRequest,
  createUsername
} from "@webgpu-metaverse/shared";

import { MetaverseAuthoritativeWorldRuntime } from "../../../server/dist/metaverse/classes/metaverse-authoritative-world-runtime.js";
import { MetaversePresenceWebTransportAdapter } from "../../../server/dist/metaverse/adapters/metaverse-presence-webtransport-adapter.js";

test("MetaversePresenceWebTransportAdapter serves presence commands and roster reads through one session owner", () => {
  const runtime = new MetaverseAuthoritativeWorldRuntime();
  const adapter = new MetaversePresenceWebTransportAdapter(runtime);
  const session = adapter.openSession();
  const playerId = createMetaversePlayerId("harbor-pilot-1");
  const username = createUsername("Harbor Pilot");

  assert.notEqual(playerId, null);
  assert.notEqual(username, null);

  const joinResponse = session.receiveClientMessage(
    createMetaversePresenceWebTransportCommandRequest({
      command: createMetaverseJoinPresenceCommand({
        characterId: "metaverse-mannequin-v1",
        playerId,
        pose: {
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
      observerPlayerId: playerId
    }),
    50
  );

  assert.equal(joinResponse.type, "presence-server-event");
  assert.equal(joinResponse.event.roster.players[0]?.playerId, "harbor-pilot-1");
  assert.equal(rosterResponse.type, "presence-server-event");
  assert.equal(rosterResponse.event.roster.snapshotSequence >= 1, true);
});

test("MetaversePresenceWebTransportAdapter returns typed error frames for unknown observers", () => {
  const adapter = new MetaversePresenceWebTransportAdapter(
    new MetaverseAuthoritativeWorldRuntime()
  );
  const session = adapter.openSession();
  const playerId = createMetaversePlayerId("missing-player");

  assert.notEqual(playerId, null);

  const response = session.receiveClientMessage(
    createMetaversePresenceWebTransportRosterRequest({
      observerPlayerId: playerId
    }),
    0
  );

  assert.equal(response.type, "presence-error");
  assert.match(response.message, /Unknown metaverse player/);
});
