import { useDeferredValue, useMemo, useState, type ReactNode } from "react";

import {
  ChevronDownIcon,
  FolderTreeIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PlusCircleIcon
} from "lucide-react";

import type { EnvironmentAssetDescriptor } from "@/assets/types/environment-asset-manifest";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { groupMapEditorLibraryAssets } from "@/engine-tool/library/map-editor-library-asset-groups";
import type {
  MapEditorProjectSnapshot,
  MapEditorSelectedEntityRef
} from "@/engine-tool/project/map-editor-project-state";
import type { MapEditorViewportToolMode } from "@/engine-tool/types/map-editor";
import { cn } from "@/lib/class-name";

interface MapEditorSceneRailProps {
  readonly activeModuleAssetId: string | null;
  readonly activeViewportToolMode: MapEditorViewportToolMode;
  readonly assetCatalogEntries: readonly EnvironmentAssetDescriptor[];
  readonly collapsed: boolean;
  readonly onActivateModuleAssetId: (assetId: string) => void;
  readonly onActivateViewportToolMode: (
    viewportToolMode: MapEditorViewportToolMode
  ) => void;
  readonly onAddConnector: () => void;
  readonly onAddEdge: () => void;
  readonly onAddModuleFromAsset: (asset: EnvironmentAssetDescriptor) => void;
  readonly onAddPlayerSpawn: () => void;
  readonly onAddRegion: () => void;
  readonly onAddSceneObject: () => void;
  readonly onAddSurface: () => void;
  readonly onCollapsedChange: (collapsed: boolean) => void;
  readonly onSectionOpenChange: (sectionId: string, open: boolean) => void;
  readonly onSelectEntityRef: (
    entityRef: MapEditorSelectedEntityRef | null
  ) => void;
  readonly project: MapEditorProjectSnapshot;
  readonly readSectionOpen: (sectionId: string, defaultOpen?: boolean) => boolean;
  readonly selectedEntityRef: MapEditorSelectedEntityRef | null;
}

function matchesSearch(
  searchQuery: string,
  ...values: (string | null | undefined)[]
): boolean {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (normalizedQuery.length === 0) {
    return true;
  }

  return values.some((value) => value?.toLowerCase().includes(normalizedQuery) === true);
}

