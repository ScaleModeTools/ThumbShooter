import type { ProfileStoragePlan } from "../types/profile-storage";

export const profileStoragePlan = {
  usernameStorageKey: "thumbshooter.profile.username",
  profileStorageKey: "thumbshooter.profile.record",
  calibrationStorageKey: "thumbshooter.profile.calibration",
  calibrationRecordVersion: 1
} as const satisfies ProfileStoragePlan;
