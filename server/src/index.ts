import { createServer } from "node:http";

import type { ServerRuntimeConfig } from "./types/server-runtime-config.js";

const runtimeConfig: ServerRuntimeConfig = {
  host: "127.0.0.1",
  port: 3210
};

const server = createServer((_request, response) => {
  response.writeHead(200, {
    "content-type": "application/json"
  });

  response.end(
    JSON.stringify({
      service: "thumbshooter-server",
      status: "scaffold",
      rendererTarget: "webgpu"
    })
  );
});

server.listen(runtimeConfig.port, runtimeConfig.host, () => {
  console.log(
    `ThumbShooter server scaffold listening on http://${runtimeConfig.host}:${runtimeConfig.port}`
  );
});
