import type { ReactNode } from "react";

import { ChevronDownIcon, FocusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  readSelectedMapEditorPlacement,
  type MapEditorConnectorDraftSnapshot,
  type MapEditorEdgeDraftSnapshot,
  type MapEditorPlacementDraftSnapshot,
  type MapEditorProjectSnapshot,
  type MapEditorRegionDraftSnapshot,
  type MapEditorSelectedEntityRef,
  type MapEditorSurfaceDraftSnapshot,
  type MapEditorTerrainChunkDraftSnapshot
} from "@/engine-tool/project/map-editor-project-state";
import type {
  MapEditorPlayerSpawnSelectionDraftSnapshot
} from "@/engine-tool/project/map-editor-project-player-spawn-selection";
import type {
  MapEditorPlayerSpawnDraftSnapshot,
  MapEditorSceneObjectDraftSnapshot,
  MapEditorWaterRegionDraftSnapshot
} from "@/engine-tool/project/map-editor-project-scene-drafts";
import {
  resolveMapEditorWaterRegionSize
} from "@/engine-tool/project/map-editor-project-scene-drafts";
import type { MapEditorPlacementUpdate } from "@/engine-tool/types/map-editor";
import { cn } from "@/lib/class-name";

import { MapEditorMetadataPanel } from "../panels/inspector/map-editor-metadata-panel";
import { MapEditorPresentationPanel } from "../panels/inspector/map-editor-presentation-panel";
import { MapEditorTransformPanel } from "../panels/inspector/map-editor-transform-panel";

function readNumberInput(value: string): number | null {
  const nextValue = Number(value);

  return Number.isFinite(nextValue) ? nextValue : null;
}

