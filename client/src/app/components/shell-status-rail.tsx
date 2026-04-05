import type { StoredProfileHydrationResult } from "../../network";

import { MilestoneBoundariesCard } from "./milestone-boundaries-card";
import { ProfileSummaryCard } from "./profile-summary-card";

interface ShellStatusRailProps {
  readonly calibrationSampleCount: number;
  readonly hasAimCalibration: boolean;
  readonly hydrationSource: StoredProfileHydrationResult["source"];
  readonly reticleCatalogLabel: string;
  readonly username: string;
}

export function ShellStatusRail({
  calibrationSampleCount,
  hasAimCalibration,
  hydrationSource,
  reticleCatalogLabel,
  username
}: ShellStatusRailProps) {
  return (
    <aside className="grid gap-6">
      <ProfileSummaryCard
        calibrationSampleCount={calibrationSampleCount}
        hasAimCalibration={hasAimCalibration}
        hydrationSource={hydrationSource}
        reticleCatalogLabel={reticleCatalogLabel}
        username={username}
      />

      <MilestoneBoundariesCard />
    </aside>
  );
}
