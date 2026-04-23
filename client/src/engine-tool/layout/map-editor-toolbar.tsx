import { RotateCwIcon, SaveIcon } from "lucide-react";

import type { MetaverseWorldBundleRegistryEntry } from "@/metaverse/world/bundle-registry";

import { Button } from "@/components/ui/button";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
  MapEditorBuilderToolStateSnapshot,
  MapEditorTerrainBrushMode,
  MapEditorTerrainBrushSizeCells,
  MapEditorViewportToolMode,
  MapEditorWallToolPresetId
} from "@/engine-tool/types/map-editor";

interface MapEditorToolbarProps {
  readonly activeModuleAssetLabel: string | null;
  readonly builderToolState: MapEditorBuilderToolStateSnapshot;
  readonly onBundleChange: (bundleId: string) => void;
  readonly onBuilderToolStateChange: (
    update: (
      currentBuilderToolState: MapEditorBuilderToolStateSnapshot
    ) => MapEditorBuilderToolStateSnapshot
  ) => void;
  readonly onResetDraftRequest: () => void;
  readonly onSaveDraftRequest: () => void;
  readonly registryEntries: readonly MetaverseWorldBundleRegistryEntry[];
  readonly selectedBundleId: string;
  readonly viewportToolMode: MapEditorViewportToolMode;
  readonly onViewportToolModeChange: (
    viewportToolMode: MapEditorViewportToolMode
  ) => void;
}

function readViewportToolMode(nextValue: string): MapEditorViewportToolMode | null {
  if (
    nextValue === "select" ||
    nextValue === "terrain" ||
    nextValue === "wall" ||
    nextValue === "path" ||
    nextValue === "water" ||
    nextValue === "module" ||
    nextValue === "move" ||
    nextValue === "rotate" ||
    nextValue === "scale"
  ) {
    return nextValue;
  }

  return null;
}

function readTerrainBrushMode(value: string): MapEditorTerrainBrushMode | null {
  return value === "lower" || value === "raise" || value === "smooth" ? value : null;
}

function readTerrainBrushSizeCells(
  value: string
): MapEditorTerrainBrushSizeCells | null {
  return value === "1" || value === "2" || value === "4" || value === "8"
    ? (Number(value) as MapEditorTerrainBrushSizeCells)
    : null;
}

function readWallPresetId(value: string): MapEditorWallToolPresetId | null {
  return value === "curb" ||
    value === "fence" ||
    value === "rail" ||
    value === "retaining-wall" ||
    value === "wall"
    ? value
    : null;
}

function readNumberInput(value: string): number | null {
  const nextValue = Number(value);

  return Number.isFinite(nextValue) ? nextValue : null;
}

function renderToolSettingsSummary(
  viewportToolMode: MapEditorViewportToolMode,
  activeModuleAssetLabel: string | null,
  builderToolState: MapEditorBuilderToolStateSnapshot
): string {
  switch (viewportToolMode) {
    case "module":
      return activeModuleAssetLabel === null
        ? "Pick a module asset in the scene rail, then click the viewport to place it."
        : `Module tool armed with ${activeModuleAssetLabel}. Click to place authored modules on the grid.`;
    case "terrain":
      return `${builderToolState.terrainBrushMode} brush, ${builderToolState.terrainBrushSizeCells}x${builderToolState.terrainBrushSizeCells}, ${builderToolState.terrainSmoothEdges ? "smooth falloff on" : "hard falloff"}.`;
    case "wall":
      return `${builderToolState.wallPresetId} preset. Click once to anchor, move to preview, click again to commit and chain.`;
    case "path":
      return "Click to start or continue pathing. Hold Ctrl and move vertically before committing to build ramps.";
    case "water":
      return `${builderToolState.waterFootprintCellsX} x ${builderToolState.waterFootprintCellsZ} cells, top ${builderToolState.waterTopElevationMeters.toFixed(1)}m, depth ${builderToolState.waterDepthMeters.toFixed(1)}m.`;
    case "move":
    case "rotate":
    case "scale":
      return "Transform tools operate on modules and player spawns through the viewport gizmo.";
    case "select":
    default:
      return "The viewport owns builder interaction. Use the left rail to arm tools and the right rail to edit selection.";
  }
}

