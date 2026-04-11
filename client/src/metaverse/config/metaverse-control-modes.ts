import type {
  MetaverseControlModeDefinition,
  MetaverseControlModeId
} from "../types/metaverse-control-mode";

export const defaultMetaverseControlMode: MetaverseControlModeId = "keyboard";

export const metaverseControlModes = [
  {
    id: "keyboard",
    label: "Keyboard + Mouse",
    description:
      "Standard FPS hub controls with pointer-lock mouse look. W/S move forward and backward, A/D strafe, Space jumps, Shift boosts, left click is primary action, and right click is secondary action.",
    controlsSummary: [
      "W/S forward and backward",
      "A/D strafe left and right",
      "Move mouse to look",
      "Space jumps, Shift boosts",
      "Left click primary action, right click secondary action"
    ]
  }
] as const satisfies readonly MetaverseControlModeDefinition[];

const legacyMouseControlMode = Object.freeze({
  id: "mouse",
  label: "Keyboard + Mouse",
  description:
    "Legacy control-mode id retained for compatibility. Hub input now uses standard FPS keyboard and mouse semantics.",
  controlsSummary: [
    "W/S forward and backward",
    "A/D strafe left and right",
    "Move mouse to look",
    "Space jumps, Shift boosts",
    "Left click primary action, right click secondary action"
  ]
} as const satisfies MetaverseControlModeDefinition);

export const metaverseControlModesWithLegacy = [
  ...metaverseControlModes,
  legacyMouseControlMode
] as const;

export function resolveMetaverseControlMode(
  controlMode: MetaverseControlModeId
): MetaverseControlModeDefinition {
  return (
    metaverseControlModesWithLegacy.find(
      (candidate) => candidate.id === controlMode
    ) ?? metaverseControlModesWithLegacy[0]
  );
}
