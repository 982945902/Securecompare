import { describe, expect, it } from 'vitest';
import { MemoryByteTransport } from './webrtcTransport';

describe('byte transport', () => {
  it('sends bytes in both directions', async () => {
    const [alice, bob] = MemoryByteTransport.pair();

    alice.send(new Uint8Array([1, 2, 3]));
    bob.send(new Uint8Array([9, 8, 7]));

    await expect(bob.receive()).resolves.toEqual(new Uint8Array([1, 2, 3]));
    await expect(alice.receive()).resolves.toEqual(new Uint8Array([9, 8, 7]));
  });
});
