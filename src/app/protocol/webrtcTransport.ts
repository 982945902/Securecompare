export type ByteMessageHandler = (bytes: Uint8Array) => void;

export interface ByteTransport {
  send(bytes: Uint8Array): void;
  receive(): Promise<Uint8Array>;
  onMessage(handler: ByteMessageHandler): () => void;
  close(): void;
}

export class MemoryByteTransport implements ByteTransport {
  private peer: MemoryByteTransport | null = null;
  private queued: Uint8Array[] = [];
  private waiters: Array<(bytes: Uint8Array) => void> = [];
  private handlers = new Set<ByteMessageHandler>();

  static pair(): [MemoryByteTransport, MemoryByteTransport] {
    const left = new MemoryByteTransport();
    const right = new MemoryByteTransport();
    left.peer = right;
    right.peer = left;
    return [left, right];
  }

  send(bytes: Uint8Array): void {
    if (!this.peer) {
      throw new Error('MemoryByteTransport is not paired');
    }
    this.peer.push(bytes);
  }

  receive(): Promise<Uint8Array> {
    const queued = this.queued.shift();
    if (queued) {
      return Promise.resolve(queued);
    }
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  onMessage(handler: ByteMessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  close(): void {
    this.peer = null;
    this.queued = [];
    this.waiters = [];
    this.handlers.clear();
  }

  private push(bytes: Uint8Array): void {
    const copy = new Uint8Array(bytes);
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter(copy);
    } else {
      this.queued.push(copy);
    }
    this.handlers.forEach((handler) => handler(copy));
  }
}

export class WebRtcByteTransport implements ByteTransport {
  private queued: Uint8Array[] = [];
  private waiters: Array<(bytes: Uint8Array) => void> = [];
  private handlers = new Set<ByteMessageHandler>();

  constructor(private readonly channel: RTCDataChannel) {
    this.channel.binaryType = 'arraybuffer';
    this.channel.addEventListener('message', (event) => {
      this.push(toUint8Array(event.data));
    });
  }

  send(bytes: Uint8Array): void {
    if (this.channel.readyState !== 'open') {
      throw new Error(`DataChannel is ${this.channel.readyState}`);
    }
    this.channel.send(bytes);
  }

  receive(): Promise<Uint8Array> {
    const queued = this.queued.shift();
    if (queued) {
      return Promise.resolve(queued);
    }
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  onMessage(handler: ByteMessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  close(): void {
    this.channel.close();
    this.queued = [];
    this.waiters = [];
    this.handlers.clear();
  }

  private push(bytes: Uint8Array): void {
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter(bytes);
    } else {
      this.queued.push(bytes);
    }
    this.handlers.forEach((handler) => handler(bytes));
  }
}

export class WebSocketByteTransport implements ByteTransport {
  private queued: Uint8Array[] = [];
  private waiters: Array<(bytes: Uint8Array) => void> = [];
  private handlers = new Set<ByteMessageHandler>();
  private readonly removeMessageListener: () => void;

  constructor(private readonly socket: WebSocket) {
    const onMessage = (event: MessageEvent) => {
      const message = parseDataMessage(event.data);
      if (message) {
        this.push(decodeBase64Bytes(message.data));
      }
    };
    this.socket.addEventListener('message', onMessage);
    this.removeMessageListener = () => this.socket.removeEventListener('message', onMessage);
  }

  send(bytes: Uint8Array): void {
    if (this.socket.readyState !== WebSocket.OPEN) {
      throw new Error(`WebSocket is ${this.socket.readyState}`);
    }
    this.socket.send(JSON.stringify({ type: 'data', data: encodeBase64Bytes(bytes) }));
  }

  receive(): Promise<Uint8Array> {
    const queued = this.queued.shift();
    if (queued) {
      return Promise.resolve(queued);
    }
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  onMessage(handler: ByteMessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  close(): void {
    this.removeMessageListener();
    this.queued = [];
    this.waiters = [];
    this.handlers.clear();
  }

  private push(bytes: Uint8Array): void {
    const copy = new Uint8Array(bytes);
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter(copy);
    } else {
      this.queued.push(copy);
    }
    this.handlers.forEach((handler) => handler(copy));
  }
}

function toUint8Array(data: unknown): Uint8Array {
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  if (data instanceof Uint8Array) {
    return data;
  }
  if (data instanceof Blob) {
    throw new Error('Blob messages are not supported by this transport');
  }
  if (typeof data === 'string') {
    return new TextEncoder().encode(data);
  }
  throw new Error('Unsupported DataChannel message type');
}

function parseDataMessage(data: unknown): { type: 'data'; data: string } | null {
  if (typeof data !== 'string') {
    return null;
  }
  try {
    const message = JSON.parse(data) as { type?: unknown; data?: unknown };
    if (message.type === 'data' && typeof message.data === 'string') {
      return { type: 'data', data: message.data };
    }
  } catch {
    return null;
  }
  return null;
}

function encodeBase64Bytes(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeBase64Bytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
