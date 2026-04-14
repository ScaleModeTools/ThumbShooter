import { useEffect, useState } from "react";

import {
  ArrowDownToLineIcon,
  ClipboardCopyIcon,
  FilePenLineIcon,
  RefreshCwIcon,
  SaveIcon
} from "lucide-react";

import type {
  MetaverseWorldSurfaceAssetAuthoring,
  MetaverseWorldSurfaceColliderAuthoring,
  MetaverseWorldSurfacePlacementId,
  MetaverseWorldSurfacePlacementSnapshot
} from "@webgpu-metaverse/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";

import {
  appendMetaverseWorldSurfaceAuthoringPlacement,
  createMetaverseWorldSurfaceAuthoringDocument,
  createMetaverseWorldSurfaceAuthoringDocumentFromAssets,
  duplicateMetaverseWorldSurfaceAuthoringPlacement,
  metaverseWorldAuthoringSourceFileName,
  metaverseWorldAuthoringSourcePath,
  parseMetaverseWorldSurfaceAuthoringDocument,
  readMetaverseWorldSurfaceAuthoringPlacement,
  removeMetaverseWorldSurfaceAuthoringPlacement,
  serializeMetaverseWorldSurfaceAuthoringDataModule,
  summarizeMetaverseWorldSurfaceAuthoring,
  updateMetaverseWorldSurfaceAuthoringPlacement,
  type MetaverseWorldAuthoringDocumentSnapshot,
  type MetaverseWorldAuthoringPlacementReference
} from "../states/metaverse-world-authoring";

interface BrowserWritableFile {
  close(): Promise<void>;
  write(contents: string): Promise<void>;
}

interface BrowserWritableFileHandle {
  readonly name: string;
  createWritable(): Promise<BrowserWritableFile>;
}

type BrowserShowSaveFilePicker = (options: {
  suggestedName?: string;
  types?: readonly {
    readonly accept: Readonly<Record<string, readonly string[]>>;
    readonly description: string;
  }[];
}) => Promise<BrowserWritableFileHandle>;

interface MetaverseWorldAuthoringStatus {
  readonly detail: string;
  readonly label: string;
  readonly tone: "error" | "info" | "success";
}

interface MetaverseWorldAuthoringPlacementFootprint {
  readonly depth: number;
  readonly width: number;
}

interface MetaverseWorldAuthoringPlacementViewModel {
  readonly assetLabel: string;
  readonly assetPlacement: MetaverseWorldSurfacePlacementId;
  readonly environmentAssetId: string;
  readonly footprint: MetaverseWorldAuthoringPlacementFootprint;
  readonly placement: MetaverseWorldSurfacePlacementSnapshot;
  readonly placementIndex: number;
  readonly placementReference: MetaverseWorldAuthoringPlacementReference;
  readonly surfaceColliderCount: number;
  readonly surfaceColliders: readonly MetaverseWorldSurfaceColliderAuthoring[];
}

interface MetaverseWorldAuthoringWorkspaceBounds {
  readonly gridStep: number;
  readonly maxX: number;
  readonly maxZ: number;
  readonly minX: number;
  readonly minZ: number;
  readonly scale: number;
}

interface MetaverseWorldAuthoringDragState {
  readonly bounds: MetaverseWorldAuthoringWorkspaceBounds;
  readonly originPosition: MetaverseWorldSurfacePlacementSnapshot["position"];
  readonly pointerId: number;
  readonly pointerStartWorldX: number;
  readonly pointerStartWorldZ: number;
  readonly selection: MetaverseWorldAuthoringPlacementReference;
}

const metaverseWorldWorkspaceWidth = 960;
const metaverseWorldWorkspaceHeight = 640;
const metaverseWorldWorkspacePadding = 56;
const metaverseWorldWorkspaceMinimumSpan = 14;
const metaverseWorldRotationStepDegrees = 15;
const metaverseWorldPositionStep = 0.5;
const metaverseWorldVerticalStep = 0.25;
const metaverseWorldScaleStep = 0.1;

const initialValidatedDocument = createInitialValidatedDocument();
const initialPlacementReference =
  resolveDefaultPlacementReference(initialValidatedDocument.surfaceAssets);

function createInitialValidatedDocument() {
  return parseMetaverseWorldSurfaceAuthoringDocument(
    createMetaverseWorldSurfaceAuthoringDocument()
  );
}

function resolveShowSaveFilePicker(): BrowserShowSaveFilePicker | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    (window as Window & { showSaveFilePicker?: BrowserShowSaveFilePicker })
      .showSaveFilePicker ?? null
  );
}

function resolveStatusVariant(status: MetaverseWorldAuthoringStatus["tone"]) {
  switch (status) {
    case "error":
      return "destructive";
    case "success":
      return "secondary";
    default:
      return "outline";
  }
}

function resolvePlacementTint(
  placement: MetaverseWorldSurfacePlacementId
): {
  readonly fill: string;
  readonly stroke: string;
} {
  switch (placement) {
    case "dynamic":
      return {
        fill: "rgb(244 63 94 / 0.22)",
        stroke: "rgb(251 113 133 / 0.92)"
      };
    case "static":
      return {
        fill: "rgb(249 115 22 / 0.16)",
        stroke: "rgb(251 146 60 / 0.92)"
      };
    default:
      return {
        fill: "rgb(56 189 248 / 0.18)",
        stroke: "rgb(125 211 252 / 0.92)"
      };
  }
}

function joinClassNames(
  ...tokens: readonly (false | null | string | undefined)[]
): string {
  return tokens.filter((token) => typeof token === "string").join(" ");
}

function formatEnvironmentAssetLabel(environmentAssetId: string): string {
  return environmentAssetId
    .replace(/-v\d+$/u, "")
    .split("-")
    .filter((segment) => segment.length > 0)
    .map((segment) => `${segment[0]?.toUpperCase() ?? ""}${segment.slice(1)}`)
    .join(" ");
}

function resolveAssetLabel(environmentAssetId: string): string {
  return formatEnvironmentAssetLabel(environmentAssetId);
}

