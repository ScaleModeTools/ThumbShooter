import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { MapEditorEditableNumberInput } from "@/engine-tool/components/map-editor-editable-number-input";
import {
  resolveMapEditorWaterRegionSize,
  type MapEditorWaterRegionDraftSnapshot
} from "@/engine-tool/project/map-editor-project-scene-drafts";

interface MapEditorWaterRegionsPanelProps {
  readonly onUpdateWaterRegion: (
    waterRegionId: string,
    update: (draft: MapEditorWaterRegionDraftSnapshot) => MapEditorWaterRegionDraftSnapshot
  ) => void;
  readonly waterRegionDrafts: readonly MapEditorWaterRegionDraftSnapshot[];
}

export function MapEditorWaterRegionsPanel({
  onUpdateWaterRegion,
  waterRegionDrafts
}: MapEditorWaterRegionsPanelProps) {
  if (waterRegionDrafts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
        No authored water regions exist for this map.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/25 p-3">
      {waterRegionDrafts.map((waterRegionDraft) => {
        const runtimeSize = resolveMapEditorWaterRegionSize(waterRegionDraft);

        return (
          <div className="flex flex-col gap-4" key={waterRegionDraft.waterRegionId}>
            <div>
              <p className="text-sm font-medium">Water Region</p>
              <p className="text-xs text-muted-foreground">
                {waterRegionDraft.waterRegionId}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${waterRegionDraft.waterRegionId}-center-x`}>
                  Center X
                </Label>
                <MapEditorEditableNumberInput
                  id={`${waterRegionDraft.waterRegionId}-center-x`}
                  onValueChange={(nextValue) => {
                    onUpdateWaterRegion(waterRegionDraft.waterRegionId, (draft) => ({
                      ...draft,
                      footprint: {
                        ...draft.footprint,
                        centerX: nextValue
                      }
                    }));
                  }}
                  value={waterRegionDraft.footprint.centerX}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${waterRegionDraft.waterRegionId}-center-z`}>
                  Center Z
                </Label>
                <MapEditorEditableNumberInput
                  id={`${waterRegionDraft.waterRegionId}-center-z`}
                  onValueChange={(nextValue) => {
                    onUpdateWaterRegion(waterRegionDraft.waterRegionId, (draft) => ({
                      ...draft,
                      footprint: {
                        ...draft.footprint,
                        centerZ: nextValue
                      }
                    }));
                  }}
                  value={waterRegionDraft.footprint.centerZ}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${waterRegionDraft.waterRegionId}-size-x`}>
                  Width Cells
                </Label>
                <MapEditorEditableNumberInput
                  decimals={0}
                  id={`${waterRegionDraft.waterRegionId}-size-x`}
                  onValueChange={(nextValue) => {
                    onUpdateWaterRegion(waterRegionDraft.waterRegionId, (draft) => ({
                      ...draft,
                      footprint: {
                        ...draft.footprint,
                        sizeCellsX: Math.max(1, Math.round(nextValue))
                      }
                    }));
                  }}
                  value={waterRegionDraft.footprint.sizeCellsX}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${waterRegionDraft.waterRegionId}-size-z`}>
                  Length Cells
                </Label>
                <MapEditorEditableNumberInput
                  decimals={0}
                  id={`${waterRegionDraft.waterRegionId}-size-z`}
                  onValueChange={(nextValue) => {
                    onUpdateWaterRegion(waterRegionDraft.waterRegionId, (draft) => ({
                      ...draft,
                      footprint: {
                        ...draft.footprint,
                        sizeCellsZ: Math.max(1, Math.round(nextValue))
                      }
                    }));
                  }}
                  value={waterRegionDraft.footprint.sizeCellsZ}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${waterRegionDraft.waterRegionId}-depth`}>
                  Depth
                </Label>
                <MapEditorEditableNumberInput
                  id={`${waterRegionDraft.waterRegionId}-depth`}
                  onValueChange={(nextValue) => {
                    onUpdateWaterRegion(waterRegionDraft.waterRegionId, (draft) => ({
                      ...draft,
                      depthMeters: Math.max(0.5, nextValue)
                    }));
                  }}
                  value={waterRegionDraft.depthMeters}
                />
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${waterRegionDraft.waterRegionId}-color`}>
                  Preview Color
                </Label>
                <Input
                  id={`${waterRegionDraft.waterRegionId}-color`}
                  onChange={(event) => {
                    onUpdateWaterRegion(waterRegionDraft.waterRegionId, (draft) => ({
                      ...draft,
                      previewColorHex: event.target.value
                    }));
                  }}
                  value={waterRegionDraft.previewColorHex}
                />
              </div>
              <div
                className="mt-auto h-10 rounded-xl border border-border/70"
                style={{ backgroundColor: waterRegionDraft.previewColorHex }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <Label htmlFor={`${waterRegionDraft.waterRegionId}-top`}>
                  Top Elevation
                </Label>
                <span className="text-muted-foreground">
                  {waterRegionDraft.topElevationMeters.toFixed(2)}m
                </span>
              </div>
              <Slider
                id={`${waterRegionDraft.waterRegionId}-top`}
                max={32}
                min={-16}
                onValueChange={([nextValue = waterRegionDraft.topElevationMeters]) => {
                  onUpdateWaterRegion(waterRegionDraft.waterRegionId, (draft) => ({
                    ...draft,
                    topElevationMeters: nextValue
                  }));
                }}
                step={0.5}
                value={[waterRegionDraft.topElevationMeters]}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <Label htmlFor={`${waterRegionDraft.waterRegionId}-opacity`}>
                  Preview Opacity
                </Label>
                <span className="text-muted-foreground">
                  {waterRegionDraft.previewOpacity.toFixed(2)}
                </span>
              </div>
              <Slider
                id={`${waterRegionDraft.waterRegionId}-opacity`}
                max={0.95}
                min={0.1}
                onValueChange={([nextValue = waterRegionDraft.previewOpacity]) => {
                  onUpdateWaterRegion(waterRegionDraft.waterRegionId, (draft) => ({
                    ...draft,
                    previewOpacity: nextValue
                  }));
                }}
                step={0.01}
                value={[waterRegionDraft.previewOpacity]}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Runtime footprint {runtimeSize.x.toFixed(1)} x {runtimeSize.z.toFixed(1)} at{" "}
              depth {runtimeSize.y.toFixed(1)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
