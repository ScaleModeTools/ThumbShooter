import type { ReactNode } from "react";

import {
  listMetaverseGameplayProfiles
} from "@webgpu-metaverse/shared/metaverse/world";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  formatMapEditorColorHex,
  parseMapEditorColorHex,
  type MapEditorColorRgbTuple
} from "@/engine-tool/colors/map-editor-color-hex";
import { MapEditorEditableNumberInput } from "@/engine-tool/components/map-editor-editable-number-input";
import type { MapEditorProjectSnapshot } from "@/engine-tool/project/map-editor-project-state";
import { listMetaverseEnvironmentPresentationProfiles } from "@/metaverse/render/environment/profiles";

interface MapEditorWorldSettingsPanelProps {
  readonly onUpdateEnvironmentPresentation: (
    update: (
      environmentPresentation: MapEditorProjectSnapshot["environmentPresentation"]
    ) => MapEditorProjectSnapshot["environmentPresentation"]
  ) => void;
  readonly onUpdateEnvironmentPresentationProfileId: (
    environmentPresentationProfileId: string | null
  ) => void;
  readonly onUpdateGameplayProfileId?: (gameplayProfileId: string) => void;
  readonly project: MapEditorProjectSnapshot;
  readonly scope?: "all" | "atmosphere" | "sky" | "sun";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function SettingsSection({
  children,
  description,
  title
}: {
  readonly children: ReactNode;
  readonly description?: string;
  readonly title: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/45 p-3">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{title}</p>
        {description !== undefined ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function NumericField({
  decimals = 2,
  id,
  label,
  onValueChange,
  value
}: {
  readonly decimals?: number;
  readonly id: string;
  readonly label: string;
  readonly onValueChange: (value: number) => void;
  readonly value: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <MapEditorEditableNumberInput
        decimals={decimals}
        id={id}
        onValueChange={onValueChange}
        value={value}
      />
    </div>
  );
}

function ColorField({
  id,
  label,
  onValueChange,
  value
}: {
  readonly id: string;
  readonly label: string;
  readonly onValueChange: (value: MapEditorColorRgbTuple) => void;
  readonly value: MapEditorColorRgbTuple;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
        <Input
          className="h-10 w-16 cursor-pointer p-1"
          id={id}
          onChange={(event) => {
            onValueChange(parseMapEditorColorHex(event.target.value, value));
          }}
          type="color"
          value={formatMapEditorColorHex(value)}
        />
        <div
          className="flex h-10 items-center rounded-xl border border-border/70 px-3 text-xs text-muted-foreground"
          style={{ backgroundColor: formatMapEditorColorHex(value) }}
        >
          {formatMapEditorColorHex(value)}
        </div>
      </div>
    </div>
  );
}

export function MapEditorWorldSettingsPanel({
  onUpdateEnvironmentPresentation,
  onUpdateEnvironmentPresentationProfileId,
  onUpdateGameplayProfileId,
  project,
  scope = "all"
}: MapEditorWorldSettingsPanelProps) {
  const gameplayProfiles = listMetaverseGameplayProfiles();
  const environmentPresentationProfiles =
    listMetaverseEnvironmentPresentationProfiles();
  const selectedEnvironmentPresentationProfileId =
    project.environmentPresentationProfileId ?? "__custom__";
  const selectedEnvironmentPresetLabel =
    environmentPresentationProfiles.find(
      (profile) => profile.id === project.environmentPresentationProfileId
    )?.label ?? "Custom";
  const environment = project.environmentPresentation.environment;
  const profileControlsVisible = scope === "all";
  const sunControlsVisible = scope === "all" || scope === "sun";
  const skyControlsVisible = scope === "all" || scope === "sky";
  const atmosphereControlsVisible = scope === "all" || scope === "atmosphere";
  const exposureControlsVisible = sunControlsVisible || skyControlsVisible;

  const updateEnvironmentValue = <
    Key extends keyof MapEditorProjectSnapshot["environmentPresentation"]["environment"]
  >(
    key: Key,
    value: MapEditorProjectSnapshot["environmentPresentation"]["environment"][Key]
  ) => {
    onUpdateEnvironmentPresentation((currentEnvironmentPresentation) => ({
      ...currentEnvironmentPresentation,
      environment: {
        ...currentEnvironmentPresentation.environment,
        [key]: value
      }
    }));
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/25 p-3">
      {profileControlsVisible ? (
        <div className="grid gap-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">HUD</span>
          <span className="font-medium">{project.hudProfileId ?? "None"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Camera</span>
          <span className="font-medium">{project.cameraProfileId ?? "None"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Character</span>
          <span className="font-medium">
            {project.characterPresentationProfileId ?? "None"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Gameplay</span>
          <span className="font-medium">{project.gameplayProfileId}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Atmosphere</span>
          <span className="font-medium">{selectedEnvironmentPresetLabel}</span>
        </div>
        </div>
      ) : null}

      {profileControlsVisible ? <Separator /> : null}

      {profileControlsVisible ? (
        <>
          <div className="flex flex-col gap-3">
            {onUpdateGameplayProfileId === undefined ? null : (
              <>
                <Label htmlFor="map-editor-gameplay-profile-select">
                  Gameplay profile
                </Label>
                <Select
                  onValueChange={onUpdateGameplayProfileId}
                  value={project.gameplayProfileId}
                >
                  <SelectTrigger id="map-editor-gameplay-profile-select">
                    <SelectValue placeholder="Select gameplay profile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {gameplayProfiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </>
            )}

            <Label htmlFor="map-editor-environment-presentation-select">
              Atmosphere preset
            </Label>
            <Select
              onValueChange={(nextValue) => {
                onUpdateEnvironmentPresentationProfileId(
                  nextValue === "__custom__" ? null : nextValue
                );
              }}
              value={selectedEnvironmentPresentationProfileId}
            >
              <SelectTrigger id="map-editor-environment-presentation-select">
                <SelectValue placeholder="Select atmosphere preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="__custom__">Custom</SelectItem>
                  {environmentPresentationProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Separator />
        </>
      ) : null}

      {!profileControlsVisible && (skyControlsVisible || atmosphereControlsVisible) ? (
        <SettingsSection title="Preset">
          <Select
            onValueChange={(nextValue) => {
              onUpdateEnvironmentPresentationProfileId(
                nextValue === "__custom__" ? null : nextValue
              );
            }}
            value={selectedEnvironmentPresentationProfileId}
          >
            <SelectTrigger id={`map-editor-environment-${scope}-preset`}>
              <SelectValue placeholder="Select atmosphere preset" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="__custom__">Custom</SelectItem>
                {environmentPresentationProfiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </SettingsSection>
      ) : null}

      {exposureControlsVisible ? (
        <SettingsSection
        description="World exposure drives materials; sky exposure compensates the dome and clouds before tone mapping."
        title="Exposure Balance"
      >
        <div className="grid grid-cols-2 gap-3">
          {sunControlsVisible ? (
            <NumericField
              decimals={2}
              id="map-editor-atmosphere-exposure"
              label="World Exposure"
              onValueChange={(value) => {
                updateEnvironmentValue("toneMappingExposure", Math.max(0.05, value));
              }}
              value={environment.toneMappingExposure}
            />
          ) : null}
          <NumericField
            decimals={2}
            id="map-editor-atmosphere-sky-exposure"
            label="Sky Exposure"
            onValueChange={(value) => {
              updateEnvironmentValue("skyExposure", Math.max(0.05, value));
            }}
            value={environment.skyExposure}
          />
          <NumericField
            decimals={2}
            id="map-editor-atmosphere-sky-exposure-curve"
            label="Sky Curve"
            onValueChange={(value) => {
              updateEnvironmentValue("skyExposureCurve", clamp(value, 0, 4));
            }}
            value={environment.skyExposureCurve}
          />
        </div>
      </SettingsSection>
      ) : null}

      {sunControlsVisible ? (
        <SettingsSection
        description="Direct control over the authored scene sun."
        title="Sun"
      >
        <div className="grid grid-cols-2 gap-3">
          <ColorField
            id="map-editor-atmosphere-sun-color"
            label="Sun Color"
            onValueChange={(value) => {
              updateEnvironmentValue("sunColor", value);
            }}
            value={environment.sunColor}
          />
          <NumericField
            decimals={1}
            id="map-editor-atmosphere-sun-elevation"
            label="Sun Elevation"
            onValueChange={(value) => {
              updateEnvironmentValue("sunElevationDegrees", clamp(value, 0, 90));
            }}
            value={environment.sunElevationDegrees}
          />
          <NumericField
            decimals={1}
            id="map-editor-atmosphere-sun-azimuth"
            label="Sun Azimuth"
            onValueChange={(value) => {
              updateEnvironmentValue("sunAzimuthDegrees", value);
            }}
            value={environment.sunAzimuthDegrees}
          />
        </div>
      </SettingsSection>
      ) : null}

      {skyControlsVisible ? (
        <SettingsSection
        description="Coverage, density, height, and drift all affect how heavy the horizon reads."
        title="Clouds"
      >
        <div className="grid grid-cols-2 gap-3">
          <NumericField
            decimals={2}
            id="map-editor-atmosphere-cloud-coverage"
            label="Cloud Coverage"
            onValueChange={(value) => {
              updateEnvironmentValue("cloudCoverage", clamp(value, 0, 1));
            }}
            value={environment.cloudCoverage}
          />
          <NumericField
            decimals={2}
            id="map-editor-atmosphere-cloud-density"
            label="Cloud Density"
            onValueChange={(value) => {
              updateEnvironmentValue("cloudDensity", clamp(value, 0, 1));
            }}
            value={environment.cloudDensity}
          />
          <NumericField
            decimals={2}
            id="map-editor-atmosphere-cloud-elevation"
            label="Cloud Elevation"
            onValueChange={(value) => {
              updateEnvironmentValue("cloudElevation", clamp(value, 0, 1));
            }}
            value={environment.cloudElevation}
          />
          <NumericField
            decimals={5}
            id="map-editor-atmosphere-cloud-scale"
            label="Cloud Scale"
            onValueChange={(value) => {
              updateEnvironmentValue("cloudScale", Math.max(0.00001, value));
            }}
            value={environment.cloudScale}
          />
          <NumericField
            decimals={5}
            id="map-editor-atmosphere-cloud-speed"
            label="Cloud Drift"
            onValueChange={(value) => {
              updateEnvironmentValue("cloudSpeed", Math.max(0, value));
            }}
            value={environment.cloudSpeed}
          />
          <NumericField
            decimals={0}
            id="map-editor-atmosphere-dome-radius"
            label="Dome Radius"
            onValueChange={(value) => {
              updateEnvironmentValue("domeRadius", Math.max(64, value));
            }}
            value={environment.domeRadius}
          />
        </div>
      </SettingsSection>
      ) : null}

      {atmosphereControlsVisible ? (
        <SettingsSection
        description="Fog is optional. Leave it off unless the map actually needs distance compression."
        title="Fog"
      >
        <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-3">
          <Label
            className="flex min-w-0 flex-1 cursor-pointer flex-col gap-1"
            htmlFor="map-editor-atmosphere-fog-enabled"
          >
            <span className="text-sm font-medium">
              {environment.fogEnabled ? "Fog On" : "Fog Off"}
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              Turn this off for clear air while tuning sky, sun, and material
              response.
            </span>
          </Label>
          <Checkbox
            id="map-editor-atmosphere-fog-enabled"
            checked={environment.fogEnabled}
            onCheckedChange={(checked) => {
              updateEnvironmentValue("fogEnabled", checked === true);
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumericField
            decimals={4}
            id="map-editor-atmosphere-fog-density"
            label="Fog Density"
            onValueChange={(value) => {
              updateEnvironmentValue("fogDensity", Math.max(0, value));
            }}
            value={environment.fogDensity}
          />
          <ColorField
            id="map-editor-atmosphere-fog-color"
            label="Fog Color"
            onValueChange={(value) => {
              updateEnvironmentValue("fogColor", value);
            }}
            value={environment.fogColor}
          />
        </div>
      </SettingsSection>
      ) : null}

      {skyControlsVisible ? (
        <SettingsSection
        description="These controls own the horizon band and lower sky tint."
        title="Horizon & Lower Sky"
      >
        <div className="grid grid-cols-2 gap-3">
          <ColorField
            id="map-editor-atmosphere-horizon-color"
            label="Horizon Color"
            onValueChange={(value) => {
              updateEnvironmentValue("horizonColor", value);
            }}
            value={environment.horizonColor}
          />
          <ColorField
            id="map-editor-atmosphere-ground-color"
            label="Lower Sky Color"
            onValueChange={(value) => {
              updateEnvironmentValue("groundColor", value);
            }}
            value={environment.groundColor}
          />
          <NumericField
            decimals={2}
            id="map-editor-atmosphere-horizon-softness"
            label="Horizon Softness"
            onValueChange={(value) => {
              updateEnvironmentValue("horizonSoftness", clamp(value, 0.01, 1));
            }}
            value={environment.horizonSoftness}
          />
          <NumericField
            decimals={2}
            id="map-editor-atmosphere-ground-falloff"
            label="Lower Sky Falloff"
            onValueChange={(value) => {
              updateEnvironmentValue("groundFalloff", Math.max(0.1, value));
            }}
            value={environment.groundFalloff}
          />
        </div>
      </SettingsSection>
      ) : null}

      {atmosphereControlsVisible ? (
        <SettingsSection
        description="Atmospheric scattering controls the body of the sky, not just the cloud layer."
        title="Scattering"
      >
        <div className="grid grid-cols-2 gap-3">
          <NumericField
            decimals={2}
            id="map-editor-atmosphere-turbidity"
            label="Turbidity"
            onValueChange={(value) => {
              updateEnvironmentValue("turbidity", Math.max(0, value));
            }}
            value={environment.turbidity}
          />
          <NumericField
            decimals={2}
            id="map-editor-atmosphere-rayleigh"
            label="Rayleigh"
            onValueChange={(value) => {
              updateEnvironmentValue("rayleigh", Math.max(0, value));
            }}
            value={environment.rayleigh}
          />
          <NumericField
            decimals={4}
            id="map-editor-atmosphere-mie"
            label="Mie Coefficient"
            onValueChange={(value) => {
              updateEnvironmentValue("mieCoefficient", Math.max(0, value));
            }}
            value={environment.mieCoefficient}
          />
          <NumericField
            decimals={3}
            id="map-editor-atmosphere-mie-g"
            label="Mie Direction"
            onValueChange={(value) => {
              updateEnvironmentValue("mieDirectionalG", clamp(value, 0, 0.999));
            }}
            value={environment.mieDirectionalG}
          />
        </div>
      </SettingsSection>
      ) : null}
    </div>
  );
}