function Section({
  children,
  onOpenChange,
  open,
  sectionId,
  title
}: {
  readonly children: ReactNode;
  readonly onOpenChange: (sectionId: string, open: boolean) => void;
  readonly open: boolean;
  readonly sectionId: string;
  readonly title: string;
}) {
  return (
    <Collapsible
      onOpenChange={(nextOpen) => onOpenChange(sectionId, nextOpen)}
      open={open}
    >
      <CollapsibleTrigger asChild>
        <Button className="w-full justify-between px-2" type="button" variant="ghost">
          {title}
          <ChevronDownIcon
            className={cn("transition-transform", open ? "rotate-0" : "-rotate-90")}
            data-icon="inline-end"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function Vector3Fields({
  labelPrefix,
  onChange,
  value
}: {
  readonly labelPrefix: string;
  readonly onChange: (
    axis: "x" | "y" | "z",
    nextValue: number
  ) => void;
  readonly value: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {(["x", "y", "z"] as const).map((axis) => (
        <div className="flex flex-col gap-2" key={axis}>
          <Label htmlFor={`${labelPrefix}-${axis}`}>{labelPrefix} {axis.toUpperCase()}</Label>
          <Input
            id={`${labelPrefix}-${axis}`}
            onChange={(event) => {
              const nextValue = readNumberInput(event.target.value);

              if (nextValue !== null) {
                onChange(axis, nextValue);
              }
            }}
            value={value[axis].toFixed(2)}
          />
        </div>
      ))}
    </div>
  );
}

function SelectedModuleEditor({
  onDeleteSelectedEntityRequest,
  onSectionOpenChange,
  onUpdateSelectedPlacement,
  readSectionOpen,
  selectedPlacement
}: {
  readonly onDeleteSelectedEntityRequest: () => void;
  readonly onSectionOpenChange: (sectionId: string, open: boolean) => void;
  readonly onUpdateSelectedPlacement: (update: MapEditorPlacementUpdate) => void;
  readonly readSectionOpen: (sectionId: string, defaultOpen?: boolean) => boolean;
  readonly selectedPlacement: MapEditorPlacementDraftSnapshot;
}) {
  return (
    <>
      <Section
        onOpenChange={onSectionOpenChange}
        open={readSectionOpen("selection-pane:module:transform", true)}
        sectionId="selection-pane:module:transform"
        title="Transform"
      >
        <MapEditorTransformPanel
          onDeleteSelectedPlacementRequest={onDeleteSelectedEntityRequest}
          onUpdateSelectedPlacement={onUpdateSelectedPlacement}
          selectedPlacement={selectedPlacement}
        />
      </Section>

      <Section
        onOpenChange={onSectionOpenChange}
        open={readSectionOpen("selection-pane:module:presentation", true)}
        sectionId="selection-pane:module:presentation"
        title="Presentation"
      >
        <MapEditorPresentationPanel
          onUpdateSelectedPlacement={onUpdateSelectedPlacement}
          selectedPlacement={selectedPlacement}
        />
      </Section>

      <Section
        onOpenChange={onSectionOpenChange}
        open={readSectionOpen("selection-pane:module:metadata", true)}
        sectionId="selection-pane:module:metadata"
        title="Metadata"
      >
        <MapEditorMetadataPanel
          onUpdateSelectedPlacement={onUpdateSelectedPlacement}
          selectedPlacement={selectedPlacement}
        />
      </Section>
    </>
  );
}

function SelectionCard({
  children,
  title
}: {
  readonly children: ReactNode;
  readonly title: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/25 p-3">
      <div className="mb-3">
        <p className="text-sm font-medium">{title}</p>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

interface MapEditorSelectionPaneProps {
  readonly onDeleteSelectedEntityRequest: () => void;
  readonly onSectionOpenChange: (sectionId: string, open: boolean) => void;
  readonly onUpdateConnector: (
    connectorId: string,
    update: (draft: MapEditorConnectorDraftSnapshot) => MapEditorConnectorDraftSnapshot
  ) => void;
  readonly onUpdateEdge: (
    edgeId: string,
    update: (draft: MapEditorEdgeDraftSnapshot) => MapEditorEdgeDraftSnapshot
  ) => void;
  readonly onUpdatePlayerSpawn: (
    spawnId: string,
    update: (draft: MapEditorPlayerSpawnDraftSnapshot) => MapEditorPlayerSpawnDraftSnapshot
  ) => void;
  readonly onUpdatePlayerSpawnSelection: (
    update: (
      draft: MapEditorPlayerSpawnSelectionDraftSnapshot
    ) => MapEditorPlayerSpawnSelectionDraftSnapshot
  ) => void;
  readonly onUpdateRegion: (
    regionId: string,
    update: (draft: MapEditorRegionDraftSnapshot) => MapEditorRegionDraftSnapshot
  ) => void;
  readonly onUpdateSceneObject: (
    objectId: string,
    update: (draft: MapEditorSceneObjectDraftSnapshot) => MapEditorSceneObjectDraftSnapshot
  ) => void;
  readonly onUpdateSelectedPlacement: (update: MapEditorPlacementUpdate) => void;
  readonly onUpdateSurface: (
    surfaceId: string,
    update: (draft: MapEditorSurfaceDraftSnapshot) => MapEditorSurfaceDraftSnapshot
  ) => void;
  readonly onUpdateTerrainChunk: (
    chunkId: string,
    update: (
      draft: MapEditorTerrainChunkDraftSnapshot
    ) => MapEditorTerrainChunkDraftSnapshot
  ) => void;
  readonly onUpdateWaterRegion: (
    waterRegionId: string,
    update: (draft: MapEditorWaterRegionDraftSnapshot) => MapEditorWaterRegionDraftSnapshot
  ) => void;
  readonly project: MapEditorProjectSnapshot;
  readonly readSectionOpen: (sectionId: string, defaultOpen?: boolean) => boolean;
  readonly selectedEntityRef: MapEditorSelectedEntityRef | null;
}

export function MapEditorSelectionPane({
  onDeleteSelectedEntityRequest,
  onSectionOpenChange,
  onUpdateConnector,
  onUpdateEdge,
  onUpdatePlayerSpawn,
  onUpdatePlayerSpawnSelection,
  onUpdateRegion,
  onUpdateSceneObject,
  onUpdateSelectedPlacement,
  onUpdateSurface,
  onUpdateTerrainChunk,
  onUpdateWaterRegion,
  project,
  readSectionOpen,
  selectedEntityRef
}: MapEditorSelectionPaneProps) {
  const selectedPlacement = readSelectedMapEditorPlacement(project);
  const selectedPlayerSpawn =
    selectedEntityRef?.kind === "player-spawn"
      ? (project.playerSpawnDrafts.find(
          (spawnDraft) => spawnDraft.spawnId === selectedEntityRef.id
        ) ?? null)
      : null;
  const selectedSceneObject =
    selectedEntityRef?.kind === "scene-object"
      ? (project.sceneObjectDrafts.find(
          (sceneObjectDraft) => sceneObjectDraft.objectId === selectedEntityRef.id
        ) ?? null)
      : null;
  const selectedWaterRegion =
    selectedEntityRef?.kind === "water-region"
      ? (project.waterRegionDrafts.find(
          (waterRegionDraft) => waterRegionDraft.waterRegionId === selectedEntityRef.id
        ) ?? null)
      : null;
  const selectedRegion =
    selectedEntityRef?.kind === "region"
      ? (project.regionDrafts.find((region) => region.regionId === selectedEntityRef.id) ??
        null)
      : null;
  const selectedEdge =
    selectedEntityRef?.kind === "edge"
      ? (project.edgeDrafts.find((edge) => edge.edgeId === selectedEntityRef.id) ?? null)
      : null;
  const selectedConnector =
    selectedEntityRef?.kind === "connector"
      ? (project.connectorDrafts.find(
          (connector) => connector.connectorId === selectedEntityRef.id
        ) ?? null)
      : null;
  const selectedSurface =
    selectedEntityRef?.kind === "surface"
      ? (project.surfaceDrafts.find(
          (surface) => surface.surfaceId === selectedEntityRef.id
        ) ?? null)
      : null;
  const selectedTerrainChunk =
    selectedEntityRef?.kind === "terrain-chunk"
      ? (project.terrainChunkDrafts.find(
          (terrainChunk) => terrainChunk.chunkId === selectedEntityRef.id
        ) ?? null)
      : null;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background/84 backdrop-blur-sm">
      <div className="flex shrink-0 items-center gap-3 border-b border-border/70 px-4 py-3">
        <div className="flex size-9 items-center justify-center rounded-xl border border-border/70 bg-muted/70">
          <FocusIcon />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Selection
          </p>
          <h2 className="truncate font-heading text-lg font-semibold">
            {selectedEntityRef === null
              ? "No Scene Selection"
              : `${selectedEntityRef.kind} / ${selectedEntityRef.id}`}
          </h2>
        </div>
        {selectedEntityRef !== null ? (
          <Button
            onClick={onDeleteSelectedEntityRequest}
            type="button"
            variant="destructive"
          >
            <Trash2Icon data-icon="inline-start" />
            Delete
          </Button>
        ) : null}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 p-4">
          {selectedPlacement !== null ? (
            <SelectedModuleEditor
              onDeleteSelectedEntityRequest={onDeleteSelectedEntityRequest}
              onSectionOpenChange={onSectionOpenChange}
              onUpdateSelectedPlacement={onUpdateSelectedPlacement}
              readSectionOpen={readSectionOpen}
              selectedPlacement={selectedPlacement}
            />
          ) : null}

          {selectedPlayerSpawn !== null ? (
            <Section
              onOpenChange={onSectionOpenChange}
              open={readSectionOpen("selection-pane:player-spawn", true)}
              sectionId="selection-pane:player-spawn"
              title="Player Spawn"
            >
              <SelectionCard title="Player Spawn">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="selection-player-spawn-label">Label</Label>
                  <Input
                    id="selection-player-spawn-label"
                    onChange={(event) =>
                      onUpdatePlayerSpawn(selectedPlayerSpawn.spawnId, (draft) => ({
                        ...draft,
                        label: event.target.value
                      }))
                    }
                    value={selectedPlayerSpawn.label}
                  />
                </div>
                <Vector3Fields
                  labelPrefix="Spawn"
                  onChange={(axis, nextValue) =>
                    onUpdatePlayerSpawn(selectedPlayerSpawn.spawnId, (draft) => ({
                      ...draft,
                      position: {
                        ...draft.position,
                        [axis]: nextValue
                      }
                    }))
                  }
                  value={selectedPlayerSpawn.position}
                />
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="selection-player-spawn-yaw">Yaw</Label>
                    <Input
                      id="selection-player-spawn-yaw"
                      onChange={(event) => {
                        const nextValue = readNumberInput(event.target.value);

                        if (nextValue !== null) {
                          onUpdatePlayerSpawn(selectedPlayerSpawn.spawnId, (draft) => ({
                            ...draft,
                            yawRadians: nextValue
                          }));
                        }
                      }}
                      value={selectedPlayerSpawn.yawRadians.toFixed(2)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="selection-player-spawn-team">Team</Label>
                    <Input
                      id="selection-player-spawn-team"
                      onChange={(event) =>
                        onUpdatePlayerSpawn(selectedPlayerSpawn.spawnId, (draft) => ({
                          ...draft,
                          teamId:
                            event.target.value === "blue" ||
                            event.target.value === "red"
                              ? event.target.value
                              : "neutral"
                        }))
                      }
                      value={selectedPlayerSpawn.teamId}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="selection-player-spawn-bias">Home Bias</Label>
                    <Input
                      id="selection-player-spawn-bias"
                      onChange={(event) => {
                        const nextValue = readNumberInput(event.target.value);

                        if (nextValue !== null) {
                          onUpdatePlayerSpawnSelection((draft) => ({
                            ...draft,
                            homeTeamBiasMeters: Math.max(0, nextValue)
                          }));
                        }
                      }}
                      value={project.playerSpawnSelectionDraft.homeTeamBiasMeters.toFixed(2)}
                    />
                  </div>
                </div>
              </SelectionCard>
            </Section>
          ) : null}

          {selectedSceneObject !== null ? (
            <Section
              onOpenChange={onSectionOpenChange}
              open={readSectionOpen("selection-pane:scene-object", true)}
              sectionId="selection-pane:scene-object"
              title="Scene Object"
            >
              <SelectionCard title="Scene Object">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="selection-scene-object-label">Label</Label>
                  <Input
                    id="selection-scene-object-label"
                    onChange={(event) =>
                      onUpdateSceneObject(selectedSceneObject.objectId, (draft) => ({
                        ...draft,
                        label: event.target.value
                      }))
                    }
                    value={selectedSceneObject.label}
                  />
                </div>
                <Vector3Fields
                  labelPrefix="Object"
                  onChange={(axis, nextValue) =>
                    onUpdateSceneObject(selectedSceneObject.objectId, (draft) => ({
                      ...draft,
                      position: {
                        ...draft.position,
                        [axis]: nextValue
                      }
                    }))
                  }
                  value={selectedSceneObject.position}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="selection-scene-object-yaw">Yaw</Label>
                    <Input
                      id="selection-scene-object-yaw"
                      onChange={(event) => {
                        const nextValue = readNumberInput(event.target.value);

                        if (nextValue !== null) {
                          onUpdateSceneObject(selectedSceneObject.objectId, (draft) => ({
                            ...draft,
                            rotationYRadians: nextValue
                          }));
                        }
                      }}
                      value={selectedSceneObject.rotationYRadians.toFixed(2)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="selection-scene-object-scale">Scale</Label>
                    <Input
                      id="selection-scene-object-scale"
                      onChange={(event) => {
                        const nextValue = readNumberInput(event.target.value);

                        if (nextValue !== null) {
                          onUpdateSceneObject(selectedSceneObject.objectId, (draft) => ({
                            ...draft,
                            scale: Math.max(0.1, nextValue)
                          }));
                        }
                      }}
                      value={selectedSceneObject.scale.toFixed(2)}
                    />
                  </div>
                </div>
              </SelectionCard>
            </Section>
          ) : null}

          {selectedWaterRegion !== null ? (
            <Section
              onOpenChange={onSectionOpenChange}
              open={readSectionOpen("selection-pane:water-region", true)}
              sectionId="selection-pane:water-region"
              title="Water Region"
            >
              <SelectionCard title="Water Region">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="selection-water-center-x">Center X</Label>
                    <Input
                      id="selection-water-center-x"
                      onChange={(event) => {
                        const nextValue = readNumberInput(event.target.value);

                        if (nextValue !== null) {
                          onUpdateWaterRegion(selectedWaterRegion.waterRegionId, (draft) => ({
                            ...draft,
                            footprint: {
                              ...draft.footprint,
                              centerX: nextValue
                            }
                          }));
                        }
                      }}
                      value={selectedWaterRegion.footprint.centerX.toFixed(2)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="selection-water-center-z">Center Z</Label>
                    <Input
                      id="selection-water-center-z"
                      onChange={(event) => {
                        const nextValue = readNumberInput(event.target.value);

                        if (nextValue !== null) {
                          onUpdateWaterRegion(selectedWaterRegion.waterRegionId, (draft) => ({
                            ...draft,
                            footprint: {
                              ...draft.footprint,
                              centerZ: nextValue
                            }
                          }));
                        }
                      }}
                      value={selectedWaterRegion.footprint.centerZ.toFixed(2)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="selection-water-width">Width Cells</Label>
                    <Input
                      id="selection-water-width"
                      onChange={(event) => {
                        const nextValue = readNumberInput(event.target.value);

                        if (nextValue !== null) {
                          onUpdateWaterRegion(selectedWaterRegion.waterRegionId, (draft) => ({
                            ...draft,
                            footprint: {
                              ...draft.footprint,
                              sizeCellsX: Math.max(1, Math.round(nextValue))
                            }
                          }));
                        }
                      }}
                      value={String(selectedWaterRegion.footprint.sizeCellsX)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="selection-water-depth-cells">Length Cells</Label>
                    <Input
                      id="selection-water-depth-cells"
                      onChange={(event) => {
                        const nextValue = readNumberInput(event.target.value);

                        if (nextValue !== null) {
                          onUpdateWaterRegion(selectedWaterRegion.waterRegionId, (draft) => ({
                            ...draft,
                            footprint: {
                              ...draft.footprint,
                              sizeCellsZ: Math.max(1, Math.round(nextValue))
                            }
                          }));
                        }
                      }}
                      value={String(selectedWaterRegion.footprint.sizeCellsZ)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="selection-water-top">Top Elevation</Label>
                    <Input
                      id="selection-water-top"
                      onChange={(event) => {
                        const nextValue = readNumberInput(event.target.value);

                        if (nextValue !== null) {
                          onUpdateWaterRegion(selectedWaterRegion.waterRegionId, (draft) => ({
                            ...draft,
                            topElevationMeters: nextValue
                          }));
                        }
                      }}
                      value={selectedWaterRegion.topElevationMeters.toFixed(2)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="selection-water-depth">Depth</Label>
                    <Input
                      id="selection-water-depth"
                      onChange={(event) => {
                        const nextValue = readNumberInput(event.target.value);

                        if (nextValue !== null) {
                          onUpdateWaterRegion(selectedWaterRegion.waterRegionId, (draft) => ({
                            ...draft,
                            depthMeters: Math.max(0.5, nextValue)
                          }));
                        }
                      }}
                      value={selectedWaterRegion.depthMeters.toFixed(2)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Runtime size {resolveMapEditorWaterRegionSize(selectedWaterRegion).x.toFixed(1)} x{" "}
                  {resolveMapEditorWaterRegionSize(selectedWaterRegion).z.toFixed(1)}
                </p>
              </SelectionCard>
            </Section>
          ) : null}

          {selectedRegion !== null ? (
            <Section
              onOpenChange={onSectionOpenChange}
              open={readSectionOpen("selection-pane:region", true)}
              sectionId="selection-pane:region"
              title="Region"
            >
              <SelectionCard title="Region">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="selection-region-label">Label</Label>
                  <Input
                    id="selection-region-label"
                    onChange={(event) =>
                      onUpdateRegion(selectedRegion.regionId, (draft) => ({
                        ...draft,
                        label: event.target.value
                      }))
                    }
                    value={selectedRegion.label}
                  />
                </div>
                <Vector3Fields
                  labelPrefix="Center"
                  onChange={(axis, nextValue) =>
                    onUpdateRegion(selectedRegion.regionId, (draft) => ({
                      ...draft,
                      center: {
                        ...draft.center,
                        [axis]: nextValue
                      }
                    }))
                  }
                  value={selectedRegion.center}
                />
                <Vector3Fields
                  labelPrefix="Size"
                  onChange={(axis, nextValue) =>
                    onUpdateRegion(selectedRegion.regionId, (draft) => ({
                      ...draft,
                      size: {
                        ...draft.size,
                        [axis]: Math.max(0.5, nextValue)
                      }
                    }))
                  }
                  value={selectedRegion.size}
                />
              </SelectionCard>
            </Section>
          ) : null}

          {selectedEdge !== null ? (
            <Section
              onOpenChange={onSectionOpenChange}
              open={readSectionOpen("selection-pane:edge", true)}
              sectionId="selection-pane:edge"
              title="Edge"
            >
              <SelectionCard title="Edge">
                <Vector3Fields
                  labelPrefix="Center"
                  onChange={(axis, nextValue) =>
                    onUpdateEdge(selectedEdge.edgeId, (draft) => ({
                      ...draft,
                      center: {
                        ...draft.center,
                        [axis]: nextValue
                      }
                    }))
                  }
                  value={selectedEdge.center}
                />
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      id: "lengthMeters" as const,
                      label: "Length",
                      value: selectedEdge.lengthMeters
                    },
                    {
                      id: "heightMeters" as const,
                      label: "Height",
                      value: selectedEdge.heightMeters
                    },
                    {
                      id: "thicknessMeters" as const,
                      label: "Thickness",
                      value: selectedEdge.thicknessMeters
                    }
                  ].map((field) => (
                    <div className="flex flex-col gap-2" key={field.id}>
                      <Label htmlFor={`selection-edge-${field.id}`}>{field.label}</Label>
                      <Input
                        id={`selection-edge-${field.id}`}
                        onChange={(event) => {
                          const nextValue = readNumberInput(event.target.value);

                          if (nextValue !== null) {
                            onUpdateEdge(selectedEdge.edgeId, (draft) => ({
                              ...draft,
                              [field.id]: Math.max(0.25, nextValue)
                            }));
                          }
                        }}
                        value={field.value.toFixed(2)}
                      />
                    </div>
                  ))}
                </div>
              </SelectionCard>
            </Section>
          ) : null}

          {selectedConnector !== null ? (
            <Section
              onOpenChange={onSectionOpenChange}
              open={readSectionOpen("selection-pane:connector", true)}
              sectionId="selection-pane:connector"
              title="Connector"
            >
              <SelectionCard title="Connector">
                <Vector3Fields
                  labelPrefix="Center"
                  onChange={(axis, nextValue) =>
                    onUpdateConnector(selectedConnector.connectorId, (draft) => ({
                      ...draft,
                      center: {
                        ...draft.center,
                        [axis]: nextValue
                      }
                    }))
                  }
                  value={selectedConnector.center}
                />
                <Vector3Fields
                  labelPrefix="Size"
                  onChange={(axis, nextValue) =>
                    onUpdateConnector(selectedConnector.connectorId, (draft) => ({
                      ...draft,
                      size: {
                        ...draft.size,
                        [axis]: Math.max(0.25, nextValue)
                      }
                    }))
                  }
                  value={selectedConnector.size}
                />
              </SelectionCard>
            </Section>
          ) : null}

          {selectedSurface !== null ? (
            <Section
              onOpenChange={onSectionOpenChange}
              open={readSectionOpen("selection-pane:surface", true)}
              sectionId="selection-pane:surface"
              title="Surface"
            >
              <SelectionCard title="Surface">
                <Vector3Fields
                  labelPrefix="Center"
                  onChange={(axis, nextValue) =>
                    onUpdateSurface(selectedSurface.surfaceId, (draft) => ({
                      ...draft,
                      center: {
                        ...draft.center,
                        [axis]: nextValue
                      },
                      elevation: axis === "y" ? nextValue : draft.elevation
                    }))
                  }
                  value={selectedSurface.center}
                />
                <Vector3Fields
                  labelPrefix="Size"
                  onChange={(axis, nextValue) =>
                    onUpdateSurface(selectedSurface.surfaceId, (draft) => ({
                      ...draft,
                      size: {
                        ...draft.size,
                        [axis]: Math.max(0.25, nextValue)
                      }
                    }))
                  }
                  value={selectedSurface.size}
                />
              </SelectionCard>
            </Section>
          ) : null}

          {selectedTerrainChunk !== null ? (
            <Section
              onOpenChange={onSectionOpenChange}
              open={readSectionOpen("selection-pane:terrain-chunk", true)}
              sectionId="selection-pane:terrain-chunk"
              title="Terrain Chunk"
            >
              <SelectionCard title="Terrain Chunk">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="selection-terrain-samples-x">Samples X</Label>
                    <Input
                      id="selection-terrain-samples-x"
                      onChange={(event) => {
                        const nextValue = readNumberInput(event.target.value);

                        if (nextValue !== null) {
                          onUpdateTerrainChunk(selectedTerrainChunk.chunkId, (draft) => ({
                            ...draft,
                            sampleCountX: Math.max(1, Math.round(nextValue))
                          }));
                        }
                      }}
                      value={String(selectedTerrainChunk.sampleCountX)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="selection-terrain-samples-z">Samples Z</Label>
                    <Input
                      id="selection-terrain-samples-z"
                      onChange={(event) => {
                        const nextValue = readNumberInput(event.target.value);

                        if (nextValue !== null) {
                          onUpdateTerrainChunk(selectedTerrainChunk.chunkId, (draft) => ({
                            ...draft,
                            sampleCountZ: Math.max(1, Math.round(nextValue))
                          }));
                        }
                      }}
                      value={String(selectedTerrainChunk.sampleCountZ)}
                    />
                  </div>
                </div>
              </SelectionCard>
            </Section>
          ) : null}

          {selectedEntityRef === null ? (
            <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
              Pick something in the scene rail or the viewport to edit it here.
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}
