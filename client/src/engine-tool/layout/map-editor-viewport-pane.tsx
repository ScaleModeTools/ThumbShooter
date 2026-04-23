import { Badge } from "@/components/ui/badge";
import { StableInlineText } from "@/components/text-stability";
import type {
  MapEditorPlayerSpawnDraftSnapshot,
  MapEditorSceneObjectDraftSnapshot,
  MapEditorWaterRegionDraftSnapshot
} from "@/engine-tool/project/map-editor-project-scene-drafts";
import type {
  MapEditorConnectorDraftSnapshot,
  MapEditorEdgeDraftSnapshot,
  MapEditorPlacementDraftSnapshot,
  MapEditorRegionDraftSnapshot,
  MapEditorSelectedEntityRef,
  MapEditorSurfaceDraftSnapshot,
  MapEditorTerrainChunkDraftSnapshot
} from "@/engine-tool/project/map-editor-project-state";
import type {
  MapEditorBuilderToolStateSnapshot,
  MapEditorPlayerSpawnTransformUpdate,
  MapEditorPlacementUpdate,
  MapEditorViewportHelperVisibilitySnapshot,
  MapEditorViewportToolMode
} from "@/engine-tool/types/map-editor";
import { MapEditorViewport } from "@/engine-tool/viewport/map-editor-viewport";

interface MapEditorViewportPaneProps {
  readonly activeModuleAssetId: string | null;
  readonly builderToolState: MapEditorBuilderToolStateSnapshot;
  readonly bundleId: string;
  readonly connectorDrafts: readonly MapEditorConnectorDraftSnapshot[];
  readonly edgeDrafts: readonly MapEditorEdgeDraftSnapshot[];
  readonly onApplyTerrainBrushAtPosition: (position: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  }) => void;
  readonly onCommitPathSegment: (
    targetPosition: {
      readonly x: number;
      readonly y: number;
      readonly z: number;
    },
    targetElevationMeters: number,
    fromAnchor: {
      readonly center: {
        readonly x: number;
        readonly y: number;
        readonly z: number;
      };
      readonly elevation: number;
    } | null
  ) => void;
  readonly onCreateModuleAtPosition: (
    assetId: string,
    position: {
      readonly x: number;
      readonly y: number;
      readonly z: number;
    }
  ) => void;
  readonly onCommitWallSegment: (
    startPosition: {
      readonly x: number;
      readonly y: number;
      readonly z: number;
    },
    endPosition: {
      readonly x: number;
      readonly y: number;
      readonly z: number;
    }
  ) => void;
  readonly onCreateWaterRegionAtPosition: (position: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  }) => void;
  readonly onCommitPlacementTransform: (
    placementId: string,
    update: MapEditorPlacementUpdate
  ) => void;
  readonly onCommitPlayerSpawnTransform: (
    spawnId: string,
    update: MapEditorPlayerSpawnTransformUpdate
  ) => void;
  readonly onSelectEntity: (entityRef: MapEditorSelectedEntityRef | null) => void;
  readonly placementDrafts: readonly MapEditorPlacementDraftSnapshot[];
  readonly playerSpawnDrafts: readonly MapEditorPlayerSpawnDraftSnapshot[];
  readonly regionDrafts: readonly MapEditorRegionDraftSnapshot[];
  readonly sceneObjectDrafts: readonly MapEditorSceneObjectDraftSnapshot[];
  readonly selectedEntityRef: MapEditorSelectedEntityRef | null;
  readonly surfaceDrafts: readonly MapEditorSurfaceDraftSnapshot[];
  readonly terrainChunkDrafts: readonly MapEditorTerrainChunkDraftSnapshot[];
  readonly waterRegionDrafts: readonly MapEditorWaterRegionDraftSnapshot[];
  readonly viewportHelperVisibility: MapEditorViewportHelperVisibilitySnapshot;
  readonly viewportToolMode: MapEditorViewportToolMode;
}

const viewportToolModeLabels = [
  "Select",
  "Terrain",
  "Wall",
  "Path",
  "Water",
  "Module",
  "Move",
  "Rotate",
  "Scale"
] as const;

function formatToolMode(viewportToolMode: MapEditorViewportToolMode): string {
  return `${viewportToolMode[0]?.toUpperCase()}${viewportToolMode.slice(1)}`;
}

