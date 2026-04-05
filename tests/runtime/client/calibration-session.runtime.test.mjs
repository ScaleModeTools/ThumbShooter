import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { createCalibrationShotSample } from "@thumbshooter/shared";

import { createClientModuleLoader } from "./load-client-module.mjs";

let clientLoader;

before(async () => {
  clientLoader = await createClientModuleLoader();
});

after(async () => {
  await clientLoader?.close();
});

function createTrackedSnapshot(sequenceNumber, x, y, thumbDrop = 0) {
  return {
    trackingState: "tracked",
    sequenceNumber,
    timestampMs: sequenceNumber * 10,
    pose: {
      thumbTip: {
        x,
        y: y + thumbDrop
      },
      indexTip: {
        x,
        y
      }
    }
  };
}

test("NinePointCalibrationSession captures one sample per trigger press and completes on the ninth anchor", async () => {
  const { NinePointCalibrationSession, gameFoundationConfig } = await clientLoader.load(
    "/src/game/index.ts"
  );
  const session = new NinePointCalibrationSession();
  const capturedAnchorIds = [];
  let fittedCalibration = null;
  let sequenceNumber = 0;

  for (const anchor of gameFoundationConfig.calibration.anchors) {
    session.ingestTrackingSnapshot(
      createTrackedSnapshot(sequenceNumber += 1, anchor.normalizedTarget.x, anchor.normalizedTarget.y)
    );

    const pressedResult = session.ingestTrackingSnapshot(
      createTrackedSnapshot(
        sequenceNumber += 1,
        anchor.normalizedTarget.x,
        anchor.normalizedTarget.y,
        0.08
      )
    );

    if (pressedResult.capturedSample !== null) {
      capturedAnchorIds.push(pressedResult.capturedSample.anchorId);
    }

    if (pressedResult.fittedCalibration !== null) {
      fittedCalibration = pressedResult.fittedCalibration;
    }

    const heldResult = session.ingestTrackingSnapshot(
      createTrackedSnapshot(
        sequenceNumber += 1,
        anchor.normalizedTarget.x,
        anchor.normalizedTarget.y,
        0.08
      )
    );

    assert.equal(heldResult.capturedSample, null);

    session.ingestTrackingSnapshot(
      createTrackedSnapshot(sequenceNumber += 1, anchor.normalizedTarget.x, anchor.normalizedTarget.y)
    );
  }

  assert.deepEqual(
    capturedAnchorIds,
    gameFoundationConfig.calibration.anchors.map((anchor) => anchor.id)
  );
  assert.notEqual(fittedCalibration, null);
  assert.equal(session.snapshot.captureState, "complete");
  assert.equal(session.snapshot.currentAnchorId, null);
});

test("NinePointCalibrationSession resumes only the sequential stored anchor prefix", async () => {
  const { NinePointCalibrationSession } = await clientLoader.load(
    "/src/game/classes/nine-point-calibration-session.ts"
  );
  const session = new NinePointCalibrationSession([
    createCalibrationShotSample({
      anchorId: "center",
      intendedTarget: { x: 0.5, y: 0.5 },
      observedPose: {
        thumbTip: { x: 0.5, y: 0.6 },
        indexTip: { x: 0.5, y: 0.5 }
      }
    }),
    createCalibrationShotSample({
      anchorId: "top-left",
      intendedTarget: { x: 0.1, y: 0.1 },
      observedPose: {
        thumbTip: { x: 0.1, y: 0.2 },
        indexTip: { x: 0.1, y: 0.1 }
      }
    }),
    createCalibrationShotSample({
      anchorId: "bottom-center",
      intendedTarget: { x: 0.5, y: 0.9 },
      observedPose: {
        thumbTip: { x: 0.5, y: 1 },
        indexTip: { x: 0.5, y: 0.9 }
      }
    })
  ]);

  assert.equal(session.snapshot.capturedSampleCount, 2);
  assert.equal(session.snapshot.currentAnchorId, "top-right");
});
