import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";

interface MapEditorEditableNumberInputProps {
  readonly decimals?: number;
  readonly id: string;
  readonly onValueChange: (value: number) => void;
  readonly value: number;
}

function formatNumberInputValue(value: number, decimals: number): string {
  return Number.isFinite(value) ? value.toFixed(decimals) : "";
}

function readDraftNumber(value: string): number | null {
  const trimmedValue = value.trim();

  if (
    trimmedValue.length === 0 ||
    trimmedValue === "-" ||
    trimmedValue === "." ||
    trimmedValue === "-."
  ) {
    return null;
  }

  const nextValue = Number(trimmedValue);

  return Number.isFinite(nextValue) ? nextValue : null;
}

export function MapEditorEditableNumberInput({
  decimals = 2,
  id,
  onValueChange,
  value
}: MapEditorEditableNumberInputProps) {
  const [editing, setEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(() =>
    formatNumberInputValue(value, decimals)
  );

  useEffect(() => {
    if (!editing) {
      setDraftValue(formatNumberInputValue(value, decimals));
    }
  }, [decimals, editing, value]);

  return (
    <Input
      id={id}
      inputMode="decimal"
      onBlur={() => {
        setEditing(false);

        if (readDraftNumber(draftValue) === null) {
          setDraftValue(formatNumberInputValue(value, decimals));
        }
      }}
      onChange={(event) => {
        const nextDraftValue = event.target.value;
        const nextValue = readDraftNumber(nextDraftValue);

        setDraftValue(nextDraftValue);

        if (nextValue !== null) {
          onValueChange(nextValue);
        }
      }}
      onFocus={() => {
        setEditing(true);
      }}
      type="text"
      value={draftValue}
    />
  );
}
