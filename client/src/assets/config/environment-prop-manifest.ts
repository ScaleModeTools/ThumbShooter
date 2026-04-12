import { createEnvironmentAssetId } from "../types/asset-id";
import { defineEnvironmentAssetManifest } from "../types/environment-asset-manifest";
import {
  defaultMountedVehicleCameraPolicyId,
  defaultMountedVehicleLookLimitPolicyId,
  defaultMountedVehicleOccupancyAnimationId
} from "../types/environment-seat";

export const metaverseHubCrateEnvironmentAssetId = createEnvironmentAssetId(
  "metaverse-hub-crate-v1"
);

export const metaverseHubPushableCrateEnvironmentAssetId = createEnvironmentAssetId(
  "metaverse-hub-pushable-crate-v1"
);

export const metaverseHubDockEnvironmentAssetId = createEnvironmentAssetId(
  "metaverse-hub-dock-v1"
);

export const metaverseHubSkiffEnvironmentAssetId = createEnvironmentAssetId(
  "metaverse-hub-skiff-v1"
);

export const metaverseHubSkiffForwardModelYawRadians = Math.PI * 0.5;

export const environmentPropManifest = defineEnvironmentAssetManifest([
  {
    id: metaverseHubCrateEnvironmentAssetId,
    label: "Metaverse hub crate",
    placement: "instanced",
    traversalAffordance: "blocker",
    physicsColliders: [
      {
        center: {
          x: 0,
          y: 0,
          z: 0
        },
        shape: "box",
        size: {
          x: 0.92,
          y: 0.92,
          z: 0.92
        },
        traversalAffordance: "blocker"
      }
    ],
    renderModel: {
      defaultTier: "high",
      lods: [
        {
          tier: "high",
          modelPath: "/models/metaverse/environment/metaverse-hub-crate-high.gltf",
          maxDistanceMeters: 18
        },
        {
          tier: "low",
          modelPath: "/models/metaverse/environment/metaverse-hub-crate-low.gltf",
          maxDistanceMeters: null
        }
      ]
    },
    orientation: null,
    collider: null,
    collisionPath: null,
    entries: null,
    seats: null
  },
  {
    id: metaverseHubDockEnvironmentAssetId,
    label: "Metaverse hub dock",
    placement: "static",
    traversalAffordance: "support",
    physicsColliders: [
      {
        center: {
          x: 0,
          y: 0,
          z: 0
        },
        shape: "box",
        size: {
          x: 8.4,
          y: 0.34,
          z: 4.2
        },
        traversalAffordance: "support"
      }
    ],
    renderModel: {
      defaultTier: "high",
      lods: [
        {
          tier: "high",
          modelPath: "/models/metaverse/environment/metaverse-hub-dock-high.gltf",
          maxDistanceMeters: 28
        },
        {
          tier: "low",
          modelPath: "/models/metaverse/environment/metaverse-hub-dock-low.gltf",
          maxDistanceMeters: null
        }
      ]
    },
    orientation: null,
    collider: null,
    collisionPath: null,
    entries: null,
    seats: null
  },
  {
    id: metaverseHubPushableCrateEnvironmentAssetId,
    label: "Metaverse hub pushable crate",
    placement: "dynamic",
    traversalAffordance: "pushable",
    physicsColliders: null,
    renderModel: {
      defaultTier: "high",
      lods: [
        {
          tier: "high",
          modelPath: "/models/metaverse/environment/metaverse-hub-crate-high.gltf",
          maxDistanceMeters: null
        }
      ]
    },
    orientation: null,
    collider: {
      center: {
        x: 0,
        y: 0,
        z: 0
      },
      shape: "box",
      size: {
        x: 0.92,
        y: 0.92,
        z: 0.92
      }
    },
    collisionPath: null,
    entries: null,
    seats: null
  },
  {
    id: metaverseHubSkiffEnvironmentAssetId,
    label: "Metaverse hub skiff",
    placement: "dynamic",
    traversalAffordance: "mount",
    physicsColliders: [
      {
        center: {
          x: 0,
          y: 0.28,
          z: 0
        },
        shape: "box",
        size: {
          x: 4.6,
          y: 0.56,
          z: 2
        },
        traversalAffordance: "blocker"
      },
      {
        center: {
          x: 0,
          y: 0.62,
          z: 0
        },
        shape: "box",
        size: {
          x: 4.2,
          y: 0.12,
          z: 1.8
        },
        traversalAffordance: "support"
      },
      {
        center: {
          x: 0,
          y: 0.95,
          z: 0
        },
        shape: "box",
        size: {
          x: 0.9,
          y: 0.18,
          z: 0.8
        },
        traversalAffordance: "support"
      },
      {
        center: {
          x: -0.25,
          y: 0.92,
          z: -0.48
        },
        shape: "box",
        size: {
          x: 1,
          y: 0.16,
          z: 0.52
        },
        traversalAffordance: "support"
      }
    ],
    renderModel: {
      defaultTier: "high",
      lods: [
        {
          tier: "high",
          modelPath: "/models/metaverse/environment/metaverse-hub-skiff.gltf",
          maxDistanceMeters: null
        }
      ]
    },
    orientation: {
      forwardModelYawRadians: metaverseHubSkiffForwardModelYawRadians
    },
    collider: {
      center: {
        x: 0,
        y: 1.05,
        z: 0
      },
      shape: "box",
      size: {
        x: 5.2,
        y: 2.4,
        z: 2.8
      }
    },
    collisionPath: "/models/metaverse/environment/metaverse-hub-skiff-collision.gltf",
    entries: [
      {
        cameraPolicyId: "seat-follow",
        controlRoutingPolicyId: "look-only",
        dismountOffset: {
          x: 0,
          y: 0,
          z: 1.2
        },
        entryId: "deck-entry",
        entryNodeName: "deck_entry",
        label: "Board deck",
        lookLimitPolicyId: "passenger-bench",
        occupancyAnimationId: "standing",
        occupantRole: "passenger"
      }
    ],
    seats: [
      {
        cameraPolicyId: defaultMountedVehicleCameraPolicyId,
        controlRoutingPolicyId: "vehicle-surface-drive",
        directEntryEnabled: true,
        dismountOffset: {
          x: 0,
          y: 0,
          z: 1.1
        },
        label: "Take helm",
        lookLimitPolicyId: defaultMountedVehicleLookLimitPolicyId,
        occupancyAnimationId: defaultMountedVehicleOccupancyAnimationId,
        seatId: "driver-seat",
        seatNodeName: "driver_seat",
        seatRole: "driver"
      },
      {
        cameraPolicyId: "seat-follow",
        controlRoutingPolicyId: "look-only",
        directEntryEnabled: true,
        dismountOffset: {
          x: 0,
          y: 0,
          z: 0.8
        },
        label: "Port bench",
        lookLimitPolicyId: "passenger-bench",
        occupancyAnimationId: defaultMountedVehicleOccupancyAnimationId,
        seatId: "port-bench-seat",
        seatNodeName: "port_bench_seat",
        seatRole: "passenger"
      }
    ]
  }
] as const);
