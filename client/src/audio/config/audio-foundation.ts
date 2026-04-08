import { AudioSettings } from "@thumbshooter/shared";

import { audioCueIds } from "../types/audio-foundation";

export const audioFoundationConfig = {
  runtime: {
    unlockPolicy: "first-user-gesture",
    graphOwnership: "single-shared-audio-context",
    settingsPersistence: "player-profile"
  },
  music: {
    engine: "strudel-web",
    mode: "procedural-reactive-bgm",
    startPolicy: "shell-load-play-after-unlock",
    shellTrack: "shell-attract-loop",
    gameplayTrack: "birds-arena-loop",
    licenseConstraint: "agpl-open-source-required"
  },
  soundEffects: {
    engine: "web-audio-api",
    synthesisStrategy: "typed-procedural-cues",
    cueIds: audioCueIds
  },
  defaultMix: AudioSettings.create().snapshot.mix
} as const;
