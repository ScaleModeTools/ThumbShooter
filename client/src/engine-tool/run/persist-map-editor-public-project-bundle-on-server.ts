import type { MetaverseMapBundleSnapshot } from "@webgpu-metaverse/shared/metaverse/world";

import { metaverseWorldClientConfig } from "@/metaverse/config/metaverse-world-network";

const publicMapEditorProjectBundlePath =
  "/metaverse/world/public-map-bundles" as const;

interface PersistMapEditorPublicProjectBundleDependencies {
  readonly fetch?: typeof globalThis.fetch;
}

export interface PersistMapEditorPublicProjectBundleResult {
  readonly bundleId: string;
  readonly label: string;
  readonly manifestPath: string;
  readonly path: string;
  readonly sourceBundleId: string;
  readonly status: "persisted";
  readonly updatedAt: string;
}

function resolveFetchDependency(
  fetchDependency: typeof globalThis.fetch | undefined
): typeof globalThis.fetch {
  if (fetchDependency !== undefined) {
    return fetchDependency;
  }

  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch.bind(globalThis);
  }

  throw new Error("Fetch API is unavailable for map editor public project saves.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readStringField(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Expected string field: ${fieldName}`);
  }

  return value.trim();
}

function readPersistResult(
  payload: unknown
): PersistMapEditorPublicProjectBundleResult {
  if (!isRecord(payload)) {
    throw new Error("Map editor public project save returned an invalid response.");
  }

  const status = readStringField(payload.status, "response.status");

  if (status !== "persisted") {
    throw new Error("Map editor public project save returned an invalid status.");
  }

  return Object.freeze({
    bundleId: readStringField(payload.bundleId, "response.bundleId"),
    label: readStringField(payload.label, "response.label"),
    manifestPath: readStringField(payload.manifestPath, "response.manifestPath"),
    path: readStringField(payload.path, "response.path"),
    sourceBundleId: readStringField(
      payload.sourceBundleId,
      "response.sourceBundleId"
    ),
    status,
    updatedAt: readStringField(payload.updatedAt, "response.updatedAt")
  });
}

function resolvePublicMapEditorProjectBundleUrl(): string {
  return new URL(
    publicMapEditorProjectBundlePath,
    metaverseWorldClientConfig.serverOrigin
  ).toString();
}

async function readErrorMessage(response: Response): Promise<string> {
  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return isRecord(payload) && typeof payload.error === "string"
    ? payload.error
    : "Map editor public project save failed.";
}

export async function persistMapEditorPublicProjectBundleOnServer(
  bundle: MetaverseMapBundleSnapshot,
  sourceBundleId: string,
  dependencies: PersistMapEditorPublicProjectBundleDependencies = {}
): Promise<PersistMapEditorPublicProjectBundleResult> {
  const fetch = resolveFetchDependency(dependencies.fetch);
  const response = await fetch(resolvePublicMapEditorProjectBundleUrl(), {
    body: JSON.stringify({
      bundle,
      sourceBundleId
    }),
    headers: {
      "content-type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return readPersistResult(await response.json());
}
