import {
  advanceMetaverseSurfaceTraversalMotion,
  clamp,
  constrainMetaverseSurfaceTraversalPositionToWorldRadius,
  createMetaverseSurfaceTraversalVector3Snapshot as freezeVector3,
  toFiniteNumber,
  wrapRadians
} from "@webgpu-metaverse/shared";

import { RapierPhysicsRuntime } from "./rapier-physics-runtime";
import type {
  MetaverseGroundedBodyConfig,
  MetaverseGroundedBodyIntentSnapshot,
  MetaverseGroundedBodySnapshot,
  PhysicsVector3Snapshot,
  RapierCharacterControllerHandle,
  RapierColliderHandle
} from "../types/metaverse-grounded-body";

function sanitizeConfig(
  config: MetaverseGroundedBodyConfig
): MetaverseGroundedBodyConfig {
  return Object.freeze({
    accelerationCurveExponent: Math.max(
      0.1,
      toFiniteNumber(config.accelerationCurveExponent, 1.2)
    ),
    accelerationUnitsPerSecondSquared: Math.max(
      0.1,
      toFiniteNumber(config.accelerationUnitsPerSecondSquared, 20)
    ),
    airborneMovementDampingFactor: clamp(
      toFiniteNumber(config.airborneMovementDampingFactor, 0.42),
      0,
      1
    ),
    baseSpeedUnitsPerSecond: Math.max(
      0,
      toFiniteNumber(config.baseSpeedUnitsPerSecond, 6)
    ),
    boostCurveExponent: Math.max(
      0.1,
      toFiniteNumber(config.boostCurveExponent, 1.1)
    ),
    boostMultiplier: Math.max(1, toFiniteNumber(config.boostMultiplier, 1.65)),
    capsuleHalfHeightMeters: Math.max(
      0.05,
      toFiniteNumber(config.capsuleHalfHeightMeters, 0.48)
    ),
    capsuleRadiusMeters: Math.max(
      0.05,
      toFiniteNumber(config.capsuleRadiusMeters, 0.34)
    ),
    controllerOffsetMeters: Math.max(
      0.001,
      toFiniteNumber(config.controllerOffsetMeters, 0.01)
    ),
    decelerationUnitsPerSecondSquared: Math.max(
      0.1,
      toFiniteNumber(config.decelerationUnitsPerSecondSquared, 26)
    ),
    dragCurveExponent: Math.max(
      0.1,
      toFiniteNumber(config.dragCurveExponent, 1.45)
    ),
    eyeHeightMeters: Math.max(0.4, toFiniteNumber(config.eyeHeightMeters, 1.62)),
    gravityUnitsPerSecond: Math.max(
      0,
      toFiniteNumber(config.gravityUnitsPerSecond, 18)
    ),
    jumpImpulseUnitsPerSecond: Math.max(
      0,
      toFiniteNumber(config.jumpImpulseUnitsPerSecond, 6.8)
    ),
    maxSlopeClimbAngleRadians: clamp(
      toFiniteNumber(config.maxSlopeClimbAngleRadians, Math.PI * 0.26),
      0,
      Math.PI * 0.5
    ),
    minSlopeSlideAngleRadians: clamp(
      toFiniteNumber(config.minSlopeSlideAngleRadians, Math.PI * 0.34),
      0,
      Math.PI * 0.5
    ),
    maxTurnSpeedRadiansPerSecond: Math.max(
      0,
      toFiniteNumber(config.maxTurnSpeedRadiansPerSecond, 1.9)
    ),
    snapToGroundDistanceMeters: Math.max(
      0,
      toFiniteNumber(config.snapToGroundDistanceMeters, 0.22)
    ),
    stepHeightMeters: Math.max(
      0,
      toFiniteNumber(config.stepHeightMeters, 0.28)
    ),
    stepWidthMeters: Math.max(
      0.01,
      toFiniteNumber(config.stepWidthMeters, 0.24)
    ),
    spawnPosition: freezeVector3(
      config.spawnPosition.x,
      config.spawnPosition.y,
      config.spawnPosition.z
    ),
    worldRadius: Math.max(1, toFiniteNumber(config.worldRadius, 110))
  });
}

