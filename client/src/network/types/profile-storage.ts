export type ProfileStorageNamespace = "thumbshooter.profile";

export type ProfileStorageSegment = "username" | "record" | "calibration";

export type ProfileStorageKey<TSegment extends ProfileStorageSegment> =
  `${ProfileStorageNamespace}.${TSegment}`;

export interface ProfileStoragePlan {
  readonly usernameStorageKey: ProfileStorageKey<"username">;
  readonly profileStorageKey: ProfileStorageKey<"record">;
  readonly calibrationStorageKey: ProfileStorageKey<"calibration">;
}
