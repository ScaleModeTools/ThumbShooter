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

class FakeRenderer {
  disposed = false;
  initCalls = 0;
  pixelRatio = null;
  renderCalls = 0;
  sizes = [];

  async init() {
    this.initCalls += 1;
  }

  render() {
    this.renderCalls += 1;
  }

  setPixelRatio(pixelRatio) {
    this.pixelRatio = pixelRatio;
  }

  setSize(width, height) {
    this.sizes.push([width, height]);
  }

  dispose() {
    this.disposed = true;
  }
}

test("WebGpuGameplayRuntime rejects unsupported navigators explicitly", async () => {
  const { WebGpuGameplayRuntime } = await clientLoader.load(
    "/src/game/classes/webgpu-gameplay-runtime.ts"
  );
  const runtime = new WebGpuGameplayRuntime(
    {
      latestPose: {
        trackingState: "unavailable",
        sequenceNumber: 0,
        timestampMs: null,
        pose: null
      }
    },
    {
      xCoefficients: [1, 0, 0],
      yCoefficients: [0, 1, 0]
    },
    undefined,
    {
      cancelAnimationFrame() {},
      createRenderer: () => new FakeRenderer(),
      devicePixelRatio: 1,
      requestAnimationFrame() {
        return 1;
      }
    }
  );

  await assert.rejects(
    runtime.start({ clientHeight: 720, clientWidth: 1280 }, {}),
    /WebGPU is unavailable/
  );
  assert.equal(runtime.hudSnapshot.lifecycle, "failed");
});

test("WebGpuGameplayRuntime renders the calibrated reticle from live tracking snapshots", async () => {
  const { WebGpuGameplayRuntime } = await clientLoader.load(
    "/src/game/classes/webgpu-gameplay-runtime.ts"
  );
  const trackingSource = {
    latestPose: {
      trackingState: "tracked",
      sequenceNumber: 1,
      timestampMs: 10,
      pose: {
        thumbTip: { x: 0.3, y: 0.5 },
        indexTip: { x: 0.25, y: 0.4 }
      }
    }
  };
  const renderer = new FakeRenderer();
  let scheduledFrame = null;

  const runtime = new WebGpuGameplayRuntime(
    trackingSource,
    {
      xCoefficients: [1, 0, 0],
      yCoefficients: [0, 1, 0]
    },
    undefined,
    {
      cancelAnimationFrame() {
        scheduledFrame = null;
      },
      createRenderer: () => renderer,
      devicePixelRatio: 1.5,
      requestAnimationFrame(callback) {
        scheduledFrame = callback;
        return 1;
      }
    }
  );

  const startSnapshot = await runtime.start(
    {
      clientHeight: 720,
      clientWidth: 1280
    },
    {
      gpu: {}
    }
  );

  assert.equal(startSnapshot.lifecycle, "running");
  assert.equal(typeof scheduledFrame, "function");

  scheduledFrame();

  assert.equal(renderer.initCalls, 1);
  assert.equal(renderer.renderCalls, 1);
  assert.equal(renderer.pixelRatio, 1.5);
  assert.deepEqual(renderer.sizes.at(-1), [1280, 720]);
  assert.equal(runtime.hudSnapshot.trackingState, "tracked");
  assert.deepEqual(runtime.hudSnapshot.aimPoint, {
    x: 0.25,
    y: 0.4
  });

  trackingSource.latestPose = {
    trackingState: "no-hand",
    sequenceNumber: 2,
    timestampMs: 20,
    pose: null
  };

  scheduledFrame();

  assert.equal(runtime.hudSnapshot.trackingState, "no-hand");
  assert.equal(runtime.hudSnapshot.aimPoint, null);

  runtime.dispose();

  assert.equal(renderer.disposed, true);
  assert.equal(runtime.hudSnapshot.lifecycle, "idle");
});