export function MapEditorToolbar({
  activeModuleAssetLabel,
  builderToolState,
  onBundleChange,
  onBuilderToolStateChange,
  onResetDraftRequest,
  onSaveDraftRequest,
  registryEntries,
  selectedBundleId,
  viewportToolMode,
  onViewportToolModeChange
}: MapEditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-start gap-3 border-t border-border/70 px-4 py-3">
      <div className="flex min-w-[15rem] flex-col gap-2">
        <Label htmlFor="map-editor-bundle-select">Map bundle</Label>
        <Select onValueChange={onBundleChange} value={selectedBundleId}>
          <SelectTrigger id="map-editor-bundle-select">
            <SelectValue placeholder="Select bundle" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {registryEntries.map((entry) => (
                <SelectItem key={entry.bundleId} value={entry.bundleId}>
                  {entry.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <Separator className="hidden h-10 md:block" orientation="vertical" />

      <div className="flex flex-col gap-2">
        <Label>Viewport tool</Label>
        <ToggleGroup
          onValueChange={(nextValue) => {
            const nextViewportToolMode = readViewportToolMode(nextValue);

            if (nextViewportToolMode !== null) {
              onViewportToolModeChange(nextViewportToolMode);
            }
          }}
          spacing={0}
          type="single"
          value={viewportToolMode}
          variant="outline"
        >
          <ToggleGroupItem value="select">Select</ToggleGroupItem>
          <ToggleGroupItem value="terrain">Terrain</ToggleGroupItem>
          <ToggleGroupItem value="wall">Wall</ToggleGroupItem>
          <ToggleGroupItem value="path">Path</ToggleGroupItem>
          <ToggleGroupItem value="water">Water</ToggleGroupItem>
          <ToggleGroupItem value="module">Module</ToggleGroupItem>
          <ToggleGroupItem value="move">Move</ToggleGroupItem>
          <ToggleGroupItem value="rotate">Rotate</ToggleGroupItem>
          <ToggleGroupItem value="scale">Scale</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {(viewportToolMode === "terrain" ||
        viewportToolMode === "wall" ||
        viewportToolMode === "water") && (
        <>
          <Separator className="hidden h-10 md:block" orientation="vertical" />

          <div className="flex min-w-[20rem] flex-wrap items-end gap-3">
            {viewportToolMode === "terrain" ? (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="map-editor-terrain-brush-mode">Brush</Label>
                  <Select
                    onValueChange={(nextValue) => {
                      const nextBrushMode = readTerrainBrushMode(nextValue);

                      if (nextBrushMode !== null) {
                        onBuilderToolStateChange((currentBuilderToolState) =>
                          Object.freeze({
                            ...currentBuilderToolState,
                            terrainBrushMode: nextBrushMode
                          })
                        );
                      }
                    }}
                    value={builderToolState.terrainBrushMode}
                  >
                    <SelectTrigger id="map-editor-terrain-brush-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="raise">Raise</SelectItem>
                      <SelectItem value="lower">Lower</SelectItem>
                      <SelectItem value="smooth">Smooth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="map-editor-terrain-brush-size">Brush Size</Label>
                  <Select
                    onValueChange={(nextValue) => {
                      const nextBrushSizeCells =
                        readTerrainBrushSizeCells(nextValue);

                      if (nextBrushSizeCells !== null) {
                        onBuilderToolStateChange((currentBuilderToolState) =>
                          Object.freeze({
                            ...currentBuilderToolState,
                            terrainBrushSizeCells: nextBrushSizeCells
                          })
                        );
                      }
                    }}
                    value={String(builderToolState.terrainBrushSizeCells)}
                  >
                    <SelectTrigger id="map-editor-terrain-brush-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1x1</SelectItem>
                      <SelectItem value="2">2x2</SelectItem>
                      <SelectItem value="4">4x4</SelectItem>
                      <SelectItem value="8">8x8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Smooth Edges</Label>
                  <Button
                    onClick={() =>
                      onBuilderToolStateChange((currentBuilderToolState) =>
                        Object.freeze({
                          ...currentBuilderToolState,
                          terrainSmoothEdges:
                            !currentBuilderToolState.terrainSmoothEdges
                        })
                      )
                    }
                    type="button"
                    variant={
                      builderToolState.terrainSmoothEdges ? "default" : "outline"
                    }
                  >
                    {builderToolState.terrainSmoothEdges ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              </>
            ) : null}

            {viewportToolMode === "wall" ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="map-editor-wall-preset">Preset</Label>
                <Select
                  onValueChange={(nextValue) => {
                    const nextPresetId = readWallPresetId(nextValue);

                    if (nextPresetId !== null) {
                      onBuilderToolStateChange((currentBuilderToolState) =>
                        Object.freeze({
                          ...currentBuilderToolState,
                          wallPresetId: nextPresetId
                        })
                      );
                    }
                  }}
                  value={builderToolState.wallPresetId}
                >
                  <SelectTrigger id="map-editor-wall-preset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wall">Wall</SelectItem>
                    <SelectItem value="fence">Fence</SelectItem>
                    <SelectItem value="rail">Rail</SelectItem>
                    <SelectItem value="curb">Curb</SelectItem>
                    <SelectItem value="retaining-wall">Retaining Wall</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {viewportToolMode === "water" ? (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="map-editor-water-width">Width Cells</Label>
                  <Input
                    id="map-editor-water-width"
                    onChange={(event) => {
                      const nextValue = readNumberInput(event.target.value);

                      if (nextValue !== null) {
                        onBuilderToolStateChange((currentBuilderToolState) =>
                          Object.freeze({
                            ...currentBuilderToolState,
                            waterFootprintCellsX: Math.max(1, Math.round(nextValue))
                          })
                        );
                      }
                    }}
                    value={String(builderToolState.waterFootprintCellsX)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="map-editor-water-length">Length Cells</Label>
                  <Input
                    id="map-editor-water-length"
                    onChange={(event) => {
                      const nextValue = readNumberInput(event.target.value);

                      if (nextValue !== null) {
                        onBuilderToolStateChange((currentBuilderToolState) =>
                          Object.freeze({
                            ...currentBuilderToolState,
                            waterFootprintCellsZ: Math.max(1, Math.round(nextValue))
                          })
                        );
                      }
                    }}
                    value={String(builderToolState.waterFootprintCellsZ)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="map-editor-water-top">Top Elevation</Label>
                  <Input
                    id="map-editor-water-top"
                    onChange={(event) => {
                      const nextValue = readNumberInput(event.target.value);

                      if (nextValue !== null) {
                        onBuilderToolStateChange((currentBuilderToolState) =>
                          Object.freeze({
                            ...currentBuilderToolState,
                            waterTopElevationMeters: nextValue
                          })
                        );
                      }
                    }}
                    value={builderToolState.waterTopElevationMeters.toFixed(1)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="map-editor-water-depth">Depth</Label>
                  <Input
                    id="map-editor-water-depth"
                    onChange={(event) => {
                      const nextValue = readNumberInput(event.target.value);

                      if (nextValue !== null) {
                        onBuilderToolStateChange((currentBuilderToolState) =>
                          Object.freeze({
                            ...currentBuilderToolState,
                            waterDepthMeters: Math.max(0.5, nextValue)
                          })
                        );
                      }
                    }}
                    value={builderToolState.waterDepthMeters.toFixed(1)}
                  />
                </div>
              </>
            ) : null}
          </div>
        </>
      )}

      <Separator className="hidden h-10 md:block" orientation="vertical" />

      <Button onClick={onResetDraftRequest} type="button" variant="outline">
        <RotateCwIcon data-icon="inline-start" />
        Reset Draft
      </Button>

      <Button onClick={onSaveDraftRequest} type="button" variant="outline">
        <SaveIcon data-icon="inline-start" />
        Save Draft
      </Button>

      <div className="ml-auto max-w-xl text-sm text-muted-foreground">
        {renderToolSettingsSummary(
          viewportToolMode,
          activeModuleAssetLabel,
          builderToolState
        )}
      </div>
    </div>
  );
}