function Section({
  badge,
  children,
  onOpenChange,
  open,
  sectionId,
  title
}: {
  readonly badge?: ReactNode;
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
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">{title}</span>
            {badge}
          </span>
          <ChevronDownIcon
            className={cn("shrink-0 transition-transform", open ? "rotate-0" : "-rotate-90")}
            data-icon="inline-end"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function OutlinerButton({
  active,
  description,
  onClick,
  title
}: {
  readonly active: boolean;
  readonly description: string;
  readonly onClick: () => void;
  readonly title: string;
}) {
  return (
    <button
      className={cn(
        "flex w-full flex-col rounded-lg border px-2.5 py-2 text-left transition-colors",
        active
          ? "border-sky-400/60 bg-sky-500/8"
          : "border-border/70 bg-muted/20 hover:bg-muted/45"
      )}
      onClick={onClick}
      type="button"
    >
      <span className="truncate text-sm font-medium">{title}</span>
      <span className="truncate text-xs text-muted-foreground">{description}</span>
    </button>
  );
}

function ModuleLibrarySection({
  activeModuleAssetId,
  assets,
  onActivateModuleAssetId,
  onAddModuleFromAsset,
  onOpenChange,
  open,
  sectionId,
  title
}: {
  readonly activeModuleAssetId: string | null;
  readonly assets: readonly EnvironmentAssetDescriptor[];
  readonly onActivateModuleAssetId: (assetId: string) => void;
  readonly onAddModuleFromAsset: (asset: EnvironmentAssetDescriptor) => void;
  readonly onOpenChange: (sectionId: string, open: boolean) => void;
  readonly open: boolean;
  readonly sectionId: string;
  readonly title: string;
}) {
  if (assets.length === 0) {
    return null;
  }

  return (
    <Section
      badge={<Badge variant="outline">{assets.length}</Badge>}
      onOpenChange={onOpenChange}
      open={open}
      sectionId={sectionId}
      title={title}
    >
      <div className="flex flex-col gap-2">
        {assets.map((asset) => {
          const isActive = activeModuleAssetId === asset.id;

          return (
            <div
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border px-2.5 py-2",
                isActive
                  ? "border-sky-400/60 bg-sky-500/8"
                  : "border-border/70 bg-background/65"
              )}
              key={asset.id}
            >
              <button
                className="min-w-0 text-left"
                onClick={() => onActivateModuleAssetId(asset.id)}
                type="button"
              >
                <div className="truncate text-sm font-medium">{asset.label}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {asset.id} · {asset.placement}
                </div>
              </button>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => onActivateModuleAssetId(asset.id)}
                  size="sm"
                  type="button"
                  variant={isActive ? "default" : "secondary"}
                >
                  Arm
                </Button>
                <Button
                  onClick={() => onAddModuleFromAsset(asset)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Add
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function ToolButton({
  active,
  label,
  onClick
}: {
  readonly active: boolean;
  readonly label: string;
  readonly onClick: () => void;
}) {
  return (
    <Button onClick={onClick} type="button" variant={active ? "default" : "outline"}>
      {label}
    </Button>
  );
}

export function MapEditorSceneRail({
  activeModuleAssetId,
  activeViewportToolMode,
  assetCatalogEntries,
  collapsed,
  onActivateModuleAssetId,
  onActivateViewportToolMode,
  onAddConnector,
  onAddEdge,
  onAddModuleFromAsset,
  onAddPlayerSpawn,
  onAddRegion,
  onAddSceneObject,
  onAddSurface,
  onCollapsedChange,
  onSectionOpenChange,
  onSelectEntityRef,
  project,
  readSectionOpen,
  selectedEntityRef
}: MapEditorSceneRailProps) {
  const [moduleSearchQuery, setModuleSearchQuery] = useState("");
  const [outlinerSearchQuery, setOutlinerSearchQuery] = useState("");
  const deferredModuleSearchQuery = useDeferredValue(moduleSearchQuery);
  const deferredOutlinerSearchQuery = useDeferredValue(outlinerSearchQuery);
  const groupedAssets = useMemo(
    () => groupMapEditorLibraryAssets(assetCatalogEntries),
    [assetCatalogEntries]
  );
  const filteredPropAssets = useMemo(
    () =>
      groupedAssets.props.filter((asset) =>
        matchesSearch(
          deferredModuleSearchQuery,
          asset.id,
          asset.label,
          asset.placement,
          asset.traversalAffordance
        )
      ),
    [deferredModuleSearchQuery, groupedAssets.props]
  );
  const filteredVehicleAssets = useMemo(
    () =>
      groupedAssets.vehicles.filter((asset) =>
        matchesSearch(
          deferredModuleSearchQuery,
          asset.id,
          asset.label,
          asset.placement,
          asset.traversalAffordance
        )
      ),
    [deferredModuleSearchQuery, groupedAssets.vehicles]
  );

  if (collapsed) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center gap-3 bg-background/84 px-2 py-3 backdrop-blur-sm">
        <Button
          onClick={() => onCollapsedChange(false)}
          size="icon"
          type="button"
          variant="outline"
        >
          <PanelLeftOpenIcon />
        </Button>
        <div className="pt-6 text-[11px] uppercase tracking-[0.24em] text-muted-foreground [writing-mode:vertical-rl]">
          Scene
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background/84 backdrop-blur-sm">
      <div className="flex shrink-0 items-center gap-3 border-b border-border/70 px-4 py-3">
        <div className="flex size-9 items-center justify-center rounded-xl border border-border/70 bg-muted/70">
          <FolderTreeIcon />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Scene
          </p>
          <h2 className="truncate font-heading text-lg font-semibold">
            Dense Outliner And Builder
          </h2>
        </div>
        <Button
          onClick={() => onCollapsedChange(true)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <PanelLeftCloseIcon />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 p-4">
          <Section
            onOpenChange={onSectionOpenChange}
            open={readSectionOpen("scene-rail:create", true)}
            sectionId="scene-rail:create"
            title="Create"
          >
            <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/25 p-3">
              <div className="flex flex-col gap-2">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Builder Tools
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <ToolButton
                    active={activeViewportToolMode === "terrain"}
                    label="Terrain"
                    onClick={() => onActivateViewportToolMode("terrain")}
                  />
                  <ToolButton
                    active={activeViewportToolMode === "wall"}
                    label="Wall"
                    onClick={() => onActivateViewportToolMode("wall")}
                  />
                  <ToolButton
                    active={activeViewportToolMode === "path"}
                    label="Path"
                    onClick={() => onActivateViewportToolMode("path")}
                  />
                  <ToolButton
                    active={activeViewportToolMode === "water"}
                    label="Water"
                    onClick={() => onActivateViewportToolMode("water")}
                  />
                  <ToolButton
                    active={activeViewportToolMode === "module"}
                    label="Module"
                    onClick={() => onActivateViewportToolMode("module")}
                  />
                  <ToolButton
                    active={activeViewportToolMode === "select"}
                    label="Select"
                    onClick={() => onActivateViewportToolMode("select")}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Gameplay Anchors
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={onAddPlayerSpawn} type="button" variant="outline">
                    <PlusCircleIcon data-icon="inline-start" />
                    Spawn
                  </Button>
                  <Button onClick={onAddSceneObject} type="button" variant="outline">
                    <PlusCircleIcon data-icon="inline-start" />
                    Launch Object
                  </Button>
                </div>
              </div>

              <Section
                onOpenChange={onSectionOpenChange}
                open={readSectionOpen("scene-rail:create:advanced", false)}
                sectionId="scene-rail:create:advanced"
                title="Advanced Semantics"
              >
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={onAddSurface} type="button" variant="outline">
                    <PlusCircleIcon data-icon="inline-start" />
                    Surface
                  </Button>
                  <Button onClick={onAddRegion} type="button" variant="outline">
                    <PlusCircleIcon data-icon="inline-start" />
                    Region
                  </Button>
                  <Button onClick={onAddEdge} type="button" variant="outline">
                    <PlusCircleIcon data-icon="inline-start" />
                    Edge
                  </Button>
                  <Button onClick={onAddConnector} type="button" variant="outline">
                    <PlusCircleIcon data-icon="inline-start" />
                    Connector
                  </Button>
                </div>
              </Section>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Module Browser</p>
                <Input
                  onChange={(event) => setModuleSearchQuery(event.target.value)}
                  placeholder="Search props, vehicles, ids..."
                  value={moduleSearchQuery}
                />
              </div>

              <ModuleLibrarySection
                activeModuleAssetId={activeModuleAssetId}
                assets={filteredPropAssets}
                onActivateModuleAssetId={onActivateModuleAssetId}
                onAddModuleFromAsset={onAddModuleFromAsset}
                onOpenChange={onSectionOpenChange}
                open={readSectionOpen("scene-rail:create:props", false)}
                sectionId="scene-rail:create:props"
                title="Props"
              />
              <ModuleLibrarySection
                activeModuleAssetId={activeModuleAssetId}
                assets={filteredVehicleAssets}
                onActivateModuleAssetId={onActivateModuleAssetId}
                onAddModuleFromAsset={onAddModuleFromAsset}
                onOpenChange={onSectionOpenChange}
                open={readSectionOpen("scene-rail:create:vehicles", false)}
                sectionId="scene-rail:create:vehicles"
                title="Vehicles"
              />
            </div>
          </Section>

          <Section
            onOpenChange={onSectionOpenChange}
            open={readSectionOpen("scene-rail:outliner", true)}
            sectionId="scene-rail:outliner"
            title="Outliner"
          >
            <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/25 p-3">
              <Input
                onChange={(event) => setOutlinerSearchQuery(event.target.value)}
                placeholder="Filter scene elements..."
                value={outlinerSearchQuery}
              />

              <Section
                badge={<Badge variant="outline">{project.terrainChunkDrafts.length}</Badge>}
                onOpenChange={onSectionOpenChange}
                open={readSectionOpen("scene-rail:outliner:terrain", true)}
                sectionId="scene-rail:outliner:terrain"
                title="Terrain"
              >
                <div className="flex flex-col gap-2">
                  {project.terrainChunkDrafts
                    .filter((terrainChunk) =>
                      matchesSearch(
                        deferredOutlinerSearchQuery,
                        terrainChunk.chunkId,
                        terrainChunk.label
                      )
                    )
                    .map((terrainChunk) => (
                      <OutlinerButton
                        active={
                          selectedEntityRef?.kind === "terrain-chunk" &&
                          selectedEntityRef.id === terrainChunk.chunkId
                        }
                        description={terrainChunk.chunkId}
                        key={terrainChunk.chunkId}
                        onClick={() =>
                          onSelectEntityRef(
                            Object.freeze({
                              id: terrainChunk.chunkId,
                              kind: "terrain-chunk"
                            })
                          )
                        }
                        title={terrainChunk.label}
                      />
                    ))}
                </div>
              </Section>

              <Section
                badge={<Badge variant="outline">{project.regionDrafts.length}</Badge>}
                onOpenChange={onSectionOpenChange}
                open={readSectionOpen("scene-rail:outliner:floors-paths", true)}
                sectionId="scene-rail:outliner:floors-paths"
                title="Floors & Paths"
              >
                <div className="flex flex-col gap-2">
                  {project.regionDrafts
                    .filter((region) =>
                      matchesSearch(
                        deferredOutlinerSearchQuery,
                        region.regionId,
                        region.label,
                        region.regionKind
                      )
                    )
                    .map((region) => (
                      <OutlinerButton
                        active={
                          selectedEntityRef?.kind === "region" &&
                          selectedEntityRef.id === region.regionId
                        }
                        description={`${region.regionKind} · ${region.regionId}`}
                        key={region.regionId}
                        onClick={() =>
                          onSelectEntityRef(
                            Object.freeze({
                              id: region.regionId,
                              kind: "region"
                            })
                          )
                        }
                        title={region.label}
                      />
                    ))}
                </div>
              </Section>

              <Section
                badge={<Badge variant="outline">{project.edgeDrafts.length}</Badge>}
                onOpenChange={onSectionOpenChange}
                open={readSectionOpen("scene-rail:outliner:walls-boundaries", true)}
                sectionId="scene-rail:outliner:walls-boundaries"
                title="Walls & Boundaries"
              >
                <div className="flex flex-col gap-2">
                  {project.edgeDrafts
                    .filter((edge) =>
                      matchesSearch(
                        deferredOutlinerSearchQuery,
                        edge.edgeId,
                        edge.label,
                        edge.edgeKind
                      )
                    )
                    .map((edge) => (
                      <OutlinerButton
                        active={
                          selectedEntityRef?.kind === "edge" &&
                          selectedEntityRef.id === edge.edgeId
                        }
                        description={`${edge.edgeKind} · ${edge.edgeId}`}
                        key={edge.edgeId}
                        onClick={() =>
                          onSelectEntityRef(
                            Object.freeze({
                              id: edge.edgeId,
                              kind: "edge"
                            })
                          )
                        }
                        title={edge.label}
                      />
                    ))}
                </div>
              </Section>

              <Section
                badge={<Badge variant="outline">{project.connectorDrafts.length}</Badge>}
                onOpenChange={onSectionOpenChange}
                open={readSectionOpen("scene-rail:outliner:connectors", false)}
                sectionId="scene-rail:outliner:connectors"
                title="Connectors"
              >
                <div className="flex flex-col gap-2">
                  {project.connectorDrafts
                    .filter((connector) =>
                      matchesSearch(
                        deferredOutlinerSearchQuery,
                        connector.connectorId,
                        connector.label,
                        connector.connectorKind
                      )
                    )
                    .map((connector) => (
                      <OutlinerButton
                        active={
                          selectedEntityRef?.kind === "connector" &&
                          selectedEntityRef.id === connector.connectorId
                        }
                        description={`${connector.connectorKind} · ${connector.connectorId}`}
                        key={connector.connectorId}
                        onClick={() =>
                          onSelectEntityRef(
                            Object.freeze({
                              id: connector.connectorId,
                              kind: "connector"
                            })
                          )
                        }
                        title={connector.label}
                      />
                    ))}
                </div>
              </Section>

              <Section
                badge={<Badge variant="outline">{project.placementDrafts.length}</Badge>}
                onOpenChange={onSectionOpenChange}
                open={readSectionOpen("scene-rail:outliner:modules", true)}
                sectionId="scene-rail:outliner:modules"
                title="Modules"
              >
                <div className="flex flex-col gap-2">
                  {project.placementDrafts
                    .filter((placement) =>
                      matchesSearch(
                        deferredOutlinerSearchQuery,
                        placement.placementId,
                        placement.assetId
                      )
                    )
                    .map((placement) => (
                      <OutlinerButton
                        active={
                          selectedEntityRef?.kind === "module" &&
                          selectedEntityRef.id === placement.placementId
                        }
                        description={placement.placementId}
                        key={placement.placementId}
                        onClick={() =>
                          onSelectEntityRef(
                            Object.freeze({
                              id: placement.placementId,
                              kind: "module"
                            })
                          )
                        }
                        title={placement.assetId}
                      />
                    ))}
                </div>
              </Section>

              <Section
                badge={
                  <Badge variant="outline">
                    {project.playerSpawnDrafts.length + project.sceneObjectDrafts.length}
                  </Badge>
                }
                onOpenChange={onSectionOpenChange}
                open={readSectionOpen("scene-rail:outliner:anchors", true)}
                sectionId="scene-rail:outliner:anchors"
                title="Gameplay Anchors"
              >
                <div className="flex flex-col gap-2">
                  {project.playerSpawnDrafts
                    .filter((spawn) =>
                      matchesSearch(
                        deferredOutlinerSearchQuery,
                        spawn.spawnId,
                        spawn.label,
                        spawn.teamId
                      )
                    )
                    .map((spawn) => (
                      <OutlinerButton
                        active={
                          selectedEntityRef?.kind === "player-spawn" &&
                          selectedEntityRef.id === spawn.spawnId
                        }
                        description={`${spawn.teamId} · ${spawn.spawnId}`}
                        key={spawn.spawnId}
                        onClick={() =>
                          onSelectEntityRef(
                            Object.freeze({
                              id: spawn.spawnId,
                              kind: "player-spawn"
                            })
                          )
                        }
                        title={spawn.label}
                      />
                    ))}
                  {project.sceneObjectDrafts
                    .filter((sceneObject) =>
                      matchesSearch(
                        deferredOutlinerSearchQuery,
                        sceneObject.objectId,
                        sceneObject.label,
                        sceneObject.launchTarget?.experienceId
                      )
                    )
                    .map((sceneObject) => (
                      <OutlinerButton
                        active={
                          selectedEntityRef?.kind === "scene-object" &&
                          selectedEntityRef.id === sceneObject.objectId
                        }
                        description={sceneObject.objectId}
                        key={sceneObject.objectId}
                        onClick={() =>
                          onSelectEntityRef(
                            Object.freeze({
                              id: sceneObject.objectId,
                              kind: "scene-object"
                            })
                          )
                        }
                        title={sceneObject.label}
                      />
                    ))}
                </div>
              </Section>

              <Section
                badge={<Badge variant="outline">{project.waterRegionDrafts.length}</Badge>}
                onOpenChange={onSectionOpenChange}
                open={readSectionOpen("scene-rail:outliner:water", false)}
                sectionId="scene-rail:outliner:water"
                title="Water"
              >
                <div className="flex flex-col gap-2">
                  {project.waterRegionDrafts
                    .filter((waterRegion) =>
                      matchesSearch(
                        deferredOutlinerSearchQuery,
                        waterRegion.waterRegionId,
                        waterRegion.previewColorHex
                      )
                    )
                    .map((waterRegion) => (
                      <OutlinerButton
                        active={
                          selectedEntityRef?.kind === "water-region" &&
                          selectedEntityRef.id === waterRegion.waterRegionId
                        }
                        description={`${waterRegion.footprint.sizeCellsX}x${waterRegion.footprint.sizeCellsZ} cells`}
                        key={waterRegion.waterRegionId}
                        onClick={() =>
                          onSelectEntityRef(
                            Object.freeze({
                              id: waterRegion.waterRegionId,
                              kind: "water-region"
                            })
                          )
                        }
                        title={`Water ${waterRegion.waterRegionId}`}
                      />
                    ))}
                </div>
              </Section>

              <Section
                badge={<Badge variant="outline">{project.surfaceDrafts.length}</Badge>}
                onOpenChange={onSectionOpenChange}
                open={readSectionOpen("scene-rail:outliner:advanced", false)}
                sectionId="scene-rail:outliner:advanced"
                title="Advanced Semantics"
              >
                <div className="flex flex-col gap-2">
                  {project.surfaceDrafts
                    .filter((surface) =>
                      matchesSearch(
                        deferredOutlinerSearchQuery,
                        surface.surfaceId,
                        surface.label,
                        surface.kind
                      )
                    )
                    .map((surface) => (
                      <OutlinerButton
                        active={
                          selectedEntityRef?.kind === "surface" &&
                          selectedEntityRef.id === surface.surfaceId
                        }
                        description={`${surface.kind} · ${surface.surfaceId}`}
                        key={surface.surfaceId}
                        onClick={() =>
                          onSelectEntityRef(
                            Object.freeze({
                              id: surface.surfaceId,
                              kind: "surface"
                            })
                          )
                        }
                        title={surface.label}
                      />
                    ))}
                </div>
              </Section>
            </div>
          </Section>
        </div>
      </ScrollArea>
    </div>
  );
}
