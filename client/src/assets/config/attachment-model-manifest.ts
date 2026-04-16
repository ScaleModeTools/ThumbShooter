import { createAttachmentAssetId } from "../types/asset-id";
import { defineAttachmentAssetManifest } from "../types/attachment-asset-manifest";

export const metaverseServicePistolAttachmentAssetId = createAttachmentAssetId(
  "metaverse-service-pistol-v1"
);

export const attachmentModelManifest = defineAttachmentAssetManifest([
  {
    id: metaverseServicePistolAttachmentAssetId,
    label: "Metaverse service pistol",
    category: "handheld",
    renderModel: {
      defaultTier: "high",
      lods: [
        {
          tier: "high",
          modelPath: "/models/metaverse/attachments/metaverse-service-pistol.gltf",
          maxDistanceMeters: null
        }
      ]
    },
    defaultSocketId: "hand_r_socket",
    allowedSocketIds: ["hand_r_socket", "hand_l_socket", "hip_socket"],
    compatibleSkeletons: ["humanoid_v1", "humanoid_v2"],
    heldMount: {
      attachmentSocketNodeNameBySocketId: {
        hand_l_socket: "metaverse_service_pistol_trigger_hand_l_socket",
        hand_r_socket: "metaverse_service_pistol_trigger_hand_r_socket"
      }
    },
    offHandSupportPointIdBySocketId: {
      hand_r_socket: "grip-support-right"
    },
    mountedHolster: {
      attachmentSocketNodeName: "metaverse_service_pistol_back_socket",
      socketName: "back_socket",
    },
    supportPoints: [
      {
        supportPointId: "grip-support-right",
        localPosition: {
          x: 0.04,
          y: 0,
          z: -0.025
        }
      }
    ]
  }
] as const);
