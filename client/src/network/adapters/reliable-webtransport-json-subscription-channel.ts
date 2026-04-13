interface WebTransportBidirectionalStreamLike {
  readonly readable: ReadableStream<Uint8Array>;
  readonly writable: WritableStream<Uint8Array>;
}

interface WebTransportLike {
  readonly closed?: Promise<unknown>;
  readonly ready?: Promise<unknown>;
  createBidirectionalStream(): Promise<WebTransportBidirectionalStreamLike>;
  close(closeInfo?: {
    readonly closeCode?: number;
    readonly reason?: string;
  }): void;
}

interface ReliableWebTransportJsonSubscriptionConnection {
  readonly reader: ReadableStreamDefaultReader<Uint8Array>;
  readonly transport: WebTransportLike;
  bufferedText: string;
  readonly decoder: TextDecoder;
  readonly writer: WritableStreamDefaultWriter<Uint8Array>;
}

export class ReliableWebTransportJsonSubscriptionChannelError extends Error {
  override readonly cause: unknown;

  constructor(message: string, cause: unknown = null) {
    super(message);
    this.name = "ReliableWebTransportJsonSubscriptionChannelError";
    this.cause = cause;
  }
}

export interface ReliableWebTransportJsonSubscriptionChannelConfig<
  Request,
  Response
> {
  readonly parseResponse: (payload: unknown) => Response;
  readonly serializeRequest?: (request: Request) => unknown;
  readonly url: string;
}

export interface ReliableWebTransportJsonSubscriptionChannelDependencies {
  readonly textEncoder?: TextEncoder;
  readonly webTransportFactory?: (url: string) => WebTransportLike;
}

function resolveWebTransportFactory(
  customFactory:
    | ReliableWebTransportJsonSubscriptionChannelDependencies["webTransportFactory"]
    | undefined
): (url: string) => WebTransportLike {
  if (customFactory !== undefined) {
    return customFactory;
  }

  const webTransportConstructor = (
    globalThis as typeof globalThis & {
      readonly WebTransport?: new (url: string) => WebTransportLike;
    }
  ).WebTransport;

  if (webTransportConstructor === undefined) {
    throw new Error(
      "WebTransport API is unavailable for the reliable JSON subscription channel."
    );
  }

  return (url: string) => new webTransportConstructor(url);
}

export class ReliableWebTransportJsonSubscriptionChannel<Request, Response> {
  readonly #encodeText: TextEncoder;
  readonly #parseResponse: (payload: unknown) => Response;
  readonly #serializeRequest: (request: Request) => unknown;
  readonly #url: string;
  readonly #webTransportFactory: (url: string) => WebTransportLike;
  readonly #subscriptions = new Set<() => void>();

  #disposed = false;

