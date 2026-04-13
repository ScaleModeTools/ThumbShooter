import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { createClientModuleLoader } from "./load-client-module.mjs";

let clientLoader;

before(async () => {
  clientLoader = await createClientModuleLoader();
});

after(async () => {
  await clientLoader?.close();
});

function flushAsyncWork() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

function createFakeWebTransportSession() {
  const clientToServer = new TransformStream();
  const serverToClient = new TransformStream();
  const clientFrameReader = clientToServer.readable.getReader();
  const serverFrameWriter = serverToClient.writable.getWriter();
  let closeCallCount = 0;

  return {
    async closeServerFrames() {
      await serverFrameWriter.close();
      serverFrameWriter.releaseLock();
    },
    get closeCallCount() {
      return closeCallCount;
    },
    async readClientFrame() {
      const { done, value } = await clientFrameReader.read();

      assert.equal(done, false);
      return JSON.parse(new TextDecoder().decode(value).trim());
    },
    transport: {
      closed: Promise.resolve(),
      async createBidirectionalStream() {
        return {
          readable: serverToClient.readable,
          writable: clientToServer.writable
        };
      },
      close() {
        closeCallCount += 1;
      },
      ready: Promise.resolve()
    },
    async writeServerFrame(payload) {
      await serverFrameWriter.write(
        new TextEncoder().encode(`${JSON.stringify(payload)}\n`)
      );
    }
  };
}

test("ReliableWebTransportJsonSubscriptionChannel streams sequential JSON frames over one reliable subscription", async () => {
  const { ReliableWebTransportJsonSubscriptionChannel } = await clientLoader.load(
    "/src/network/index.ts"
  );
  const fakeSession = createFakeWebTransportSession();
  const responses = [];
  let closeCallCount = 0;
  const channel = new ReliableWebTransportJsonSubscriptionChannel(
    {
      parseResponse(payload) {
        return payload;
      },
      url: "https://example.test/metaverse/world"
    },
    {
      webTransportFactory() {
        return fakeSession.transport;
      }
    }
  );

  const subscription = channel.openSubscription(
    {
      subscriptionId: 1,
      type: "world-snapshot-subscribe"
    },
    {
      onClose() {
        closeCallCount += 1;
      },
      onResponse(response) {
        responses.push(response);
      }
    }
  );

  assert.deepEqual(await fakeSession.readClientFrame(), {
    subscriptionId: 1,
    type: "world-snapshot-subscribe"
  });

  await fakeSession.writeServerFrame({
    eventId: 1
  });
  await fakeSession.writeServerFrame({
    eventId: 2
  });
  await flushAsyncWork();

  assert.deepEqual(responses, [
    {
      eventId: 1
    },
    {
      eventId: 2
    }
  ]);

  await fakeSession.closeServerFrames();
  await subscription.closed;

  assert.equal(closeCallCount, 1);
  assert.ok(fakeSession.closeCallCount >= 1);

  channel.dispose();
});

test("ReliableWebTransportJsonSubscriptionChannel rejects subscriptions after disposal", async () => {
  const { ReliableWebTransportJsonSubscriptionChannel } = await clientLoader.load(
    "/src/network/index.ts"
  );
  const channel = new ReliableWebTransportJsonSubscriptionChannel(
    {
      parseResponse(payload) {
        return payload;
      },
      url: "https://example.test/metaverse/world"
    },
    {
      webTransportFactory() {
        return createFakeWebTransportSession().transport;
      }
    }
  );

  channel.dispose();

  assert.throws(
    () =>
      channel.openSubscription(
        {
          type: "after-dispose"
        },
        {
          onResponse() {}
        }
      ),
    /already been disposed/
  );
});
