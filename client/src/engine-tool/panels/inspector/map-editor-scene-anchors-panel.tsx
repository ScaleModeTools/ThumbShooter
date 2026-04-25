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
import { MapEditorEditableNumberInput } from "@/engine-tool/components/map-editor-editable-number-input";
import type {
  MapEditorPlayerSpawnSelectionDraftSnapshot
} from "@/engine-tool/project/map-editor-project-player-spawn-selection";
import type {
  MapEditorPlayerSpawnDraftSnapshot,
  MapEditorSceneObjectDraftSnapshot
} from "@/engine-tool/project/map-editor-project-scene-drafts";

interface MapEditorSceneAnchorsPanelProps {
  readonly onUpdatePlayerSpawnSelection: (
    update: (
      draft: MapEditorPlayerSpawnSelectionDraftSnapshot
    ) => MapEditorPlayerSpawnSelectionDraftSnapshot
  ) => void;
  readonly onUpdatePlayerSpawn: (
    spawnId: string,
    update: (draft: MapEditorPlayerSpawnDraftSnapshot) => MapEditorPlayerSpawnDraftSnapshot
  ) => void;
  readonly onUpdateSceneObject: (
    objectId: string,
    update: (draft: MapEditorSceneObjectDraftSnapshot) => MapEditorSceneObjectDraftSnapshot
  ) => void;
  readonly playerSpawnDrafts: readonly MapEditorPlayerSpawnDraftSnapshot[];
  readonly playerSpawnSelectionDraft: MapEditorPlayerSpawnSelectionDraftSnapshot;
  readonly sceneObjectDrafts: readonly MapEditorSceneObjectDraftSnapshot[];
}

