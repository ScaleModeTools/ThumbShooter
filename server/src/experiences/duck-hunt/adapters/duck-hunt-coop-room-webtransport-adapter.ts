import type {
  CoopPlayerId,
  DuckHuntCoopRoomWebTransportClientMessage,
  DuckHuntCoopRoomWebTransportServerMessage
} from "@webgpu-metaverse/shared";
import {
  createCoopRoomSnapshotEvent,
  createDuckHuntCoopRoomWebTransportErrorMessage,
  createDuckHuntCoopRoomWebTransportServerEventMessage
} from "@webgpu-metaverse/shared";

import { CoopRoomDirectory } from "../classes/coop-room-directory.js";

interface PersistentReliableStreamContext<Response> {
  readonly closed: Promise<void>;
  writeResponse(response: Response): Promise<void>;
}

interface CoopRoomSnapshotSubscriber {
  readonly observerPlayerId: CoopPlayerId;
  readonly roomId: string;
  readonly session: DuckHuntCoopRoomWebTransportSession;
  readonly writeResponse: (
    response: DuckHuntCoopRoomWebTransportServerMessage
  ) => Promise<void>;
  closeAfterWrite: boolean;
  pendingResponse: DuckHuntCoopRoomWebTransportServerMessage | null;
  writing: boolean;
}

function resolveBoundPlayerId(
  message: DuckHuntCoopRoomWebTransportClientMessage
): CoopPlayerId {
  switch (message.type) {
    case "coop-room-command-request":
      return message.command.playerId;
    case "coop-room-snapshot-request":
    case "coop-room-snapshot-subscribe":
      return message.observerPlayerId;
    default: {
      const exhaustiveCheck: never = message;
      throw new Error(
        `Unsupported Duck Hunt co-op WebTransport message: ${exhaustiveCheck}`
      );
    }
  }
}

export class DuckHuntCoopRoomWebTransportSession {
  readonly #adapter: DuckHuntCoopRoomWebTransportAdapter;
  readonly #roomDirectory: CoopRoomDirectory;

  #boundPlayerId: CoopPlayerId | null = null;
  #disposed = false;

  constructor(
    roomDirectory: CoopRoomDirectory,
    adapter: DuckHuntCoopRoomWebTransportAdapter
  ) {
    this.#adapter = adapter;
    this.#roomDirectory = roomDirectory;
  }

  receiveClientMessage(
    message: DuckHuntCoopRoomWebTransportClientMessage,
    nowMs: number
  ): DuckHuntCoopRoomWebTransportServerMessage {
    this.#assertNotDisposed();

    try {
      this.#bindPlayerIdentity(resolveBoundPlayerId(message));

      switch (message.type) {
        case "coop-room-command-request":
          return createDuckHuntCoopRoomWebTransportServerEventMessage({
            event: this.#roomDirectory.acceptCommand(message.command, nowMs)
          });
        case "coop-room-snapshot-request":
          return createDuckHuntCoopRoomWebTransportServerEventMessage({
            event: createCoopRoomSnapshotEvent(
              this.#roomDirectory.advanceRoom(
                message.roomId,
                nowMs,
                message.observerPlayerId
              )
            )
          });
        case "coop-room-snapshot-subscribe":
          return createDuckHuntCoopRoomWebTransportErrorMessage({
            message:
              "Duck Hunt co-op snapshot subscriptions require a persistent WebTransport stream."
          });
        default: {
          const exhaustiveCheck: never = message;
          throw new Error(
            `Unsupported Duck Hunt co-op WebTransport message: ${exhaustiveCheck}`
          );
        }
      }
    } catch (error) {
      return createDuckHuntCoopRoomWebTransportErrorMessage({
        message:
          error instanceof Error
            ? error.message
            : "Duck Hunt co-op room WebTransport request failed."
      });
    }
  }

  async handleClientStream(
    message: DuckHuntCoopRoomWebTransportClientMessage,
    context: PersistentReliableStreamContext<DuckHuntCoopRoomWebTransportServerMessage>,
    nowMs: number
  ): Promise<boolean> {
    this.#assertNotDisposed();

    if (message.type !== "coop-room-snapshot-subscribe") {
      return false;
    }

    try {
      this.#bindPlayerIdentity(message.observerPlayerId);
    } catch (error) {
      await context.writeResponse(
        createDuckHuntCoopRoomWebTransportErrorMessage({
          message:
            error instanceof Error
              ? error.message
              : "Duck Hunt co-op snapshot subscribe failed."
        })
      );
      return true;
    }

    const unsubscribe = this.#adapter.subscribeRoomSnapshots(
      this,
      message.roomId,
      message.observerPlayerId,
      context.writeResponse,
      nowMs
    );

    try {
      await context.closed.catch(() => undefined);
    } finally {
      unsubscribe();
    }

    return true;
  }

  get boundPlayerId(): CoopPlayerId | null {
    return this.#boundPlayerId;
  }

  dispose(): void {
    this.#adapter.unsubscribeSession(this);
    this.#disposed = true;
  }

  #bindPlayerIdentity(playerId: CoopPlayerId): void {
    if (this.#boundPlayerId !== null && this.#boundPlayerId !== playerId) {
      throw new Error(
        `Duck Hunt co-op WebTransport session is already bound to ${this.#boundPlayerId}.`
      );
    }

    this.#boundPlayerId = playerId;
  }

  #assertNotDisposed(): void {
    if (this.#disposed) {
      throw new Error(
        "Duck Hunt co-op room WebTransport session has already been disposed."
      );
    }
  }
}