function freezeGroundedBodySnapshot(
  config: MetaverseGroundedBodyConfig,
  position: PhysicsVector3Snapshot,
  planarSpeedUnitsPerSecond: number,
  verticalSpeedUnitsPerSecond: number,
  yawRadians: number,
  grounded: boolean
): MetaverseGroundedBodySnapshot {
  return Object.freeze({
    capsuleHalfHeightMeters: config.capsuleHalfHeightMeters,
    capsuleRadiusMeters: config.capsuleRadiusMeters,
    eyeHeightMeters: config.eyeHeightMeters,
    grounded,
    jumpReady: grounded,
    planarSpeedUnitsPerSecond: Math.max(0, toFiniteNumber(planarSpeedUnitsPerSecond)),
    position,
    verticalSpeedUnitsPerSecond: toFiniteNumber(verticalSpeedUnitsPerSecond),
    yawRadians: wrapRadians(yawRadians)
  });
}

export class MetaverseGroundedBodyRuntime {
  readonly #config: MetaverseGroundedBodyConfig;
  readonly #physicsRuntime: RapierPhysicsRuntime;

  #autostepEnabled = true;
  #autostepHeightMeters: number;
  #characterController: RapierCharacterControllerHandle | null = null;
  #collider: RapierColliderHandle | null = null;
  #forwardSpeedUnitsPerSecond = 0;
  #strafeSpeedUnitsPerSecond = 0;
  #verticalSpeedUnitsPerSecond = 0;
  #applyImpulsesToDynamicBodies = false;
  #snapshot: MetaverseGroundedBodySnapshot;

