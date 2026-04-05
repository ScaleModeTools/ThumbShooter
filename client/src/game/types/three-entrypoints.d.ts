declare module "three/webgpu" {
  export {
    Clock,
    Group,
    Mesh,
    OrthographicCamera,
    PlaneGeometry,
    RingGeometry,
    Scene
  } from "three";
  import type { Material, OrthographicCamera, Scene } from "three";

  export interface WebGPURendererParameters {
    readonly alpha?: boolean;
    readonly antialias?: boolean;
    readonly canvas?: HTMLCanvasElement;
  }

  export class WebGPURenderer {
    constructor(parameters?: WebGPURendererParameters);

    init(): Promise<void>;
    render(scene: Scene, camera: OrthographicCamera): void;
    setPixelRatio(pixelRatio: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    dispose(): void;
  }

  export class MeshBasicNodeMaterial extends Material {
    constructor(parameters?: {
      readonly transparent?: boolean;
    });

    colorNode: unknown;
    transparent: boolean;
  }
}

declare module "three/tsl" {
  export function color(red: number, green: number, blue: number): unknown;
  export function mix(left: unknown, right: unknown, factor: unknown): unknown;
  export function uv(): {
    readonly y: unknown;
  };
}