export class DuckHuntCoopRoomWebTransportAdapter {
  readonly #roomDirectory: CoopRoomDirectory;
  readonly #snapshotSubscribers = new Map<
    DuckHuntCoopRoomWebTransportSession,
    CoopRoomSnapshotSubscriber
  >();

  constructor(roomDirectory: CoopRoomDirectory) {
    this.#roomDirectory = roomDirectory;
  }

  openSession(): DuckHuntCoopRoomWebTransportSession {
    return new DuckHuntCoopRoomWebTransportSession(this.#roomDirectory, this);
  }

  publishRoomSnapshots(nowMs: number): void {
    for (const subscriber of this.#snapshotSubscribers.values()) {
      this.#queueSnapshotForSubscriber(subscriber, nowMs);
    }
  }

  subscribeRoomSnapshots(
    session: DuckHuntCoopRoomWebTransportSession,
    roomId: string,
    observerPlayerId: CoopPlayerId,
    writeResponse: (
      response: DuckHuntCoopRoomWebTransportServerMessage
    ) => Promise<void>,
    nowMs: number
  ): () => void {
    this.unsubscribeSession(session);

    const subscriber: CoopRoomSnapshotSubscriber = {
      closeAfterWrite: false,
      observerPlayerId,
      pendingResponse: null,
      roomId,
      session,
      writeResponse,
      writing: false
    };

    this.#snapshotSubscribers.set(session, subscriber);
    this.#queueSnapshotForSubscriber(subscriber, nowMs);

    return () => {
      if (this.#snapshotSubscribers.get(session) === subscriber) {
        this.#snapshotSubscribers.delete(session);
      }
    };
  }

  unsubscribeSession(session: DuckHuntCoopRoomWebTransportSession): void {
    this.#snapshotSubscribers.delete(session);
  }

  #queueSnapshotForSubscriber(
    subscriber: CoopRoomSnapshotSubscriber,
    nowMs: number
  ): void {
    const response = this.#createSnapshotResponse(
      subscriber.roomId,
      subscriber.observerPlayerId,
      nowMs
    );

    subscriber.pendingResponse = response;
    subscriber.closeAfterWrite = response.type === "coop-room-error";

    if (subscriber.writing) {
      return;
    }

    subscriber.writing = true;
    void this.#flushSubscriber(subscriber);
  }

  #createSnapshotResponse(
    roomId: string,
    observerPlayerId: CoopPlayerId,
    nowMs: number
  ): DuckHuntCoopRoomWebTransportServerMessage {
    try {
      return createDuckHuntCoopRoomWebTransportServerEventMessage({
        event: createCoopRoomSnapshotEvent(
          this.#roomDirectory.advanceRoom(
            roomId as Parameters<CoopRoomDirectory["advanceRoom"]>[0],
            nowMs,
            observerPlayerId
          )
        )
      });
    } catch (error) {
      return createDuckHuntCoopRoomWebTransportErrorMessage({
        message:
          error instanceof Error
            ? error.message
            : "Duck Hunt co-op room snapshot publish failed."
      });
    }
  }

  async #flushSubscriber(
    subscriber: CoopRoomSnapshotSubscriber
  ): Promise<void> {
    let keepSubscribed = true;

    try {
      while (true) {
        const pendingResponse = subscriber.pendingResponse;

        if (pendingResponse === null) {
          return;
        }

        const closeAfterWrite = subscriber.closeAfterWrite;

        subscriber.pendingResponse = null;
        subscriber.closeAfterWrite = false;
        await subscriber.writeResponse(pendingResponse);

        if (closeAfterWrite) {
          keepSubscribed = false;
          return;
        }
      }
    } catch {
      // Transport close or slow-subscriber failure removes this writer.
      keepSubscribed = false;
    } finally {
      subscriber.writing = false;

      if (!keepSubscribed) {
        this.#snapshotSubscribers.delete(subscriber.session);
        return;
      }

      if (subscriber.pendingResponse !== null) {
        subscriber.writing = true;
        void this.#flushSubscriber(subscriber);
      }
    }
  }
}
