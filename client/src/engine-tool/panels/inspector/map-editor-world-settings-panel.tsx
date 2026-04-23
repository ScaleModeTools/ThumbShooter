import {
  listMetaverseGameplayProfiles
} from "@webgpu-metaverse/shared/metaverse/world";

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
import type { MapEditorProjectSnapshot } from "@/engine-tool/project/map-editor-project-state";
import { listMetaverseEnvironmentPresentationProfiles } from "@/metaverse/render/environment/profiles";

interface MapEditorWorldSettingsPanelProps {
  readonly onUpdateEnvironmentPresentationProfileId: (
    environmentPresentationProfileId: string | null
  ) => void;
  readonly onUpdateGameplayProfileId: (gameplayProfileId: string) => void;
  readonly project: MapEditorProjectSnapshot;
}

export function MapEditorWorldSettingsPanel({
  onUpdateEnvironmentPresentationProfileId,
  onUpdateGameplayProfileId,
  project
}: MapEditorWorldSettingsPanelProps) {
  const gameplayProfiles = listMetaverseGameplayProfiles();
  const environmentPresentationProfiles =
    listMetaverseEnvironmentPresentationProfiles();
  const selectedEnvironmentPresentationProfileId =
    project.environmentPresentationProfileId ?? "__none__";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/25 p-3">
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
          <span className="text-muted-foreground">Environment</span>
          <span className="font-medium">
            {project.environmentPresentationProfileId ?? "None"}
          </span>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
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

        <Separator />

        <Label htmlFor="map-editor-environment-presentation-select">
          Environment presentation
        </Label>
        <Select
          onValueChange={(nextValue) => {
            onUpdateEnvironmentPresentationProfileId(
              nextValue === "__none__" ? null : nextValue
            );
          }}
          value={selectedEnvironmentPresentationProfileId}
        >
          <SelectTrigger id="map-editor-environment-presentation-select">
            <SelectValue placeholder="Select environment presentation" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="__none__">None</SelectItem>
              {environmentPresentationProfiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
