import {
  MetaverseGroundedBodyRuntime,
  type PhysicsVector3Snapshot
} from "@/physics";
import { defaultMetaverseLocomotionMode } from "../config/metaverse-locomotion-modes";
import {
  advanceMetaverseCameraSnapshot,
  createMetaverseCameraSnapshot
} from "../states/metaverse-flight";
import type { MetaverseFlightInputSnapshot } from "../types/metaverse-control-mode";
import type { MetaverseLocomotionModeId } from "../types/metaverse-locomotion-mode";
import type {
  MetaverseCameraSnapshot,
  MetaverseCharacterPresentationSnapshot,
  MetaverseRuntimeConfig,
  MountedEnvironmentSnapshot
} from "../types/metaverse-runtime";
import {
  advanceTraversalCameraPresentationPitchRadians,
  createTraversalGroundedCameraPresentationSnapshot,
  createTraversalSkiffCameraPresentationSnapshot,
  createTraversalSwimCameraPresentationSnapshot
} from "../traversal/presentation/camera-presentation";
import { createTraversalCharacterPresentationSnapshot } from "../traversal/presentation/character-presentation";
import {
  advanceSurfaceLocomotionSnapshot,
  clamp,
  createSurfaceLocomotionSnapshot,
  freezeVector3,
  toFiniteNumber,
  wrapRadians
} from "../traversal/policies/surface-locomotion";
import {
  isWaterbornePosition,
  resolveAutomaticSurfaceLocomotionMode,
  resolveSurfaceHeightMeters,
  shouldEnableGroundedAutostep
} from "../traversal/policies/surface-routing";
import type {
  MetaverseTraversalRuntimeDependencies,
  MountedSkiffRuntimeState,
  SurfaceLocomotionSnapshot
} from "../traversal/types/traversal";

function createIdleGroundedBodyIntentSnapshot() {
  return Object.freeze({
    boost: false,
    jump: false,
    moveAxis: 0,
    strafeAxis: 0,
    turnAxis: 0
  });
}

export class MetaverseTraversalRuntime {
  readonly #config: MetaverseRuntimeConfig;
  readonly #groundedBodyRuntime: MetaverseGroundedBodyRuntime;
  readonly #readDynamicEnvironmentPose: MetaverseTraversalRuntimeDependencies["readDynamicEnvironmentPose"];
  readonly #setDynamicEnvironmentPose: MetaverseTraversalRuntimeDependencies["setDynamicEnvironmentPose"];
  readonly #surfaceColliderSnapshots: MetaverseTraversalRuntimeDependencies["surfaceColliderSnapshots"];

  #cameraSnapshot: MetaverseCameraSnapshot;
  #characterPresentationSnapshot: MetaverseCharacterPresentationSnapshot | null =
    null;
  #locomotionMode = defaultMetaverseLocomotionMode;
  #mountedSkiffForwardSpeedUnitsPerSecond = 0;
  #mountedSkiffStrafeSpeedUnitsPerSecond = 0;
  #mountedSkiffState: MountedSkiffRuntimeState | null = null;
  #swimForwardSpeedUnitsPerSecond = 0;
  #swimStrafeSpeedUnitsPerSecond = 0;
  #swimSnapshot: SurfaceLocomotionSnapshot;
  #traversalCameraPitchRadians: number;

