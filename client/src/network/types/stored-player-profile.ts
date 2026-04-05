import type {
  CalibrationShotSample,
  PlayerProfile,
  PlayerProfileSnapshot,
  Username
} from "@thumbshooter/shared";

import type { CalibrationRecordVersion } from "./profile-storage";

export interface StoredPlayerProfileRecord {
  readonly username: Username;
  readonly selectedReticleId: PlayerProfileSnapshot["selectedReticleId"];
  readonly audioSettings: PlayerProfileSnapshot["audioSettings"];
}

export interface StoredCalibrationRecord {
  readonly version: CalibrationRecordVersion;
  readonly aimCalibration: PlayerProfileSnapshot["aimCalibration"];
  readonly calibrationSamples: readonly CalibrationShotSample[];
}

export interface StoredProfileHydrationResult {
  readonly profile: PlayerProfile | null;
  readonly source: "empty" | "username-only" | "profile-record";
}
