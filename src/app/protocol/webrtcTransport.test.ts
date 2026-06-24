import { describe, expect, it } from 'vitest';
import { MemoryByteTransport, WebSocketByteTransport } from './webrtcTransport';

describe('byte transport', () => {
  it('sends bytes in both directions', async () => {
    const [alice, bob] = MemoryByteTransport.pair();

    alice.send(new Uint8Array([1, 2, 3]));
    bob.send(new Uint8Array([9, 8, 7]));

    await expect(bob.receive()).resolves.toEqual(new Uint8Array([1, 2, 3]));
    await expect(alice.receive()).resolves.toEqual(new Uint8Array([9, 8, 7]));
  });

  it('encodes bytes over signaling WebSocket data messages', async () => {
    const socket = new FakeWebSocket();
    const transport = new WebSocketByteTransport(socket as unknown as WebSocket);

    transport.send(new Uint8Array([1, 2, 3, 4]));
    socket.emitMessage(JSON.stringify({ type: 'data', data: 'CQgH' }));

    expect(socket.sent).toEqual([JSON.stringify({ type: 'data', data: 'AQIDBA==' })]);
    await expect(transport.receive()).resolves.toEqual(new Uint8Array([9, 8, 7]));
  });
});

class FakeWebSocket {
  readonly OPEN = WebSocket.OPEN;
  readyState = WebSocket.OPEN;
  sent: string[] = [];
  private listeners = new Map<string, Set<(event: MessageEvent) => void>>();

  addEventListener(type: string, listener: (event: MessageEvent) => void): void {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  send(message: string): void {
    this.sent.push(message);
  }

  close(): void {
    this.readyState = WebSocket.CLOSED;
  }

  emitMessage(data: string): void {
    this.listeners.get('message')?.forEach((listener) =>
      listener({ data } as MessageEvent),
    );
  }
}
