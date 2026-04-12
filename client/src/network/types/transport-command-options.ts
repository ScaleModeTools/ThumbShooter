export const networkCommandDeliveryHints = [
  "default",
  "best-effort-disconnect"
] as const;

export type NetworkCommandDeliveryHint =
  (typeof networkCommandDeliveryHints)[number];

export interface NetworkCommandTransportOptions {
  readonly deliveryHint?: NetworkCommandDeliveryHint;
}
