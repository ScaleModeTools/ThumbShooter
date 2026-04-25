import { useDeferredValue, useMemo, useState, type ReactNode } from "react";

import {
  BoxIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  FlagIcon,
  Layers3Icon,
  LightbulbIcon,
  MapIcon,
  MountainIcon,
  SunIcon,
  WavesIcon,
  type LucideIcon
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import type {
  MapEditorProjectSnapshot,
  MapEditorSelectedEntityRef
} from "@/engine-tool/project/map-editor-project-state";
import type {
  MapEditorSceneVisibilityLayerId,
  MapEditorSceneVisibilitySnapshot
} from "@/engine-tool/types/map-editor";
import { composeMapEditorLayoutClassName } from "@/engine-tool/layout/map-editor-layout-class-name";

interface MapEditorSceneOutlinerPanelProps {
  readonly onSceneVisibilityChange: (
    layerId: MapEditorSceneVisibilityLayerId,
    visible: boolean
  ) => void;
  readonly onSectionOpenChange: (sectionId: string, open: boolean) => void;
  readonly onSelectEntityRef: (
    entityRef: MapEditorSelectedEntityRef | null
  ) => void;
  readonly onUpdatePlacementVisibility: (
    placementId: string,
    visible: boolean
  ) => void;
  readonly project: MapEditorProjectSnapshot;
  readonly readSectionOpen: (sectionId: string, defaultOpen?: boolean) => boolean;
  readonly sceneVisibility: MapEditorSceneVisibilitySnapshot;
  readonly selectedEntityRef: MapEditorSelectedEntityRef | null;
}

interface SceneOutlinerRow {
  readonly description: string;
  readonly entityRef: MapEditorSelectedEntityRef | null;
  readonly icon: LucideIcon;
  readonly id: string;
  readonly onVisibilityChange?: (visible: boolean) => void;
  readonly title: string;
  readonly visible: boolean;
  readonly visibilityToggleVisible?: boolean;
}

interface SceneOutlinerSectionData {
  readonly count: number;
  readonly layerId?: MapEditorSceneVisibilityLayerId;
  readonly rows: readonly SceneOutlinerRow[];
  readonly sectionId: string;
  readonly title: string;
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

function isSelectedEntity(
  selectedEntityRef: MapEditorSelectedEntityRef | null,
  entityRef: MapEditorSelectedEntityRef | null
): boolean {
  return (
    selectedEntityRef !== null &&
    entityRef !== null &&
    selectedEntityRef.kind === entityRef.kind &&
    selectedEntityRef.id === entityRef.id
  );
}

function VisibilityButton({
  label,
  onVisibilityChange,
  visible
}: {
  readonly label: string;
  readonly onVisibilityChange: (visible: boolean) => void;
  readonly visible: boolean;
}) {
  const Icon = visible ? EyeIcon : EyeOffIcon;

  return (
    <Button
      aria-label={`${visible ? "Hide" : "Show"} ${label}`}
      aria-pressed={visible}
      className="size-7 shrink-0"
      onClick={() => onVisibilityChange(!visible)}
      size="icon"
      title={`${visible ? "Hide" : "Show"} ${label}`}
      type="button"
      variant={visible ? "ghost" : "outline"}
    >
      <Icon />
    </Button>
  );
}

function SceneOutlinerRowButton({
  children,
  entityRef,
  onSelectEntityRef
}: {
  readonly children: ReactNode;
  readonly entityRef: MapEditorSelectedEntityRef | null;
  readonly onSelectEntityRef: (
    entityRef: MapEditorSelectedEntityRef | null
  ) => void;
}) {
  if (entityRef === null) {
    return <div className="min-w-0 flex-1">{children}</div>;
  }

  return (
    <button
      className="min-w-0 flex-1 text-left"
      onClick={() => onSelectEntityRef(entityRef)}
      type="button"
    >
      {children}
    </button>
  );
}

function SceneOutlinerRowView({
  onSelectEntityRef,
  row,
  selectedEntityRef
}: {
  readonly onSelectEntityRef: (
    entityRef: MapEditorSelectedEntityRef | null
  ) => void;
  readonly row: SceneOutlinerRow;
  readonly selectedEntityRef: MapEditorSelectedEntityRef | null;
}) {
  const Icon = row.icon;
  const active = isSelectedEntity(selectedEntityRef, row.entityRef);

  return (
    <div
      className={composeMapEditorLayoutClassName(
        "grid h-8 grid-cols-[minmax(0,1fr)_auto] items-center gap-1 rounded-md border px-2 transition-colors",
        active
          ? "border-primary/50 bg-primary/10"
          : "border-border/70 bg-background/55 hover:bg-muted/50",
        row.visible ? "" : "opacity-55"
      )}
    >
      <SceneOutlinerRowButton
        entityRef={row.entityRef}
        onSelectEntityRef={onSelectEntityRef}
      >
        <span className="flex min-w-0 items-center gap-2" title={row.description}>
          <Icon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate text-xs font-medium">{row.title}</span>
        </span>
      </SceneOutlinerRowButton>
      {row.onVisibilityChange === undefined ? null : (
        <VisibilityButton
          label={row.title}
          onVisibilityChange={row.onVisibilityChange}
          visible={row.visibilityToggleVisible ?? row.visible}
        />
      )}
    </div>
  );
}

function SceneOutlinerSection({
  onSceneVisibilityChange,
  onSectionOpenChange,
  onSelectEntityRef,
  readSectionOpen,
  sceneVisibility,
  section,
  selectedEntityRef
}: {
  readonly onSceneVisibilityChange: (
    layerId: MapEditorSceneVisibilityLayerId,
    visible: boolean
  ) => void;
  readonly onSectionOpenChange: (sectionId: string, open: boolean) => void;
  readonly onSelectEntityRef: (
    entityRef: MapEditorSelectedEntityRef | null
  ) => void;
  readonly readSectionOpen: (sectionId: string, defaultOpen?: boolean) => boolean;
  readonly sceneVisibility: MapEditorSceneVisibilitySnapshot;
  readonly section: SceneOutlinerSectionData;
  readonly selectedEntityRef: MapEditorSelectedEntityRef | null;
}) {
  if (section.rows.length === 0) {
    return null;
  }

  const sectionVisible =
    section.layerId === undefined ? true : sceneVisibility[section.layerId];
  const open = readSectionOpen(section.sectionId, true);

  return (
    <Collapsible
      className="flex flex-col gap-1"
      onOpenChange={(nextOpen) => onSectionOpenChange(section.sectionId, nextOpen)}
      open={open}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1">
        <CollapsibleTrigger asChild>
          <Button
            className="h-8 min-w-0 justify-start px-2 text-xs"
            type="button"
            variant="ghost"
          >
            <ChevronDownIcon
              className={composeMapEditorLayoutClassName(
                "shrink-0 transition-transform",
                open ? "rotate-0" : "-rotate-90"
              )}
              data-icon="inline-start"
            />
            <span className="min-w-0 truncate font-medium">{section.title}</span>
          </Button>
        </CollapsibleTrigger>
        <Badge variant="outline">{section.count}</Badge>
        {section.layerId === undefined ? null : (
          <VisibilityButton
            label={section.title}
            onVisibilityChange={(visible) =>
              onSceneVisibilityChange(section.layerId as MapEditorSceneVisibilityLayerId, visible)
            }
            visible={sectionVisible}
          />
        )}
      </div>
      <CollapsibleContent className="flex flex-col gap-1">
        {section.rows.map((row) => (
          <SceneOutlinerRowView
            key={row.id}
            onSelectEntityRef={onSelectEntityRef}
            row={row}
            selectedEntityRef={selectedEntityRef}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function createEntityRef(
  kind: MapEditorSelectedEntityRef["kind"],
  id: string
): MapEditorSelectedEntityRef {
  return Object.freeze({ id, kind });
}

export function MapEditorSceneOutlinerPanel({
  onSceneVisibilityChange,
  onSectionOpenChange,
  onSelectEntityRef,
  onUpdatePlacementVisibility,
  project,
  readSectionOpen,
  sceneVisibility,
  selectedEntityRef
}: MapEditorSceneOutlinerPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const environment = project.environmentPresentation.environment;
  const sections = useMemo<readonly SceneOutlinerSectionData[]>(() => {
    const ownedSurfaceIds = new Set<string>([
      ...project.regionDrafts.map((region) => region.surfaceId),
      ...project.edgeDrafts.map((edge) => edge.surfaceId)
    ]);
    const standaloneSurfaces = project.surfaceDrafts.filter(
      (surface) => !ownedSurfaceIds.has(surface.surfaceId)
    );
    const worldRows: readonly SceneOutlinerRow[] = Object.freeze([
      Object.freeze({
        description: `${environment.sunElevationDegrees.toFixed(0)} elevation · ${environment.sunAzimuthDegrees.toFixed(0)} azimuth`,
        entityRef: createEntityRef("world-sun", "global-sun"),
        icon: SunIcon,
        id: "world:sun",
        onVisibilityChange: (visible: boolean) =>
          onSceneVisibilityChange("worldSun", visible),
        title: "Global Sun",
        visible: sceneVisibility.worldSun
      }),
      Object.freeze({
        description: `Clouds ${environment.cloudCoverage.toFixed(2)} · horizon ${environment.horizonSoftness.toFixed(2)}`,
        entityRef: createEntityRef("world-sky", "sky"),
        icon: Layers3Icon,
        id: "world:sky",
        title: "Sky",
        visible: true
      }),
      Object.freeze({
        description: environment.fogEnabled
          ? `Fog ${environment.fogDensity.toFixed(4)}`
          : "Fog disabled",
        entityRef: createEntityRef("world-atmosphere", "atmosphere"),
        icon: Layers3Icon,
        id: "world:atmosphere",
        title: "Atmosphere",
        visible: true
      })
    ]);

    return Object.freeze([
      Object.freeze({
        count: 3,
        rows: worldRows.filter((row) =>
          matchesSearch(deferredSearchQuery, row.title, row.description)
        ),
        sectionId: "scene-outliner:world",
        title: "World"
      }),
      Object.freeze({
        count: project.terrainPatchDrafts.length,
        layerId: "terrain" as const,
        rows: project.terrainPatchDrafts
          .filter((terrainPatch) =>
            matchesSearch(
              deferredSearchQuery,
              terrainPatch.terrainPatchId,
              terrainPatch.label
            )
          )
          .map((terrainPatch) =>
            Object.freeze({
              description: `${terrainPatch.sampleCountX}x${terrainPatch.sampleCountZ} samples`,
              entityRef: createEntityRef("terrain-patch", terrainPatch.terrainPatchId),
              icon: MountainIcon,
              id: `terrain:${terrainPatch.terrainPatchId}`,
              title: terrainPatch.label,
              visible: sceneVisibility.terrain
            })
          ),
        sectionId: "scene-outliner:terrain",
        title: "Terrain"
      }),
      Object.freeze({
        count:
          project.regionDrafts.length +
          project.edgeDrafts.length +
          project.structuralDrafts.length +
          standaloneSurfaces.length +
          project.connectorDrafts.length,
        layerId: "authoredSurfaces" as const,
        rows: [
          ...project.regionDrafts.map((region) =>
            Object.freeze({
              description: `${region.regionKind} · ${region.regionId}`,
              entityRef: createEntityRef("region", region.regionId),
              icon: MapIcon,
              id: `region:${region.regionId}`,
              title: region.label,
              visible: sceneVisibility.authoredSurfaces
            })
          ),
          ...project.edgeDrafts.map((edge) =>
            Object.freeze({
              description: `${edge.edgeKind} · ${edge.edgeId}`,
              entityRef: createEntityRef("edge", edge.edgeId),
              icon: MapIcon,
              id: `edge:${edge.edgeId}`,
              title: edge.label,
              visible: sceneVisibility.authoredSurfaces
            })
          ),
          ...project.structuralDrafts.map((structure) =>
            Object.freeze({
              description: `${structure.structureKind} · ${structure.materialId}`,
              entityRef: createEntityRef("structure", structure.structureId),
              icon: BoxIcon,
              id: `structure:${structure.structureId}`,
              title: structure.label,
              visible: sceneVisibility.authoredSurfaces
            })
          ),
          ...standaloneSurfaces.map((surface) =>
            Object.freeze({
              description: `${surface.kind} · ${surface.surfaceId}`,
              entityRef: createEntityRef("surface", surface.surfaceId),
              icon: MapIcon,
              id: `surface:${surface.surfaceId}`,
              title: surface.label,
              visible: sceneVisibility.authoredSurfaces
            })
          ),
          ...project.connectorDrafts.map((connector) =>
            Object.freeze({
              description: `${connector.connectorKind} · ${connector.connectorId}`,
              entityRef: createEntityRef("connector", connector.connectorId),
              icon: MapIcon,
              id: `connector:${connector.connectorId}`,
              title: connector.label,
              visible: sceneVisibility.authoredSurfaces
            })
          )
        ].filter((row) =>
          matchesSearch(deferredSearchQuery, row.title, row.description)
        ),
        sectionId: "scene-outliner:geometry",
        title: "Geometry"
      }),
      Object.freeze({
        count: project.placementDrafts.length,
        layerId: "authoredModules" as const,
        rows: project.placementDrafts
          .filter((placement) =>
            matchesSearch(
              deferredSearchQuery,
              placement.placementId,
              placement.assetId,
              placement.moduleId
            )
          )
          .map((placement) =>
            Object.freeze({
              description: placement.placementId,
              entityRef: createEntityRef("module", placement.placementId),
              icon: BoxIcon,
              id: `module:${placement.placementId}`,
              onVisibilityChange: (visible: boolean) =>
                onUpdatePlacementVisibility(placement.placementId, visible),
              title: placement.assetId,
              visible: sceneVisibility.authoredModules && placement.isVisible,
              visibilityToggleVisible: placement.isVisible
            })
          ),
        sectionId: "scene-outliner:modules",
        title: "Modules"
      }),
      Object.freeze({
        count:
          project.playerSpawnDrafts.length +
          project.sceneObjectDrafts.length +
          project.gameplayVolumeDrafts.length,
        layerId: "gameplayMarkers" as const,
        rows: [
          ...project.playerSpawnDrafts.map((spawn) =>
            Object.freeze({
              description: `${spawn.teamId} · ${spawn.spawnId}`,
              entityRef: createEntityRef("player-spawn", spawn.spawnId),
              icon: FlagIcon,
              id: `spawn:${spawn.spawnId}`,
              title: spawn.label,
              visible: sceneVisibility.gameplayMarkers
            })
          ),
          ...project.sceneObjectDrafts.map((sceneObject) =>
            Object.freeze({
              description:
                sceneObject.launchTarget === null
                  ? sceneObject.objectId
                  : `${sceneObject.objectId} · ${sceneObject.launchTarget.experienceId}`,
              entityRef: createEntityRef("scene-object", sceneObject.objectId),
              icon: FlagIcon,
              id: `scene-object:${sceneObject.objectId}`,
              title: sceneObject.label,
              visible: sceneVisibility.gameplayMarkers
            })
          ),
          ...project.gameplayVolumeDrafts.map((volume) =>
            Object.freeze({
              description: `${volume.volumeKind} · ${volume.teamId ?? "all"}`,
              entityRef: createEntityRef("gameplay-volume", volume.volumeId),
              icon: FlagIcon,
              id: `volume:${volume.volumeId}`,
              title: volume.label,
              visible: sceneVisibility.gameplayMarkers
            })
          )
        ].filter((row) =>
          matchesSearch(deferredSearchQuery, row.title, row.description)
        ),
        sectionId: "scene-outliner:gameplay",
        title: "Gameplay"
      }),
      Object.freeze({
        count: project.lightDrafts.length,
        layerId: "authoredLights" as const,
        rows: project.lightDrafts
          .filter((light) =>
            matchesSearch(
              deferredSearchQuery,
              light.lightId,
              light.label,
              light.lightKind
            )
          )
          .map((light) =>
            Object.freeze({
              description: `${light.lightKind} · ${light.intensity.toFixed(1)}`,
              entityRef: createEntityRef("light", light.lightId),
              icon: LightbulbIcon,
              id: `light:${light.lightId}`,
              title: light.label,
              visible: sceneVisibility.authoredLights
            })
          ),
        sectionId: "scene-outliner:lights",
        title: "Lights"
      }),
      Object.freeze({
        count: project.waterRegionDrafts.length,
        layerId: "waterRegions" as const,
        rows: project.waterRegionDrafts
          .filter((waterRegion) =>
            matchesSearch(
              deferredSearchQuery,
              waterRegion.waterRegionId,
              waterRegion.previewColorHex
            )
          )
          .map((waterRegion) =>
            Object.freeze({
              description: `${waterRegion.footprint.sizeCellsX}x${waterRegion.footprint.sizeCellsZ} cells`,
              entityRef: createEntityRef("water-region", waterRegion.waterRegionId),
              icon: WavesIcon,
              id: `water:${waterRegion.waterRegionId}`,
              title: `Water ${waterRegion.waterRegionId}`,
              visible: sceneVisibility.waterRegions
            })
          ),
        sectionId: "scene-outliner:water",
        title: "Water"
      })
    ]);
  }, [
    deferredSearchQuery,
    environment.cloudCoverage,
    environment.fogDensity,
    environment.fogEnabled,
    environment.horizonSoftness,
    environment.sunAzimuthDegrees,
    environment.sunElevationDegrees,
    onSceneVisibilityChange,
    onUpdatePlacementVisibility,
    project.connectorDrafts,
    project.edgeDrafts,
    project.gameplayVolumeDrafts,
    project.lightDrafts,
    project.placementDrafts,
    project.playerSpawnDrafts,
    project.regionDrafts,
    project.sceneObjectDrafts,
    project.structuralDrafts,
    project.surfaceDrafts,
    project.terrainPatchDrafts,
    project.waterRegionDrafts,
    sceneVisibility
  ]);
  const filteredCount = sections.reduce(
    (total, section) => total + section.rows.length,
    0
  );

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/20 p-2">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium">Scene</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {filteredCount} items in outliner
          </p>
        </div>
        <Badge variant="secondary">{project.placementDrafts.length}</Badge>
      </div>
      <Input
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Filter scene..."
        value={searchQuery}
      />
      <div className="flex flex-col gap-1.5">
        {sections.map((section) => (
          <SceneOutlinerSection
            key={section.title}
            onSceneVisibilityChange={onSceneVisibilityChange}
            onSectionOpenChange={onSectionOpenChange}
            onSelectEntityRef={onSelectEntityRef}
            readSectionOpen={readSectionOpen}
            sceneVisibility={sceneVisibility}
            section={section}
            selectedEntityRef={selectedEntityRef}
          />
        ))}
      </div>
    </div>
  );
}
