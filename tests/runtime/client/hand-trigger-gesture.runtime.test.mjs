import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { createClientModuleLoader } from "./load-client-module.mjs";
import { createTrackedHandPose } from "./tracked-hand-pose-fixture.mjs";

let clientLoader;

before(async () => {
  clientLoader = await createClientModuleLoader();
});

after(async () => {
  await clientLoader?.close();
});

test("evaluateHandTriggerGesture uses thumb-chain engagement plus axis angle hysteresis", async () => {
  const { calibrationCaptureConfig, evaluateHandTriggerGesture } = await clientLoader.load(
    "/src/game/index.ts"
  );
  const triggerConfig = calibrationCaptureConfig.triggerGesture;
  const openPose = createTrackedHandPose(0.5, 0.4, 0);
  const pressedPose = createTrackedHandPose(0.5, 0.4, 1);

  const openGesture = evaluateHandTriggerGesture(openPose, false, triggerConfig);

  assert.equal(openGesture.triggerPressed, false);
  assert.equal(openGesture.triggerReady, true);
  assert.equal(openGesture.axisAngleDegrees >= 40, true);
  assert.equal(
    openGesture.axisAngleDegrees >= triggerConfig.releaseAxisAngleDegrees,
    true
  );
  assert.equal(
    openGesture.engagementRatio >= triggerConfig.releaseEngagementRatio,
    true
  );

  const pressedGesture = evaluateHandTriggerGesture(pressedPose, false, triggerConfig);

  assert.equal(pressedGesture.triggerPressed, true);
  assert.equal(pressedGesture.triggerReady, false);
  assert.equal(pressedGesture.axisAngleDegrees <= 12, true);
  assert.equal(
    pressedGesture.axisAngleDegrees <= triggerConfig.pressAxisAngleDegrees,
    true
  );
  assert.equal(
    pressedGesture.engagementRatio <= triggerConfig.pressEngagementRatio,
    true
  );

  const releasedGesture = evaluateHandTriggerGesture(openPose, true, triggerConfig);

  assert.equal(releasedGesture.triggerPressed, false);
  assert.equal(releasedGesture.triggerReady, true);
});
