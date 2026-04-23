import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaverseCombatMatchSnapshot,
  createMetaversePlayerCombatHurtVolumes,
  resolveMetaverseCombatHitForSegment
} from "@webgpu-metaverse/shared";

test("shared metaverse combat match defaults to a 3 second respawn delay", () => {
  const combatMatchSnapshot = createMetaverseCombatMatchSnapshot();

  assert.equal(combatMatchSnapshot.respawnDelayMs, 3_000);
});

test("shared metaverse combat hurt volumes resolve a floor-root standing body shot", () => {
  const hurtVolumes = createMetaversePlayerCombatHurtVolumes({
    activeBodyPosition: {
      x: 0,
      y: 0,
      z: 0
    }
  });
  const hitResolution = resolveMetaverseCombatHitForSegment(
    {
      x: 0,
      y: 0.95,
      z: -8
    },
    {
      x: 0,
      y: 0.95,
      z: 8
    },
    hurtVolumes
  );

  assert.notEqual(hitResolution, null);
  assert.equal(hitResolution?.hitZone, "body");
});

test("shared metaverse combat hurt volumes resolve a floor-root standing head shot", () => {
  const hurtVolumes = createMetaversePlayerCombatHurtVolumes({
    activeBodyPosition: {
      x: 0,
      y: 0,
      z: 0
    }
  });
  const hitResolution = resolveMetaverseCombatHitForSegment(
    {
      x: 0,
      y: 1.58,
      z: -8
    },
    {
      x: 0,
      y: 1.58,
      z: 8
    },
    hurtVolumes
  );

  assert.notEqual(hitResolution, null);
  assert.equal(hitResolution?.hitZone, "head");
});
