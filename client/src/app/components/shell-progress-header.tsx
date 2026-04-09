import { Badge } from "@/components/ui/badge";

interface ShellProgressHeaderProps {
  readonly audioStatusLabel: string;
  readonly capabilityReasonLabel: string;
  readonly musicVolumeLabel: string;
  readonly runtimeLocks: readonly string[];
  readonly sfxVolumeLabel: string;
}

export function ShellProgressHeader({
  audioStatusLabel,
  capabilityReasonLabel,
  musicVolumeLabel,
  runtimeLocks,
  sfxVolumeLabel
}: ShellProgressHeaderProps) {
  return (
    <header className="rounded-[2rem] border border-border/70 bg-card/82 p-6 shadow-[0_24px_80px_rgb(15_23_42_/_0.14)] backdrop-blur-xl">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-2">
          <Badge>Local arena gameplay live</Badge>
          <Badge variant="secondary">Mouse starts immediately</Badge>
          <Badge variant="secondary">Camera setup optional</Badge>
          <Badge variant="outline">WebGPU required</Badge>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="type-kicker">
                ThumbShooter
              </p>
              <h1 className="type-display max-w-4xl">
                Login confirms your local profile, then the main menu handles
                input choice and gameplay launch.
              </h1>
              <p className="type-lead max-w-3xl">
                Mouse players can enter the arena without touching webcam
                permissions. Thumb-shooter setup stays available from the menu
                when you want worker tracking, webcam permission, and nine-point
                calibration.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {runtimeLocks.map((runtimeLock) => (
                <Badge key={runtimeLock} variant="secondary">
                  {runtimeLock}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid gap-3 rounded-[1.5rem] border border-border/70 bg-muted/35 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="type-label">Session state</p>
              <Badge variant="outline">{audioStatusLabel}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-3">
                <p className="type-caption">
                  Music
                </p>
                <p className="type-metric mt-2">{musicVolumeLabel}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-3">
                <p className="type-caption">
                  SFX
                </p>
                <p className="type-metric mt-2">{sfxVolumeLabel}</p>
              </div>
            </div>
            <div className="type-body-muted rounded-xl border border-border/70 bg-background/70 px-3 py-3">
              Capability: {capabilityReasonLabel}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
