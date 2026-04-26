import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaverseCombatMatchSnapshot,
  createMetaversePlayerCombatSnapshot,
  createMetaversePlayerCombatHurtVolumes,
  resolveMetaverseCombatHitForSegment
} from "@webgpu-metaverse/shared";

test("shared metaverse combat match defaults to a 3 second respawn delay", () => {
  const combatMatchSnapshot = createMetaverseCombatMatchSnapshot();

  assert.equal(combatMatchSnapshot.respawnDelayMs, 3_000);
});

test("shared metaverse combat snapshots preserve negative suicide kills and team scores", () => {
  const playerCombatSnapshot = createMetaversePlayerCombatSnapshot({
    kills: -1.9
  });
  const combatMatchSnapshot = createMetaverseCombatMatchSnapshot({
    teams: [
      {
        playerIds: [],
        score: -2.8,
        teamId: "red"
      },
      {
        playerIds: [],
        score: 3.4,
        teamId: "blue"
      }
    ]
  });

  assert.equal(playerCombatSnapshot.kills, -1);
  assert.equal(combatMatchSnapshot.teams[0]?.score, -2);
  assert.equal(combatMatchSnapshot.teams[1]?.score, 3);
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