  constructor(
    config: MetaverseGroundedBodyConfig,
    physicsRuntime: RapierPhysicsRuntime
  ) {
    this.#config = sanitizeConfig(config);
    this.#physicsRuntime = physicsRuntime;
    this.#autostepHeightMeters = this.#config.stepHeightMeters;
    this.#snapshot = freezeGroundedBodySnapshot(
      this.#config,
      this.#config.spawnPosition,
      0,
      0,
      0,
      false
    );
  }

  get isInitialized(): boolean {
    return this.#characterController !== null && this.#collider !== null;
  }

  get snapshot(): MetaverseGroundedBodySnapshot {
    return this.#snapshot;
  }

  async init(initialYawRadians = 0): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await this.#physicsRuntime.init();

    const controller = this.#physicsRuntime.createCharacterController(
      this.#config.controllerOffsetMeters
    );

    controller.setUp?.(this.#physicsRuntime.createVector3(0, 1, 0));
    controller.setApplyImpulsesToDynamicBodies(
      this.#applyImpulsesToDynamicBodies
    );
    controller.setCharacterMass(1);
    this.#syncAutostepConfiguration(controller);
    controller.enableSnapToGround(this.#config.snapToGroundDistanceMeters);
    controller.setMaxSlopeClimbAngle?.(this.#config.maxSlopeClimbAngleRadians);
    controller.setMinSlopeSlideAngle?.(this.#config.minSlopeSlideAngleRadians);

    const collider = this.#physicsRuntime.createCapsuleCollider(
      this.#config.capsuleHalfHeightMeters,
      this.#config.capsuleRadiusMeters,
      this.#rootToColliderCenter(this.#config.spawnPosition)
    );

    this.#characterController = controller;
    this.#collider = collider;
    this.#forwardSpeedUnitsPerSecond = 0;
    this.#snapshot = freezeGroundedBodySnapshot(
      this.#config,
      this.#config.spawnPosition,
      0,
      0,
      initialYawRadians,
      false
    );
  }

  setApplyImpulsesToDynamicBodies(enabled: boolean): void {
    this.#applyImpulsesToDynamicBodies = enabled;
    this.#characterController?.setApplyImpulsesToDynamicBodies(enabled);
  }

  setAutostepEnabled(
    enabled: boolean,
    maxHeightMeters = this.#config.stepHeightMeters
  ): void {
    this.#autostepEnabled = enabled;
    this.#autostepHeightMeters = Math.max(
      this.#config.stepHeightMeters,
      toFiniteNumber(maxHeightMeters, this.#config.stepHeightMeters)
    );
    const controller = this.#characterController;

    if (controller === null) {
      return;
    }

    this.#syncAutostepConfiguration(controller);
  }

  syncAuthoritativeState(snapshot: {
    readonly grounded: boolean;
    readonly linearVelocity: PhysicsVector3Snapshot;
    readonly position: PhysicsVector3Snapshot;
    readonly yawRadians: number;
  }): void {
    const collider = this.#requireCollider();
    const sanitizedPosition = freezeVector3(
      snapshot.position.x,
      snapshot.position.y,
      snapshot.position.z
    );
    const yawRadians = wrapRadians(snapshot.yawRadians);
    const linearVelocityX = toFiniteNumber(snapshot.linearVelocity.x);
    const linearVelocityY = toFiniteNumber(snapshot.linearVelocity.y);
    const linearVelocityZ = toFiniteNumber(snapshot.linearVelocity.z);
    const forwardX = Math.sin(yawRadians);
    const forwardZ = -Math.cos(yawRadians);
    const rightX = Math.cos(yawRadians);
    const rightZ = Math.sin(yawRadians);

    collider.setTranslation(this.#rootToColliderCenter(sanitizedPosition));
    this.#forwardSpeedUnitsPerSecond =
      linearVelocityX * forwardX + linearVelocityZ * forwardZ;
    this.#strafeSpeedUnitsPerSecond =
      linearVelocityX * rightX + linearVelocityZ * rightZ;
    this.#verticalSpeedUnitsPerSecond =
      snapshot.grounded === true ? 0 : linearVelocityY;
    this.#snapshot = freezeGroundedBodySnapshot(
      this.#config,
      sanitizedPosition,
      Math.hypot(linearVelocityX, linearVelocityZ),
      this.#verticalSpeedUnitsPerSecond,
      yawRadians,
      snapshot.grounded === true
    );
  }

  advance(
    intentSnapshot: MetaverseGroundedBodyIntentSnapshot,
    deltaSeconds: number
  ): MetaverseGroundedBodySnapshot {
    const collider = this.#requireCollider();
    const controller = this.#requireCharacterController();

    if (deltaSeconds <= 0) {
      return this.#snapshot;
    }

    this.#physicsRuntime.stepSimulation(deltaSeconds);

    const movementDampingFactor =
      this.#snapshot.grounded ? 1 : this.#config.airborneMovementDampingFactor;
    const motionSnapshot = advanceMetaverseSurfaceTraversalMotion(
      this.#snapshot.yawRadians,
      {
        forwardSpeedUnitsPerSecond: this.#forwardSpeedUnitsPerSecond,
        strafeSpeedUnitsPerSecond: this.#strafeSpeedUnitsPerSecond
      },
      {
        boost: intentSnapshot.boost,
        moveAxis: intentSnapshot.moveAxis,
        strafeAxis: intentSnapshot.strafeAxis,
        yawAxis: intentSnapshot.turnAxis
      },
      this.#config,
      deltaSeconds,
      true,
      movementDampingFactor
    );
    const yawRadians = motionSnapshot.yawRadians;
    const jumpRequested = intentSnapshot.jump === true && this.#snapshot.jumpReady;
    const verticalSpeedUnitsPerSecond =
      (jumpRequested
        ? Math.max(
            this.#verticalSpeedUnitsPerSecond,
            this.#config.jumpImpulseUnitsPerSecond
          )
        : this.#verticalSpeedUnitsPerSecond) -
      this.#config.gravityUnitsPerSecond * deltaSeconds;
    const forwardX = Math.sin(yawRadians);
    const forwardZ = -Math.cos(yawRadians);
    const rightX = Math.cos(yawRadians);
    const rightZ = Math.sin(yawRadians);
    const desiredMovement = this.#physicsRuntime.createVector3(
      motionSnapshot.velocityX * deltaSeconds,
      verticalSpeedUnitsPerSecond * deltaSeconds,
      motionSnapshot.velocityZ * deltaSeconds
    );

    controller.computeColliderMovement(collider, desiredMovement);

    const currentTranslation = collider.translation();
    const computedMovement = controller.computedMovement();
    const unclampedRootPosition = freezeVector3(
      currentTranslation.x + computedMovement.x,
      currentTranslation.y + computedMovement.y - this.#standingOffsetMeters,
      currentTranslation.z + computedMovement.z
    );
    const clampedRootPosition =
      constrainMetaverseSurfaceTraversalPositionToWorldRadius(
        unclampedRootPosition,
        this.#config.worldRadius
      );
    const appliedDeltaX = clampedRootPosition.x - this.#snapshot.position.x;
    const appliedDeltaY = clampedRootPosition.y - this.#snapshot.position.y;
    const appliedDeltaZ = clampedRootPosition.z - this.#snapshot.position.z;
    const planarSpeedUnitsPerSecond = Math.hypot(appliedDeltaX, appliedDeltaZ) /
      deltaSeconds;
    const grounded = controller.computedGrounded();

    collider.setTranslation(this.#rootToColliderCenter(clampedRootPosition));
    this.#forwardSpeedUnitsPerSecond =
      (appliedDeltaX * forwardX + appliedDeltaZ * forwardZ) / deltaSeconds;
    this.#strafeSpeedUnitsPerSecond =
      (appliedDeltaX * rightX + appliedDeltaZ * rightZ) / deltaSeconds;
    // Air control already reduces acceleration/deceleration above, so keep the
    // carried horizontal velocity intact when the body leaves the ground.
    this.#verticalSpeedUnitsPerSecond = grounded
      ? 0
      : appliedDeltaY / deltaSeconds;

    this.#snapshot = freezeGroundedBodySnapshot(
      this.#config,
      clampedRootPosition,
      planarSpeedUnitsPerSecond,
      this.#verticalSpeedUnitsPerSecond,
      yawRadians,
      grounded
    );

    return this.#snapshot;
  }

  dispose(): void {
    if (this.#collider !== null) {
      this.#physicsRuntime.removeCollider(this.#collider);
      this.#collider = null;
    }

    this.#characterController?.free?.();
    this.#characterController = null;
    this.#applyImpulsesToDynamicBodies = false;
    this.#autostepEnabled = true;
    this.#autostepHeightMeters = this.#config.stepHeightMeters;
    this.#forwardSpeedUnitsPerSecond = 0;
    this.#strafeSpeedUnitsPerSecond = 0;
    this.#verticalSpeedUnitsPerSecond = 0;
    this.#snapshot = freezeGroundedBodySnapshot(
      this.#config,
      this.#config.spawnPosition,
      0,
      0,
      this.#snapshot.yawRadians,
      false
    );
  }

  teleport(position: PhysicsVector3Snapshot, yawRadians: number): void {
    const collider = this.#requireCollider();
    const sanitizedPosition = freezeVector3(position.x, position.y, position.z);

    collider.setTranslation(this.#rootToColliderCenter(sanitizedPosition));
    this.#forwardSpeedUnitsPerSecond = 0;
    this.#strafeSpeedUnitsPerSecond = 0;
    this.#verticalSpeedUnitsPerSecond = 0;
    this.#snapshot = freezeGroundedBodySnapshot(
      this.#config,
      sanitizedPosition,
      0,
      0,
      yawRadians,
      false
    );
  }

  get #standingOffsetMeters(): number {
    return (
      this.#config.capsuleHalfHeightMeters + this.#config.capsuleRadiusMeters
    );
  }

  #requireCharacterController(): RapierCharacterControllerHandle {
    if (this.#characterController === null) {
      throw new Error("Metaverse grounded body runtime must be initialized before use.");
    }

    return this.#characterController;
  }

  #requireCollider(): RapierColliderHandle {
    if (this.#collider === null) {
      throw new Error("Metaverse grounded body runtime must be initialized before use.");
    }

    return this.#collider;
  }

  #syncAutostepConfiguration(
    controller: RapierCharacterControllerHandle
  ): void {
    if (this.#autostepEnabled) {
      controller.enableAutostep(
        this.#autostepHeightMeters,
        this.#config.stepWidthMeters,
        false
      );
      return;
    }

    controller.disableAutostep?.();
  }

  #rootToColliderCenter(
    rootPosition: PhysicsVector3Snapshot
  ): PhysicsVector3Snapshot {
    return freezeVector3(
      rootPosition.x,
      rootPosition.y + this.#standingOffsetMeters,
      rootPosition.z
    );
  }
}
