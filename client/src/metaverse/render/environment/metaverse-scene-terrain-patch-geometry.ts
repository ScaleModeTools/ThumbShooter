import {
  BufferGeometry,
  Float32BufferAttribute
} from "three/webgpu";

export interface MetaverseSceneTerrainPatchGeometryInput {
  readonly heightSamples: readonly number[];
  readonly sampleCountX: number;
  readonly sampleCountZ: number;
  readonly sampleSpacingMeters: number;
}

export function createMetaverseSceneTerrainPatchGeometry(
  terrainPatch: MetaverseSceneTerrainPatchGeometryInput
): BufferGeometry {
  const geometry = new BufferGeometry();
  const vertices: number[] = [];
  const uvs: number[] = [];
  const halfX = (terrainPatch.sampleCountX - 1) * 0.5;
  const halfZ = (terrainPatch.sampleCountZ - 1) * 0.5;
  const readLocalX = (sampleX: number): number =>
    (sampleX - halfX) * terrainPatch.sampleSpacingMeters;
  const readLocalZ = (sampleZ: number): number =>
    (sampleZ - halfZ) * terrainPatch.sampleSpacingMeters;
  const readHeight = (sampleX: number, sampleZ: number): number =>
    terrainPatch.heightSamples[sampleZ * terrainPatch.sampleCountX + sampleX] ?? 0;
  const readTerrainUv = (
    x: number,
    z: number
  ): readonly [number, number] => [
    terrainPatch.sampleCountX <= 1
      ? 0
      : (x / terrainPatch.sampleSpacingMeters + halfX) /
        (terrainPatch.sampleCountX - 1),
    terrainPatch.sampleCountZ <= 1
      ? 0
      : (z / terrainPatch.sampleSpacingMeters + halfZ) /
        (terrainPatch.sampleCountZ - 1)
  ] as const;
  const pushVertex = (
    x: number,
    y: number,
    z: number,
    u: number,
    v: number
  ): number => {
    const vertexIndex = vertices.length / 3;

    vertices.push(x, y, z);
    uvs.push(u, v);

    return vertexIndex;
  };
  const pushTriangle = (
    a: readonly [number, number, number],
    b: readonly [number, number, number],
    c: readonly [number, number, number]
  ): void => {
    const aUv = readTerrainUv(a[0], a[2]);
    const bUv = readTerrainUv(b[0], b[2]);
    const cUv = readTerrainUv(c[0], c[2]);

    pushVertex(a[0], a[1], a[2], aUv[0], aUv[1]);
    pushVertex(b[0], b[1], b[2], bUv[0], bUv[1]);
    pushVertex(c[0], c[1], c[2], cUv[0], cUv[1]);
  };
  const pushTerrainQuad = (
    topLeft: readonly [number, number, number],
    bottomLeft: readonly [number, number, number],
    topRight: readonly [number, number, number],
    bottomRight: readonly [number, number, number]
  ): void => {
    pushTriangle(topLeft, bottomLeft, topRight);
    pushTriangle(topRight, bottomLeft, bottomRight);
  };
  const pushTerrainEdgeSkirt = (
    samples: readonly {
      readonly sampleX: number;
      readonly sampleZ: number;
    }[]
  ) => {
    if (samples.length < 2) {
      return;
    }

    for (let index = 0; index < samples.length - 1; index += 1) {
      const currentSample = samples[index];
      const nextSample = samples[index + 1];

      if (currentSample === undefined || nextSample === undefined) {
        continue;
      }

      const topCurrent = [
        readLocalX(currentSample.sampleX),
        readHeight(currentSample.sampleX, currentSample.sampleZ),
        readLocalZ(currentSample.sampleZ)
      ] as const;
      const topNext = [
        readLocalX(nextSample.sampleX),
        readHeight(nextSample.sampleX, nextSample.sampleZ),
        readLocalZ(nextSample.sampleZ)
      ] as const;
      const bottomCurrent = [topCurrent[0], 0, topCurrent[2]] as const;
      const bottomNext = [topNext[0], 0, topNext[2]] as const;

      pushTriangle(topCurrent, bottomCurrent, topNext);
      pushTriangle(topNext, bottomCurrent, bottomNext);
    }
  };

  for (let sampleZ = 0; sampleZ < terrainPatch.sampleCountZ - 1; sampleZ += 1) {
    for (let sampleX = 0; sampleX < terrainPatch.sampleCountX - 1; sampleX += 1) {
      pushTerrainQuad(
        [
          readLocalX(sampleX),
          readHeight(sampleX, sampleZ),
          readLocalZ(sampleZ)
        ] as const,
        [
          readLocalX(sampleX),
          readHeight(sampleX, sampleZ + 1),
          readLocalZ(sampleZ + 1)
        ] as const,
        [
          readLocalX(sampleX + 1),
          readHeight(sampleX + 1, sampleZ),
          readLocalZ(sampleZ)
        ] as const,
        [
          readLocalX(sampleX + 1),
          readHeight(sampleX + 1, sampleZ + 1),
          readLocalZ(sampleZ + 1)
        ] as const
      );
    }
  }

  pushTerrainEdgeSkirt(
    Array.from({ length: terrainPatch.sampleCountX }, (_entry, sampleX) => ({
      sampleX,
      sampleZ: 0
    }))
  );
  pushTerrainEdgeSkirt(
    Array.from({ length: terrainPatch.sampleCountZ }, (_entry, sampleZ) => ({
      sampleX: terrainPatch.sampleCountX - 1,
      sampleZ
    }))
  );
  pushTerrainEdgeSkirt(
    Array.from({ length: terrainPatch.sampleCountX }, (_entry, index) => ({
      sampleX: terrainPatch.sampleCountX - 1 - index,
      sampleZ: terrainPatch.sampleCountZ - 1
    }))
  );
  pushTerrainEdgeSkirt(
    Array.from({ length: terrainPatch.sampleCountZ }, (_entry, index) => ({
      sampleX: 0,
      sampleZ: terrainPatch.sampleCountZ - 1 - index
    }))
  );

  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();

  return geometry;
}
