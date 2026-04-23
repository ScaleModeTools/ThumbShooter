import {
  startTransition,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState
} from "react";

import { ArrowLeftIcon, Layers3Icon, PlayIcon } from "lucide-react";

import { environmentPropManifest } from "@/assets/config/environment-prop-manifest";
import type { EnvironmentAssetDescriptor } from "@/assets/types/environment-asset-manifest";
import {
  applyStoredMetaverseWorldBundleOverride,
  clearMetaverseWorldBundlePreviewEntry,
  listMetaverseWorldBundleRegistryEntries,
  resolveDefaultMetaverseWorldBundleId,
  resolveMetaverseWorldBundleSourceBundleId
} from "@/metaverse/world/bundle-registry";
import { loadMetaverseMapBundle } from "@/metaverse/world/map-bundles";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  createStableCountReserveTexts,
  StableInlineText
} from "@/components/text-stability";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from "@/components/ui/resizable";
import { MapEditorMenubar } from "@/engine-tool/layout/map-editor-menubar";
import { MapEditorSceneRail } from "@/engine-tool/layout/map-editor-scene-rail";
import { MapEditorSelectionPane } from "@/engine-tool/layout/map-editor-selection-pane";
import { MapEditorToolbar } from "@/engine-tool/layout/map-editor-toolbar";
import { MapEditorViewportPane } from "@/engine-tool/layout/map-editor-viewport-pane";
import { MapEditorWorldPane } from "@/engine-tool/layout/map-editor-world-pane";
import {
  addMapEditorPathSegment,
  addMapEditorConnectorDraft,
  addMapEditorEdgeDraft,
  addMapEditorPlayerSpawnDraft,
  addMapEditorLaunchVariationDraft,
  addMapEditorPlacementFromAsset,
  addMapEditorPlacementAtPositionFromAsset,
  addMapEditorRegionDraft,
  addMapEditorSceneObjectDraft,
  addMapEditorSurfaceDraft,
  addMapEditorTerrainChunkDraft,
  addMapEditorWallSegment,
  addMapEditorWaterRegionDraft,
  applyMapEditorTerrainBrush,
  createMapEditorProject,
  readSelectedMapEditorLaunchVariation,
  readSelectedMapEditorPlacement,
  removeMapEditorEntity,
  selectMapEditorEntity,
  selectMapEditorLaunchVariation,
  type MapEditorConnectorDraftSnapshot,
  type MapEditorEdgeDraftSnapshot,
  updateMapEditorLaunchVariationDraft,
  updateMapEditorConnectorDraft,
  updateMapEditorEdgeDraft,
  updateMapEditorEnvironmentPresentationProfileId,
  updateMapEditorGameplayProfileId,
  updateMapEditorPlayerSpawnDraft,
  updateMapEditorPlayerSpawnSelectionDraft,
  updateMapEditorRegionDraft,
  updateMapEditorSceneObjectDraft,
  updateMapEditorPlacement,
  updateMapEditorSurfaceDraft,
  updateMapEditorTerrainChunkDraft,
  updateMapEditorWaterRegionDraft,
  type MapEditorProjectSnapshot,
  type MapEditorRegionDraftSnapshot,
  type MapEditorSelectedEntityRef,
  type MapEditorSurfaceDraftSnapshot,
  type MapEditorTerrainChunkDraftSnapshot
} from "@/engine-tool/project/map-editor-project-state";
import {
  applyMapEditorProjectSessionChange,
  createMapEditorProjectSession,
  replaceMapEditorProjectSessionProject,
  undoMapEditorProjectSessionChange,
  updateMapEditorProjectSessionProject
} from "@/engine-tool/project/map-editor-project-session";
import {
  clearStoredMapEditorProject,
  loadStoredMapEditorProject,
  saveMapEditorProject,
  type MapEditorProjectStorageLike
} from "@/engine-tool/project/map-editor-project-storage";
import {
  loadMapEditorUiPrefs,
  saveMapEditorUiPrefs
} from "@/engine-tool/project/map-editor-ui-storage";
import type { MapEditorLaunchVariationDraftSnapshot } from "@/engine-tool/project/map-editor-project-launch-variations";
import type {
  MapEditorPlayerSpawnSelectionDraftSnapshot
} from "@/engine-tool/project/map-editor-project-player-spawn-selection";
import type {
  MapEditorPlayerSpawnDraftSnapshot,
  MapEditorSceneObjectDraftSnapshot,
  MapEditorWaterRegionDraftSnapshot
} from "@/engine-tool/project/map-editor-project-scene-drafts";
import { validateAndRegisterMapEditorPreviewBundle } from "@/engine-tool/run/map-editor-run-preview";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { defaultMapEditorViewportHelperVisibility } from "@/engine-tool/types/map-editor";
import type {
  MapEditorBuilderToolStateSnapshot,
  MapEditorPlayerSpawnTransformUpdate,
  MapEditorViewportHelperId,
  MapEditorPlacementUpdate,
  MapEditorViewportToolMode
} from "@/engine-tool/types/map-editor";
import { defaultMapEditorBuilderToolState } from "@/engine-tool/types/map-editor";
import type { MetaverseWorldPreviewLaunchSelectionSnapshot } from "@/metaverse/world/map-bundles";

