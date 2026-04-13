export interface ReliableWebTransportSubscriptionHandle {
  readonly closed: Promise<void>;
  close(): void;
}
