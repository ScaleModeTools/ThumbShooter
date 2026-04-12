import type { PhysicsVector3Snapshot } from "@/physics";

import type { MetaversePlacedCuboidColliderSnapshot } from "../../states/metaverse-environment-collision";
import type {
  MetaverseEnvironmentEntryProofConfig,
  MetaverseEnvironmentSeatProofConfig
} from "../../types/metaverse-runtime";
import type { SurfaceLocomotionConfig } from "../../traversal/types/traversal";
import {
  advanceSurfaceLocomotionSnapshot,
  freezeVector3,
  toFiniteNumber,
  wrapRadians
} from "../../traversal/policies/surface-locomotion";
import { isWaterbornePosition } from "../../traversal/policies/surface-routing";
import type {
  MountedVehicleControlIntent,
  MountedVehicleEntryRuntimeSnapshot,
  MountedVehicleOccupancyRuntimeSnapshot,
  MountedVehicleRuntimeSnapshot,
  MountedVehicleSeatRuntimeSnapshot
} from "../types/vehicle-runtime";

interface MetaverseVehicleRuntimeInit {
  readonly environmentAssetId: string;
  readonly label: string;
  readonly oceanHeightMeters: number;
  readonly poseSnapshot: {
    readonly position: PhysicsVector3Snapshot;
    readonly yawRadians: number;
  };
  readonly entries: readonly MetaverseEnvironmentEntryProofConfig[] | null;
  readonly seats: readonly MetaverseEnvironmentSeatProofConfig[];
  readonly surfaceColliderSnapshots: readonly MetaversePlacedCuboidColliderSnapshot[];
  readonly waterContactProbeRadiusMeters: number;
  readonly waterlineHeightMeters: number;
}

interface MetaverseVehicleOccupancyRuntime {
  occupy(): void;
  occupancySnapshot(): MountedVehicleOccupancyRuntimeSnapshot;
  vacate(): void;
}

class MetaverseVehicleSeatRuntime {
  readonly #cameraPolicyId: MountedVehicleSeatRuntimeSnapshot["cameraPolicyId"];
  readonly #controlRoutingPolicyId: MountedVehicleSeatRuntimeSnapshot["controlRoutingPolicyId"];
  readonly #directEntryEnabled: boolean;
  readonly #dismountOffset: MountedVehicleSeatRuntimeSnapshot["dismountOffset"];
  readonly #label: MountedVehicleSeatRuntimeSnapshot["label"];
  readonly #lookLimitPolicyId: MountedVehicleSeatRuntimeSnapshot["lookLimitPolicyId"];
  readonly #occupancyAnimationId: MountedVehicleSeatRuntimeSnapshot["occupancyAnimationId"];
  readonly #seatId: string;
  readonly #seatNodeName: string;
  readonly #seatRole: MountedVehicleSeatRuntimeSnapshot["seatRole"];

  #occupied = false;

  constructor(seat: MetaverseEnvironmentSeatProofConfig) {
    this.#cameraPolicyId = seat.cameraPolicyId;
    this.#controlRoutingPolicyId = seat.controlRoutingPolicyId;
    this.#directEntryEnabled = seat.directEntryEnabled;
    this.#dismountOffset = freezeVector3(
      seat.dismountOffset.x,
      seat.dismountOffset.y,
      seat.dismountOffset.z
    );
    this.#label = seat.label;
    this.#lookLimitPolicyId = seat.lookLimitPolicyId;
    this.#occupancyAnimationId = seat.occupancyAnimationId;
    this.#seatId = seat.seatId;
    this.#seatNodeName = seat.seatNodeName;
    this.#seatRole = seat.seatRole;
  }

  get seatId(): string {
    return this.#seatId;
  }

  get directEntryEnabled(): boolean {
    return this.#directEntryEnabled;
  }

  occupy(): void {
    this.#occupied = true;
  }

  vacate(): void {
    this.#occupied = false;
  }

  snapshot(): MountedVehicleSeatRuntimeSnapshot {
    return Object.freeze({
      cameraPolicyId: this.#cameraPolicyId,
      controlRoutingPolicyId: this.#controlRoutingPolicyId,
      directEntryEnabled: this.#directEntryEnabled,
      dismountOffset: this.#dismountOffset,
      label: this.#label,
      lookLimitPolicyId: this.#lookLimitPolicyId,
      occupancyAnimationId: this.#occupancyAnimationId,
      occupied: this.#occupied,
      seatId: this.#seatId,
      seatNodeName: this.#seatNodeName,
      seatRole: this.#seatRole
    });
  }

  occupancySnapshot(): MountedVehicleOccupancyRuntimeSnapshot {
    return Object.freeze({
      cameraPolicyId: this.#cameraPolicyId,
      controlRoutingPolicyId: this.#controlRoutingPolicyId,
      dismountOffset: this.#dismountOffset,
      entryId: null,
      lookLimitPolicyId: this.#lookLimitPolicyId,
      occupancyAnimationId: this.#occupancyAnimationId,
      occupancyKind: "seat",
      occupantLabel: this.#label,
      occupantRole: this.#seatRole,
      seatId: this.#seatId
    });
  }
}

