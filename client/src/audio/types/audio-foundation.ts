export const audioTrackIds = [
  "shell-attract-loop",
  "birds-arena-loop"
] as const;
export const audioCueIds = [
  "ui-confirm",
  "ui-menu-open",
  "ui-menu-close",
  "calibration-shot",
  "weapon-pistol-shot",
  "weapon-reload",
  "enemy-hit",
  "enemy-scatter"
] as const;

export type AudioTrackId = (typeof audioTrackIds)[number];
export type AudioCueId = (typeof audioCueIds)[number];