function triggerSourceDownload(contents: string): void {
  const blob = new Blob([contents], {
    type: "text/plain;charset=utf-8"
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = metaverseWorldAuthoringSourceFileName;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

function isSamePlacementReference(
  left: MetaverseWorldAuthoringPlacementReference | null,
  right: MetaverseWorldAuthoringPlacementReference | null
): boolean {
  if (left === right) {
    return true;
  }

  if (left === null || right === null) {
    return false;
  }

  return (
    left.environmentAssetId === right.environmentAssetId &&
    left.placementIndex === right.placementIndex
  );
}

function resolveDefaultPlacementReference(
  assets: readonly MetaverseWorldSurfaceAssetAuthoring[]
): MetaverseWorldAuthoringPlacementReference | null {
  for (const asset of assets) {
    if (asset.placements.length === 0) {
      continue;
    }

    return {
      environmentAssetId: asset.environmentAssetId,
      placementIndex: 0
    };
  }

  return null;
}

function resolvePlacementFootprint(
  surfaceColliders: readonly MetaverseWorldSurfaceColliderAuthoring[],
  scale: number
): MetaverseWorldAuthoringPlacementFootprint {
  if (surfaceColliders.length === 0) {
    const size = Math.max(scale, 0.9);

    return {
      depth: size,
      width: size
    };
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const collider of surfaceColliders) {
    const halfWidth = Math.abs(collider.size.x * scale) * 0.5;
    const halfDepth = Math.abs(collider.size.z * scale) * 0.5;
    const centerX = collider.center.x * scale;
    const centerZ = collider.center.z * scale;

    minX = Math.min(minX, centerX - halfWidth);
    maxX = Math.max(maxX, centerX + halfWidth);
    minZ = Math.min(minZ, centerZ - halfDepth);
    maxZ = Math.max(maxZ, centerZ + halfDepth);
  }

  return {
    depth: Math.max(maxZ - minZ, 0.75),
    width: Math.max(maxX - minX, 0.75)
  };
}

function resolvePlacementViewModels(
  assets: readonly MetaverseWorldSurfaceAssetAuthoring[]
): readonly MetaverseWorldAuthoringPlacementViewModel[] {
  return assets.flatMap((asset) =>
    asset.placements.map((placement, placementIndex) => ({
      assetLabel: resolveAssetLabel(asset.environmentAssetId),
      assetPlacement: asset.placement,
      environmentAssetId: asset.environmentAssetId,
      footprint: resolvePlacementFootprint(
        asset.surfaceColliders,
        placement.scale
      ),
      placement,
      placementIndex,
      placementReference: {
        environmentAssetId: asset.environmentAssetId,
        placementIndex
      },
      surfaceColliderCount: asset.surfaceColliders.length,
      surfaceColliders: asset.surfaceColliders
    }))
  );
}

function resolveGridStep(span: number): number {
  const targetStep = Math.max(span / 8, 1);
  const magnitude = 10 ** Math.floor(Math.log10(targetStep));

  for (const multiplier of [1, 2, 5, 10]) {
    const candidate = magnitude * multiplier;

    if (candidate >= targetStep) {
      return candidate;
    }
  }

  return magnitude * 10;
}

function resolveWorkspaceBounds(
  placements: readonly MetaverseWorldAuthoringPlacementViewModel[]
): MetaverseWorldAuthoringWorkspaceBounds {
  let minX = 0;
  let maxX = 0;
  let minZ = 0;
  let maxZ = 0;

  for (const placement of placements) {
    const radius =
      Math.max(placement.footprint.width, placement.footprint.depth) * 0.8 + 1.2;

    minX = Math.min(minX, placement.placement.position.x - radius);
    maxX = Math.max(maxX, placement.placement.position.x + radius);
    minZ = Math.min(minZ, placement.placement.position.z - radius);
    maxZ = Math.max(maxZ, placement.placement.position.z + radius);
  }

  const centerX = (minX + maxX) * 0.5;
  const centerZ = (minZ + maxZ) * 0.5;
  const spanX = Math.max(maxX - minX + 8, metaverseWorldWorkspaceMinimumSpan);
  const spanZ = Math.max(maxZ - minZ + 8, metaverseWorldWorkspaceMinimumSpan);
  const scale = Math.min(
    (metaverseWorldWorkspaceWidth - metaverseWorldWorkspacePadding * 2) / spanX,
    (metaverseWorldWorkspaceHeight - metaverseWorldWorkspacePadding * 2) / spanZ
  );

  return {
    gridStep: resolveGridStep(Math.max(spanX, spanZ)),
    maxX: centerX + spanX * 0.5,
    maxZ: centerZ + spanZ * 0.5,
    minX: centerX - spanX * 0.5,
    minZ: centerZ - spanZ * 0.5,
    scale
  };
}

function projectWorldToWorkspace(
  bounds: MetaverseWorldAuthoringWorkspaceBounds,
  x: number,
  z: number
) {
  return {
    x: metaverseWorldWorkspacePadding + (x - bounds.minX) * bounds.scale,
    y:
      metaverseWorldWorkspaceHeight -
      metaverseWorldWorkspacePadding -
      (z - bounds.minZ) * bounds.scale
  };
}

function readPointerWorldPosition(
  bounds: MetaverseWorldAuthoringWorkspaceBounds,
  svgElement: SVGSVGElement,
  clientX: number,
  clientY: number
) {
  const rect = svgElement.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const svgX = ((clientX - rect.left) / rect.width) * metaverseWorldWorkspaceWidth;
  const svgY =
    ((clientY - rect.top) / rect.height) * metaverseWorldWorkspaceHeight;

  return {
    x: bounds.minX + (svgX - metaverseWorldWorkspacePadding) / bounds.scale,
    z:
      bounds.minZ +
      (metaverseWorldWorkspaceHeight -
        metaverseWorldWorkspacePadding -
        svgY) /
        bounds.scale
  };
}

function resolveColliderWorldCenter(
  collider: MetaverseWorldSurfaceColliderAuthoring,
  placement: MetaverseWorldSurfacePlacementSnapshot
) {
  const scaledCenterX = collider.center.x * placement.scale;
  const scaledCenterZ = collider.center.z * placement.scale;
  const sine = Math.sin(placement.rotationYRadians);
  const cosine = Math.cos(placement.rotationYRadians);

  return {
    x: placement.position.x + scaledCenterX * cosine + scaledCenterZ * sine,
    z: placement.position.z - scaledCenterX * sine + scaledCenterZ * cosine
  };
}

function formatDisplayNumber(value: number, digits = 2): string {
  return value.toFixed(digits);
}

function formatDisplayDegrees(radians: number): string {
  return formatDisplayNumber((radians * 180) / Math.PI, 1);
}

function parseFiniteNumber(value: string): number | null {
  if (value.trim().length === 0) {
    return null;
  }

  const parsedValue = Number.parseFloat(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function MetaverseWorldAuthoringScreen() {
  const [editorDocument, setEditorDocument] = useState(() =>
    createMetaverseWorldSurfaceAuthoringDocument()
  );
  const [selectedSourceFileHandle, setSelectedSourceFileHandle] =
    useState<BrowserWritableFileHandle | null>(null);
  const [validatedDocument, setValidatedDocument] = useState(
    () => initialValidatedDocument
  );
  const [selectedPlacementReference, setSelectedPlacementReference] = useState<
    MetaverseWorldAuthoringPlacementReference | null
  >(() => initialPlacementReference);
  const [showColliders, setShowColliders] = useState(true);
  const [dragState, setDragState] =
    useState<MetaverseWorldAuthoringDragState | null>(null);
  const [status, setStatus] = useState<MetaverseWorldAuthoringStatus>({
    detail:
      "World Builder is now the primary workflow. Drag placements in the layout view, edit water regions in the JSON, then save or export the generated shared source.",
    label: "Ready",
    tone: "info"
  });

  const validatedAssets = validatedDocument.surfaceAssets;
  const validatedWaterRegions = validatedDocument.waterRegions;
  const summary = summarizeMetaverseWorldSurfaceAuthoring(validatedDocument);
  const placementEntries = resolvePlacementViewModels(validatedAssets);
  const selectedPlacementEntry =
    selectedPlacementReference === null
      ? null
      : placementEntries.find((placementEntry) =>
          isSamePlacementReference(
            placementEntry.placementReference,
            selectedPlacementReference
          )
        ) ?? null;
  const generatedSource = serializeMetaverseWorldSurfaceAuthoringDataModule(
    validatedDocument
  );
  const browserSaveSupported = resolveShowSaveFilePicker() !== null;
  const selectedSourceFileLabel =
    selectedSourceFileHandle?.name ?? "No source file selected yet";
  const generatedSourceLineCount = generatedSource.split("\n").length;
  const workspaceBounds = resolveWorkspaceBounds(placementEntries);
  const instancedAssets = validatedAssets.filter(
    (asset) => asset.placement === "instanced"
  );

  useEffect(() => {
    if (
      selectedPlacementReference !== null &&
      readMetaverseWorldSurfaceAuthoringPlacement(
        validatedAssets,
        selectedPlacementReference
      ) !== null
    ) {
      return;
    }

    setSelectedPlacementReference(resolveDefaultPlacementReference(validatedAssets));
  }, [selectedPlacementReference, validatedAssets]);

  function resolveSelectionAfterValidation(
    nextAssets: readonly MetaverseWorldSurfaceAssetAuthoring[]
  ): MetaverseWorldAuthoringPlacementReference | null {
    if (
      selectedPlacementReference !== null &&
      readMetaverseWorldSurfaceAuthoringPlacement(
        nextAssets,
        selectedPlacementReference
      ) !== null
    ) {
      return selectedPlacementReference;
    }

    return resolveDefaultPlacementReference(nextAssets);
  }

  function commitValidatedAssets(
    nextAssets: readonly MetaverseWorldSurfaceAssetAuthoring[],
    nextSelection: MetaverseWorldAuthoringPlacementReference | null,
    nextStatus?: MetaverseWorldAuthoringStatus
  ): void {
    const nextDocument = parseMetaverseWorldSurfaceAuthoringDocument(
      createMetaverseWorldSurfaceAuthoringDocumentFromAssets(
        nextAssets,
        validatedWaterRegions
      )
    );

    setValidatedDocument(nextDocument);
    setEditorDocument(JSON.stringify(nextDocument, null, 2));
    setSelectedPlacementReference(nextSelection);

    if (nextStatus !== undefined) {
      setStatus(nextStatus);
    }
  }

  function commitValidatedDocument(
    nextDocument: MetaverseWorldAuthoringDocumentSnapshot,
    nextSelection: MetaverseWorldAuthoringPlacementReference | null,
    nextStatus?: MetaverseWorldAuthoringStatus
  ): void {
    const normalizedDocument = parseMetaverseWorldSurfaceAuthoringDocument(
      JSON.stringify(nextDocument, null, 2)
    );

    setValidatedDocument(normalizedDocument);
    setEditorDocument(JSON.stringify(normalizedDocument, null, 2));
    setSelectedPlacementReference(nextSelection);

    if (nextStatus !== undefined) {
      setStatus(nextStatus);
    }
  }

  function reportAuthoringError(error: unknown): void {
    setStatus({
      detail:
        error instanceof Error
          ? error.message
          : "The world authoring change could not be applied.",
      label: "Update failed",
      tone: "error"
    });
  }

  function updateSelectedPlacement(
    mutator: (
      placement: MetaverseWorldSurfacePlacementSnapshot
    ) => MetaverseWorldSurfacePlacementSnapshot
  ): void {
    if (selectedPlacementReference === null) {
      return;
    }

    const selectedPlacement = readMetaverseWorldSurfaceAuthoringPlacement(
      validatedAssets,
      selectedPlacementReference
    );

    if (selectedPlacement === null) {
      return;
    }

    try {
      const nextAssets = updateMetaverseWorldSurfaceAuthoringPlacement(
        validatedAssets,
        selectedPlacementReference,
        mutator(selectedPlacement)
      );

      commitValidatedAssets(nextAssets, selectedPlacementReference);
    } catch (error) {
      reportAuthoringError(error);
    }
  }

  function handleResetFromSource(): void {
    const nextDocument = createInitialValidatedDocument();

    setDragState(null);
    commitValidatedDocument(
      nextDocument,
      resolveDefaultPlacementReference(nextDocument.surfaceAssets),
      {
        detail:
          "Reloaded the shipped metaverse surface placements, collider authoring, and water regions from the shared source module.",
        label: "Reset",
        tone: "info"
      }
    );
  }

  function handleValidateAndFormat(): void {
    try {
      const nextDocument =
        parseMetaverseWorldSurfaceAuthoringDocument(editorDocument);

      setDragState(null);
      commitValidatedDocument(
        nextDocument,
        resolveSelectionAfterValidation(nextDocument.surfaceAssets),
        {
          detail:
            "The document is valid and the visual workspace has been rebuilt from the normalized authoring data.",
          label: "Valid",
          tone: "success"
        }
      );
    } catch (error) {
      setStatus({
        detail:
          error instanceof Error
            ? error.message
            : "The world authoring document could not be validated.",
        label: "Validation failed",
        tone: "error"
      });
    }
  }

  async function handleCopySource(): Promise<void> {
    try {
      await navigator.clipboard.writeText(generatedSource);
      setStatus({
        detail:
          "Copied the generated TypeScript data module. You can inspect it or replace the shared source manually.",
        label: "Copied",
        tone: "success"
      });
    } catch (error) {
      setStatus({
        detail:
          error instanceof Error
            ? error.message
            : "Clipboard copy failed in this browser.",
        label: "Copy failed",
        tone: "error"
      });
    }
  }

  function handleDownloadSource(): void {
    triggerSourceDownload(generatedSource);
    setStatus({
      detail:
        "Downloaded the generated TypeScript source for the shared metaverse world authoring data module.",
      label: "Downloaded",
      tone: "success"
    });
  }

  async function handleSaveSourceFile(): Promise<void> {
    const showSaveFilePicker = resolveShowSaveFilePicker();

    if (showSaveFilePicker === null) {
      setStatus({
        detail:
          "This browser does not expose the File System Access API. Use Download or Copy TypeScript instead.",
        label: "Save unavailable",
        tone: "error"
      });
      return;
    }

    try {
      const sourceFileHandle =
        selectedSourceFileHandle ??
        (await showSaveFilePicker({
          suggestedName: metaverseWorldAuthoringSourceFileName,
          types: [
            {
              accept: {
                "text/typescript": [".ts"]
              },
              description: "TypeScript source"
            }
          ]
        }));
      const writableFile = await sourceFileHandle.createWritable();

      await writableFile.write(generatedSource);
      await writableFile.close();

      setSelectedSourceFileHandle(sourceFileHandle);
      setStatus({
        detail: `Saved the generated TypeScript source to ${sourceFileHandle.name}.`,
        label: "Saved",
        tone: "success"
      });
    } catch (error) {
      setStatus({
        detail:
          error instanceof Error
            ? error.message
            : "The source file could not be saved.",
        label: "Save failed",
        tone: "error"
      });
    }
  }

  function handleAddPlacement(environmentAssetId: string): void {
    try {
      const placementMutation = appendMetaverseWorldSurfaceAuthoringPlacement(
        validatedAssets,
        environmentAssetId
      );

      commitValidatedAssets(placementMutation.assets, placementMutation.placement, {
        detail: `Added another ${resolveAssetLabel(environmentAssetId)} placement to the world builder.`,
        label: "Placement added",
        tone: "success"
      });
    } catch (error) {
      reportAuthoringError(error);
    }
  }

  function handleDuplicateSelectedPlacement(): void {
    if (selectedPlacementReference === null) {
      return;
    }

    try {
      const placementMutation = duplicateMetaverseWorldSurfaceAuthoringPlacement(
        validatedAssets,
        selectedPlacementReference
      );

      commitValidatedAssets(placementMutation.assets, placementMutation.placement, {
        detail:
          "Duplicated the selected instanced placement and offset it so you can reposition it immediately.",
        label: "Placement duplicated",
        tone: "success"
      });
    } catch (error) {
      reportAuthoringError(error);
    }
  }

  function handleRemoveSelectedPlacement(): void {
    if (selectedPlacementReference === null) {
      return;
    }

    try {
      const nextAssets = removeMetaverseWorldSurfaceAuthoringPlacement(
        validatedAssets,
        selectedPlacementReference
      );
      const sameSlotSelection = {
        environmentAssetId: selectedPlacementReference.environmentAssetId,
        placementIndex: selectedPlacementReference.placementIndex
      };
      const previousSlotSelection = {
        environmentAssetId: selectedPlacementReference.environmentAssetId,
        placementIndex: Math.max(selectedPlacementReference.placementIndex - 1, 0)
      };
      const nextSelection =
        readMetaverseWorldSurfaceAuthoringPlacement(
          nextAssets,
          sameSlotSelection
        ) !== null
          ? sameSlotSelection
          : readMetaverseWorldSurfaceAuthoringPlacement(
                nextAssets,
                previousSlotSelection
              ) !== null
            ? previousSlotSelection
            : resolveDefaultPlacementReference(nextAssets);

      setDragState(null);
      commitValidatedAssets(nextAssets, nextSelection, {
        detail:
          "Removed the selected instanced placement from the authored world layout.",
        label: "Placement removed",
        tone: "success"
      });
    } catch (error) {
      reportAuthoringError(error);
    }
  }

  function handlePlacementPointerDown(
    event: React.PointerEvent<SVGRectElement>,
    placementReference: MetaverseWorldAuthoringPlacementReference
  ): void {
    const svgElement = event.currentTarget.ownerSVGElement;

    if (svgElement === null) {
      return;
    }

    const worldPosition = readPointerWorldPosition(
      workspaceBounds,
      svgElement,
      event.clientX,
      event.clientY
    );
    const selectedPlacement = readMetaverseWorldSurfaceAuthoringPlacement(
      validatedAssets,
      placementReference
    );

    if (worldPosition === null || selectedPlacement === null) {
      return;
    }

    svgElement.setPointerCapture(event.pointerId);
    setSelectedPlacementReference(placementReference);
    setDragState({
      bounds: workspaceBounds,
      originPosition: selectedPlacement.position,
      pointerId: event.pointerId,
      pointerStartWorldX: worldPosition.x,
      pointerStartWorldZ: worldPosition.z,
      selection: placementReference
    });
  }

  function handleWorkspacePointerMove(
    event: React.PointerEvent<SVGSVGElement>
  ): void {
    if (dragState === null || dragState.pointerId !== event.pointerId) {
      return;
    }

    const worldPosition = readPointerWorldPosition(
      dragState.bounds,
      event.currentTarget,
      event.clientX,
      event.clientY
    );

    if (worldPosition === null) {
      return;
    }

    const deltaX = worldPosition.x - dragState.pointerStartWorldX;
    const deltaZ = worldPosition.z - dragState.pointerStartWorldZ;

    try {
      const nextAssets = updateMetaverseWorldSurfaceAuthoringPlacement(
        validatedAssets,
        dragState.selection,
        {
          position: {
            x: dragState.originPosition.x + deltaX,
            y: dragState.originPosition.y,
            z: dragState.originPosition.z + deltaZ
          },
          rotationYRadians:
            readMetaverseWorldSurfaceAuthoringPlacement(
              validatedAssets,
              dragState.selection
            )?.rotationYRadians ?? 0,
          scale:
            readMetaverseWorldSurfaceAuthoringPlacement(
              validatedAssets,
              dragState.selection
            )?.scale ?? 1
        }
      );

      commitValidatedAssets(nextAssets, dragState.selection);
    } catch (error) {
      reportAuthoringError(error);
      setDragState(null);
    }
  }

  function handleWorkspacePointerRelease(
    event: React.PointerEvent<SVGSVGElement>
  ): void {
    if (dragState === null || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setDragState(null);
  }

  function handlePositionInputChange(
    axis: "x" | "y" | "z",
    value: string
  ): void {
    const parsedValue = parseFiniteNumber(value);

    if (parsedValue === null) {
      return;
    }

    updateSelectedPlacement((placement) => ({
      position: {
        ...placement.position,
        [axis]: parsedValue
      },
      rotationYRadians: placement.rotationYRadians,
      scale: placement.scale
    }));
  }

  function handleRotationInputChange(value: string): void {
    const parsedValue = parseFiniteNumber(value);

    if (parsedValue === null) {
      return;
    }

    updateSelectedPlacement((placement) => ({
      position: placement.position,
      rotationYRadians: (parsedValue * Math.PI) / 180,
      scale: placement.scale
    }));
  }

  function handleScaleInputChange(value: string): void {
    const parsedValue = parseFiniteNumber(value);

    if (parsedValue === null || parsedValue <= 0) {
      return;
    }

    updateSelectedPlacement((placement) => ({
      position: placement.position,
      rotationYRadians: placement.rotationYRadians,
      scale: parsedValue
    }));
  }

  function handleNudgePosition(axis: "x" | "y" | "z", delta: number): void {
    updateSelectedPlacement((placement) => ({
      position: {
        ...placement.position,
        [axis]: placement.position[axis] + delta
      },
      rotationYRadians: placement.rotationYRadians,
      scale: placement.scale
    }));
  }

  function handleRotateDelta(deltaDegrees: number): void {
    updateSelectedPlacement((placement) => ({
      position: placement.position,
      rotationYRadians:
        placement.rotationYRadians + (deltaDegrees * Math.PI) / 180,
      scale: placement.scale
    }));
  }

  function handleScaleDelta(delta: number): void {
    updateSelectedPlacement((placement) => ({
      position: placement.position,
      rotationYRadians: placement.rotationYRadians,
      scale: Math.max(0.1, placement.scale + delta)
    }));
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top_left,rgb(56_189_248/0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgb(251_146_60/0.14),transparent_28%),linear-gradient(180deg,rgb(2_6_23),rgb(15_23_42_/_0.92))] text-foreground">
      <main className="mx-auto flex min-h-dvh max-w-[96rem] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-border/60 bg-card/78 backdrop-blur-lg">
            <CardHeader>
              <CardAction className="flex flex-wrap gap-2">
                <Badge variant="secondary">World builder</Badge>
                <Badge variant="outline">Top-down workspace</Badge>
                <Badge variant="outline">Shared source writer</Badge>
              </CardAction>
              <CardTitle className="font-heading text-2xl tracking-tight sm:text-3xl">
                Metaverse World Builder
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                This is the first pass toward the little in-browser Blender
                tool: drag placements in the layout view, duplicate instanced
                props, tune transforms in the inspector, edit finite water
                regions in the JSON, and export the exact shared data module
                the game already consumes.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-lg border border-border/60 bg-background/56 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Assets
                </p>
                <p className="mt-2 font-heading text-3xl tracking-tight">
                  {summary.assetCount}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/56 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Placements
                </p>
                <p className="mt-2 font-heading text-3xl tracking-tight">
                  {summary.placementCount}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/56 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Colliders
                </p>
                <p className="mt-2 font-heading text-3xl tracking-tight">
                  {summary.surfaceColliderCount}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/56 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Water regions
                </p>
                <p className="mt-2 font-heading text-3xl tracking-tight">
                  {summary.waterRegionCount}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/56 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Source lines
                </p>
                <p className="mt-2 font-heading text-3xl tracking-tight">
                  {generatedSourceLineCount}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/56 p-4 sm:col-span-2 xl:col-span-5">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Shared source path
                </p>
                <p className="mt-2 break-all font-mono text-sm text-foreground/92">
                  {metaverseWorldAuthoringSourcePath}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/78 backdrop-blur-lg">
            <CardHeader>
              <CardTitle>Save modes</CardTitle>
              <CardDescription>
                Chromium on `localhost` can write the generated TypeScript
                directly into the repo file. Other browsers can still export or
                copy the source.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={browserSaveSupported ? "secondary" : "outline"}>
                  {browserSaveSupported
                    ? "Direct file save ready"
                    : "Direct file save unavailable"}
                </Badge>
                <Badge
                  variant={
                    selectedSourceFileHandle === null ? "outline" : "secondary"
                  }
                >
                  {selectedSourceFileLabel}
                </Badge>
              </div>
              <Separator />
              <div className="text-sm leading-6 text-muted-foreground">
                <p>Save writes the generated shared data module.</p>
                <p>Download exports the same file without file-system access.</p>
                <p>
                  Copy TypeScript is the low-friction fallback when you want to
                  inspect the source before replacing the shared file.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="border-border/60 bg-card/78 backdrop-blur-lg">
            <CardHeader>
              <CardAction className="flex flex-wrap gap-2">
                <Toggle
                  onPressedChange={setShowColliders}
                  pressed={showColliders}
                  size="sm"
                  variant="outline"
                >
                  {showColliders ? "Hide colliders" : "Show colliders"}
                </Toggle>
                <Badge variant="outline">Drag to move X/Z</Badge>
                <Badge variant="outline">Inspector handles Y / rotate / scale</Badge>
              </CardAction>
              <CardTitle>Layout workspace</CardTitle>
              <CardDescription>
                This first builder slice is a top-down scene workspace. Select a
                placement, drag it on the plane, then use the inspector to dial
                in height, yaw, and scale.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-[linear-gradient(180deg,rgb(15_23_42),rgb(2_6_23))] shadow-[inset_0_0_0_1px_rgb(148_163_184/0.06)]">
                <svg
                  aria-label="Metaverse world builder workspace"
                  className="aspect-[3/2] w-full touch-none"
                  onPointerCancel={handleWorkspacePointerRelease}
                  onPointerMove={handleWorkspacePointerMove}
                  onPointerUp={handleWorkspacePointerRelease}
                  viewBox={`0 0 ${metaverseWorldWorkspaceWidth} ${metaverseWorldWorkspaceHeight}`}
                >
                  <defs>
                    <pattern
                      height={workspaceBounds.gridStep * workspaceBounds.scale}
                      id="metaverse-world-grid"
                      patternUnits="userSpaceOnUse"
                      width={workspaceBounds.gridStep * workspaceBounds.scale}
                      x={
                        projectWorldToWorkspace(
                          workspaceBounds,
                          Math.floor(workspaceBounds.minX / workspaceBounds.gridStep) *
                            workspaceBounds.gridStep,
                          0
                        ).x
                      }
                      y={
                        projectWorldToWorkspace(
                          workspaceBounds,
                          0,
                          Math.ceil(workspaceBounds.maxZ / workspaceBounds.gridStep) *
                            workspaceBounds.gridStep
                        ).y
                      }
                    >
                      <path
                        d={`M ${workspaceBounds.gridStep * workspaceBounds.scale} 0 L 0 0 0 ${workspaceBounds.gridStep * workspaceBounds.scale}`}
                        fill="none"
                        stroke="rgb(148 163 184 / 0.10)"
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                  <rect
                    fill="url(#metaverse-world-grid)"
                    height={metaverseWorldWorkspaceHeight}
                    width={metaverseWorldWorkspaceWidth}
                    x="0"
                    y="0"
                  />
                  {(() => {
                    const origin = projectWorldToWorkspace(workspaceBounds, 0, 0);

                    return (
                      <g opacity="0.86">
                        <line
                          stroke="rgb(56 189 248 / 0.48)"
                          strokeDasharray="7 7"
                          strokeWidth="2"
                          x1={metaverseWorldWorkspacePadding}
                          x2={metaverseWorldWorkspaceWidth - metaverseWorldWorkspacePadding}
                          y1={origin.y}
                          y2={origin.y}
                        />
                        <line
                          stroke="rgb(251 146 60 / 0.48)"
                          strokeDasharray="7 7"
                          strokeWidth="2"
                          x1={origin.x}
                          x2={origin.x}
                          y1={metaverseWorldWorkspacePadding}
                          y2={metaverseWorldWorkspaceHeight - metaverseWorldWorkspacePadding}
                        />
                        <circle
                          cx={origin.x}
                          cy={origin.y}
                          fill="rgb(248 250 252 / 0.88)"
                          r="4.5"
                        />
                      </g>
                    );
                  })()}
                  {placementEntries.map((placementEntry) => {
                    const tint = resolvePlacementTint(placementEntry.assetPlacement);
                    const center = projectWorldToWorkspace(
                      workspaceBounds,
                      placementEntry.placement.position.x,
                      placementEntry.placement.position.z
                    );
                    const footprintWidth =
                      placementEntry.footprint.width * workspaceBounds.scale;
                    const footprintDepth =
                      placementEntry.footprint.depth * workspaceBounds.scale;
                    const isSelected = isSamePlacementReference(
                      placementEntry.placementReference,
                      selectedPlacementReference
                    );
                    const forwardLength =
                      Math.max(
                        placementEntry.footprint.width,
                        placementEntry.footprint.depth
                      ) *
                        0.7 *
                        workspaceBounds.scale +
                      8;
                    const forwardTip = {
                      x:
                        center.x +
                        Math.sin(placementEntry.placement.rotationYRadians) *
                          forwardLength,
                      y:
                        center.y -
                        Math.cos(placementEntry.placement.rotationYRadians) *
                          forwardLength
                    };

                    return (
                      <g key={`${placementEntry.environmentAssetId}:${placementEntry.placementIndex}`}>
                        {showColliders
                          ? placementEntry.surfaceColliders.map(
                              (collider, colliderIndex) => {
                                const colliderCenter = resolveColliderWorldCenter(
                                  collider,
                                  placementEntry.placement
                                );
                                const colliderScreenCenter = projectWorldToWorkspace(
                                  workspaceBounds,
                                  colliderCenter.x,
                                  colliderCenter.z
                                );
                                const colliderWidth =
                                  Math.abs(
                                    collider.size.x * placementEntry.placement.scale
                                  ) * workspaceBounds.scale;
                                const colliderDepth =
                                  Math.abs(
                                    collider.size.z * placementEntry.placement.scale
                                  ) * workspaceBounds.scale;

                                return (
                                  <g
                                    key={`${placementEntry.environmentAssetId}:${placementEntry.placementIndex}:collider:${colliderIndex}`}
                                    transform={`translate(${colliderScreenCenter.x} ${colliderScreenCenter.y}) rotate(${-formatDisplayNumber((placementEntry.placement.rotationYRadians * 180) / Math.PI, 3)})`}
                                  >
                                    <rect
                                      fill={
                                        collider.traversalAffordance === "support"
                                          ? "rgb(34 197 94 / 0.18)"
                                          : "rgb(248 113 113 / 0.16)"
                                      }
                                      height={Math.max(colliderDepth, 6)}
                                      stroke={
                                        collider.traversalAffordance === "support"
                                          ? "rgb(74 222 128 / 0.7)"
                                          : "rgb(252 165 165 / 0.66)"
                                      }
                                      strokeDasharray="6 4"
                                      strokeWidth={isSelected ? 2.5 : 1.5}
                                      width={Math.max(colliderWidth, 6)}
                                      x={-Math.max(colliderWidth, 6) * 0.5}
                                      y={-Math.max(colliderDepth, 6) * 0.5}
                                    />
                                  </g>
                                );
                              }
                            )
                          : null}
                        <g
                          transform={`translate(${center.x} ${center.y}) rotate(${-formatDisplayNumber((placementEntry.placement.rotationYRadians * 180) / Math.PI, 3)})`}
                        >
                          <rect
                            className="cursor-grab active:cursor-grabbing"
                            fill={tint.fill}
                            height={Math.max(footprintDepth, 14)}
                            onPointerDown={(event) =>
                              handlePlacementPointerDown(
                                event,
                                placementEntry.placementReference
                              )
                            }
                            rx="12"
                            stroke={tint.stroke}
                            strokeWidth={isSelected ? 4 : 2}
                            width={Math.max(footprintWidth, 14)}
                            x={-Math.max(footprintWidth, 14) * 0.5}
                            y={-Math.max(footprintDepth, 14) * 0.5}
                          >
                            <title>{`${placementEntry.assetLabel} ${placementEntry.placementIndex + 1}`}</title>
                          </rect>
                        </g>
                        <line
                          stroke={isSelected ? "rgb(248 250 252)" : tint.stroke}
                          strokeLinecap="round"
                          strokeWidth={isSelected ? 4 : 2.5}
                          x1={center.x}
                          x2={forwardTip.x}
                          y1={center.y}
                          y2={forwardTip.y}
                        />
                        <circle
                          cx={center.x}
                          cy={center.y}
                          fill={isSelected ? "rgb(248 250 252)" : tint.stroke}
                          r={isSelected ? 5 : 3.5}
                        />
                        {isSelected ? (
                          <g transform={`translate(${center.x + 16} ${center.y - 16})`}>
                            <rect
                              fill="rgb(15 23 42 / 0.92)"
                              height="26"
                              rx="9"
                              width={
                                Math.max(placementEntry.assetLabel.length * 7.4 + 58, 164)
                              }
                              x="0"
                              y="-18"
                            />
                            <text
                              fill="rgb(226 232 240)"
                              fontFamily="var(--ui-font-sans)"
                              fontSize="12"
                              y="-1"
                            >
                              {`${placementEntry.assetLabel} ${placementEntry.placementIndex + 1}`}
                            </text>
                          </g>
                        ) : null}
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-background/56 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Selection
                  </p>
                  <p className="mt-2 font-medium text-foreground">
                    {selectedPlacementEntry === null
                      ? "None"
                      : `${selectedPlacementEntry.assetLabel} ${selectedPlacementEntry.placementIndex + 1}`}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/56 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Position
                  </p>
                  <p className="mt-2 font-mono text-sm text-foreground/90">
                    {selectedPlacementEntry === null
                      ? "x 0.00 / y 0.00 / z 0.00"
                      : `x ${formatDisplayNumber(selectedPlacementEntry.placement.position.x)} / y ${formatDisplayNumber(selectedPlacementEntry.placement.position.y)} / z ${formatDisplayNumber(selectedPlacementEntry.placement.position.z)}`}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/56 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Rotation / scale
                  </p>
                  <p className="mt-2 font-mono text-sm text-foreground/90">
                    {selectedPlacementEntry === null
                      ? "0.0° / 1.00"
                      : `${formatDisplayDegrees(selectedPlacementEntry.placement.rotationYRadians)}° / ${formatDisplayNumber(selectedPlacementEntry.placement.scale)}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="border-border/60 bg-card/78 backdrop-blur-lg">
              <CardHeader>
                <CardTitle>Scene placements</CardTitle>
                <CardDescription>
                  Add instanced props from the palette and select any authored
                  placement for direct manipulation.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="rounded-xl border border-border/60 bg-background/56 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Instanced palette
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {instancedAssets.map((asset) => (
                      <Button
                        key={asset.environmentAssetId}
                        onClick={() => handleAddPlacement(asset.environmentAssetId)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Add {resolveAssetLabel(asset.environmentAssetId)}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="max-h-[32rem] space-y-2 overflow-auto pr-1">
                  {placementEntries.map((placementEntry) => {
                    const selected = isSamePlacementReference(
                      placementEntry.placementReference,
                      selectedPlacementReference
                    );

                    return (
                      <button
                        className={joinClassNames(
                          "w-full rounded-xl border p-3 text-left transition-colors",
                          selected
                            ? "border-sky-300/70 bg-sky-400/10 shadow-[inset_0_0_0_1px_rgb(125_211_252/0.26)]"
                            : "border-border/60 bg-background/56 hover:bg-background/72"
                        )}
                        key={`${placementEntry.environmentAssetId}:${placementEntry.placementIndex}:row`}
                        onClick={() =>
                          setSelectedPlacementReference(
                            placementEntry.placementReference
                          )
                        }
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground/96">
                              {placementEntry.assetLabel}{" "}
                              {placementEntry.placementIndex + 1}
                            </p>
                            <p className="mt-1 font-mono text-xs text-muted-foreground">
                              {placementEntry.environmentAssetId}
                            </p>
                          </div>
                          <Badge variant={selected ? "secondary" : "outline"}>
                            {placementEntry.assetPlacement}
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{`x ${formatDisplayNumber(placementEntry.placement.position.x)}`}</span>
                          <span>{`y ${formatDisplayNumber(placementEntry.placement.position.y)}`}</span>
                          <span>{`z ${formatDisplayNumber(placementEntry.placement.position.z)}`}</span>
                          <span>{`${formatDisplayDegrees(placementEntry.placement.rotationYRadians)}°`}</span>
                          <span>{`scale ${formatDisplayNumber(placementEntry.placement.scale)}`}</span>
                          <span>{`${placementEntry.surfaceColliderCount} colliders`}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/78 backdrop-blur-lg">
              <CardHeader>
                <CardAction className="flex flex-wrap gap-2">
                  <Button
                    disabled={
                      selectedPlacementEntry === null ||
                      selectedPlacementEntry.assetPlacement !== "instanced"
                    }
                    onClick={handleDuplicateSelectedPlacement}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Duplicate
                  </Button>
                  <Button
                    disabled={
                      selectedPlacementEntry === null ||
                      selectedPlacementEntry.assetPlacement !== "instanced"
                    }
                    onClick={handleRemoveSelectedPlacement}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Remove
                  </Button>
                </CardAction>
                <CardTitle>Selection inspector</CardTitle>
                <CardDescription>
                  Numeric editing stays precise while the workspace handles quick
                  layout moves.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {selectedPlacementEntry === null ? (
                  <p className="text-sm text-muted-foreground">
                    Select a placement from the workspace or scene list to edit
                    it.
                  </p>
                ) : (
                  <>
                    <div className="rounded-xl border border-border/60 bg-background/56 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {selectedPlacementEntry.assetLabel}{" "}
                            {selectedPlacementEntry.placementIndex + 1}
                          </p>
                          <p className="mt-1 font-mono text-xs text-muted-foreground">
                            {selectedPlacementEntry.environmentAssetId}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {selectedPlacementEntry.assetPlacement}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="metaverse-world-x">Position X</Label>
                        <Input
                          id="metaverse-world-x"
                          onChange={(event) =>
                            handlePositionInputChange("x", event.target.value)
                          }
                          step="0.25"
                          type="number"
                          value={selectedPlacementEntry.placement.position.x}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="metaverse-world-y">Position Y</Label>
                        <Input
                          id="metaverse-world-y"
                          onChange={(event) =>
                            handlePositionInputChange("y", event.target.value)
                          }
                          step="0.25"
                          type="number"
                          value={selectedPlacementEntry.placement.position.y}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="metaverse-world-z">Position Z</Label>
                        <Input
                          id="metaverse-world-z"
                          onChange={(event) =>
                            handlePositionInputChange("z", event.target.value)
                          }
                          step="0.25"
                          type="number"
                          value={selectedPlacementEntry.placement.position.z}
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="metaverse-world-rotation">Rotation Y</Label>
                        <Input
                          id="metaverse-world-rotation"
                          onChange={(event) =>
                            handleRotationInputChange(event.target.value)
                          }
                          step="1"
                          type="number"
                          value={formatDisplayDegrees(
                            selectedPlacementEntry.placement.rotationYRadians
                          )}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="metaverse-world-scale">Scale</Label>
                        <Input
                          id="metaverse-world-scale"
                          min="0.1"
                          onChange={(event) =>
                            handleScaleInputChange(event.target.value)
                          }
                          step="0.05"
                          type="number"
                          value={selectedPlacementEntry.placement.scale}
                        />
                      </div>
                    </div>
                    <Separator />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        onClick={() => handleNudgePosition("x", -metaverseWorldPositionStep)}
                        type="button"
                        variant="outline"
                      >
                        Nudge X -
                      </Button>
                      <Button
                        onClick={() => handleNudgePosition("x", metaverseWorldPositionStep)}
                        type="button"
                        variant="outline"
                      >
                        Nudge X +
                      </Button>
                      <Button
                        onClick={() => handleNudgePosition("z", -metaverseWorldPositionStep)}
                        type="button"
                        variant="outline"
                      >
                        Nudge Z -
                      </Button>
                      <Button
                        onClick={() => handleNudgePosition("z", metaverseWorldPositionStep)}
                        type="button"
                        variant="outline"
                      >
                        Nudge Z +
                      </Button>
                      <Button
                        onClick={() => handleNudgePosition("y", -metaverseWorldVerticalStep)}
                        type="button"
                        variant="outline"
                      >
                        Lower Y
                      </Button>
                      <Button
                        onClick={() => handleNudgePosition("y", metaverseWorldVerticalStep)}
                        type="button"
                        variant="outline"
                      >
                        Raise Y
                      </Button>
                      <Button
                        onClick={() =>
                          handleRotateDelta(-metaverseWorldRotationStepDegrees)
                        }
                        type="button"
                        variant="outline"
                      >
                        Rotate -{metaverseWorldRotationStepDegrees}°
                      </Button>
                      <Button
                        onClick={() =>
                          handleRotateDelta(metaverseWorldRotationStepDegrees)
                        }
                        type="button"
                        variant="outline"
                      >
                        Rotate +{metaverseWorldRotationStepDegrees}°
                      </Button>
                      <Button
                        onClick={() => handleScaleDelta(-metaverseWorldScaleStep)}
                        type="button"
                        variant="outline"
                      >
                        Scale -
                      </Button>
                      <Button
                        onClick={() => handleScaleDelta(metaverseWorldScaleStep)}
                        type="button"
                        variant="outline"
                      >
                        Scale +
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <Card className="border-border/60 bg-card/78 backdrop-blur-lg">
            <CardHeader>
              <CardTitle>World builder workflow</CardTitle>
              <CardDescription>
                This first pass is intentionally narrow: placement layout,
                transform editing, collider preview, and deterministic export
                back into the shared world source.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>Drag in the workspace to move on the ground plane.</p>
              <p>Use the inspector for height, yaw, and exact scale changes.</p>
              <p>
                Instanced props can be added, duplicated, and removed directly
                from the builder.
              </p>
              <p>
                The JSON panel remains available as a power-user escape hatch
                and for debugging authoring diffs.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/78 backdrop-blur-lg">
            <CardHeader>
              <CardAction className="flex flex-wrap gap-2">
                <Button
                  onClick={handleResetFromSource}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <RefreshCwIcon data-icon="inline-start" />
                  Reset
                </Button>
                <Button
                  onClick={handleValidateAndFormat}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <FilePenLineIcon data-icon="inline-start" />
                  Validate + format
                </Button>
              </CardAction>
              <CardTitle>JSON and source export</CardTitle>
              <CardDescription>
                Visual edits write back into the JSON authoring document below.
                Surface placements stay visual-first; water regions and any
                deeper world tuning remain directly editable in JSON.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!browserSaveSupported}
                  onClick={() => void handleSaveSourceFile()}
                  type="button"
                >
                  <SaveIcon data-icon="inline-start" />
                  Save source file
                </Button>
                <Button
                  onClick={handleDownloadSource}
                  type="button"
                  variant="outline"
                >
                  <ArrowDownToLineIcon data-icon="inline-start" />
                  Download
                </Button>
                <Button
                  onClick={() => void handleCopySource()}
                  type="button"
                  variant="outline"
                >
                  <ClipboardCopyIcon data-icon="inline-start" />
                  Copy TypeScript
                </Button>
              </div>
              <Textarea
                aria-label="Metaverse world authoring document"
                className="min-h-[28rem] font-mono text-[0.82rem] leading-6"
                onChange={(event) => {
                  setEditorDocument(event.target.value);
                }}
                spellCheck={false}
                value={editorDocument}
              />
            </CardContent>
            <CardFooter className="flex flex-wrap gap-3 text-sm">
              <Badge variant={resolveStatusVariant(status.tone)}>
                {status.label}
              </Badge>
              <span className="text-muted-foreground">{status.detail}</span>
            </CardFooter>
          </Card>
        </section>
      </main>
    </div>
  );
}