class MetaverseVehicleEntryRuntime {
  readonly #cameraPolicyId: MountedVehicleEntryRuntimeSnapshot["cameraPolicyId"];
  readonly #controlRoutingPolicyId: MountedVehicleEntryRuntimeSnapshot["controlRoutingPolicyId"];
  readonly #dismountOffset: MountedVehicleEntryRuntimeSnapshot["dismountOffset"];
  readonly #entryId: MountedVehicleEntryRuntimeSnapshot["entryId"];
  readonly #entryNodeName: MountedVehicleEntryRuntimeSnapshot["entryNodeName"];
  readonly #label: MountedVehicleEntryRuntimeSnapshot["label"];
  readonly #lookLimitPolicyId: MountedVehicleEntryRuntimeSnapshot["lookLimitPolicyId"];
  readonly #occupancyAnimationId: MountedVehicleEntryRuntimeSnapshot["occupancyAnimationId"];
  readonly #occupantRole: MountedVehicleEntryRuntimeSnapshot["occupantRole"];

  #occupied = false;

  constructor(entry: MetaverseEnvironmentEntryProofConfig) {
    this.#cameraPolicyId = entry.cameraPolicyId;
    this.#controlRoutingPolicyId = entry.controlRoutingPolicyId;
    this.#dismountOffset = freezeVector3(
      entry.dismountOffset.x,
      entry.dismountOffset.y,
      entry.dismountOffset.z
    );
    this.#entryId = entry.entryId;
    this.#entryNodeName = entry.entryNodeName;
    this.#label = entry.label;
    this.#lookLimitPolicyId = entry.lookLimitPolicyId;
    this.#occupancyAnimationId = entry.occupancyAnimationId;
    this.#occupantRole = entry.occupantRole;
  }

  get entryId(): string {
    return this.#entryId;
  }

  occupy(): void {
    this.#occupied = true;
  }

  vacate(): void {
    this.#occupied = false;
  }

  snapshot(): MountedVehicleEntryRuntimeSnapshot {
    return Object.freeze({
      cameraPolicyId: this.#cameraPolicyId,
      controlRoutingPolicyId: this.#controlRoutingPolicyId,
      dismountOffset: this.#dismountOffset,
      entryId: this.#entryId,
      entryNodeName: this.#entryNodeName,
      label: this.#label,
      lookLimitPolicyId: this.#lookLimitPolicyId,
      occupancyAnimationId: this.#occupancyAnimationId,
      occupied: this.#occupied,
      occupantRole: this.#occupantRole
    });
  }

  occupancySnapshot(): MountedVehicleOccupancyRuntimeSnapshot {
    return Object.freeze({
      cameraPolicyId: this.#cameraPolicyId,
      controlRoutingPolicyId: this.#controlRoutingPolicyId,
      dismountOffset: this.#dismountOffset,
      entryId: this.#entryId,
      lookLimitPolicyId: this.#lookLimitPolicyId,
      occupancyAnimationId: this.#occupancyAnimationId,
      occupancyKind: "entry",
      occupantLabel: this.#label,
      occupantRole: this.#occupantRole,
      seatId: null
    });
  }
}

export class MetaverseVehicleRuntime {
  readonly #environmentAssetId: string;
  readonly #entryRuntimes: readonly MetaverseVehicleEntryRuntime[];
  readonly #label: string;
  readonly #oceanHeightMeters: number;
  readonly #seatRuntimes: readonly MetaverseVehicleSeatRuntime[];
  readonly #surfaceColliderSnapshots: readonly MetaversePlacedCuboidColliderSnapshot[];
  readonly #waterContactProbeRadiusMeters: number;

  #forwardSpeedUnitsPerSecond = 0;
  #occupancyRuntime: MetaverseVehicleOccupancyRuntime | null = null;
  #planarSpeedUnitsPerSecond = 0;
  #position: PhysicsVector3Snapshot;
  #strafeSpeedUnitsPerSecond = 0;
  #waterborne: boolean;
  #yawRadians: number;

