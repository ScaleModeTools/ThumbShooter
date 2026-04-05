import {
  AffineAimTransform,
  createNormalizedViewportPoint,
  type AffineAimTransformSnapshot
} from "@thumbshooter/shared";

import {
  Group,
  Mesh,
  MeshBasicNodeMaterial,
  OrthographicCamera,
  PlaneGeometry,
  RingGeometry,
  Scene,
  WebGPURenderer
} from "three/webgpu";
import { color, mix, uv } from "three/tsl";

import { gameplayRuntimeConfig } from "../config/gameplay-runtime";
import type {
  GameplayHudSnapshot,
  GameplayRuntimeConfig
} from "../types/gameplay-runtime";
import type { LatestHandTrackingSnapshot } from "../types/hand-tracking";

interface GameplayTrackingSource {
  readonly latestPose: LatestHandTrackingSnapshot;
}

interface GameplayRendererHost {
  init(): Promise<void>;
  render(scene: Scene, camera: OrthographicCamera): void;
  setPixelRatio(pixelRatio: number): void;
  setSize(width: number, height: number, updateStyle?: boolean): void;
  dispose(): void;
}

interface GameplayCanvasHost {
  readonly clientHeight: number;
  readonly clientWidth: number;
}

interface GameplayRuntimeDependencies {
  readonly cancelAnimationFrame?: typeof globalThis.cancelAnimationFrame;
  readonly createRenderer?: (
    canvas: HTMLCanvasElement
  ) => GameplayRendererHost;
  readonly devicePixelRatio?: number;
  readonly requestAnimationFrame?: typeof globalThis.requestAnimationFrame;
}

function createDefaultRenderer(canvas: HTMLCanvasElement): GameplayRendererHost {
  return new WebGPURenderer({
    alpha: true,
    antialias: true,
    canvas
  });
}

function freezeHudSnapshot(
  lifecycle: GameplayHudSnapshot["lifecycle"],
  trackingState: GameplayHudSnapshot["trackingState"],
  aimPoint: GameplayHudSnapshot["aimPoint"],
  failureReason: string | null
): GameplayHudSnapshot {
  return Object.freeze({
    aimPoint,
    failureReason,
    lifecycle,
    trackingState
  });
}

function readNowMs(): number {
  return globalThis.performance?.now() ?? Date.now();
}

export class WebGpuGameplayRuntime {
  readonly #affineAimTransform: AffineAimTransform;
  readonly #camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  readonly #config: GameplayRuntimeConfig;
  readonly #createRenderer: (canvas: HTMLCanvasElement) => GameplayRendererHost;
  readonly #devicePixelRatio: number;
  readonly #requestAnimationFrame: typeof globalThis.requestAnimationFrame;
  readonly #cancelAnimationFrame: typeof globalThis.cancelAnimationFrame;
  readonly #scene = new Scene();
  readonly #trackingSource: GameplayTrackingSource;
  readonly #backgroundMesh: Mesh;
  readonly #reticleGroup = new Group();

  #animationFrameHandle = 0;
  #animationStartAtMs = 0;
  #canvasHost: GameplayCanvasHost | null = null;
  #hudSnapshot = freezeHudSnapshot("idle", "unavailable", null, null);
  #renderer: GameplayRendererHost | null = null;

  constructor(
    trackingSource: GameplayTrackingSource,
    aimCalibration: AffineAimTransformSnapshot,
    config: GameplayRuntimeConfig = gameplayRuntimeConfig,
    dependencies: GameplayRuntimeDependencies = {}
  ) {
    this.#affineAimTransform = AffineAimTransform.fromSnapshot(aimCalibration);
    this.#config = config;
    this.#trackingSource = trackingSource;
    this.#createRenderer = dependencies.createRenderer ?? createDefaultRenderer;
    this.#devicePixelRatio = dependencies.devicePixelRatio ?? window.devicePixelRatio;
    this.#requestAnimationFrame =
      dependencies.requestAnimationFrame ?? window.requestAnimationFrame;
    this.#cancelAnimationFrame =
      dependencies.cancelAnimationFrame ?? window.cancelAnimationFrame;

    this.#camera.position.z = 5;
    this.#backgroundMesh = this.#createBackgroundMesh();
    this.#scene.add(this.#backgroundMesh);
    this.#scene.add(this.#reticleGroup);
    this.#createReticleMeshes();
  }

  get hudSnapshot(): GameplayHudSnapshot {
    return this.#hudSnapshot;
  }

  async start(
    canvas: HTMLCanvasElement,
    navigatorLike: Navigator | null | undefined = window.navigator
  ): Promise<GameplayHudSnapshot> {
    this.dispose();

    if (navigatorLike?.gpu === undefined) {
      this.#hudSnapshot = freezeHudSnapshot(
        "failed",
        "unavailable",
        null,
        "WebGPU is unavailable for the gameplay runtime."
      );
      throw new Error(
        this.#hudSnapshot.failureReason ??
          "WebGPU is unavailable for the gameplay runtime."
      );
    }

