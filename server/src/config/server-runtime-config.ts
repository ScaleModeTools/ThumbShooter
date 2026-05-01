import type { ServerRuntimeConfig } from "../types/server-runtime-config.js";

const defaultServerHost = "127.0.0.1";
const defaultServerPort = 3210;

function resolveOptionalNonEmptyEnvValue(rawValue: string | undefined): string | null {
  const trimmedValue = rawValue?.trim();

  return trimmedValue === undefined || trimmedValue.length === 0
    ? null
    : trimmedValue;
}

function resolveHostEnvValue(
  env: NodeJS.ProcessEnv,
  envName: string,
  fallbackHost: string
): string {
  return resolveOptionalNonEmptyEnvValue(env[envName]) ?? fallbackHost;
}

function resolvePortEnvValue(
  env: NodeJS.ProcessEnv,
  envName: string,
  fallbackPort: number
): number {
  const rawValue = resolveOptionalNonEmptyEnvValue(env[envName]);

  if (rawValue === null) {
    return fallbackPort;
  }

  const port = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error(`Invalid WebGPU Metaverse server port: ${envName}`);
  }

  return port;
}

export function resolveServerRuntimeConfigFromEnvironment(
  env: NodeJS.ProcessEnv
): ServerRuntimeConfig {
  return Object.freeze({
    host: resolveHostEnvValue(
      env,
      "WEBGPU_METAVERSE_SERVER_HOST",
      defaultServerHost
    ),
    port: resolvePortEnvValue(
      env,
      "WEBGPU_METAVERSE_SERVER_PORT",
      defaultServerPort
    )
  });
}
