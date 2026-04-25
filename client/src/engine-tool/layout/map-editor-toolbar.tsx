import type { ReactNode } from "react";

import { RotateCwIcon, SaveIcon } from "lucide-react";

import type { MetaverseWorldBundleRegistryEntry } from "@/metaverse/world/bundle-registry";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

interface MapEditorToolbarProps {
  readonly onBundleChange: (bundleId: string) => void;
  readonly onResetDraftRequest: () => void;
  readonly onSaveDraftRequest: () => void;
  readonly registryEntries: readonly MetaverseWorldBundleRegistryEntry[];
  readonly selectedBundleId: string;
}

function SidebarSection({
  children,
  title
}: {
  readonly children: ReactNode;
  readonly title: string;
}) {
  return (
    <section className="flex flex-col gap-3 border-b border-border/70 px-4 py-4">
      <h3 className="text-xs font-medium uppercase text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function MapEditorToolbar({
  onBundleChange,
  onResetDraftRequest,
  onSaveDraftRequest,
  registryEntries,
  selectedBundleId
}: MapEditorToolbarProps) {
  const selectedBundleLabel =
    registryEntries.find((entry) => entry.bundleId === selectedBundleId)?.label ??
    selectedBundleId;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background/84">
      <div className="shrink-0 border-b border-border/70 px-4 py-3">
        <p className="text-xs uppercase text-muted-foreground">Authoring</p>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {selectedBundleLabel}
        </p>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <SidebarSection title="Project">
          <div className="flex flex-col gap-2">
            <Label htmlFor="map-editor-bundle-select">Map Bundle</Label>
            <Select onValueChange={onBundleChange} value={selectedBundleId}>
              <SelectTrigger id="map-editor-bundle-select">
                <SelectValue placeholder="Select bundle" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {registryEntries.map((entry) => (
                    <SelectItem key={entry.bundleId} value={entry.bundleId}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </SidebarSection>
      </ScrollArea>

      <div className="flex shrink-0 items-center gap-2 border-t border-border/70 p-3">
        <Button
          className="flex-1"
          onClick={onResetDraftRequest}
          type="button"
          variant="outline"
        >
          <RotateCwIcon data-icon="inline-start" />
          Reset
        </Button>

        <Button
          className="flex-1"
          onClick={onSaveDraftRequest}
          type="button"
          variant="outline"
        >
          <SaveIcon data-icon="inline-start" />
          Save
        </Button>
      </div>
    </div>
  );
}