function formatSelectionBadge(
  selectedEntityRef: MapEditorSelectedEntityRef | null
): string {
  if (selectedEntityRef === null) {
    return "No selection";
  }

  return `${selectedEntityRef.kind}: ${selectedEntityRef.id}`;
}

export function MapEditorViewportPane({
  activeModuleAssetId,
  builderToolState,
  bundleId,
  connectorDrafts,
  edgeDrafts,
  onApplyTerrainBrushAtPosition,
  onCommitPathSegment,
  onCreateModuleAtPosition,
  onCommitWallSegment,
  onCreateWaterRegionAtPosition,
  onCommitPlacementTransform,
  onCommitPlayerSpawnTransform,
  onSelectEntity,
  placementDrafts,
  playerSpawnDrafts,
  regionDrafts,
  sceneObjectDrafts,
  selectedEntityRef,
  surfaceDrafts,
  terrainChunkDrafts,
  waterRegionDrafts,
  viewportHelperVisibility,
  viewportToolMode
}: MapEditorViewportPaneProps) {
  const viewportBadgeText =
    viewportToolMode === "module" && activeModuleAssetId !== null
      ? activeModuleAssetId
      : formatSelectionBadge(selectedEntityRef);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Viewport
          </p>
          <h2 className="font-heading text-lg font-semibold">
            Semantic Scene Workspace
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            <StableInlineText
              reserveTexts={viewportToolModeLabels}
              text={formatToolMode(viewportToolMode)}
            />
          </Badge>
          <Badge variant={selectedEntityRef === null ? "outline" : "secondary"}>
            <StableInlineText stabilizeNumbers={false} text={viewportBadgeText} />
          </Badge>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-4">
        <MapEditorViewport
          activeModuleAssetId={activeModuleAssetId}
          builderToolState={builderToolState}
          bundleId={bundleId}
          connectorDrafts={connectorDrafts}
          edgeDrafts={edgeDrafts}
          helperVisibility={viewportHelperVisibility}
          onApplyTerrainBrushAtPosition={onApplyTerrainBrushAtPosition}
          onCommitPathSegment={onCommitPathSegment}
          onCommitPlacementTransform={onCommitPlacementTransform}
          onCommitPlayerSpawnTransform={onCommitPlayerSpawnTransform}
          onCreateModuleAtPosition={onCreateModuleAtPosition}
          onCommitWallSegment={onCommitWallSegment}
          onCreateWaterRegionAtPosition={onCreateWaterRegionAtPosition}
          onSelectEntity={onSelectEntity}
          placementDrafts={placementDrafts}
          playerSpawnDrafts={playerSpawnDrafts}
          regionDrafts={regionDrafts}
          sceneObjectDrafts={sceneObjectDrafts}
          selectedEntityRef={selectedEntityRef}
          surfaceDrafts={surfaceDrafts}
          terrainChunkDrafts={terrainChunkDrafts}
          waterRegionDrafts={waterRegionDrafts}
          viewportToolMode={viewportToolMode}
        />
      </div>

      <div className="shrink-0 border-t border-border/70 px-4 py-3 text-sm text-muted-foreground">
        {viewportToolMode === "module" && activeModuleAssetId !== null
          ? `Orbit with drag, pan with right-drag, zoom with the scroll wheel, and fly with WASD plus Q/E. Click to place ${activeModuleAssetId}.`
          : viewportToolMode === "terrain"
            ? `Click to ${builderToolState.terrainBrushMode} terrain with a ${builderToolState.terrainBrushSizeCells}x${builderToolState.terrainBrushSizeCells} brush.`
            : viewportToolMode === "wall"
              ? `Click once to anchor a ${builderToolState.wallPresetId}, move to preview, then click again to commit and keep chaining.`
              : viewportToolMode === "path"
                ? "Click to start or continue pathing. Hold Ctrl and move vertically before committing to preview a ramp."
                : viewportToolMode === "water"
                  ? `Click to place a ${builderToolState.waterFootprintCellsX} x ${builderToolState.waterFootprintCellsZ} water footprint.`
                  : "Orbit with drag, pan with right-drag, zoom with the scroll wheel, and fly with WASD plus Q/E. Use the outliner or viewport picking to focus authored entities."}
      </div>
    </div>
  );
}