export function MapEditorSceneAnchorsPanel({
  onUpdatePlayerSpawnSelection,
  onUpdatePlayerSpawn,
  onUpdateSceneObject,
  playerSpawnDrafts,
  playerSpawnSelectionDraft,
  sceneObjectDrafts
}: MapEditorSceneAnchorsPanelProps) {
  if (playerSpawnDrafts.length === 0 && sceneObjectDrafts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
        No scene anchors are authored for this map yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/25 p-3">
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/70 p-3">
        <div>
          <p className="text-sm font-medium">Team Spawn Routing</p>
          <p className="text-xs text-muted-foreground">
            Home-team spawns stay preferred until enemies enter the authored
            avoidance radius.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="map-editor-spawn-enemy-radius">
              Enemy Avoidance Radius
            </Label>
            <MapEditorEditableNumberInput
              id="map-editor-spawn-enemy-radius"
              onValueChange={(nextValue) => {
                onUpdatePlayerSpawnSelection((draft) => ({
                  ...draft,
                  enemyAvoidanceRadiusMeters: Math.max(0, nextValue)
                }));
              }}
              value={playerSpawnSelectionDraft.enemyAvoidanceRadiusMeters}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="map-editor-spawn-home-bias">Home Team Bias</Label>
            <MapEditorEditableNumberInput
              id="map-editor-spawn-home-bias"
              onValueChange={(nextValue) => {
                onUpdatePlayerSpawnSelection((draft) => ({
                  ...draft,
                  homeTeamBiasMeters: Math.max(0, nextValue)
                }));
              }}
              value={playerSpawnSelectionDraft.homeTeamBiasMeters}
            />
          </div>
        </div>
      </div>

      {playerSpawnDrafts.map((spawnDraft) => (
        <div className="flex flex-col gap-3" key={spawnDraft.spawnId}>
          <div>
            <p className="text-sm font-medium">{spawnDraft.label}</p>
            <p className="text-xs text-muted-foreground">
              {spawnDraft.spawnId}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${spawnDraft.spawnId}-team`}>Home Team</Label>
              <Select
                onValueChange={(value) => {
                  onUpdatePlayerSpawn(spawnDraft.spawnId, (draft) => ({
                    ...draft,
                    teamId:
                      value === "red" || value === "blue" ? value : "neutral"
                  }));
                }}
                value={spawnDraft.teamId}
              >
                <SelectTrigger id={`${spawnDraft.spawnId}-team`}>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="red">Red Team</SelectItem>
                    <SelectItem value="blue">Blue Team</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${spawnDraft.spawnId}-yaw`}>Spawn Yaw</Label>
              <MapEditorEditableNumberInput
                id={`${spawnDraft.spawnId}-yaw`}
                onValueChange={(nextValue) => {
                  onUpdatePlayerSpawn(spawnDraft.spawnId, (draft) => ({
                    ...draft,
                    yawRadians: nextValue
                  }));
                }}
                value={spawnDraft.yawRadians}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${spawnDraft.spawnId}-x`}>Spawn X</Label>
              <MapEditorEditableNumberInput
                id={`${spawnDraft.spawnId}-x`}
                onValueChange={(nextValue) => {
                  onUpdatePlayerSpawn(spawnDraft.spawnId, (draft) => ({
                    ...draft,
                    position: {
                      ...draft.position,
                      x: nextValue
                    }
                  }));
                }}
                value={spawnDraft.position.x}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${spawnDraft.spawnId}-y`}>Spawn Y</Label>
              <MapEditorEditableNumberInput
                id={`${spawnDraft.spawnId}-y`}
                onValueChange={(nextValue) => {
                  onUpdatePlayerSpawn(spawnDraft.spawnId, (draft) => ({
                    ...draft,
                    position: {
                      ...draft.position,
                      y: nextValue
                    }
                  }));
                }}
                value={spawnDraft.position.y}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${spawnDraft.spawnId}-z`}>Spawn Z</Label>
              <MapEditorEditableNumberInput
                id={`${spawnDraft.spawnId}-z`}
                onValueChange={(nextValue) => {
                  onUpdatePlayerSpawn(spawnDraft.spawnId, (draft) => ({
                    ...draft,
                    position: {
                      ...draft.position,
                      z: nextValue
                    }
                  }));
                }}
                value={spawnDraft.position.z}
              />
            </div>
          </div>
        </div>
      ))}

      {playerSpawnDrafts.length > 0 && sceneObjectDrafts.length > 0 ? <Separator /> : null}

      {sceneObjectDrafts.map((sceneObjectDraft) => (
        <div className="flex flex-col gap-3" key={sceneObjectDraft.objectId}>
          <div>
            <p className="text-sm font-medium">{sceneObjectDraft.label}</p>
            <p className="text-xs text-muted-foreground">
              {sceneObjectDraft.launchTarget === null
                ? sceneObjectDraft.objectId
                : `Portal to ${sceneObjectDraft.launchTarget.experienceId}`}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${sceneObjectDraft.objectId}-x`}>Object X</Label>
              <MapEditorEditableNumberInput
                id={`${sceneObjectDraft.objectId}-x`}
                onValueChange={(nextValue) => {
                  onUpdateSceneObject(sceneObjectDraft.objectId, (draft) => ({
                    ...draft,
                    position: {
                      ...draft.position,
                      x: nextValue
                    }
                  }));
                }}
                value={sceneObjectDraft.position.x}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${sceneObjectDraft.objectId}-y`}>Object Y</Label>
              <MapEditorEditableNumberInput
                id={`${sceneObjectDraft.objectId}-y`}
                onValueChange={(nextValue) => {
                  onUpdateSceneObject(sceneObjectDraft.objectId, (draft) => ({
                    ...draft,
                    position: {
                      ...draft.position,
                      y: nextValue
                    }
                  }));
                }}
                value={sceneObjectDraft.position.y}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${sceneObjectDraft.objectId}-z`}>Object Z</Label>
              <MapEditorEditableNumberInput
                id={`${sceneObjectDraft.objectId}-z`}
                onValueChange={(nextValue) => {
                  onUpdateSceneObject(sceneObjectDraft.objectId, (draft) => ({
                    ...draft,
                    position: {
                      ...draft.position,
                      z: nextValue
                    }
                  }));
                }}
                value={sceneObjectDraft.position.z}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
