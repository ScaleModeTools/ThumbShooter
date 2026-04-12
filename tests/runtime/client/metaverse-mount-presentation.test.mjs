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

test("environment yaw conversion roundtrips between simulation forward truth and render yaw", async () => {
  const {
    resolveEnvironmentRenderYawFromSimulationYaw,
    resolveEnvironmentSimulationYawFromRenderYaw
  } = await clientLoader.load(
    "/src/metaverse/traversal/presentation/mount-presentation.ts"
  );
  const vehicleAsset = Object.freeze({
    orientation: Object.freeze({
      forwardModelYawRadians: Math.PI * 0.5
    })
  });
  const unorientedDynamicAsset = Object.freeze({
    orientation: null
  });
  const simulationYawCases = [
    -Math.PI,
    -1.2,
    0,
    0.4,
    Math.PI * 0.9
  ];

  assert.ok(
    Math.abs(
      wrapRadians(
        resolveEnvironmentRenderYawFromSimulationYaw(vehicleAsset, 0) -
          Math.PI * 0.5
      )
    ) < 0.0001
  );

  for (const simulationYawRadians of simulationYawCases) {
    const renderYawRadians = resolveEnvironmentRenderYawFromSimulationYaw(
      vehicleAsset,
      simulationYawRadians
    );
    const roundtrippedSimulationYawRadians =
      resolveEnvironmentSimulationYawFromRenderYaw(vehicleAsset, renderYawRadians);

    assert.ok(
      Math.abs(
        wrapRadians(roundtrippedSimulationYawRadians - simulationYawRadians)
      ) < 0.0001
    );
    assert.ok(
      Math.abs(
        wrapRadians(
          resolveEnvironmentRenderYawFromSimulationYaw(
            unorientedDynamicAsset,
            simulationYawRadians
          ) - simulationYawRadians
        )
      ) < 0.0001
    );
    assert.ok(
      Math.abs(
        wrapRadians(
          resolveEnvironmentSimulationYawFromRenderYaw(
            unorientedDynamicAsset,
            simulationYawRadians
          ) - simulationYawRadians
        )
      ) < 0.0001
    );
  }
});

test("resolveMountedCharacterSeatTransform aligns seat sockets and follows the authored seat anchor rotation", async () => {
  const [
    {
      createMountedCharacterSeatTransformSnapshot,
      resolveMountedCharacterSeatTransform
    },
    { Group, Object3D, Quaternion, Vector3 }
  ] = await Promise.all([
    clientLoader.load("/src/metaverse/traversal/presentation/mount-presentation.ts"),
    import("three/webgpu")
  ]);
  const seatAnchorNode = new Object3D();
  const sceneRoot = new Group();

  sceneRoot.add(seatAnchorNode);
  seatAnchorNode.position.set(2.4, 1.1, -3.2);
  seatAnchorNode.rotation.set(0.21, Math.PI * 0.5, -0.17);

  const characterAnchorGroup = new Group();
  const characterSeatSocketNode = new Object3D();

  seatAnchorNode.add(characterAnchorGroup);
  characterAnchorGroup.scale.setScalar(1.15);
  characterAnchorGroup.add(characterSeatSocketNode);
  characterSeatSocketNode.position.set(0.18, 0.46, -0.62);

  sceneRoot.updateMatrixWorld(true);

  const mountTransform = createMountedCharacterSeatTransformSnapshot();

  resolveMountedCharacterSeatTransform(
    {
      characterAnchorGroup,
      characterSeatSocketNode,
      seatAnchorNode
    },
    mountTransform
  );

  characterAnchorGroup.position.copy(mountTransform.localPosition);
  characterAnchorGroup.quaternion.copy(mountTransform.localQuaternion);
  characterAnchorGroup.updateMatrixWorld(true);

  const mountedSeatWorldPosition = seatAnchorNode.getWorldPosition(new Vector3());
  const characterSeatWorldPosition = characterSeatSocketNode.getWorldPosition(
    new Vector3()
  );

  assert.ok(
    characterSeatWorldPosition.distanceTo(mountedSeatWorldPosition) < 0.0001
  );
  assert.ok(
    characterAnchorGroup
      .getWorldQuaternion(new Quaternion())
      .angleTo(seatAnchorNode.getWorldQuaternion(new Quaternion())) < 0.0001
  );
});

test("resolveMountedCharacterSeatTransform keeps local seat alignment stable while the seat anchor rotates", async () => {
  const [
    {
      createMountedCharacterSeatTransformSnapshot,
      resolveMountedCharacterSeatTransform
    },
    { Group, Object3D, Quaternion, Vector3 }
  ] = await Promise.all([
    clientLoader.load("/src/metaverse/traversal/presentation/mount-presentation.ts"),
    import("three/webgpu")
  ]);
  const seatAnchorNode = new Object3D();
  const sceneRoot = new Group();
  const characterAnchorGroup = new Group();
  const characterSeatSocketNode = new Object3D();
  const firstMountTransform = createMountedCharacterSeatTransformSnapshot();
  const secondMountTransform = createMountedCharacterSeatTransformSnapshot();

  sceneRoot.add(seatAnchorNode);
  seatAnchorNode.position.set(0.35, 1.28, -0.42);
  seatAnchorNode.add(characterAnchorGroup);
  characterAnchorGroup.add(characterSeatSocketNode);
  characterSeatSocketNode.position.set(0.18, 0.46, -0.62);

  seatAnchorNode.rotation.set(0, Math.PI * 0.5, 0);
  sceneRoot.updateMatrixWorld(true);
  resolveMountedCharacterSeatTransform(
    {
      characterAnchorGroup,
      characterSeatSocketNode,
      seatAnchorNode
    },
    firstMountTransform
  );

  characterAnchorGroup.position.copy(firstMountTransform.localPosition);
  characterAnchorGroup.quaternion.copy(firstMountTransform.localQuaternion);
  seatAnchorNode.rotation.set(0, -Math.PI * 0.25, 0);
  sceneRoot.updateMatrixWorld(true);
  resolveMountedCharacterSeatTransform(
    {
      characterAnchorGroup,
      characterSeatSocketNode,
      seatAnchorNode
    },
    secondMountTransform
  );

  assert.ok(
    firstMountTransform.localQuaternion.angleTo(secondMountTransform.localQuaternion) <
      0.0001
  );
  assert.ok(firstMountTransform.localQuaternion.angleTo(new Quaternion()) < 0.0001);
  assert.ok(
    firstMountTransform.localPosition.distanceTo(secondMountTransform.localPosition) <
      0.0001
  );
});
