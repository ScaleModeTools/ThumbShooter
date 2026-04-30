import assert from "node:assert/strict";
import test, { after, before } from "node:test";

import { createClientModuleLoader } from "../load-client-module.mjs";

let clientLoader;

before(async () => {
  clientLoader = await createClientModuleLoader();
});

after(async () => {
  await clientLoader?.close();
});

test("metaverse respawn presentation exposes the last 3 seconds without decimals", async () => {
  const {
    resolveMetaverseRespawnCountdownAudioCueId,
    resolveMetaverseRespawnCountdownSecond,
    resolveMetaverseRespawnVisibleCountdownSecond
  } = await clientLoader.load(
    "/src/metaverse/config/metaverse-respawn-presentation.ts"
  );

  assert.equal(resolveMetaverseRespawnCountdownSecond(5_000), null);
  assert.equal(resolveMetaverseRespawnCountdownSecond(4_001), null);
  assert.equal(resolveMetaverseRespawnCountdownSecond(4_000), 3);
  assert.equal(resolveMetaverseRespawnCountdownSecond(3_999), 3);
  assert.equal(resolveMetaverseRespawnCountdownSecond(3_000), 2);
  assert.equal(resolveMetaverseRespawnCountdownSecond(2_000), 1);
  assert.equal(resolveMetaverseRespawnCountdownSecond(1_000), 0);
  assert.equal(resolveMetaverseRespawnCountdownSecond(0), null);

  assert.equal(resolveMetaverseRespawnVisibleCountdownSecond(4_000), 3);
  assert.equal(resolveMetaverseRespawnVisibleCountdownSecond(3_000), 2);
  assert.equal(resolveMetaverseRespawnVisibleCountdownSecond(2_000), 1);
  assert.equal(resolveMetaverseRespawnVisibleCountdownSecond(1_000), null);

  assert.equal(
    resolveMetaverseRespawnCountdownAudioCueId(3),
    "metaverse-respawn-countdown"
  );
  assert.equal(
    resolveMetaverseRespawnCountdownAudioCueId(0),
    "metaverse-respawn-countdown-ready"
  );
});