  constructor(
    config: ReliableWebTransportJsonSubscriptionChannelConfig<Request, Response>,
    dependencies: ReliableWebTransportJsonSubscriptionChannelDependencies = {}
  ) {
    this.#encodeText = dependencies.textEncoder ?? new TextEncoder();
    this.#parseResponse = config.parseResponse;
    this.#serializeRequest =
      config.serializeRequest ?? ((request: Request) => request);
    this.#url = config.url;
    this.#webTransportFactory = resolveWebTransportFactory(
      dependencies.webTransportFactory
    );
  }

  openSubscription(
    request: Request,
    handlers: {
      readonly onClose?: (() => void) | undefined;
      readonly onError?: ((error: unknown) => void) | undefined;
      readonly onResponse: (response: Response) => void;
    }
  ): {
    readonly closed: Promise<void>;
    close(): void;
  } {
    this.#assertNotDisposed();

    const connectionPromise = this.#openConnection();
    let closed = false;
    let closeConnection = () => {};

    const close = () => {
      if (closed) {
        return;
      }

      closed = true;
      closeConnection();
    };

    this.#subscriptions.add(close);

    const closedPromise = this.#runSubscription(
      connectionPromise,
      request,
      handlers,
      (nextCloseConnection) => {
        closeConnection = nextCloseConnection;
      }
    )
      .catch((error) => {
        if (!closed) {
          handlers.onError?.(error);
        }
      })
      .finally(() => {
        close();
        this.#subscriptions.delete(close);
        handlers.onClose?.();
      });

    return Object.freeze({
      closed: closedPromise,
      close
    });
  }

  dispose(): void {
    if (this.#disposed) {
      return;
    }

    this.#disposed = true;

    for (const close of this.#subscriptions) {
      close();
    }

    this.#subscriptions.clear();
  }

  async #runSubscription(
    connectionPromise: Promise<ReliableWebTransportJsonSubscriptionConnection>,
    request: Request,
    handlers: {
      readonly onResponse: (response: Response) => void;
    },
    setCloseConnection: (closeConnection: () => void) => void
  ): Promise<void> {
    let connection: ReliableWebTransportJsonSubscriptionConnection | null = null;

    try {
      connection = await connectionPromise;
      const activeConnection = connection;
      setCloseConnection(() => {
        void this.#closeConnection(activeConnection);
      });
      await connection.writer.write(
        this.#encodeText.encode(
          `${JSON.stringify(this.#serializeRequest(request))}\n`
        )
      );

      while (true) {
        const response = this.#parseResponse(await this.#readJsonFrame(connection));
        handlers.onResponse(response);
      }
    } catch (error) {
      if (
        error instanceof ReliableWebTransportJsonSubscriptionChannelError &&
        error.message ===
          "Reliable WebTransport JSON subscription channel closed."
      ) {
        return;
      }

      throw error;
    } finally {
      if (connection !== null) {
        await this.#closeConnection(connection);
      }
    }
  }

  async #openConnection(): Promise<ReliableWebTransportJsonSubscriptionConnection> {
    const transport = this.#webTransportFactory(this.#url);

    if (transport.ready !== undefined) {
      await transport.ready;
    }

    const stream = await transport.createBidirectionalStream();

    return {
      bufferedText: "",
      decoder: new TextDecoder(),
      reader: stream.readable.getReader(),
      transport,
      writer: stream.writable.getWriter()
    };
  }

  async #readJsonFrame(
    connection: ReliableWebTransportJsonSubscriptionConnection
  ): Promise<unknown> {
    while (true) {
      const newlineIndex = connection.bufferedText.indexOf("\n");

      if (newlineIndex >= 0) {
        const rawFrame = connection.bufferedText.slice(0, newlineIndex);
        connection.bufferedText = connection.bufferedText.slice(newlineIndex + 1);

        if (rawFrame.trim().length === 0) {
          continue;
        }

        try {
          return JSON.parse(rawFrame);
        } catch {
          throw new ReliableWebTransportJsonSubscriptionChannelError(
            "Reliable WebTransport JSON subscription channel received invalid JSON."
          );
        }
      }

      const { done, value } = await connection.reader.read();

      if (done) {
        throw new ReliableWebTransportJsonSubscriptionChannelError(
          "Reliable WebTransport JSON subscription channel closed."
        );
      }

      connection.bufferedText += connection.decoder.decode(value, {
        stream: true
      });
    }
  }

  async #closeConnection(
    connection: ReliableWebTransportJsonSubscriptionConnection
  ): Promise<void> {
    try {
      await connection.writer.close();
    } catch {}

    try {
      connection.writer.releaseLock();
    } catch {}

    try {
      connection.reader.releaseLock();
    } catch {}

    try {
      connection.transport.close({
        closeCode: 0,
        reason: "Subscription closed"
      });
    } catch {}

    try {
      await connection.transport.closed;
    } catch {}
  }

  #assertNotDisposed(): void {
    if (this.#disposed) {
      throw new Error(
        "Reliable WebTransport JSON subscription channel has already been disposed."
      );
    }
  }
}
