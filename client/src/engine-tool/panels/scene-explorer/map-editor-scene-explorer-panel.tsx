import { useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import type { MapEditorProjectSnapshot } from "@/engine-tool/project/map-editor-project-state";

interface MapEditorSceneExplorerPanelProps {
  readonly onSelectPlacementId: (placementId: string) => void;
  readonly project: MapEditorProjectSnapshot;
  readonly selectedPlacementId: string | null;
}

function formatPlacementModeLabel(placementMode: string): string {
  return `${placementMode[0]?.toUpperCase() ?? ""}${placementMode.slice(1)}`;
}

export function MapEditorSceneExplorerPanel({
  onSelectPlacementId,
  project,
  selectedPlacementId
}: MapEditorSceneExplorerPanelProps) {
  useEffect(() => {
    if (selectedPlacementId === null) {
      return;
    }

    globalThis.document
      .getElementById(`map-editor-scene-placement-${selectedPlacementId}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedPlacementId]);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/25 p-3">
      <div className="grid gap-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Bundle</span>
          <span className="font-medium">{project.bundleLabel}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Placed objects</span>
          <span className="font-medium">{project.placementDrafts.length}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Player spawns</span>
          <span className="font-medium">{project.playerSpawnDrafts.length}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Scene objects</span>
          <span className="font-medium">{project.sceneObjectDrafts.length}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Water regions</span>
          <span className="font-medium">{project.waterRegionDrafts.length}</span>
        </div>
        <Separator />
        <div className="overflow-hidden rounded-xl border border-border/70">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Mode</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.placementDrafts.map((placement) => (
                <TableRow
                  className={
                    placement.placementId === selectedPlacementId
                      ? "bg-amber-500/10 shadow-[inset_0_0_0_1px_rgb(251_191_36/0.35)]"
                      : undefined
                  }
                  id={`map-editor-scene-placement-${placement.placementId}`}
                  key={placement.placementId}
                  onClick={() => onSelectPlacementId(placement.placementId)}
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span>{placement.assetId}</span>
                        {placement.placementId === selectedPlacementId ? (
                          <Badge variant="outline">Selected</Badge>
                        ) : null}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {placement.placementId}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatPlacementModeLabel(placement.placementMode)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