function readBrowserStorage(): MapEditorProjectStorageLike | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function createProjectForBundle(
  bundleId: string,
  storage: MapEditorProjectStorageLike | null
): MapEditorProjectSnapshot {
  return (
    loadStoredMapEditorProject(storage, bundleId) ??
    createMapEditorProject(loadMetaverseMapBundle(bundleId))
  );
}

function selectDefaultBundleId(
  initialBundleId: string | undefined
): string {
  return resolveMetaverseWorldBundleSourceBundleId(
    initialBundleId ?? resolveDefaultMetaverseWorldBundleId()
  );
}

function applySelectedPlacementUpdate(
  project: MapEditorProjectSnapshot,
  update: MapEditorPlacementUpdate
): MapEditorProjectSnapshot {
  if (project.selectedPlacementId === null) {
    return project;
  }

  return applyPlacementUpdate(project, project.selectedPlacementId, update);
}

function applyPlacementUpdate(
  project: MapEditorProjectSnapshot,
  placementId: string,
  update: MapEditorPlacementUpdate
): MapEditorProjectSnapshot {
  return updateMapEditorPlacement(
    project,
    placementId,
    (placement) => ({
      ...placement,
      ...update,
      position: update.position ?? placement.position
    })
  );
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}

type MapEditorRightPaneTabId = "selection" | "world";

interface MapEditorPanelApi {
  collapse: () => void;
  expand: () => void;
}

function freezeSectionOpenState(
  nextSectionOpenState: Readonly<Record<string, boolean>>
): Readonly<Record<string, boolean>> {
  return Object.freeze({ ...nextSectionOpenState });
}

const placementCountReserveTexts = createStableCountReserveTexts(
  "module",
  "modules"
);
const playerSpawnCountReserveTexts = createStableCountReserveTexts(
  "player spawn",
  "player spawns"
);
const waterRegionCountReserveTexts = createStableCountReserveTexts(
  "water region",
  "water regions"
);

interface MapEditorStageScreenProps {
  readonly initialBundleId?: string;
  readonly onCloseRequest: () => void;
  readonly onRunPreviewRequest: (
    launchSelection: MetaverseWorldPreviewLaunchSelectionSnapshot
  ) => void;
}

