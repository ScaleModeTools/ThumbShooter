import {
  resolveMetaverseAuthoritativeDynamicSurfaceColliders,
  type MetaverseAuthoritativeSurfaceColliderSnapshot
} from "../config/metaverse-authoritative-world-surface.js";
import { MetaverseAuthoritativeRapierPhysicsRuntime } from "./metaverse-authoritative-rapier-physics-runtime.js";
import type {
  PhysicsVector3Snapshot,
  RapierColliderHandle
} from "../types/metaverse-authoritative-rapier.js";

export class MetaverseAuthoritativeDynamicSurfaceColliderRuntime {
  readonly #environmentAssetId: string;
  readonly #physicsRuntime: MetaverseAuthoritativeRapierPhysicsRuntime;

  #colliders: RapierColliderHandle[] = [];
  #surfaceColliderSnapshots:
    readonly MetaverseAuthoritativeSurfaceColliderSnapshot[] =
    Object.freeze([]);

  constructor(
    environmentAssetId: string,
    physicsRuntime: MetaverseAuthoritativeRapierPhysicsRuntime
  ) {
    this.#environmentAssetId = environmentAssetId;
    this.#physicsRuntime = physicsRuntime;
  }

  get colliders(): readonly RapierColliderHandle[] {
    return this.#colliders;
  }

  get environmentAssetId(): string {
    return this.#environmentAssetId;
  }

  get surfaceColliderSnapshots():
    readonly MetaverseAuthoritativeSurfaceColliderSnapshot[] {
    return this.#surfaceColliderSnapshots;
  }

  syncPose(poseSnapshot: {
    readonly position: PhysicsVector3Snapshot;
    readonly yawRadians: number;
  }): void {
    const nextColliderSnapshots =
      resolveMetaverseAuthoritativeDynamicSurfaceColliders(
        this.#environmentAssetId,
        poseSnapshot
      );

    if (nextColliderSnapshots.length === 0) {
      this.dispose();
      return;
    }

    if (this.#colliders.length === 0) {
      this.#colliders = nextColliderSnapshots.map((colliderSnapshot) =>
        this.#physicsRuntime.createCuboidCollider(
          colliderSnapshot.halfExtents,
          colliderSnapshot.translation,
          colliderSnapshot.rotation
        )
      );
    } else if (this.#colliders.length !== nextColliderSnapshots.length) {
      throw new Error(
        `Metaverse authoritative dynamic surface collider runtime changed collider count for ${this.#environmentAssetId}.`
      );
    } else {
      for (const [colliderIndex, collider] of this.#colliders.entries()) {
        const colliderSnapshot = nextColliderSnapshots[colliderIndex];

        if (colliderSnapshot === undefined) {
          continue;
        }

        collider.setTranslation(colliderSnapshot.translation);
        collider.setRotation(colliderSnapshot.rotation);
      }
    }

    this.#surfaceColliderSnapshots = nextColliderSnapshots;
  }

  dispose(): void {
    for (const collider of this.#colliders) {
      this.#physicsRuntime.removeCollider(collider);
    }

    this.#colliders = [];
    this.#surfaceColliderSnapshots = Object.freeze([]);
  }
}
