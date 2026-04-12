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

test("ReliableWebTransportJsonRequestChannel serializes sequential JSON frames over one reliable stream", async () => {
  const { ReliableWebTransportJsonRequestChannel } = await clientLoader.load(
    "/src/network/index.ts"
  );
  const fakeSession = createFakeWebTransportSession();
  const channel = new ReliableWebTransportJsonRequestChannel(
    {
      parseResponse(payload) {
        return payload;
      },
      url: "https://example.test/metaverse"
    },
    {
      webTransportFactory() {
        return fakeSession.transport;
      }
    }
  );

  const firstResponsePromise = channel.sendRequest({
    requestId: 1,
    type: "first-request"
  });
  const secondResponsePromise = channel.sendRequest({
    requestId: 2,
    type: "second-request"
  });

  assert.deepEqual(await fakeSession.readClientFrame(), {
    requestId: 1,
    type: "first-request"
  });
  await fakeSession.writeServerFrame({
    responseId: 1
  });
  assert.deepEqual(await firstResponsePromise, {
    responseId: 1
  });

  assert.deepEqual(await fakeSession.readClientFrame(), {
    requestId: 2,
    type: "second-request"
  });
  await fakeSession.writeServerFrame({
    responseId: 2
  });
  assert.deepEqual(await secondResponsePromise, {
    responseId: 2
  });

  channel.dispose();
  await flushAsyncWork();

  assert.ok(fakeSession.closeCallCount >= 1);
});

test("ReliableWebTransportJsonRequestChannel rejects requests after disposal", async () => {
  const { ReliableWebTransportJsonRequestChannel } = await clientLoader.load(
    "/src/network/index.ts"
  );
  const channel = new ReliableWebTransportJsonRequestChannel(
    {
      parseResponse(payload) {
        return payload;
      },
      url: "https://example.test/metaverse"
    },
    {
      webTransportFactory() {
        return createFakeWebTransportSession().transport;
      }
    }
  );

  channel.dispose();

  await assert.rejects(
    () =>
      channel.sendRequest({
        type: "after-dispose"
      }),
    /already been disposed/
  );
});
