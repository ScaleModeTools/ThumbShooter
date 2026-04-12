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

interface ReliableWebTransportJsonConnection {
  readonly reader: ReadableStreamDefaultReader<Uint8Array>;
  readonly transport: WebTransportLike;
  bufferedText: string;
  readonly decoder: TextDecoder;
  readonly writer: WritableStreamDefaultWriter<Uint8Array>;
}

export class ReliableWebTransportJsonRequestChannelError extends Error {
  override readonly cause: unknown;

  constructor(message: string, cause: unknown = null) {
    super(message);
    this.name = "ReliableWebTransportJsonRequestChannelError";
    this.cause = cause;
  }
}

export interface ReliableWebTransportJsonRequestChannelConfig<
  Request,
  Response
> {
  readonly parseResponse: (payload: unknown) => Response;
  readonly serializeRequest?: (request: Request) => unknown;
  readonly url: string;
}

export interface ReliableWebTransportJsonRequestChannelDependencies {
  readonly textEncoder?: TextEncoder;
  readonly webTransportFactory?: (url: string) => WebTransportLike;
}

function resolveWebTransportFactory(
  customFactory:
    | ReliableWebTransportJsonRequestChannelDependencies["webTransportFactory"]
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
      "WebTransport API is unavailable for the reliable JSON request channel."
    );
  }

  return (url: string) => new webTransportConstructor(url);
}

export class ReliableWebTransportJsonRequestChannel<Request, Response> {
  readonly #encodeText: TextEncoder;
  readonly #parseResponse: (payload: unknown) => Response;
  readonly #serializeRequest: (request: Request) => unknown;
  readonly #url: string;
  readonly #webTransportFactory: (url: string) => WebTransportLike;

  #connectionPromise: Promise<ReliableWebTransportJsonConnection> | null = null;
  #disposed = false;
  #requestQueue: Promise<void> = Promise.resolve();

  constructor(
    config: ReliableWebTransportJsonRequestChannelConfig<Request, Response>,
    dependencies: ReliableWebTransportJsonRequestChannelDependencies = {}
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

  async sendRequest(request: Request): Promise<Response> {
    this.#assertNotDisposed();

    const serializedRequest = this.#serializeRequest(request);
    const priorRequest = this.#requestQueue;
    let releaseRequestQueue = () => {};
    this.#requestQueue = new Promise<void>((resolve) => {
      releaseRequestQueue = resolve;
    });

    await priorRequest;

    try {
      const connection = await this.#ensureConnection();
      await connection.writer.write(
        this.#encodeText.encode(`${JSON.stringify(serializedRequest)}\n`)
      );
      return this.#parseResponse(await this.#readJsonFrame(connection));
    } catch (error) {
      this.#resetConnection();
      if (error instanceof ReliableWebTransportJsonRequestChannelError) {
        throw error;
      }

      const message =
        error instanceof Error &&
        typeof error.message === "string" &&
        error.message.trim().length > 0
          ? error.message
          : "Reliable WebTransport JSON request channel request failed.";

      throw new ReliableWebTransportJsonRequestChannelError(message, error);
    } finally {
      releaseRequestQueue();
    }
  }

  dispose(): void {
    if (this.#disposed) {
      return;
    }

    this.#disposed = true;
    this.#resetConnection();
  }

  async #ensureConnection(): Promise<ReliableWebTransportJsonConnection> {
    if (this.#connectionPromise !== null) {
      return this.#connectionPromise;
    }

    const connectionPromise = this.#openConnection();
    this.#connectionPromise = connectionPromise;

    try {
      return await connectionPromise;
    } catch (error) {
      if (this.#connectionPromise === connectionPromise) {
        this.#connectionPromise = null;
      }
      throw error;
    }
  }

  async #openConnection(): Promise<ReliableWebTransportJsonConnection> {
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
    connection: ReliableWebTransportJsonConnection
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
          throw new ReliableWebTransportJsonRequestChannelError(
            "Reliable WebTransport JSON request channel received invalid JSON."
          );
        }
      }

      const { done, value } = await connection.reader.read();

      if (done) {
        throw new ReliableWebTransportJsonRequestChannelError(
          "Reliable WebTransport JSON request channel closed before a response frame arrived."
        );
      }

      connection.bufferedText += connection.decoder.decode(value, {
        stream: true
      });
    }
  }

  #resetConnection(): void {
    const connectionPromise = this.#connectionPromise;

    if (connectionPromise === null) {
      return;
    }

    this.#connectionPromise = null;
    void connectionPromise
      .then(async (connection) => {
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
            reason: "Channel disposed"
          });
        } catch {}

        try {
          await connection.transport.closed;
        } catch {}
      })
      .catch(() => {});
  }

  #assertNotDisposed(): void {
    if (this.#disposed) {
      throw new Error(
        "Reliable WebTransport JSON request channel has already been disposed."
      );
    }
  }
}
