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
  const indices: number[] = [];
  const halfX = (terrainPatch.sampleCountX - 1) * 0.5;
  const halfZ = (terrainPatch.sampleCountZ - 1) * 0.5;
  const readLocalX = (sampleX: number): number =>
    (sampleX - halfX) * terrainPatch.sampleSpacingMeters;
  const readLocalZ = (sampleZ: number): number =>
    (sampleZ - halfZ) * terrainPatch.sampleSpacingMeters;
  const readTopIndex = (sampleX: number, sampleZ: number): number =>
    sampleZ * terrainPatch.sampleCountX + sampleX;
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
  const pushTerrainEdgeSkirt = (
    samples: readonly {
      readonly sampleX: number;
      readonly sampleZ: number;
    }[]
  ) => {
    if (samples.length < 2) {
      return;
    }

    const bottomIndices = samples.map(({ sampleX, sampleZ }, sampleIndex) =>
      pushVertex(
        readLocalX(sampleX),
        0,
        readLocalZ(sampleZ),
        samples.length <= 1 ? 0 : sampleIndex / (samples.length - 1),
        1
      )
    );

    for (let index = 0; index < samples.length - 1; index += 1) {
      const currentSample = samples[index];
      const nextSample = samples[index + 1];

      if (currentSample === undefined || nextSample === undefined) {
        continue;
      }

      const topCurrent = readTopIndex(
        currentSample.sampleX,
        currentSample.sampleZ
      );
      const topNext = readTopIndex(nextSample.sampleX, nextSample.sampleZ);
      const bottomCurrent = bottomIndices[index] ?? topCurrent;
      const bottomNext = bottomIndices[index + 1] ?? topNext;

      indices.push(
        topCurrent,
        bottomCurrent,
        topNext,
        topNext,
        bottomCurrent,
        bottomNext
      );
    }
  };

  for (let sampleZ = 0; sampleZ < terrainPatch.sampleCountZ; sampleZ += 1) {
    for (let sampleX = 0; sampleX < terrainPatch.sampleCountX; sampleX += 1) {
      const heightIndex = readTopIndex(sampleX, sampleZ);

      pushVertex(
        readLocalX(sampleX),
        terrainPatch.heightSamples[heightIndex] ?? 0,
        readLocalZ(sampleZ),
        terrainPatch.sampleCountX <= 1 ? 0 : sampleX / (terrainPatch.sampleCountX - 1),
        terrainPatch.sampleCountZ <= 1 ? 0 : sampleZ / (terrainPatch.sampleCountZ - 1)
      );
    }
  }

  for (let sampleZ = 0; sampleZ < terrainPatch.sampleCountZ - 1; sampleZ += 1) {
    for (let sampleX = 0; sampleX < terrainPatch.sampleCountX - 1; sampleX += 1) {
      const topLeft = readTopIndex(sampleX, sampleZ);
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + terrainPatch.sampleCountX;
      const bottomRight = bottomLeft + 1;

      indices.push(topLeft, bottomLeft, topRight, topRight, bottomLeft, bottomRight);
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
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}
