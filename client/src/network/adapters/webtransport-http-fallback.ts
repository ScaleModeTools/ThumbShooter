import { ReliableWebTransportJsonRequestChannelError } from "./reliable-webtransport-json-request-channel";

interface DisposableTransport {
  dispose?(): void;
}

function isWebTransportFallbackError(error: unknown): boolean {
  return error instanceof ReliableWebTransportJsonRequestChannelError;
}

export interface WebTransportHttpFallbackInvoker<
  Transport extends DisposableTransport
> {
  readonly usingFallback: boolean;
  dispose(): void;
  invoke<Response>(
    operation: (transport: Transport) => Promise<Response>
  ): Promise<Response>;
}

export function createWebTransportHttpFallbackInvoker<
  Transport extends DisposableTransport
>(
  primaryTransport: Transport,
  fallbackTransport: Transport
): WebTransportHttpFallbackInvoker<Transport> {
  let usingFallback = false;

  return Object.freeze({
    get usingFallback() {
      return usingFallback;
    },
    dispose() {
      primaryTransport.dispose?.();
      fallbackTransport.dispose?.();
    },
    async invoke<Response>(
      operation: (transport: Transport) => Promise<Response>
    ): Promise<Response> {
      if (usingFallback) {
        return operation(fallbackTransport);
      }

      try {
        return await operation(primaryTransport);
      } catch (error) {
        if (!isWebTransportFallbackError(error)) {
          throw error;
        }

        usingFallback = true;
        return operation(fallbackTransport);
      }
    }
  });
}
