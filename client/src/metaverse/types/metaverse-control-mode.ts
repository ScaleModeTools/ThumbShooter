export const metaverseControlModeIds = ["keyboard", "mouse"] as const;

export type MetaverseControlModeId = (typeof metaverseControlModeIds)[number];

export interface MetaverseControlModeDefinition {
  readonly id: MetaverseControlModeId;
  readonly label: string;
  readonly description: string;
  readonly controlsSummary: readonly string[];
}

export interface MetaverseFlightInputSnapshot {
  readonly boost: boolean;
  readonly jump: boolean;
  readonly moveAxis: number;
  readonly primaryAction: boolean;
  readonly pitchAxis: number;
  readonly secondaryAction: boolean;
  readonly strafeAxis: number;
  readonly yawAxis: number;
}
