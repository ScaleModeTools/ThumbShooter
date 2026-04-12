import assert from "node:assert/strict";
import test from "node:test";

import {
  createMetaverseJoinPresenceCommand,
  createMetaversePlayerId,
  createMetaversePresenceRosterSnapshot,
  createMetaverseSessionSnapshot,
  createPortalLaunchSelectionSnapshot,
  createUsername,
  experienceCatalog,
  readExperienceCatalogEntry,
  readExperienceTickOwner
} from "@webgpu-metaverse/shared";

test("experienceCatalog exposes Duck Hunt as the first metaverse-ready experience", () => {
  assert.equal(experienceCatalog.length, 1);

  const duckHuntEntry = readExperienceCatalogEntry("duck-hunt");

  assert.equal(duckHuntEntry.id, "duck-hunt");
  assert.equal(duckHuntEntry.label, "Duck Hunt!");
  assert.equal(duckHuntEntry.defaultInputMode, "mouse");
  assert.deepEqual(duckHuntEntry.supportedSessionModes, [
    "single-player",
    "co-op"
  ]);
  assert.equal(readExperienceTickOwner("duck-hunt", "single-player"), "client");
  assert.equal(readExperienceTickOwner("duck-hunt", "co-op"), "server");
});

test("createPortalLaunchSelectionSnapshot resolves the authority model from the shared catalog", () => {
  const singlePlayerLaunch = createPortalLaunchSelectionSnapshot({
    experienceId: "duck-hunt",
    inputMode: "mouse",
    sessionMode: "single-player"
  });
  const coopLaunch = createPortalLaunchSelectionSnapshot({
    experienceId: "duck-hunt",
    inputMode: "camera-thumb-trigger",
    sessionMode: "co-op"
  });

  assert.equal(singlePlayerLaunch.tickOwner, "client");
  assert.equal(coopLaunch.tickOwner, "server");
});

test("createMetaverseSessionSnapshot freezes the available experience ids", () => {
  const inputExperienceIds = ["duck-hunt"];
  const sessionSnapshot = createMetaverseSessionSnapshot({
    activeExperienceId: null,
    availableExperienceIds: inputExperienceIds,
    selectedSessionMode: "single-player",
    tickOwner: "server"
  });

  inputExperienceIds.push("duck-hunt");

  assert.deepEqual(sessionSnapshot.availableExperienceIds, ["duck-hunt"]);
  assert.ok(Object.isFrozen(sessionSnapshot.availableExperienceIds));
});

test("metaverse presence contracts freeze roster and normalize ids", () => {
  const playerId = createMetaversePlayerId(" harbor-pilot-1 ");
  const username = createUsername("Harbor Pilot");

  assert.notEqual(playerId, null);
  assert.notEqual(username, null);

  const rosterInput = [
    {
      characterId: " metaverse-mannequin-v1 ",
      playerId,
      pose: {
        animationVocabulary: "walk",
        locomotionMode: "swim",
        mountedOccupancy: {
          environmentAssetId: " metaverse-hub-skiff-v1 ",
          entryId: null,
          occupancyKind: "seat",
          occupantRole: "passenger",
          seatId: " port-bench-seat "
        },
        position: {
          x: 2,
          y: 0.5,
          z: -4
        },
        stateSequence: 3.8,
        yawRadians: Math.PI * 3
      },
      username
    }
  ];
  const rosterSnapshot = createMetaversePresenceRosterSnapshot({
    players: rosterInput,
    snapshotSequence: 5.9,
    tickIntervalMs: 120
  });
  const joinCommand = createMetaverseJoinPresenceCommand({
    characterId: " metaverse-mannequin-v1 ",
    playerId,
    pose: {
      position: {
        x: 2,
        y: 0.5,
        z: -4
      },
      mountedOccupancy: {
        environmentAssetId: " metaverse-hub-skiff-v1 ",
        entryId: null,
        occupancyKind: "seat",
        occupantRole: "passenger",
        seatId: " port-bench-seat "
      },
      yawRadians: Math.PI * 3
    },
    username
  });

  rosterInput.push(rosterInput[0]);

  assert.equal(rosterSnapshot.players.length, 1);
  assert.equal(rosterSnapshot.players[0]?.characterId, "metaverse-mannequin-v1");
  assert.equal(rosterSnapshot.players[0]?.pose.stateSequence, 3);
  assert.equal(rosterSnapshot.players[0]?.pose.yawRadians, Math.PI * 3);
  assert.equal(
    rosterSnapshot.players[0]?.pose.mountedOccupancy?.environmentAssetId,
    "metaverse-hub-skiff-v1"
  );
  assert.equal(
    rosterSnapshot.players[0]?.pose.mountedOccupancy?.seatId,
    "port-bench-seat"
  );
  assert.equal(rosterSnapshot.snapshotSequence, 5);
  assert.ok(Object.isFrozen(rosterSnapshot.players));
  assert.ok(Object.isFrozen(rosterSnapshot.players[0]));
  assert.ok(Object.isFrozen(rosterSnapshot.players[0]?.pose.mountedOccupancy));
  assert.equal(joinCommand.playerId, "harbor-pilot-1");
  assert.equal(joinCommand.pose.animationVocabulary, "idle");
  assert.equal(joinCommand.pose.locomotionMode, "grounded");
  assert.equal(joinCommand.pose.mountedOccupancy?.occupancyKind, "seat");
});
