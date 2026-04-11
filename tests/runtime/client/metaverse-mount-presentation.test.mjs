import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { createClientModuleLoader } from "./load-client-module.mjs";

let clientLoader;

function wrapRadians(rawValue) {
  let nextValue = rawValue;

  while (nextValue > Math.PI) {
    nextValue -= Math.PI * 2;
  }

  while (nextValue <= -Math.PI) {
    nextValue += Math.PI * 2;
  }

  return nextValue;
}

before(async () => {
  clientLoader = await createClientModuleLoader();
});

after(async () => {
  await clientLoader.close();
});

test("resolveMountedCharacterSeatTransform aligns seat sockets and derives rider yaw from vehicle semantics", async () => {
  const [
    {
      createMountedCharacterSeatTransformSnapshot,
      resolveEnvironmentRenderYawFromRuntimeYaw,
      resolveMountedCharacterSeatTransform
    },
    { Euler, Group, Object3D, Quaternion, Vector3 }
  ] = await Promise.all([
    clientLoader.load("/src/metaverse/traversal/presentation/mount-presentation.ts"),
    import("three/webgpu")
  ]);
  const vehicleAsset = Object.freeze({
    orientation: Object.freeze({
      bowModelYawRadians: Math.PI * 0.25
    })
  });
  const seatMount = Object.freeze({
    riderFacingDirection: "bow"
  });
  const vehicleRuntimeYawRadians = 0.4;
  const vehicleAnchorGroup = new Group();
  const seatSocketNode = new Object3D();
  const sceneRoot = new Group();

  sceneRoot.add(vehicleAnchorGroup);
  vehicleAnchorGroup.rotation.set(
    0.21,
    resolveEnvironmentRenderYawFromRuntimeYaw(
      vehicleAsset,
      vehicleRuntimeYawRadians
    ),
    -0.17
  );
  vehicleAnchorGroup.position.set(2.4, 1.1, -3.2);
  vehicleAnchorGroup.add(seatSocketNode);
  seatSocketNode.position.set(0.35, 1.28, -0.42);

  const characterAnchorGroup = new Group();
  const characterSeatSocketNode = new Object3D();

  seatSocketNode.add(characterAnchorGroup);
  characterAnchorGroup.scale.setScalar(1.15);
  characterAnchorGroup.add(characterSeatSocketNode);
  characterSeatSocketNode.position.set(0.18, 0.46, -0.62);

  sceneRoot.updateMatrixWorld(true);

  const mountTransform = createMountedCharacterSeatTransformSnapshot();

  resolveMountedCharacterSeatTransform(
    {
      characterAnchorGroup,
      characterRenderYawOffsetRadians: Math.PI,
      characterSeatSocketNode,
      mount: seatMount,
      seatSocketNode,
      vehicleAnchorGroup,
      vehicleOrientation: vehicleAsset
    },
    mountTransform
  );

  characterAnchorGroup.position.copy(mountTransform.localPosition);
  characterAnchorGroup.quaternion.copy(mountTransform.localQuaternion);
  characterAnchorGroup.updateMatrixWorld(true);

  const mountedSeatWorldPosition = seatSocketNode.getWorldPosition(new Vector3());
  const characterSeatWorldPosition = characterSeatSocketNode.getWorldPosition(
    new Vector3()
  );
  const characterWorldYawRadians = new Euler().setFromQuaternion(
    characterAnchorGroup.getWorldQuaternion(new Quaternion()),
    "YXZ"
  ).y;
  const expectedCharacterRenderYawRadians = wrapRadians(
    Math.PI - vehicleRuntimeYawRadians
  );

  assert.ok(
    characterSeatWorldPosition.distanceTo(mountedSeatWorldPosition) < 0.0001
  );
  assert.ok(
    Math.abs(
      wrapRadians(
        characterWorldYawRadians - expectedCharacterRenderYawRadians
      )
    ) < 0.0001
  );
});
