import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveServerRuntimeConfigFromEnvironment
} from "../../../server/dist/config/server-runtime-config.js";

test("resolveServerRuntimeConfigFromEnvironment keeps localdev HTTP defaults", () => {
  assert.deepEqual(resolveServerRuntimeConfigFromEnvironment({}), {
    host: "127.0.0.1",
    port: 3210
  });
});

test("resolveServerRuntimeConfigFromEnvironment accepts production HTTP bind env", () => {
  assert.deepEqual(
    resolveServerRuntimeConfigFromEnvironment({
      WEBGPU_METAVERSE_SERVER_HOST: "0.0.0.0",
      WEBGPU_METAVERSE_SERVER_PORT: "8080"
    }),
    {
      host: "0.0.0.0",
      port: 8080
    }
  );
});
