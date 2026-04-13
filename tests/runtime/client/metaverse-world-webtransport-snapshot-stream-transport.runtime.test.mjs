import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import {
  createMetaversePlayerId,
  createMetaverseRealtimeWorldEvent,
  createMetaverseRealtimeWorldWebTransportErrorMessage,
  createMetaverseRealtimeWorldWebTransportServerEventMessage
} from "@webgpu-metaverse/shared";

import { createClientModuleLoader } from "./load-client-module.mjs";

let clientLoader;

before(async () => {
  clientLoader = await createClientModuleLoader();
});

after(async () => {
  await clientLoader?.close();
});

test("createMetaverseWorldWebTransportSnapshotStreamTransport subscribes with the explicit world snapshot stream request", async () => {
  const { createMetaverseWorldWebTransportSnapshotStreamTransport } =
    await clientLoader.load("/src/network/index.ts");
  const playerId = createMetaversePlayerId("stream-world-player");

  assert.notEqual(playerId, null);

  let capturedHandlers = null;
  const capturedRequests = [];
  let channelDisposed = false;
  const transport = createMetaverseWorldWebTransportSnapshotStreamTransport(
    {
      webTransportUrl: "https://example.test/metaverse/world"
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
  const worldEvents = [];
  let closeCallCount = 0;

  transport.subscribeWorldSnapshots(playerId, {
    onClose() {
      closeCallCount += 1;
    },
    onWorldEvent(event) {
      worldEvents.push(event);
    }
  });

  assert.equal(capturedRequests.length, 1);
  assert.equal(capturedRequests[0]?.type, "world-snapshot-subscribe");
  assert.equal(capturedRequests[0]?.observerPlayerId, playerId);

  capturedHandlers?.onResponse(
    createMetaverseRealtimeWorldWebTransportServerEventMessage({
      event: createMetaverseRealtimeWorldEvent({
        world: {
          players: [],
          snapshotSequence: 1,
          tick: {
            currentTick: 10,
            emittedAtServerTimeMs: 1_500,
            simulationTimeMs: 1_450,
            tickIntervalMs: 50
          },
          vehicles: []
        }
      })
    })
  );

  assert.equal(worldEvents.length, 1);
  assert.equal(worldEvents[0]?.world.tick.currentTick, 10);

  assert.throws(
    () =>
      capturedHandlers?.onResponse(
        createMetaverseRealtimeWorldWebTransportErrorMessage({
          message: "Unknown metaverse player: stream-world-player"
        })
      ),
    /Unknown metaverse player/
  );

  capturedHandlers?.onClose?.();
  transport.dispose();

  assert.equal(closeCallCount, 1);
  assert.equal(channelDisposed, true);
});
