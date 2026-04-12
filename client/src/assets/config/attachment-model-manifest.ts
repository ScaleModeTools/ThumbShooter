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
    gripAlignment: {
      attachmentForwardAxis: {
        x: 1,
        y: 0,
        z: 0
      },
      attachmentUpAxis: {
        x: 0,
        y: 1,
        z: 0
      },
      socketForwardAxis: {
        x: 1,
        y: 0,
        z: 0
      },
      socketOffset: {
        x: 0,
        y: 0,
        z: 0
      },
      socketUpAxis: {
        x: 0,
        y: -1,
        z: 0
      }
    },
    supportPoints: null
  }
] as const);
