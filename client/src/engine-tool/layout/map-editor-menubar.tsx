import {
  MenubarCheckboxItem,
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger
} from "@/components/ui/menubar";
import type {
  MapEditorViewportHelperId,
  MapEditorViewportHelperVisibilitySnapshot,
  MapEditorViewportToolMode
} from "@/engine-tool/types/map-editor";

interface MapEditorMenubarProps {
  readonly canDeleteSelectedEntity: boolean;
  readonly canResetSelectedTransform: boolean;
  readonly canUndoProjectChange: boolean;
  readonly onCloseRequest: () => void;
  readonly onDeleteSelectedEntityRequest: () => void;
  readonly onResetDraftRequest: () => void;
  readonly onResetSelectedTransformRequest: () => void;
  readonly onSaveDraftRequest: () => void;
  readonly onUndoProjectChangeRequest: () => void;
  readonly onValidateAndRunRequest: () => void;
  readonly onViewportHelperVisibilityChange: (
    helperId: MapEditorViewportHelperId,
    visible: boolean
  ) => void;
  readonly viewportToolMode: MapEditorViewportToolMode;
  readonly viewportHelperVisibility: MapEditorViewportHelperVisibilitySnapshot;
  readonly onViewportToolModeChange: (
    viewportToolMode: MapEditorViewportToolMode
  ) => void;
}

function readViewportToolMode(
  nextValue: string
): MapEditorViewportToolMode | null {
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

export function MapEditorMenubar({
  canDeleteSelectedEntity,
  canResetSelectedTransform,
  canUndoProjectChange,
  onCloseRequest,
  onDeleteSelectedEntityRequest,
  onResetDraftRequest,
  onResetSelectedTransformRequest,
  onSaveDraftRequest,
  onUndoProjectChangeRequest,
  onValidateAndRunRequest,
  onViewportHelperVisibilityChange,
  viewportHelperVisibility,
  viewportToolMode,
  onViewportToolModeChange
}: MapEditorMenubarProps) {
  return (
    <Menubar className="h-auto min-h-8 border-border/70 bg-muted/35">
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={onSaveDraftRequest}>
            Save Draft
            <MenubarShortcut>Ctrl+S</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={onResetDraftRequest}>
            Reset Draft
            <MenubarShortcut>Shift+R</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={onCloseRequest}>
            Return To Shell
            <MenubarShortcut>Esc</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent>
          <MenubarLabel>Selection</MenubarLabel>
          <MenubarItem
            disabled={!canUndoProjectChange}
            onClick={onUndoProjectChangeRequest}
          >
            Undo
            <MenubarShortcut>Ctrl+Z</MenubarShortcut>
          </MenubarItem>
          <MenubarItem
            disabled={!canDeleteSelectedEntity}
            onClick={onDeleteSelectedEntityRequest}
          >
            Delete Selection
            <MenubarShortcut>Del</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem
            disabled={!canResetSelectedTransform}
            onClick={onResetSelectedTransformRequest}
          >
            Reset Selected Transform
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger>View</MenubarTrigger>
        <MenubarContent>
          <MenubarLabel>Helpers</MenubarLabel>
          <MenubarCheckboxItem
            checked={viewportHelperVisibility.grid}
            onCheckedChange={(checked) => {
              onViewportHelperVisibilityChange("grid", checked === true);
            }}
          >
            Grid
          </MenubarCheckboxItem>
          <MenubarCheckboxItem
            checked={viewportHelperVisibility.axes}
            onCheckedChange={(checked) => {
              onViewportHelperVisibilityChange("axes", checked === true);
            }}
          >
            Axes
          </MenubarCheckboxItem>
          <MenubarCheckboxItem
            checked={viewportHelperVisibility.collisionBounds}
            onCheckedChange={(checked) => {
              onViewportHelperVisibilityChange(
                "collisionBounds",
                checked === true
              );
            }}
          >
            Collision Bounds
          </MenubarCheckboxItem>
          <MenubarCheckboxItem
            checked={viewportHelperVisibility.polarGrid}
            onCheckedChange={(checked) => {
              onViewportHelperVisibilityChange("polarGrid", checked === true);
            }}
          >
            Polar Grid
          </MenubarCheckboxItem>
          <MenubarCheckboxItem
            checked={viewportHelperVisibility.selectionBounds}
            onCheckedChange={(checked) => {
              onViewportHelperVisibilityChange(
                "selectionBounds",
                checked === true
              );
            }}
          >
            Selection Bounds
          </MenubarCheckboxItem>

          <MenubarSeparator />
          <MenubarLabel>Viewport Tool</MenubarLabel>
          <MenubarRadioGroup
            onValueChange={(nextValue) => {
              const nextViewportToolMode = readViewportToolMode(nextValue);

              if (nextViewportToolMode !== null) {
                onViewportToolModeChange(nextViewportToolMode);
              }
            }}
            value={viewportToolMode}
          >
            <MenubarRadioItem value="select">Select</MenubarRadioItem>
            <MenubarRadioItem value="terrain">Terrain</MenubarRadioItem>
            <MenubarRadioItem value="wall">Wall</MenubarRadioItem>
            <MenubarRadioItem value="path">Path</MenubarRadioItem>
            <MenubarRadioItem value="water">Water</MenubarRadioItem>
            <MenubarRadioItem value="module">Module</MenubarRadioItem>
            <MenubarRadioItem value="move">Move</MenubarRadioItem>
            <MenubarRadioItem value="rotate">Rotate</MenubarRadioItem>
            <MenubarRadioItem value="scale">Scale</MenubarRadioItem>
          </MenubarRadioGroup>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger>Run</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={onValidateAndRunRequest}>
            Validate + Run
            <MenubarShortcut>Shift+Enter</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
