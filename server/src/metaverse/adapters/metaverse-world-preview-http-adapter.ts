import type {
  IncomingMessage,
  ServerResponse
} from "node:http";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import {
  join,
  resolve
} from "node:path";

import { registerAuthoritativeMetaverseMapBundlePreview } from "../world/map-bundles/load-authoritative-metaverse-map-bundle.js";

interface MetaverseWorldPreviewHttpAdapterOptions {
  readonly publicProjectRootPath?: string;
}

interface PublicMetaverseMapBundleManifestEntry {
  readonly bundleId: string;
  readonly label: string;
  readonly path: string;
  readonly sourceBundleId: string;
  readonly updatedAt: string;
}

interface PublicMetaverseMapBundleManifest {
  readonly projects: readonly PublicMetaverseMapBundleManifestEntry[];
  readonly version: 1;
}

function writeCorsHeaders(
  response: ServerResponse<IncomingMessage>
): void {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
  response.setHeader("access-control-max-age", "86400");
}

function writeJson(
  response: ServerResponse<IncomingMessage>,
  statusCode: number,
  payload: unknown
): void {
  writeCorsHeaders(response);
  response.writeHead(statusCode, {
    "cache-control": "no-store, max-age=0",
    "content-type": "application/json"
  });
  response.end(JSON.stringify(payload));
}