    this.#hudSnapshot = freezeHudSnapshot("booting", "unavailable", null, null);
    this.#canvasHost = canvas;
    this.#renderer = this.#createRenderer(canvas);
    await this.#renderer.init();
    this.#animationStartAtMs = readNowMs();
    this.#syncViewport();
    this.#hudSnapshot = freezeHudSnapshot("running", "unavailable", null, null);
    this.#queueNextFrame();

    return this.#hudSnapshot;
  }

  dispose(): void {
    if (this.#animationFrameHandle !== 0) {
      this.#cancelAnimationFrame(this.#animationFrameHandle);
      this.#animationFrameHandle = 0;
    }

    this.#renderer?.dispose();
    this.#renderer = null;
    this.#canvasHost = null;
    this.#reticleGroup.visible = false;
    this.#animationStartAtMs = 0;

    if (this.#hudSnapshot.lifecycle !== "failed") {
      this.#hudSnapshot = freezeHudSnapshot("idle", "unavailable", null, null);
    }
  }

  #createBackgroundMesh(): Mesh {
    const backgroundMaterial = new MeshBasicNodeMaterial();

    backgroundMaterial.colorNode = mix(
      color(...this.#config.background.lowerColor),
      color(...this.#config.background.upperColor),
      uv().y
    );

    return new Mesh(new PlaneGeometry(2, 2), backgroundMaterial);
  }

  #createReticleMeshes(): void {
    const reticleMaterial = new MeshBasicNodeMaterial({
      transparent: true
    });
    const horizontalMaterial = new MeshBasicNodeMaterial({
      transparent: true
    });
    const verticalMaterial = new MeshBasicNodeMaterial({
      transparent: true
    });

    reticleMaterial.colorNode = color(...this.#config.reticle.strokeColor);
    horizontalMaterial.colorNode = color(...this.#config.reticle.strokeColor);
    verticalMaterial.colorNode = color(...this.#config.reticle.strokeColor);

    const ringMesh = new Mesh(
      new RingGeometry(
        this.#config.reticle.innerRadius,
        this.#config.reticle.outerRadius,
        64
      ),
      reticleMaterial
    );
    const horizontalBar = new Mesh(
      new PlaneGeometry(
        this.#config.reticle.horizontalBarSize.width,
        this.#config.reticle.horizontalBarSize.height
      ),
      horizontalMaterial
    );
    const verticalBar = new Mesh(
      new PlaneGeometry(
        this.#config.reticle.verticalBarSize.width,
        this.#config.reticle.verticalBarSize.height
      ),
      verticalMaterial
    );

    this.#reticleGroup.visible = false;
    this.#reticleGroup.add(ringMesh, horizontalBar, verticalBar);
  }

  #queueNextFrame(): void {
    if (this.#renderer === null || this.#canvasHost === null) {
      return;
    }

    this.#animationFrameHandle = this.#requestAnimationFrame(() => {
      this.#animationFrameHandle = 0;
      this.#renderFrame();
      this.#queueNextFrame();
    });
  }

  #renderFrame(): void {
    if (this.#renderer === null || this.#canvasHost === null) {
      return;
    }

    this.#syncViewport();
    this.#syncReticleFromTracking(this.#trackingSource.latestPose);
    this.#reticleGroup.rotation.z =
      Math.sin(((readNowMs() - this.#animationStartAtMs) / 1000) * 1.4) * 0.03;
    this.#renderer.render(this.#scene, this.#camera);
  }

  #syncReticleFromTracking(trackingSnapshot: LatestHandTrackingSnapshot): void {
    if (trackingSnapshot.trackingState !== "tracked") {
      this.#reticleGroup.visible = false;
      this.#hudSnapshot = freezeHudSnapshot(
        "running",
        trackingSnapshot.trackingState,
        null,
        null
      );
      return;
    }

    const aimPoint = this.#affineAimTransform.apply(trackingSnapshot.pose.indexTip);
    const aspect = Math.max(
      1,
      (this.#canvasHost?.clientWidth ?? 1) / Math.max(this.#canvasHost?.clientHeight ?? 1, 1)
    );
    const worldX = (aimPoint.x * 2 - 1) * aspect;
    const worldY = 1 - aimPoint.y * 2;

    this.#reticleGroup.visible = true;
    this.#reticleGroup.position.set(worldX, worldY, 0.1);
    this.#hudSnapshot = freezeHudSnapshot(
      "running",
      "tracked",
      createNormalizedViewportPoint(aimPoint),
      null
    );
  }

  #syncViewport(): void {
    if (this.#renderer === null || this.#canvasHost === null) {
      return;
    }

    const width = Math.max(1, this.#canvasHost.clientWidth);
    const height = Math.max(1, this.#canvasHost.clientHeight);
    const aspect = width / height;

    this.#renderer.setPixelRatio(this.#devicePixelRatio);
    this.#renderer.setSize(width, height, false);
    this.#camera.left = -aspect;
    this.#camera.right = aspect;
    this.#camera.top = 1;
    this.#camera.bottom = -1;
    this.#camera.updateProjectionMatrix();
    this.#backgroundMesh.scale.set(aspect, 1, 1);
  }
}
