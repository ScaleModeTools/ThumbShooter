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
  const pushProjectedVertex = (
    point: readonly [number, number, number],
    verticalUv: boolean,
    projectAcrossZ: boolean
  ): void => {
    const u = verticalUv
      ? (projectAcrossZ ? point[2] : point[0]) / terrainPatch.sampleSpacingMeters
      : point[0] / terrainPatch.sampleSpacingMeters;
    const v = verticalUv
      ? point[1] / terrainPatch.sampleSpacingMeters
      : point[2] / terrainPatch.sampleSpacingMeters;

    pushVertex(point[0], point[1], point[2], u, v);
  };
  const pushTriangle = (
    a: readonly [number, number, number],
    b: readonly [number, number, number],
    c: readonly [number, number, number],
    verticalUv: boolean,
    projectAcrossZ: boolean
  ): void => {
    pushProjectedVertex(a, verticalUv, projectAcrossZ);
    pushProjectedVertex(b, verticalUv, projectAcrossZ);
    pushProjectedVertex(c, verticalUv, projectAcrossZ);
  };
  const pushTerrainQuad = (
    topLeft: readonly [number, number, number],
    bottomLeft: readonly [number, number, number],
    topRight: readonly [number, number, number],
    bottomRight: readonly [number, number, number]
  ): void => {
    const minY = Math.min(topLeft[1], bottomLeft[1], topRight[1], bottomRight[1]);
    const maxY = Math.max(topLeft[1], bottomLeft[1], topRight[1], bottomRight[1]);
    const rangeX = Math.max(
      topLeft[0],
      bottomLeft[0],
      topRight[0],
      bottomRight[0]
    ) - Math.min(topLeft[0], bottomLeft[0], topRight[0], bottomRight[0]);
    const rangeZ = Math.max(
      topLeft[2],
      bottomLeft[2],
      topRight[2],
      bottomRight[2]
    ) - Math.min(topLeft[2], bottomLeft[2], topRight[2], bottomRight[2]);
    const pitchRadians = Math.atan2(
      maxY - minY,
      Math.max(0.001, Math.min(Math.max(0.001, rangeX), Math.max(0.001, rangeZ)))
    );
    const verticalUv = pitchRadians >= 70 * (Math.PI / 180);
    const projectAcrossZ = rangeZ >= rangeX;

    pushTriangle(topLeft, bottomLeft, topRight, verticalUv, projectAcrossZ);
    pushTriangle(topRight, bottomLeft, bottomRight, verticalUv, projectAcrossZ);
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
      const projectAcrossZ = Math.abs(topNext[2] - topCurrent[2]) >=
        Math.abs(topNext[0] - topCurrent[0]);

      pushTriangle(topCurrent, bottomCurrent, topNext, true, projectAcrossZ);
      pushTriangle(topNext, bottomCurrent, bottomNext, true, projectAcrossZ);
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
