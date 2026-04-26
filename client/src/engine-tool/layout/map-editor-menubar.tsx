import {
  MenubarCheckboxItem,
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger
} from "@/components/ui/menubar";
import type {
  MapEditorViewportHelperId,
  MapEditorViewportHelperVisibilitySnapshot
} from "@/engine-tool/types/map-editor";

interface MapEditorMenubarProps {
  readonly canDeleteSelectedEntity: boolean;
  readonly canResetSelectedTransform: boolean;
  readonly canUndoProjectChange: boolean;
  readonly onCloseRequest: () => void;
  readonly onDeleteSelectedEntityRequest: () => void;
  readonly onNewProjectRequest: () => void;
  readonly onResetDraftRequest: () => void;
  readonly onResetSelectedTransformRequest: () => void;
  readonly onSaveAsProjectRequest: () => void;
  readonly onSaveDraftRequest: () => void;
  readonly onUndoProjectChangeRequest: () => void;
  readonly onValidateAndRunRequest: () => void;
  readonly onViewportHelperVisibilityChange: (
    helperId: MapEditorViewportHelperId,
    visible: boolean
  ) => void;
  readonly viewportHelperVisibility: MapEditorViewportHelperVisibilitySnapshot;
}

export function MapEditorMenubar({
  canDeleteSelectedEntity,
  canResetSelectedTransform,
  canUndoProjectChange,
  onCloseRequest,
  onDeleteSelectedEntityRequest,
  onNewProjectRequest,
  onResetDraftRequest,
  onResetSelectedTransformRequest,
  onSaveAsProjectRequest,
  onSaveDraftRequest,
  onUndoProjectChangeRequest,
  onValidateAndRunRequest,
  onViewportHelperVisibilityChange,
  viewportHelperVisibility
}: MapEditorMenubarProps) {
  return (
    <Menubar className="h-auto min-h-8 border-border/70 bg-muted/35">
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={onNewProjectRequest}>
            New Project
            <MenubarShortcut>Ctrl+N</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={onSaveDraftRequest}>
            Save
            <MenubarShortcut>Ctrl+S</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onClick={onSaveAsProjectRequest}>
            Save As
            <MenubarShortcut>Shift+Ctrl+S</MenubarShortcut>
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
