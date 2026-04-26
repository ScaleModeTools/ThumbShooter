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
import { MapEditorSceneOutlinerPanel } from "@/engine-tool/panels/scene-explorer/map-editor-scene-outliner-panel";
import type {
  MapEditorProjectSnapshot,
  MapEditorSelectedEntityRef
} from "@/engine-tool/project/map-editor-project-state";
import type {
  MapEditorSceneVisibilityLayerId,
  MapEditorSceneVisibilitySnapshot,
  MapEditorViewportToolMode
} from "@/engine-tool/types/map-editor";
import { composeMapEditorLayoutClassName } from "./map-editor-layout-class-name";

interface MapEditorSceneRailProps {
  readonly activeModuleAssetId: string | null;
  readonly activeViewportToolMode: MapEditorViewportToolMode;
  readonly assetCatalogEntries: readonly EnvironmentAssetDescriptor[];
  readonly builderToolsVisible?: boolean;
  readonly collapsed: boolean;
  readonly headerVisible?: boolean;
  readonly onActivateModuleAssetId: (assetId: string) => void;
  readonly onActivateViewportToolMode: (
    viewportToolMode: MapEditorViewportToolMode
  ) => void;
  readonly onAddConnector: () => void;
  readonly onAddEdge: () => void;
  readonly onAddModuleFromAsset: (asset: EnvironmentAssetDescriptor) => void;
  readonly onAddRegion: () => void;
  readonly onAddSurface: () => void;
  readonly onCollapsedChange: (collapsed: boolean) => void;
  readonly onSceneVisibilityChange: (
    layerId: MapEditorSceneVisibilityLayerId,
    visible: boolean
  ) => void;
  readonly onSectionOpenChange: (sectionId: string, open: boolean) => void;
  readonly onSelectEntityRef: (
    entityRef: MapEditorSelectedEntityRef | null
  ) => void;
  readonly onMergeTerrainPatches: (terrainPatchIds: readonly string[]) => void;
  readonly onUpdatePlacementVisibility: (
    placementId: string,
    visible: boolean
  ) => void;
  readonly project: MapEditorProjectSnapshot;
  readonly readSectionOpen: (sectionId: string, defaultOpen?: boolean) => boolean;
  readonly sceneVisibility: MapEditorSceneVisibilitySnapshot;
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
        <Button
          className="h-8 w-full justify-between px-2 text-xs"
          type="button"
          variant="ghost"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">{title}</span>
            {badge}
          </span>
          <ChevronDownIcon
            className={composeMapEditorLayoutClassName(
              "shrink-0 transition-transform",
              open ? "rotate-0" : "-rotate-90"
            )}
            data-icon="inline-end"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
    </Collapsible>
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
      <div className="flex flex-col gap-1.5">
        {assets.map((asset) => {
          const isActive = activeModuleAssetId === asset.id;

          return (
            <div
              className={composeMapEditorLayoutClassName(
                "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border px-2 py-1.5",
                isActive
                  ? "border-primary/50 bg-primary/10"
                  : "border-border/70 bg-background/65"
              )}
              key={asset.id}
            >
              <button
                className="min-w-0 text-left"
                onClick={() => onActivateModuleAssetId(asset.id)}
                title={`${asset.id} · ${asset.placement}`}
                type="button"
              >
                <div className="truncate text-xs font-medium">{asset.label}</div>
              </button>
              <div className="flex items-center gap-1">
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
    <Button
      className="justify-start"
      onClick={onClick}
      size="sm"
      type="button"
      variant={active ? "default" : "outline"}
    >
      {label}
    </Button>
  );
}

export function MapEditorSceneRail({
  activeModuleAssetId,
  activeViewportToolMode,
  assetCatalogEntries,
  builderToolsVisible = true,
  collapsed,
  headerVisible = true,
  onActivateModuleAssetId,
  onActivateViewportToolMode,
  onAddConnector,
  onAddEdge,
  onAddModuleFromAsset,
  onAddRegion,
  onAddSurface,
  onCollapsedChange,
  onSceneVisibilityChange,
  onSectionOpenChange,
  onSelectEntityRef,
  onMergeTerrainPatches,
  onUpdatePlacementVisibility,
  project,
  readSectionOpen,
  sceneVisibility,
  selectedEntityRef
}: MapEditorSceneRailProps) {
  const [moduleSearchQuery, setModuleSearchQuery] = useState("");
  const deferredModuleSearchQuery = useDeferredValue(moduleSearchQuery);
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
      {headerVisible ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-border/70 px-3 py-2">
          <div className="flex size-8 items-center justify-center rounded-lg border border-border/70 bg-muted/70">
            <FolderTreeIcon />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Scene
            </p>
            <h2 className="truncate text-sm font-semibold">Outliner</h2>
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
      ) : null}

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 p-3">
          <MapEditorSceneOutlinerPanel
            onMergeTerrainPatches={onMergeTerrainPatches}
            onSceneVisibilityChange={onSceneVisibilityChange}
            onSectionOpenChange={onSectionOpenChange}
            onSelectEntityRef={onSelectEntityRef}
            onUpdatePlacementVisibility={onUpdatePlacementVisibility}
            project={project}
            readSectionOpen={readSectionOpen}
            sceneVisibility={sceneVisibility}
            selectedEntityRef={selectedEntityRef}
          />

          <div className="rounded-lg border border-border/70 bg-muted/20 p-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-medium">Scene</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border/70 bg-background/55 px-2 py-1.5">
                <span className="truncate text-xs font-medium">Player Spawn</span>
                <Button
                  aria-label="Place player spawn"
                  aria-pressed={activeViewportToolMode === "player-spawn"}
                  onClick={() => onActivateViewportToolMode("player-spawn")}
                  size="icon-sm"
                  title="Place player spawn"
                  type="button"
                  variant={
                    activeViewportToolMode === "player-spawn"
                      ? "default"
                      : "outline"
                  }
                >
                  <PlusCircleIcon />
                </Button>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border/70 bg-background/55 px-2 py-1.5">
                <span className="truncate text-xs font-medium">Portal</span>
                <Button
                  aria-label="Place portal"
                  aria-pressed={activeViewportToolMode === "portal"}
                  onClick={() => onActivateViewportToolMode("portal")}
                  size="icon-sm"
                  title="Place portal"
                  type="button"
                  variant={
                    activeViewportToolMode === "portal" ? "default" : "outline"
                  }
                >
                  <PlusCircleIcon />
                </Button>
              </div>
            </div>
          </div>

          <Section
            onOpenChange={onSectionOpenChange}
            open={readSectionOpen("scene-rail:create", false)}
            sectionId="scene-rail:create"
            title="Create & Library"
          >
            <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/20 p-2">
              {builderToolsVisible ? (
                <>
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] font-medium uppercase text-muted-foreground">
                      Builder Tools
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <ToolButton
                        active={activeViewportToolMode === "floor"}
                        label="Floor"
                        onClick={() => onActivateViewportToolMode("floor")}
                      />
                      <ToolButton
                        active={activeViewportToolMode === "cover"}
                        label="Cover"
                        onClick={() => onActivateViewportToolMode("cover")}
                      />
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
                        active={activeViewportToolMode === "zone"}
                        label="Zone"
                        onClick={() => onActivateViewportToolMode("zone")}
                      />
                      <ToolButton
                        active={activeViewportToolMode === "lane"}
                        label="Lane"
                        onClick={() => onActivateViewportToolMode("lane")}
                      />
                      <ToolButton
                        active={activeViewportToolMode === "vehicle-route"}
                        label="Route"
                        onClick={() => onActivateViewportToolMode("vehicle-route")}
                      />
                      <ToolButton
                        active={activeViewportToolMode === "paint"}
                        label="Paint"
                        onClick={() => onActivateViewportToolMode("paint")}
                      />
                      <ToolButton
                        active={activeViewportToolMode === "delete"}
                        label="Delete"
                        onClick={() => onActivateViewportToolMode("delete")}
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
                      <ToolButton
                        active={activeViewportToolMode === "light"}
                        label="Light"
                        onClick={() => onActivateViewportToolMode("light")}
                      />
                    </div>
                  </div>
                </>
              ) : null}

              <Section
                onOpenChange={onSectionOpenChange}
                open={readSectionOpen("scene-rail:create:advanced", false)}
                sectionId="scene-rail:create:advanced"
                title="Advanced"
              >
                <div className="grid grid-cols-2 gap-1.5">
                  <Button onClick={onAddSurface} size="sm" type="button" variant="outline">
                    Surface
                  </Button>
                  <Button onClick={onAddRegion} size="sm" type="button" variant="outline">
                    Region
                  </Button>
                  <Button onClick={onAddEdge} size="sm" type="button" variant="outline">
                    Edge
                  </Button>
                  <Button onClick={onAddConnector} size="sm" type="button" variant="outline">
                    Connector
                  </Button>
                </div>
              </Section>

              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium">Module Library</p>
                <Input
                  onChange={(event) => setModuleSearchQuery(event.target.value)}
                  placeholder="Search props, vehicles..."
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
        </div>
      </ScrollArea>
    </div>
  );
}
