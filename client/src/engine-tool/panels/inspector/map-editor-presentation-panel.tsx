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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { mapEditorMaterialOptions } from "@/engine-tool/config/map-editor-material-options";
import { type MapEditorPlacementDraftSnapshot } from "@/engine-tool/project/map-editor-project-state";
import type { MapEditorPlacementUpdate } from "@/engine-tool/types/map-editor";

interface MapEditorPresentationPanelProps {
  readonly onUpdateSelectedPlacement: (update: MapEditorPlacementUpdate) => void;
  readonly selectedPlacement: MapEditorPlacementDraftSnapshot | null;
}

export function MapEditorPresentationPanel({
  onUpdateSelectedPlacement,
  selectedPlacement
}: MapEditorPresentationPanelProps) {
  if (selectedPlacement === null) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
        Select a placement to edit material and presentation overrides.
      </div>
    );
  }

  const selectedMaterialReferenceId =
    selectedPlacement.materialReferenceId ?? "__default__";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/25 p-3">
      <div className="flex flex-col gap-3">
        <Label htmlFor="map-editor-material-select">Material reference</Label>
        <Select
          onValueChange={(nextValue) => {
            onUpdateSelectedPlacement({
              materialReferenceId:
                nextValue === "__default__" ? null : nextValue
            });
          }}
          value={selectedMaterialReferenceId}
        >
          <SelectTrigger id="map-editor-material-select">
            <SelectValue placeholder="Select material" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {mapEditorMaterialOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <div className="overflow-hidden rounded-xl border border-border/70">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Label</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mapEditorMaterialOptions.map((option) => (
                <TableRow
                  className={
                    selectedMaterialReferenceId === option.value
                      ? "bg-muted/70"
                      : undefined
                  }
                  key={option.value}
                >
                  <TableCell className="font-mono text-xs">
                    {option.value}
                  </TableCell>
                  <TableCell>{option.label}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