  constructor(
    config: MetaverseRuntimeConfig,
    dependencies: MetaverseTraversalRuntimeDependencies
  ) {
    this.#config = config;
    this.#groundedBodyRuntime = dependencies.groundedBodyRuntime;
    this.#readDynamicEnvironmentPose = dependencies.readDynamicEnvironmentPose;
    this.#setDynamicEnvironmentPose = dependencies.setDynamicEnvironmentPose;
    this.#surfaceColliderSnapshots = dependencies.surfaceColliderSnapshots;
    this.#cameraSnapshot = createMetaverseCameraSnapshot(config.camera);
    this.#traversalCameraPitchRadians = config.camera.initialPitchRadians;
    this.#swimSnapshot = createSurfaceLocomotionSnapshot(
      freezeVector3(
        config.camera.spawnPosition.x,
        config.ocean.height,
        config.camera.spawnPosition.z
      ),
      config.camera.initialYawRadians
    );
  }

  get cameraSnapshot(): MetaverseCameraSnapshot {
    return this.#cameraSnapshot;
  }

  get characterPresentationSnapshot():
    | MetaverseCharacterPresentationSnapshot
    | null {
    return this.#characterPresentationSnapshot;
  }

  get locomotionMode(): MetaverseLocomotionModeId {
    return this.#locomotionMode;
  }

  reset(): void {
    this.#groundedBodyRuntime.setAutostepEnabled(false);
    this.#cameraSnapshot = createMetaverseCameraSnapshot(this.#config.camera);
    this.#characterPresentationSnapshot = null;
    this.#locomotionMode = defaultMetaverseLocomotionMode;
    this.#mountedSkiffForwardSpeedUnitsPerSecond = 0;
    this.#mountedSkiffStrafeSpeedUnitsPerSecond = 0;
    this.#mountedSkiffState = null;
    this.#swimForwardSpeedUnitsPerSecond = 0;
    this.#swimStrafeSpeedUnitsPerSecond = 0;
    this.#swimSnapshot = createSurfaceLocomotionSnapshot(
      freezeVector3(
        this.#config.camera.spawnPosition.x,
        this.#config.ocean.height,
        this.#config.camera.spawnPosition.z
      ),
      this.#config.camera.initialYawRadians
    );
    this.#traversalCameraPitchRadians = this.#config.camera.initialPitchRadians;
  }

  boot(): void {
    this.#enterGroundedLocomotion(
      freezeVector3(
        this.#config.groundedBody.spawnPosition.x,
        this.#config.groundedBody.spawnPosition.y,
        this.#config.groundedBody.spawnPosition.z
      ),
      this.#cameraSnapshot.yawRadians
    );
    this.#syncAutomaticSurfaceLocomotion(
      this.#groundedBodyRuntime.snapshot.position,
      this.#groundedBodyRuntime.snapshot.yawRadians
    );
    this.#syncCharacterPresentationSnapshot();
  }

  syncMountedEnvironment(
    mountedEnvironment: MountedEnvironmentSnapshot | null
  ): void {
    if (mountedEnvironment !== null) {
      this.#mountEnvironment(mountedEnvironment);
      this.#syncCharacterPresentationSnapshot();
      return;
    }

    if (this.#mountedSkiffState !== null) {
      this.#dismountSkiff(this.#mountedSkiffState);
      this.#syncCharacterPresentationSnapshot();
      return;
    }

    if (this.#locomotionMode === "mounted") {
      this.#syncAutomaticSurfaceLocomotion(
        freezeVector3(
          this.#cameraSnapshot.position.x,
          this.#config.ocean.height,
          this.#cameraSnapshot.position.z
        ),
        this.#cameraSnapshot.yawRadians
      );
    }

    this.#syncCharacterPresentationSnapshot();
  }

  advance(
    movementInput: MetaverseFlightInputSnapshot,
    deltaSeconds: number
  ): MetaverseCameraSnapshot {
    this.#cameraSnapshot =
      this.#mountedSkiffState !== null
        ? this.#advanceMountedSkiffLocomotion(movementInput, deltaSeconds)
        : this.#locomotionMode === "grounded"
          ? this.#advanceGroundedLocomotion(movementInput, deltaSeconds)
          : this.#locomotionMode === "swim"
            ? this.#advanceSwimLocomotion(movementInput, deltaSeconds)
            : advanceMetaverseCameraSnapshot(
                this.#cameraSnapshot,
                movementInput,
                this.#config,
                deltaSeconds
              );
    this.#syncCharacterPresentationSnapshot();

    return this.#cameraSnapshot;
  }

  #setLocomotionMode(locomotionMode: MetaverseLocomotionModeId): void {
    this.#locomotionMode = locomotionMode;
  }

  #enterGroundedLocomotion(
    position: PhysicsVector3Snapshot,
    yawRadians: number,
    supportHeightMeters: number | null = null
  ): void {
    if (!this.#groundedBodyRuntime.isInitialized) {
      return;
    }

    this.#groundedBodyRuntime.setAutostepEnabled(false);
    this.#groundedBodyRuntime.teleport(
      freezeVector3(
        position.x,
        supportHeightMeters ??
          resolveSurfaceHeightMeters(
            this.#config,
            this.#surfaceColliderSnapshots,
            position.x,
            position.z
          ),
        position.z
      ),
      yawRadians
    );
    this.#groundedBodyRuntime.advance(
      createIdleGroundedBodyIntentSnapshot(),
      1 / 60
    );
    this.#setLocomotionMode("grounded");
    this.#cameraSnapshot = createTraversalGroundedCameraPresentationSnapshot(
      this.#groundedBodyRuntime.snapshot,
      this.#traversalCameraPitchRadians,
      this.#config
    );
  }

  #enterSwimLocomotion(
    position: PhysicsVector3Snapshot,
    yawRadians: number
  ): void {
    this.#groundedBodyRuntime.setAutostepEnabled(false);
    this.#swimForwardSpeedUnitsPerSecond = 0;
    this.#swimStrafeSpeedUnitsPerSecond = 0;
    this.#swimSnapshot = createSurfaceLocomotionSnapshot(
      freezeVector3(position.x, this.#config.ocean.height, position.z),
      yawRadians
    );
    this.#setLocomotionMode("swim");
    this.#cameraSnapshot = createTraversalSwimCameraPresentationSnapshot(
      this.#swimSnapshot,
      this.#traversalCameraPitchRadians,
      this.#config
    );
  }

  #syncAutomaticSurfaceLocomotion(
    position: PhysicsVector3Snapshot,
    yawRadians: number
  ): void {
    const locomotionDecision = resolveAutomaticSurfaceLocomotionMode(
      this.#config,
      this.#surfaceColliderSnapshots,
      position,
      yawRadians,
      this.#locomotionMode === "grounded" ? "grounded" : "swim"
    );

    if (locomotionDecision.locomotionMode === "grounded") {
      this.#enterGroundedLocomotion(
        position,
        yawRadians,
        locomotionDecision.supportHeightMeters
      );
      return;
    }

    this.#enterSwimLocomotion(position, yawRadians);
  }

  #mountEnvironment(mountedEnvironment: MountedEnvironmentSnapshot): void {
    this.#groundedBodyRuntime.setAutostepEnabled(false);
    this.#setLocomotionMode("mounted");

    if (mountedEnvironment.environmentAssetId !== "metaverse-hub-skiff-v1") {
      this.#mountedSkiffState = null;
      this.#mountedSkiffForwardSpeedUnitsPerSecond = 0;
      this.#mountedSkiffStrafeSpeedUnitsPerSecond = 0;
      return;
    }

    const dynamicEnvironmentPose = this.#readDynamicEnvironmentPose(
      mountedEnvironment.environmentAssetId
    );

    if (dynamicEnvironmentPose === null) {
      this.#mountedSkiffState = null;
      this.#mountedSkiffForwardSpeedUnitsPerSecond = 0;
      this.#mountedSkiffStrafeSpeedUnitsPerSecond = 0;
      return;
    }

    const position = freezeVector3(
      dynamicEnvironmentPose.position.x,
      toFiniteNumber(
        dynamicEnvironmentPose.position.y,
        this.#config.skiff.waterlineHeightMeters
      ),
      dynamicEnvironmentPose.position.z
    );
    const yawRadians = wrapRadians(dynamicEnvironmentPose.yawRadians);

    this.#traversalCameraPitchRadians = this.#cameraSnapshot.pitchRadians;
    this.#mountedSkiffForwardSpeedUnitsPerSecond = 0;
    this.#mountedSkiffStrafeSpeedUnitsPerSecond = 0;
    const mountedSkiffState = Object.freeze({
      environmentAssetId: mountedEnvironment.environmentAssetId,
      label: mountedEnvironment.label,
      planarSpeedUnitsPerSecond: 0,
      position,
      waterborne: isWaterbornePosition(
        this.#config,
        this.#surfaceColliderSnapshots,
        position,
        this.#config.skiff.waterContactProbeRadiusMeters
      ),
      yawRadians
    });
    this.#mountedSkiffState = mountedSkiffState;
    this.#setDynamicEnvironmentPose(
      mountedEnvironment.environmentAssetId,
      Object.freeze({
        position,
        yawRadians
      })
    );
    this.#cameraSnapshot = createTraversalSkiffCameraPresentationSnapshot(
      mountedSkiffState,
      this.#traversalCameraPitchRadians,
      this.#config
    );
  }

  #dismountSkiff(previousMountedSkiffState: MountedSkiffRuntimeState): void {
    this.#mountedSkiffState = null;
    this.#mountedSkiffForwardSpeedUnitsPerSecond = 0;
    this.#mountedSkiffStrafeSpeedUnitsPerSecond = 0;
    this.#syncAutomaticSurfaceLocomotion(
      previousMountedSkiffState.position,
      previousMountedSkiffState.yawRadians
    );
  }

  #advanceGroundedLocomotion(
    movementInput: MetaverseFlightInputSnapshot,
    deltaSeconds: number
  ): MetaverseCameraSnapshot {
    const currentBodySnapshot = this.#groundedBodyRuntime.snapshot;
    const nextGroundedYawRadians = wrapRadians(
      currentBodySnapshot.yawRadians +
        clamp(toFiniteNumber(movementInput.yawAxis, 0), -1, 1) *
          this.#config.groundedBody.maxTurnSpeedRadiansPerSecond *
          deltaSeconds
    );

    this.#groundedBodyRuntime.setAutostepEnabled(
      shouldEnableGroundedAutostep(
        this.#config,
        this.#surfaceColliderSnapshots,
        currentBodySnapshot.position,
        nextGroundedYawRadians,
        movementInput.moveAxis,
        movementInput.strafeAxis
      )
    );
    this.#traversalCameraPitchRadians =
      advanceTraversalCameraPresentationPitchRadians(
        this.#traversalCameraPitchRadians,
        movementInput,
        this.#config,
        deltaSeconds
      );

    const bodySnapshot = this.#groundedBodyRuntime.advance(
      Object.freeze({
        boost: movementInput.boost,
        jump: movementInput.jump,
        moveAxis: movementInput.moveAxis,
        strafeAxis: movementInput.strafeAxis,
        turnAxis: toFiniteNumber(movementInput.yawAxis, 0)
      }),
      deltaSeconds
    );

    const locomotionDecision = resolveAutomaticSurfaceLocomotionMode(
      this.#config,
      this.#surfaceColliderSnapshots,
      bodySnapshot.position,
      bodySnapshot.yawRadians,
      "grounded"
    );

    if (locomotionDecision.locomotionMode === "swim") {
      this.#enterSwimLocomotion(bodySnapshot.position, bodySnapshot.yawRadians);

      return this.#cameraSnapshot;
    }

    return createTraversalGroundedCameraPresentationSnapshot(
      bodySnapshot,
      this.#traversalCameraPitchRadians,
      this.#config
    );
  }

  #advanceSwimLocomotion(
    movementInput: MetaverseFlightInputSnapshot,
    deltaSeconds: number
  ): MetaverseCameraSnapshot {
    this.#traversalCameraPitchRadians =
      advanceTraversalCameraPresentationPitchRadians(
        this.#traversalCameraPitchRadians,
        movementInput,
        this.#config,
        deltaSeconds
      );

    const nextSwimState = advanceSurfaceLocomotionSnapshot(
      this.#swimSnapshot,
      {
        forwardSpeedUnitsPerSecond: this.#swimForwardSpeedUnitsPerSecond,
        strafeSpeedUnitsPerSecond: this.#swimStrafeSpeedUnitsPerSecond
      },
      movementInput,
      this.#config.swim,
      deltaSeconds,
      this.#config.movement.worldRadius,
      this.#config.ocean.height
    );

    this.#swimForwardSpeedUnitsPerSecond =
      nextSwimState.speedSnapshot.forwardSpeedUnitsPerSecond;
    this.#swimStrafeSpeedUnitsPerSecond =
      nextSwimState.speedSnapshot.strafeSpeedUnitsPerSecond;
    this.#swimSnapshot = nextSwimState.snapshot;

    const locomotionDecision = resolveAutomaticSurfaceLocomotionMode(
      this.#config,
      this.#surfaceColliderSnapshots,
      this.#swimSnapshot.position,
      this.#swimSnapshot.yawRadians,
      "swim"
    );

    if (locomotionDecision.locomotionMode === "grounded") {
      this.#enterGroundedLocomotion(
        this.#swimSnapshot.position,
        this.#swimSnapshot.yawRadians,
        locomotionDecision.supportHeightMeters
      );

      return this.#cameraSnapshot;
    }

    return createTraversalSwimCameraPresentationSnapshot(
      this.#swimSnapshot,
      this.#traversalCameraPitchRadians,
      this.#config
    );
  }

  #advanceMountedSkiffLocomotion(
    movementInput: MetaverseFlightInputSnapshot,
    deltaSeconds: number
  ): MetaverseCameraSnapshot {
    const mountedSkiffState = this.#mountedSkiffState;

    if (mountedSkiffState === null) {
      return this.#cameraSnapshot;
    }

    this.#traversalCameraPitchRadians =
      advanceTraversalCameraPresentationPitchRadians(
        this.#traversalCameraPitchRadians,
        movementInput,
        this.#config,
        deltaSeconds
      );

    const skiffMovementInput = mountedSkiffState.waterborne
      ? movementInput
      : Object.freeze({
          boost: false,
          jump: false,
          moveAxis: 0,
          primaryAction: movementInput.primaryAction,
          pitchAxis: movementInput.pitchAxis,
          secondaryAction: movementInput.secondaryAction,
          strafeAxis: 0,
          yawAxis: 0
        } satisfies MetaverseFlightInputSnapshot);
    const nextSkiffState = advanceSurfaceLocomotionSnapshot(
      mountedSkiffState,
      {
        forwardSpeedUnitsPerSecond: this.#mountedSkiffForwardSpeedUnitsPerSecond,
        strafeSpeedUnitsPerSecond: this.#mountedSkiffStrafeSpeedUnitsPerSecond
      },
      skiffMovementInput,
      this.#config.skiff,
      deltaSeconds,
      this.#config.movement.worldRadius,
      mountedSkiffState.position.y
    );
    const skiffSnapshot = Object.freeze({
      ...nextSkiffState.snapshot,
      environmentAssetId: mountedSkiffState.environmentAssetId,
      label: mountedSkiffState.label,
      waterborne: isWaterbornePosition(
        this.#config,
        this.#surfaceColliderSnapshots,
        nextSkiffState.snapshot.position,
        this.#config.skiff.waterContactProbeRadiusMeters
      )
    } satisfies MountedSkiffRuntimeState);

    this.#mountedSkiffForwardSpeedUnitsPerSecond = skiffSnapshot.waterborne
      ? nextSkiffState.speedSnapshot.forwardSpeedUnitsPerSecond
      : 0;
    this.#mountedSkiffStrafeSpeedUnitsPerSecond = skiffSnapshot.waterborne
      ? nextSkiffState.speedSnapshot.strafeSpeedUnitsPerSecond
      : 0;
    this.#mountedSkiffState = skiffSnapshot;
    this.#setDynamicEnvironmentPose(skiffSnapshot.environmentAssetId, {
      position: skiffSnapshot.position,
      yawRadians: skiffSnapshot.yawRadians
    });

    return createTraversalSkiffCameraPresentationSnapshot(
      skiffSnapshot,
      this.#traversalCameraPitchRadians,
      this.#config
    );
  }

  #syncCharacterPresentationSnapshot(): void {
    this.#characterPresentationSnapshot = createTraversalCharacterPresentationSnapshot({
      config: this.#config,
      groundedBodySnapshot: this.#groundedBodyRuntime.isInitialized
        ? this.#groundedBodyRuntime.snapshot
        : null,
      locomotionMode: this.#locomotionMode,
      mountedSkiffState: this.#mountedSkiffState,
      swimSnapshot: this.#swimSnapshot
    });
  }
}
