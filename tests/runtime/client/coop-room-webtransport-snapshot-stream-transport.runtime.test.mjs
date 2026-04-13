import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import {
  createCoopPlayerId,
  createCoopRoomId,
  createCoopRoomSnapshotEvent,
  createCoopSessionId,
  createDuckHuntCoopRoomWebTransportErrorMessage,
  createDuckHuntCoopRoomWebTransportServerEventMessage
} from "@webgpu-metaverse/shared";

import { createClientModuleLoader } from "./load-client-module.mjs";

let clientLoader;

before(async () => {
  clientLoader = await createClientModuleLoader();
});

after(async () => {
  await clientLoader?.close();
});

test("createCoopRoomWebTransportSnapshotStreamTransport subscribes with the explicit Duck Hunt room snapshot stream request", async () => {
  const { createCoopRoomWebTransportSnapshotStreamTransport } =
    await clientLoader.load("/src/network/index.ts");
  const playerId = createCoopPlayerId("stream-coop-player");
  const roomId = createCoopRoomId("co-op-stream-room");
  const sessionId = createCoopSessionId("co-op-stream-room-session-1");

  assert.notEqual(playerId, null);
  assert.notEqual(roomId, null);
  assert.notEqual(sessionId, null);

  let capturedHandlers = null;
  const capturedRequests = [];
  let channelDisposed = false;
  const transport = createCoopRoomWebTransportSnapshotStreamTransport(
    {
      roomId,
      webTransportUrl: "https://example.test/duck-hunt/coop"
    },
    {
      channel: {
        dispose() {
          channelDisposed = true;
        },
        openSubscription(request, handlers) {
          capturedRequests.push(request);
          capturedHandlers = handlers;
          return {
            closed: Promise.resolve(),
            close() {}
          };
        }
      }
    }
  );
  const roomEvents = [];
  let closeCallCount = 0;

  transport.subscribeRoomSnapshots(playerId, {
    onClose() {
      closeCallCount += 1;
    },
    onRoomEvent(event) {
      roomEvents.push(event);
    }
  });

  assert.equal(capturedRequests.length, 1);
  assert.equal(capturedRequests[0]?.type, "coop-room-snapshot-subscribe");
  assert.equal(capturedRequests[0]?.observerPlayerId, playerId);
  assert.equal(capturedRequests[0]?.roomId, roomId);

  capturedHandlers?.onResponse(
    createDuckHuntCoopRoomWebTransportServerEventMessage({
      event: createCoopRoomSnapshotEvent({
        birds: [],
        capacity: 4,
        players: [],
        roomId,
        session: {
          birdsCleared: 0,
          birdsRemaining: 1,
          requiredReadyPlayerCount: 1,
          sessionId,
          teamHitsLanded: 0,
          teamShotsFired: 0
        },
        tick: {
          currentTick: 1,
          emittedAtServerTimeMs: 50,
          simulationTimeMs: 50,
          tickIntervalMs: 50
        }
      })
    })
  );

  assert.equal(roomEvents.length, 1);
  assert.equal(roomEvents[0]?.room.tick.currentTick, 1);

  assert.throws(
    () =>
      capturedHandlers?.onResponse(
        createDuckHuntCoopRoomWebTransportErrorMessage({
          message: "Unknown co-op player: stream-coop-player"
        })
      ),
    /Unknown co-op player/
  );

  capturedHandlers?.onClose?.();
  transport.dispose();

  assert.equal(closeCallCount, 1);
  assert.equal(channelDisposed, true);
});