export function MapEditorStageScreen({
  initialBundleId,
  onCloseRequest,
  onRunPreviewRequest
}: MapEditorStageScreenProps) {
  const registryEntries = useMemo(
    () => listMetaverseWorldBundleRegistryEntries(),
    []
  );
  const defaultBundleId = selectDefaultBundleId(initialBundleId);
  const bundleLabelReserveTexts = useMemo(
    () => registryEntries.map((entry) => entry.label),
    [registryEntries]
  );
  const [browserStorage] = useState<MapEditorProjectStorageLike | null>(() =>
    readBrowserStorage()
  );
  const [initialUiPrefs] = useState(() => loadMapEditorUiPrefs(browserStorage));
  const [selectedBundleId, setSelectedBundleId] = useState(defaultBundleId);
  const [projectSession, setProjectSession] = useState(() =>
    createMapEditorProjectSession(
      createProjectForBundle(defaultBundleId, browserStorage)
    )
  );
  const sceneRailPanelApiRef = useRef<MapEditorPanelApi | null>(null);
  const [activeRightPaneTab, setActiveRightPaneTab] =
    useState<MapEditorRightPaneTabId>("world");
  const [activeModuleAssetId, setActiveModuleAssetId] = useState<string | null>(
    null
  );
  const [builderToolState, setBuilderToolState] =
    useState<MapEditorBuilderToolStateSnapshot>(
      initialUiPrefs.builderToolState ?? defaultMapEditorBuilderToolState
    );
  const [sceneRailCollapsed, setSceneRailCollapsed] = useState(
    initialUiPrefs.sceneRailCollapsed
  );
  const [sectionOpenState, setSectionOpenState] = useState(
    initialUiPrefs.sectionOpenState
  );
  const [viewportHelperVisibility, setViewportHelperVisibility] = useState(
    defaultMapEditorViewportHelperVisibility
  );
  const [viewportToolMode, setViewportToolMode] =
    useState<MapEditorViewportToolMode>("select");
  const [runInProgress, setRunInProgress] = useState(false);
  const [runStatusMessage, setRunStatusMessage] = useState<string | null>(null);
  const project = projectSession.project;
  const selectedLaunchVariation = readSelectedMapEditorLaunchVariation(project);
  const selectedPlacement = readSelectedMapEditorPlacement(project);
  const canUndoProjectChange = projectSession.undoHistory.length > 0;
  const handleProjectSelectionUpdate = useEffectEvent(
    (
      update: (
        project: MapEditorProjectSnapshot
      ) => MapEditorProjectSnapshot
    ) => {
      setProjectSession((currentSession) =>
        updateMapEditorProjectSessionProject(currentSession, update)
      );
    }
  );
  const handleProjectAuthoringChange = useEffectEvent(
    (
      update: (
        project: MapEditorProjectSnapshot
      ) => MapEditorProjectSnapshot
    ) => {
      setProjectSession((currentSession) =>
        applyMapEditorProjectSessionChange(currentSession, update)
      );
      setRunStatusMessage(null);
    }
  );
  const handleUndoProjectChangeRequest = useEffectEvent(() => {
    setProjectSession((currentSession) =>
      undoMapEditorProjectSessionChange(currentSession)
    );
    setRunStatusMessage(null);
  });
  const handleDeleteSelectedEntityRequest = useEffectEvent(() => {
    handleProjectAuthoringChange((currentProject) =>
      removeMapEditorEntity(currentProject)
    );
  });
  const handleBuilderToolStateChange = (
    update: (
      currentBuilderToolState: MapEditorBuilderToolStateSnapshot
    ) => MapEditorBuilderToolStateSnapshot
  ) => {
    setBuilderToolState((currentBuilderToolState) =>
      Object.freeze(update(currentBuilderToolState))
    );
  };
  const handleSectionOpenChange = (sectionId: string, open: boolean) => {
    setSectionOpenState((currentSectionOpenState) =>
      freezeSectionOpenState({
        ...currentSectionOpenState,
        [sectionId]: open
      })
    );
  };
  const readSectionOpen = (sectionId: string, defaultOpen = true): boolean =>
    sectionOpenState[sectionId] ?? defaultOpen;

  const handleBundleChange = (nextBundleId: string) => {
    startTransition(() => {
      setSelectedBundleId(nextBundleId);
      setActiveModuleAssetId(null);
      setViewportToolMode("select");
      setProjectSession((currentSession) =>
        replaceMapEditorProjectSessionProject(
          currentSession,
          createProjectForBundle(nextBundleId, browserStorage)
        )
      );
      setRunStatusMessage(null);
    });
  };

  const handleResetDraftRequest = () => {
    startTransition(() => {
      clearStoredMapEditorProject(browserStorage, selectedBundleId);
      clearMetaverseWorldBundlePreviewEntry(selectedBundleId);
      setActiveModuleAssetId(null);
      setViewportToolMode("select");
      setProjectSession((currentSession) =>
        replaceMapEditorProjectSessionProject(
          currentSession,
          createMapEditorProject(loadMetaverseMapBundle(selectedBundleId))
        )
      );
      setRunStatusMessage(null);
    });
  };

  const handleSaveDraftRequest = () => {
    saveMapEditorProject(browserStorage, project);
    applyStoredMetaverseWorldBundleOverride(browserStorage, project.bundleId);
    setRunStatusMessage(
      `Saved ${project.bundleLabel} with ${
        project.launchVariationDrafts.length
      } launch variation${project.launchVariationDrafts.length === 1 ? "" : "s"}.`
    );
  };

  useEffect(() => {
    saveMapEditorUiPrefs(browserStorage, {
      builderToolState,
      sceneRailCollapsed,
      sectionOpenState
    });
  }, [browserStorage, builderToolState, sceneRailCollapsed, sectionOpenState]);

  const handleSelectEntity = (entityRef: MapEditorSelectedEntityRef | null) => {
    if (entityRef?.kind === "module") {
      const selectedModuleAssetId =
        project.placementDrafts.find(
          (placement) => placement.placementId === entityRef.id
        )?.assetId ?? null;

      if (selectedModuleAssetId !== null) {
        setActiveModuleAssetId(selectedModuleAssetId);
      }
    }

    handleProjectSelectionUpdate((currentProject) =>
      selectMapEditorEntity(currentProject, entityRef)
    );
  };

  const handleUpdateSelectedPlacement = (update: MapEditorPlacementUpdate) => {
    handleProjectAuthoringChange((currentProject) =>
      applySelectedPlacementUpdate(currentProject, update)
    );
  };

  const handleUpdateEnvironmentPresentationProfileId = (
    environmentPresentationProfileId: string | null
  ) => {
    handleProjectAuthoringChange((currentProject) =>
      updateMapEditorEnvironmentPresentationProfileId(
        currentProject,
        environmentPresentationProfileId
      )
    );
  };

  const handleUpdateGameplayProfileId = (gameplayProfileId: string) => {
    handleProjectAuthoringChange((currentProject) =>
      updateMapEditorGameplayProfileId(currentProject, gameplayProfileId)
    );
  };

  const handleAddLaunchVariation = () => {
    handleProjectAuthoringChange((currentProject) =>
      addMapEditorLaunchVariationDraft(currentProject)
    );
  };

  const handleAddPlayerSpawn = () => {
    handleProjectAuthoringChange((currentProject) =>
      addMapEditorPlayerSpawnDraft(currentProject)
    );
  };

  const handleAddSurface = () => {
    handleProjectAuthoringChange((currentProject) =>
      addMapEditorSurfaceDraft(currentProject)
    );
  };

  const handleAddRegion = () => {
    handleProjectAuthoringChange((currentProject) =>
      addMapEditorRegionDraft(currentProject)
    );
  };

  const handleAddEdge = () => {
    handleProjectAuthoringChange((currentProject) =>
      addMapEditorEdgeDraft(currentProject)
    );
  };

  const handleAddConnector = () => {
    handleProjectAuthoringChange((currentProject) =>
      addMapEditorConnectorDraft(currentProject)
    );
  };

  const handleAddSceneObject = () => {
    handleProjectAuthoringChange((currentProject) =>
      addMapEditorSceneObjectDraft(currentProject)
    );
  };

  const handleSelectLaunchVariation = (variationId: string) => {
    handleProjectSelectionUpdate((currentProject) =>
      selectMapEditorLaunchVariation(currentProject, variationId)
    );
  };

  const handleUpdateLaunchVariation = (
    variationId: string,
    update: (
      draft: MapEditorLaunchVariationDraftSnapshot
    ) => MapEditorLaunchVariationDraftSnapshot
  ) => {
    handleProjectAuthoringChange((currentProject) =>
      updateMapEditorLaunchVariationDraft(currentProject, variationId, update)
    );
  };

  const handleCommitViewportPlacementTransform = (
    placementId: string,
    update: MapEditorPlacementUpdate
  ) => {
    handleProjectAuthoringChange((currentProject) =>
      applyPlacementUpdate(currentProject, placementId, update)
    );
  };

  const handleCommitViewportPlayerSpawnTransform = (
    spawnId: string,
    update: MapEditorPlayerSpawnTransformUpdate
  ) => {
    handleProjectAuthoringChange((currentProject) =>
      updateMapEditorPlayerSpawnDraft(currentProject, spawnId, (spawnDraft) => ({
        ...spawnDraft,
        position: update.position,
        yawRadians: update.yawRadians
      }))
    );
  };

  const handleResetSelectedTransformRequest = () => {
    handleProjectAuthoringChange((currentProject) =>
      currentProject.selectedPlacementId === null
        ? currentProject
        : updateMapEditorPlacement(
            currentProject,
            currentProject.selectedPlacementId,
            (placement) => ({
              ...placement,
              rotationYRadians: 0,
              scale: Object.freeze({
                x: 1,
                y: 1,
                z: 1
              })
            })
          )
    );
  };

  const handleActivateModuleAssetId = (assetId: string) => {
    setActiveModuleAssetId(assetId);
    setViewportToolMode("module");
  };

  const handleActivateViewportToolMode = (
    nextViewportToolMode: MapEditorViewportToolMode
  ) => {
    setViewportToolMode(nextViewportToolMode);
  };

  const handleAddModuleFromAsset = (
    asset: EnvironmentAssetDescriptor
  ) => {
    handleProjectAuthoringChange((currentProject) =>
      addMapEditorPlacementFromAsset(currentProject, asset)
    );
  };

  const handleCreateModuleAtPosition = (
    assetId: string,
    position: {
      readonly x: number;
      readonly y: number;
      readonly z: number;
    }
  ) => {
    const asset =
      environmentPropManifest.environmentAssets.find(
        (environmentAsset) => environmentAsset.id === assetId
      ) ?? null;

    if (asset === null) {
      return;
    }

    handleProjectAuthoringChange((currentProject) =>
      addMapEditorPlacementAtPositionFromAsset(currentProject, asset, position)
    );
  };

  const handleApplyTerrainBrushAtPosition = (position: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  }) => {
    handleProjectAuthoringChange((currentProject) =>
      applyMapEditorTerrainBrush(
        currentProject,
        position,
        builderToolState.terrainBrushMode,
        builderToolState.terrainBrushSizeCells,
        builderToolState.terrainSmoothEdges
      )
    );
  };

  const handleCommitWallSegment = (
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
  ) => {
    handleProjectAuthoringChange((currentProject) =>
      addMapEditorWallSegment(
        currentProject,
        startPosition,
        endPosition,
        builderToolState.wallPresetId
      )
    );
  };

  const handleCommitPathSegment = (
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
  ) => {
    handleProjectAuthoringChange((currentProject) =>
      addMapEditorPathSegment(
        currentProject,
        targetPosition,
        targetElevationMeters,
        fromAnchor === null
          ? null
          : Object.freeze({
              center: Object.freeze({
                x: fromAnchor.center.x,
                y: fromAnchor.center.y,
                z: fromAnchor.center.z
              }),
              elevation: fromAnchor.elevation
            })
      )
    );
  };

  const handleCreateWaterRegionAtPosition = (position: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  }) => {
    handleProjectAuthoringChange((currentProject) =>
      addMapEditorWaterRegionDraft(currentProject, position, {
        depthMeters: builderToolState.waterDepthMeters,
        topElevationMeters: builderToolState.waterTopElevationMeters,
        widthCells: builderToolState.waterFootprintCellsX,
        zCells: builderToolState.waterFootprintCellsZ
      })
    );
  };

  const handleViewportHelperVisibilityChange = (
    helperId: MapEditorViewportHelperId,
    visible: boolean
  ) => {
    setViewportHelperVisibility((currentVisibility) => {
      if (currentVisibility[helperId] === visible) {
        return currentVisibility;
      }

      return Object.freeze({
        ...currentVisibility,
        [helperId]: visible
      });
    });
  };

  const handleUpdatePlayerSpawn = (
    spawnId: string,
    update: (
      draft: MapEditorPlayerSpawnDraftSnapshot
    ) => MapEditorPlayerSpawnDraftSnapshot
  ) => {
    handleProjectAuthoringChange((currentProject) =>
      updateMapEditorPlayerSpawnDraft(currentProject, spawnId, update)
    );
  };

  const handleUpdatePlayerSpawnSelection = (
    update: (
      draft: MapEditorPlayerSpawnSelectionDraftSnapshot
    ) => MapEditorPlayerSpawnSelectionDraftSnapshot
  ) => {
    handleProjectAuthoringChange((currentProject) =>
      updateMapEditorPlayerSpawnSelectionDraft(currentProject, update)
    );
  };

  const handleUpdateSceneObject = (
    objectId: string,
    update: (
      draft: MapEditorSceneObjectDraftSnapshot
    ) => MapEditorSceneObjectDraftSnapshot
  ) => {
    handleProjectAuthoringChange((currentProject) =>
      updateMapEditorSceneObjectDraft(currentProject, objectId, update)
    );
  };

  const handleUpdateWaterRegion = (
    waterRegionId: string,
    update: (
      draft: MapEditorWaterRegionDraftSnapshot
    ) => MapEditorWaterRegionDraftSnapshot
  ) => {
    handleProjectAuthoringChange((currentProject) =>
      updateMapEditorWaterRegionDraft(currentProject, waterRegionId, update)
    );
  };

  const handleUpdateRegion = (
    regionId: string,
    update: (
      draft: MapEditorRegionDraftSnapshot
    ) => MapEditorRegionDraftSnapshot
  ) => {
    handleProjectAuthoringChange((currentProject) =>
      updateMapEditorRegionDraft(currentProject, regionId, update)
    );
  };

  const handleUpdateEdge = (
    edgeId: string,
    update: (draft: MapEditorEdgeDraftSnapshot) => MapEditorEdgeDraftSnapshot
  ) => {
    handleProjectAuthoringChange((currentProject) =>
      updateMapEditorEdgeDraft(currentProject, edgeId, update)
    );
  };

  const handleUpdateConnector = (
    connectorId: string,
    update: (
      draft: MapEditorConnectorDraftSnapshot
    ) => MapEditorConnectorDraftSnapshot
  ) => {
    handleProjectAuthoringChange((currentProject) =>
      updateMapEditorConnectorDraft(currentProject, connectorId, update)
    );
  };

  const handleUpdateSurface = (
    surfaceId: string,
    update: (
      draft: MapEditorSurfaceDraftSnapshot
    ) => MapEditorSurfaceDraftSnapshot
  ) => {
    handleProjectAuthoringChange((currentProject) =>
      updateMapEditorSurfaceDraft(currentProject, surfaceId, update)
    );
  };

  const handleUpdateTerrainChunk = (
    chunkId: string,
    update: (
      draft: MapEditorTerrainChunkDraftSnapshot
    ) => MapEditorTerrainChunkDraftSnapshot
  ) => {
    handleProjectAuthoringChange((currentProject) =>
      updateMapEditorTerrainChunkDraft(currentProject, chunkId, update)
    );
  };

  useEffect(() => {
    if (project.selectedEntityRef !== null) {
      setActiveRightPaneTab("selection");
      return;
    }

    setActiveRightPaneTab((currentTab) =>
      currentTab === "selection" ? "world" : currentTab
    );
  }, [project.selectedEntityRef]);

  useEffect(() => {
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isEditableKeyboardTarget(event.target)) {
        return;
      }

      if (
        event.repeat !== true &&
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "z"
      ) {
        event.preventDefault();
        handleUndoProjectChangeRequest();
        return;
      }

      if (
        event.repeat !== true &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        event.key === "Delete"
      ) {
        event.preventDefault();
        handleDeleteSelectedEntityRequest();
      }
    };

    globalThis.window.addEventListener("keydown", handleWindowKeyDown);

    return () => {
      globalThis.window.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, []);

  const handleValidateAndRunRequest = async () => {
    setRunInProgress(true);
    setRunStatusMessage("Registering preview bundle with local authority...");
    const runPreviewResult = await validateAndRegisterMapEditorPreviewBundle(
      project
    );

    setRunInProgress(false);

    if (!runPreviewResult.validation.valid || runPreviewResult.launchSelection === null) {
      setRunStatusMessage(
        runPreviewResult.registrationError ??
          runPreviewResult.validation.errors[0] ??
          "The map draft failed validation."
      );
      return;
    }

    setRunStatusMessage(
      selectedLaunchVariation === null
        ? `Preview bundle ${runPreviewResult.launchSelection.bundleLabel} exported to the runtime registry.`
        : `Running ${selectedLaunchVariation.label} on ${runPreviewResult.launchSelection.bundleLabel}.`
    );
    saveMapEditorProject(browserStorage, project);
    applyStoredMetaverseWorldBundleOverride(browserStorage, project.bundleId);
    onRunPreviewRequest(runPreviewResult.launchSelection);
  };

  return (
    <section className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,rgb(14_165_233/0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgb(251_146_60/0.12),transparent_24%),linear-gradient(180deg,rgb(2_6_23),rgb(15_23_42))] text-foreground">
      <header className="shrink-0 border-b border-border/70 bg-background/92 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-border/70 bg-muted/80">
              <Layers3Icon />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                Engine Tool
              </p>
              <h1 className="truncate font-heading text-xl font-semibold tracking-tight">
                Map Editor Suite
              </h1>
            </div>
          </div>

          <Badge variant="secondary">
            <StableInlineText
              reserveTexts={bundleLabelReserveTexts}
              stabilizeNumbers={false}
              text={project.bundleLabel}
            />
          </Badge>
          <Badge variant="outline">
            <StableInlineText
              reserveTexts={placementCountReserveTexts}
              text={`${project.placementDrafts.length} module${
                project.placementDrafts.length === 1 ? "" : "s"
              }`}
            />
          </Badge>
          <Badge variant="outline">
            <StableInlineText
              reserveTexts={playerSpawnCountReserveTexts}
              text={`${project.playerSpawnDrafts.length} player spawn${
                project.playerSpawnDrafts.length === 1 ? "" : "s"
              }`}
            />
          </Badge>
          <Badge variant="outline">
            <StableInlineText
              reserveTexts={waterRegionCountReserveTexts}
              text={`${project.waterRegionDrafts.length} water region${
                project.waterRegionDrafts.length === 1 ? "" : "s"
              }`}
            />
          </Badge>
          {selectedLaunchVariation !== null ? (
            <Badge variant="outline">
              <StableInlineText
                stabilizeNumbers={false}
                text={`Variation: ${selectedLaunchVariation.label}`}
              />
            </Badge>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            <Button onClick={onCloseRequest} type="button" variant="outline">
              <ArrowLeftIcon data-icon="inline-start" />
              <StableInlineText stabilizeNumbers={false} text="Return To Shell" />
            </Button>
            <Button
              disabled={runInProgress}
              onClick={handleSaveDraftRequest}
              type="button"
              variant="outline"
            >
              <StableInlineText stabilizeNumbers={false} text="Save Draft" />
            </Button>
            <Button
              disabled={runInProgress}
              onClick={handleValidateAndRunRequest}
              type="button"
            >
              <PlayIcon data-icon="inline-start" />
              <StableInlineText
                stabilizeNumbers={false}
                text={runInProgress ? "Running..." : "Validate + Run"}
              />
            </Button>
          </div>
        </div>

        {runStatusMessage !== null ? (
          <div className="border-t border-border/70 px-4 py-2 text-sm text-muted-foreground">
            {runStatusMessage}
          </div>
        ) : null}

        <div className="border-t border-border/70 px-4 py-2">
          <MapEditorMenubar
            canDeleteSelectedEntity={project.selectedEntityRef !== null}
            canResetSelectedTransform={selectedPlacement !== null}
            canUndoProjectChange={canUndoProjectChange}
            onCloseRequest={onCloseRequest}
            onDeleteSelectedEntityRequest={handleDeleteSelectedEntityRequest}
            onResetDraftRequest={handleResetDraftRequest}
            onResetSelectedTransformRequest={handleResetSelectedTransformRequest}
            onSaveDraftRequest={handleSaveDraftRequest}
            onUndoProjectChangeRequest={handleUndoProjectChangeRequest}
            onValidateAndRunRequest={handleValidateAndRunRequest}
            onViewportHelperVisibilityChange={
              handleViewportHelperVisibilityChange
            }
            viewportHelperVisibility={viewportHelperVisibility}
            onViewportToolModeChange={setViewportToolMode}
            viewportToolMode={viewportToolMode}
          />
        </div>

        <MapEditorToolbar
          activeModuleAssetLabel={activeModuleAssetId}
          builderToolState={builderToolState}
          onBundleChange={handleBundleChange}
          onBuilderToolStateChange={handleBuilderToolStateChange}
          onResetDraftRequest={handleResetDraftRequest}
          onSaveDraftRequest={handleSaveDraftRequest}
          onViewportToolModeChange={setViewportToolMode}
          registryEntries={registryEntries}
          selectedBundleId={selectedBundleId}
          viewportToolMode={viewportToolMode}
        />
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        <ResizablePanelGroup className="h-full min-h-0" orientation="horizontal">
          <ResizablePanel
            collapsedSize={5}
            collapsible
            defaultSize={22}
            minSize={18}
            panelRef={(panelApi) => {
              sceneRailPanelApiRef.current = panelApi;
            }}
          >
            <MapEditorSceneRail
              activeModuleAssetId={activeModuleAssetId}
              activeViewportToolMode={viewportToolMode}
              assetCatalogEntries={environmentPropManifest.environmentAssets}
              collapsed={sceneRailCollapsed}
              onActivateModuleAssetId={handleActivateModuleAssetId}
              onActivateViewportToolMode={handleActivateViewportToolMode}
              onAddConnector={handleAddConnector}
              onAddEdge={handleAddEdge}
              onAddModuleFromAsset={handleAddModuleFromAsset}
              onAddPlayerSpawn={handleAddPlayerSpawn}
              onAddRegion={handleAddRegion}
              onAddSceneObject={handleAddSceneObject}
              onAddSurface={handleAddSurface}
              onCollapsedChange={(collapsed) => {
                if (collapsed) {
                  sceneRailPanelApiRef.current?.collapse();
                } else {
                  sceneRailPanelApiRef.current?.expand();
                }
                setSceneRailCollapsed(collapsed);
              }}
              onSectionOpenChange={handleSectionOpenChange}
              onSelectEntityRef={handleSelectEntity}
              project={project}
              readSectionOpen={readSectionOpen}
              selectedEntityRef={project.selectedEntityRef}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={50} minSize={34}>
            <MapEditorViewportPane
              activeModuleAssetId={activeModuleAssetId}
              builderToolState={builderToolState}
              bundleId={project.bundleId}
              connectorDrafts={project.connectorDrafts}
              edgeDrafts={project.edgeDrafts}
              onApplyTerrainBrushAtPosition={handleApplyTerrainBrushAtPosition}
              onCommitPathSegment={handleCommitPathSegment}
              onCommitPlacementTransform={handleCommitViewportPlacementTransform}
              onCommitPlayerSpawnTransform={
                handleCommitViewportPlayerSpawnTransform
              }
              onCommitWallSegment={handleCommitWallSegment}
              onCreateModuleAtPosition={handleCreateModuleAtPosition}
              onCreateWaterRegionAtPosition={handleCreateWaterRegionAtPosition}
              onSelectEntity={handleSelectEntity}
              placementDrafts={project.placementDrafts}
              playerSpawnDrafts={project.playerSpawnDrafts}
              regionDrafts={project.regionDrafts}
              sceneObjectDrafts={project.sceneObjectDrafts}
              selectedEntityRef={project.selectedEntityRef}
              surfaceDrafts={project.surfaceDrafts}
              terrainChunkDrafts={project.terrainChunkDrafts}
              waterRegionDrafts={project.waterRegionDrafts}
              viewportHelperVisibility={viewportHelperVisibility}
              viewportToolMode={viewportToolMode}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={28} minSize={24}>
            <Tabs
              className="flex h-full min-h-0 flex-col overflow-hidden bg-background/70"
              onValueChange={(nextTab) => {
                if (nextTab === "selection" || nextTab === "world") {
                  setActiveRightPaneTab(nextTab);
                }
              }}
              value={activeRightPaneTab}
            >
              <div className="shrink-0 border-b border-border/70 px-4 py-3">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="selection">Selection</TabsTrigger>
                  <TabsTrigger value="world">World</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent
                className="mt-0 min-h-0 flex-1 overflow-hidden"
                value="selection"
              >
                <MapEditorSelectionPane
                  onDeleteSelectedEntityRequest={handleDeleteSelectedEntityRequest}
                  onSectionOpenChange={handleSectionOpenChange}
                  onUpdateConnector={handleUpdateConnector}
                  onUpdateEdge={handleUpdateEdge}
                  onUpdatePlayerSpawn={handleUpdatePlayerSpawn}
                  onUpdatePlayerSpawnSelection={handleUpdatePlayerSpawnSelection}
                  onUpdateRegion={handleUpdateRegion}
                  onUpdateSceneObject={handleUpdateSceneObject}
                  onUpdateSelectedPlacement={handleUpdateSelectedPlacement}
                  onUpdateSurface={handleUpdateSurface}
                  onUpdateTerrainChunk={handleUpdateTerrainChunk}
                  onUpdateWaterRegion={handleUpdateWaterRegion}
                  project={project}
                  readSectionOpen={readSectionOpen}
                  selectedEntityRef={project.selectedEntityRef}
                />
              </TabsContent>

              <TabsContent
                className="mt-0 min-h-0 flex-1 overflow-hidden"
                value="world"
              >
                <MapEditorWorldPane
                  onSectionOpenChange={handleSectionOpenChange}
                  onAddLaunchVariation={handleAddLaunchVariation}
                  onSelectLaunchVariation={handleSelectLaunchVariation}
                  onUpdateEnvironmentPresentationProfileId={
                    handleUpdateEnvironmentPresentationProfileId
                  }
                  onUpdateGameplayProfileId={handleUpdateGameplayProfileId}
                  onUpdateLaunchVariation={handleUpdateLaunchVariation}
                  project={project}
                  readSectionOpen={readSectionOpen}
                  runInProgress={runInProgress}
                  runStatusMessage={runStatusMessage}
                  selectedLaunchVariation={selectedLaunchVariation}
                />
              </TabsContent>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </section>
  );
}