  constructor({
    environmentAssetId,
    entries,
    label,
    oceanHeightMeters,
    poseSnapshot,
    seats,
    surfaceColliderSnapshots,
    waterContactProbeRadiusMeters,
    waterlineHeightMeters
  }: MetaverseVehicleRuntimeInit) {
    this.#environmentAssetId = environmentAssetId;
    this.#label = label;
    this.#oceanHeightMeters = oceanHeightMeters;
    this.#entryRuntimes = Object.freeze(
      (entries ?? []).map((entry) => new MetaverseVehicleEntryRuntime(entry))
    );
    this.#seatRuntimes = Object.freeze(
      seats.map((seat) => new MetaverseVehicleSeatRuntime(seat))
    );
    this.#surfaceColliderSnapshots = surfaceColliderSnapshots;
    this.#waterContactProbeRadiusMeters = waterContactProbeRadiusMeters;
    this.#position = freezeVector3(
      poseSnapshot.position.x,
      toFiniteNumber(poseSnapshot.position.y, waterlineHeightMeters),
      poseSnapshot.position.z
    );
    this.#yawRadians = wrapRadians(poseSnapshot.yawRadians);
    this.#waterborne = false;
    this.#syncWaterborneState();
  }

  get snapshot(): MountedVehicleRuntimeSnapshot {
    return Object.freeze({
      environmentAssetId: this.#environmentAssetId,
      label: this.#label,
      occupancy:
        this.#occupancyRuntime === null
          ? null
          : this.#occupancyRuntime.occupancySnapshot(),
      planarSpeedUnitsPerSecond: this.#planarSpeedUnitsPerSecond,
      position: this.#position,
      waterborne: this.#waterborne,
      yawRadians: this.#yawRadians
    });
  }

  occupySeat(seatId: string): MountedVehicleSeatRuntimeSnapshot | null {
    const nextSeatRuntime = this.#seatRuntimes.find((seat) => seat.seatId === seatId);

    if (nextSeatRuntime === undefined) {
      return null;
    }

    this.clearOccupancy();
    nextSeatRuntime.occupy();
    this.#occupancyRuntime = nextSeatRuntime;

    return nextSeatRuntime.snapshot();
  }

  occupyEntry(entryId: string): MountedVehicleEntryRuntimeSnapshot | null {
    const nextEntryRuntime = this.#entryRuntimes.find(
      (entry) => entry.entryId === entryId
    );

    if (nextEntryRuntime === undefined) {
      return null;
    }

    this.clearOccupancy();
    nextEntryRuntime.occupy();
    this.#occupancyRuntime = nextEntryRuntime;

    return nextEntryRuntime.snapshot();
  }

  clearOccupancy(): void {
    this.#occupancyRuntime?.vacate();
    this.#occupancyRuntime = null;
  }

  syncAuthoritativePose(poseSnapshot: {
    readonly position: PhysicsVector3Snapshot;
    readonly yawRadians: number;
  }): MountedVehicleRuntimeSnapshot {
    this.#position = freezeVector3(
      poseSnapshot.position.x,
      poseSnapshot.position.y,
      poseSnapshot.position.z
    );
    this.#yawRadians = wrapRadians(poseSnapshot.yawRadians);
    this.#planarSpeedUnitsPerSecond = 0;
    this.#forwardSpeedUnitsPerSecond = 0;
    this.#strafeSpeedUnitsPerSecond = 0;
    this.#syncWaterborneState();

    return this.snapshot;
  }

  advance(
    controlIntent: MountedVehicleControlIntent,
    locomotionConfig: SurfaceLocomotionConfig,
    deltaSeconds: number,
    worldRadius: number
  ): MountedVehicleRuntimeSnapshot {
    const nextMountedVehicleState = advanceSurfaceLocomotionSnapshot(
      {
        planarSpeedUnitsPerSecond: this.#planarSpeedUnitsPerSecond,
        position: this.#position,
        yawRadians: this.#yawRadians
      },
      {
        forwardSpeedUnitsPerSecond: this.#forwardSpeedUnitsPerSecond,
        strafeSpeedUnitsPerSecond: this.#strafeSpeedUnitsPerSecond
      },
      controlIntent,
      locomotionConfig,
      deltaSeconds,
      worldRadius,
      this.#position.y
    );

    this.#position = nextMountedVehicleState.snapshot.position;
    this.#yawRadians = nextMountedVehicleState.snapshot.yawRadians;
    this.#planarSpeedUnitsPerSecond =
      nextMountedVehicleState.snapshot.planarSpeedUnitsPerSecond;
    this.#syncWaterborneState();
    this.#forwardSpeedUnitsPerSecond = this.#waterborne
      ? nextMountedVehicleState.speedSnapshot.forwardSpeedUnitsPerSecond
      : 0;
    this.#strafeSpeedUnitsPerSecond = this.#waterborne
      ? nextMountedVehicleState.speedSnapshot.strafeSpeedUnitsPerSecond
      : 0;

    return this.snapshot;
  }

  #syncWaterborneState(): void {
    this.#waterborne = isWaterbornePosition(
      {
        ocean: {
          height: this.#oceanHeightMeters
        }
      } as never,
      this.#surfaceColliderSnapshots,
      this.#position,
      this.#waterContactProbeRadiusMeters,
      this.#environmentAssetId
    );
  }
}
