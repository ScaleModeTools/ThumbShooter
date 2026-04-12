import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaverseJoinPresenceCommand,
  createMetaversePlayerId,
  createMetaverseRealtimeWorldWebTransportCommandRequest,
  createMetaverseRealtimeWorldWebTransportSnapshotRequest,
  createMetaverseSyncDriverVehicleControlCommand,
  createUsername
} from "@webgpu-metaverse/shared";

import { MetaverseWorldWebTransportAdapter } from "../../../server/dist/metaverse/adapters/metaverse-world-webtransport-adapter.js";
import { MetaverseAuthoritativeWorldRuntime } from "../../../server/dist/metaverse/classes/metaverse-authoritative-world-runtime.js";

test("MetaverseWorldWebTransportAdapter serves authoritative world snapshots through one session owner", () => {
  const runtime = new MetaverseAuthoritativeWorldRuntime();
  const adapter = new MetaverseWorldWebTransportAdapter(runtime);
  const session = adapter.openSession();
  const playerId = createMetaversePlayerId("harbor-pilot-1");
  const username = createUsername("Harbor Pilot");

  assert.notEqual(playerId, null);
  assert.notEqual(username, null);

  runtime.acceptPresenceCommand(
    createMetaverseJoinPresenceCommand({
      characterId: "metaverse-mannequin-v1",
      playerId,
      pose: {
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
        yawRadians: 0
      },
      username
    }),
    0
  );

  const response = session.receiveClientMessage(
    createMetaverseRealtimeWorldWebTransportSnapshotRequest({
      observerPlayerId: playerId
    }),
    100
  );

  assert.equal(response.type, "world-server-event");
  assert.equal(response.event.world.players[0]?.playerId, "harbor-pilot-1");
  assert.equal(response.event.world.vehicles.length, 1);
});

test("MetaverseWorldWebTransportAdapter accepts typed driver vehicle control requests", () => {
  const runtime = new MetaverseAuthoritativeWorldRuntime();
  const adapter = new MetaverseWorldWebTransportAdapter(runtime);
  const session = adapter.openSession();
  const playerId = createMetaversePlayerId("harbor-pilot-1");
  const username = createUsername("Harbor Pilot");

  assert.notEqual(playerId, null);
  assert.notEqual(username, null);

  runtime.acceptPresenceCommand(
    createMetaverseJoinPresenceCommand({
      characterId: "metaverse-mannequin-v1",
      playerId,
      pose: {
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
        yawRadians: 0
      },
      username
    }),
    0
  );

  const response = session.receiveClientMessage(
    createMetaverseRealtimeWorldWebTransportCommandRequest({
      command: createMetaverseSyncDriverVehicleControlCommand({
        controlIntent: {
          boost: false,
          environmentAssetId: "metaverse-hub-skiff-v1",
          moveAxis: 1,
          strafeAxis: 0,
          yawAxis: 0
        },
        controlSequence: 1,
        playerId
      })
    }),
    100
  );

  assert.equal(response.type, "world-server-event");
  assert.equal(response.event.type, "world-snapshot");
});

test("MetaverseWorldWebTransportAdapter returns typed error frames for unknown observers", () => {
  const adapter = new MetaverseWorldWebTransportAdapter(
    new MetaverseAuthoritativeWorldRuntime()
  );
  const session = adapter.openSession();
  const playerId = createMetaversePlayerId("missing-player");

  assert.notEqual(playerId, null);

  const response = session.receiveClientMessage(
    createMetaverseRealtimeWorldWebTransportSnapshotRequest({
      observerPlayerId: playerId
    }),
    0
  );

  assert.equal(response.type, "world-error");
  assert.match(response.message, /Unknown metaverse player/);
});