function writeNoContent(
  response: ServerResponse<IncomingMessage>
): void {
  writeCorsHeaders(response);
  response.writeHead(204, {
    "cache-control": "no-store, max-age=0"
  });
  response.end();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readRecordField(
  value: unknown,
  fieldName: string
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Expected object field: ${fieldName}`);
  }

  return value;
}

function readOptionalStringField(
  value: unknown,
  fieldName: string
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`Expected string field: ${fieldName}`);
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new Error(`Expected non-empty string field: ${fieldName}`);
  }

  return normalizedValue;
}

function readJsonBody(
  request: IncomingMessage
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    request.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

function readStringField(
  value: unknown,
  fieldName: string
): string {
  if (typeof value !== "string") {
    throw new Error(`Expected string field: ${fieldName}`);
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new Error(`Expected non-empty string field: ${fieldName}`);
  }

  return normalizedValue;
}

function isMetaverseWorldPreviewBundlePath(pathname: string): boolean {
  const segments = pathname.split("/").filter((segment) => segment.length > 0);

  return (
    segments.length === 3 &&
    segments[0] === "metaverse" &&
    segments[1] === "world" &&
    segments[2] === "preview-bundles"
  );
}

function isMetaverseWorldPublicMapBundlePath(pathname: string): boolean {
  const segments = pathname.split("/").filter((segment) => segment.length > 0);

  return (
    segments.length === 3 &&
    segments[0] === "metaverse" &&
    segments[1] === "world" &&
    segments[2] === "public-map-bundles"
  );
}

function resolveDefaultPublicProjectRootPath(): string {
  const clientPublicRootPath = resolve(process.cwd(), "client", "public");

  if (existsSync(clientPublicRootPath)) {
    return join(clientPublicRootPath, "map-editor", "projects");
  }

  return resolve(
    process.cwd(),
    "..",
    "client",
    "public",
    "map-editor",
    "projects"
  );
}

function readManifestEntry(
  value: unknown
): PublicMetaverseMapBundleManifestEntry | null {
  if (!isRecord(value)) {
    return null;
  }

  try {
    return Object.freeze({
      bundleId: readStringField(value.bundleId, "manifest.projects[].bundleId"),
      label: readStringField(value.label, "manifest.projects[].label"),
      path: readStringField(value.path, "manifest.projects[].path"),
      sourceBundleId: readStringField(
        value.sourceBundleId,
        "manifest.projects[].sourceBundleId"
      ),
      updatedAt: readStringField(
        value.updatedAt,
        "manifest.projects[].updatedAt"
      )
    });
  } catch {
    return null;
  }
}

function readPublicMetaverseMapBundleManifest(
  publicProjectRootPath: string
): PublicMetaverseMapBundleManifest {
  const manifestPath = join(publicProjectRootPath, "manifest.json");

  try {
    const parsedValue = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;

    if (
      !isRecord(parsedValue) ||
      parsedValue.version !== 1 ||
      !Array.isArray(parsedValue.projects)
    ) {
      throw new Error("Public map project manifest is invalid.");
    }

    const projects: PublicMetaverseMapBundleManifestEntry[] = [];

    for (const candidate of parsedValue.projects) {
      const entry = readManifestEntry(candidate);

      if (
        entry !== null &&
        !projects.some((project) => project.bundleId === entry.bundleId)
      ) {
        projects.push(entry);
      }
    }

    return Object.freeze({
      projects: Object.freeze(projects),
      version: 1
    });
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return Object.freeze({
        projects: Object.freeze([]),
        version: 1
      });
    }

    throw error;
  }
}

function resolvePublicMapBundleFileName(bundleId: string): string {
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(bundleId)) {
    throw new Error(
      "Public map project ids may only contain lowercase letters, numbers, and hyphens."
    );
  }

  return `${bundleId}.json`;
}

export class MetaverseWorldPreviewHttpAdapter {
  private readonly publicProjectRootPath: string;

  constructor(options: MetaverseWorldPreviewHttpAdapterOptions = {}) {
    this.publicProjectRootPath =
      options.publicProjectRootPath ?? resolveDefaultPublicProjectRootPath();
  }

  private persistPublicMapBundle(
    bundleSnapshot: unknown,
    sourceBundleId: string | undefined
  ): PublicMetaverseMapBundleManifestEntry {
    const previewEntry = registerAuthoritativeMetaverseMapBundlePreview(
      bundleSnapshot,
      sourceBundleId
    );
    const fileName = resolvePublicMapBundleFileName(previewEntry.bundleId);
    const publicPath = `/map-editor/projects/${fileName}`;
    const updatedAt = new Date().toISOString();
    const manifest = readPublicMetaverseMapBundleManifest(
      this.publicProjectRootPath
    );
    const manifestEntry = Object.freeze({
      bundleId: previewEntry.bundleId,
      label: previewEntry.bundle.label,
      path: publicPath,
      sourceBundleId: previewEntry.sourceBundleId,
      updatedAt
    } satisfies PublicMetaverseMapBundleManifestEntry);
    const nextProjects = Object.freeze(
      [
        ...manifest.projects.filter(
          (project) => project.bundleId !== previewEntry.bundleId
        ),
        manifestEntry
      ].sort((left, right) =>
        left.label.localeCompare(right.label) ||
        left.bundleId.localeCompare(right.bundleId)
      )
    );

    mkdirSync(this.publicProjectRootPath, {
      recursive: true
    });
    writeFileSync(
      join(this.publicProjectRootPath, fileName),
      `${JSON.stringify(previewEntry.bundle, null, 2)}\n`,
      "utf8"
    );
    writeFileSync(
      join(this.publicProjectRootPath, "manifest.json"),
      `${JSON.stringify(
        Object.freeze({
          projects: nextProjects,
          version: 1
        } satisfies PublicMetaverseMapBundleManifest),
        null,
        2
      )}\n`,
      "utf8"
    );

    return manifestEntry;
  }

  async handleRequest(
    request: IncomingMessage,
    response: ServerResponse<IncomingMessage>,
    requestUrl: URL
  ): Promise<boolean> {
    const previewBundlePath = isMetaverseWorldPreviewBundlePath(
      requestUrl.pathname
    );
    const publicMapBundlePath = isMetaverseWorldPublicMapBundlePath(
      requestUrl.pathname
    );

    if (!previewBundlePath && !publicMapBundlePath) {
      return false;
    }

    if (request.method === "OPTIONS") {
      writeNoContent(response);
      return true;
    }

    if (request.method !== "POST") {
      writeJson(response, 405, {
        error: "Method not allowed."
      });
      return true;
    }

    try {
      const requestBody = readRecordField(
        await readJsonBody(request),
        "request"
      );
      const sourceBundleId = readOptionalStringField(
        requestBody.sourceBundleId,
        "request.sourceBundleId"
      );

      if (publicMapBundlePath) {
        const publicEntry = this.persistPublicMapBundle(
          requestBody.bundle,
          sourceBundleId
        );

        writeJson(response, 200, {
          bundleId: publicEntry.bundleId,
          label: publicEntry.label,
          manifestPath: "/map-editor/projects/manifest.json",
          path: publicEntry.path,
          sourceBundleId: publicEntry.sourceBundleId,
          status: "persisted",
          updatedAt: publicEntry.updatedAt
        });
        return true;
      }

      const previewEntry = registerAuthoritativeMetaverseMapBundlePreview(
        requestBody.bundle,
        sourceBundleId
      );

      writeJson(response, 200, {
        bundleId: previewEntry.bundleId,
        label: previewEntry.bundle.label,
        sourceBundleId: previewEntry.sourceBundleId,
        status: "registered"
      });
    } catch (error) {
      writeJson(response, 400, {
        error:
          error instanceof Error
            ? error.message
            : "Metaverse world preview registration failed."
      });
    }

    return true;
  }
}
