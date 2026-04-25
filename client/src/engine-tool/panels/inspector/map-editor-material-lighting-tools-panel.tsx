import type {
  MetaverseMapBundleSemanticLightKind,
  MetaverseMapBundleSemanticMaterialId
} from "@webgpu-metaverse/shared/metaverse/world";

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
import {
  formatMapEditorColorHex,
  parseMapEditorColorHex
} from "@/engine-tool/colors/map-editor-color-hex";
import { MapEditorEditableNumberInput } from "@/engine-tool/components/map-editor-editable-number-input";
import {
  mapEditorSemanticMaterialOptions,
  mapEditorTerrainMaterialOptions
} from "@/engine-tool/config/map-editor-material-options";
import type {
  MapEditorBuilderToolStateSnapshot
} from "@/engine-tool/types/map-editor";

interface MapEditorMaterialLightingToolsPanelProps {
  readonly builderToolState: MapEditorBuilderToolStateSnapshot;
  readonly onBuilderToolStateChange: (
    update: (
      currentBuilderToolState: MapEditorBuilderToolStateSnapshot
    ) => MapEditorBuilderToolStateSnapshot
  ) => void;
}

const mapEditorLightKindOptions = Object.freeze(
  [
    Object.freeze({ label: "Point", value: "point" }),
    Object.freeze({ label: "Spot", value: "spot" }),
    Object.freeze({ label: "Ambient", value: "ambient" }),
    Object.freeze({ label: "Sun", value: "sun" })
  ] satisfies readonly {
    readonly label: string;
    readonly value: MetaverseMapBundleSemanticLightKind;
  }[]
);

function readSemanticMaterialId(
  value: string
): MetaverseMapBundleSemanticMaterialId | null {
  return mapEditorSemanticMaterialOptions.find((option) => option.value === value)
    ?.value ?? null;
}

function readLightKind(
  value: string
): MetaverseMapBundleSemanticLightKind | null {
  return mapEditorLightKindOptions.find((option) => option.value === value)
    ?.value ?? null;
}

export function MapEditorMaterialLightingToolsPanel({
  builderToolState,
  onBuilderToolStateChange
}: MapEditorMaterialLightingToolsPanelProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/25 p-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="map-editor-right-active-material">
            Build Material
          </Label>
          <Select
            onValueChange={(nextValue) => {
              const nextMaterialId = readSemanticMaterialId(nextValue);

              if (nextMaterialId !== null) {
                onBuilderToolStateChange((currentBuilderToolState) =>
                  Object.freeze({
                    ...currentBuilderToolState,
                    activeMaterialId: nextMaterialId,
                    activeMaterialReferenceId: nextMaterialId
                  })
                );
              }
            }}
            value={builderToolState.activeMaterialId}
          >
            <SelectTrigger id="map-editor-right-active-material">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {mapEditorSemanticMaterialOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="map-editor-right-terrain-material">
            Terrain Material
          </Label>
          <Select
            onValueChange={(nextValue) => {
              const nextMaterialId = readSemanticMaterialId(nextValue);

              if (nextMaterialId !== null) {
                onBuilderToolStateChange((currentBuilderToolState) =>
                  Object.freeze({
                    ...currentBuilderToolState,
                    terrainMaterialId: nextMaterialId
                  })
                );
              }
            }}
            value={builderToolState.terrainMaterialId}
          >
            <SelectTrigger id="map-editor-right-terrain-material">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {mapEditorTerrainMaterialOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="map-editor-right-light-kind">Light Type</Label>
          <Select
            onValueChange={(nextValue) => {
              const nextLightKind = readLightKind(nextValue);

              if (nextLightKind !== null) {
                onBuilderToolStateChange((currentBuilderToolState) =>
                  Object.freeze({
                    ...currentBuilderToolState,
                    lightKind: nextLightKind
                  })
                );
              }
            }}
            value={builderToolState.lightKind}
          >
            <SelectTrigger id="map-editor-right-light-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {mapEditorLightKindOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="map-editor-right-light-color">Light Color</Label>
          <Input
            className="h-10 cursor-pointer p-1"
            id="map-editor-right-light-color"
            onChange={(event) => {
              onBuilderToolStateChange((currentBuilderToolState) =>
                Object.freeze({
                  ...currentBuilderToolState,
                  lightColor: parseMapEditorColorHex(
                    event.target.value,
                    currentBuilderToolState.lightColor
                  )
                })
              );
            }}
            type="color"
            value={formatMapEditorColorHex(builderToolState.lightColor)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="map-editor-right-light-intensity">
            Light Intensity
          </Label>
          <MapEditorEditableNumberInput
            decimals={1}
            id="map-editor-right-light-intensity"
            onValueChange={(nextValue) => {
              onBuilderToolStateChange((currentBuilderToolState) =>
                Object.freeze({
                  ...currentBuilderToolState,
                  lightIntensity: Math.max(0, nextValue)
                })
              );
            }}
            value={builderToolState.lightIntensity}
          />
        </div>

        {builderToolState.lightKind === "ambient" ||
        builderToolState.lightKind === "sun" ? null : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="map-editor-right-light-range">Light Range</Label>
            <MapEditorEditableNumberInput
              decimals={1}
              id="map-editor-right-light-range"
              onValueChange={(nextValue) => {
                onBuilderToolStateChange((currentBuilderToolState) =>
                  Object.freeze({
                    ...currentBuilderToolState,
                    lightRangeMeters: Math.max(1, nextValue)
                  })
                );
              }}
              value={builderToolState.lightRangeMeters}
            />
          </div>
        )}
      </div>
    </div>
  );
}
