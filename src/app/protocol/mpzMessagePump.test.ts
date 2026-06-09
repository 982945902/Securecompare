import { describe, expect, it, vi } from 'vitest';
import { drainOutbound, forwardOutbound } from './mpzMessagePump';

describe('mpz message-pump helpers', () => {
  it('drains outbound bytes only when the wasm pump has data', () => {
    expect(drainOutbound({ takeOutbound: () => new Uint8Array() })).toBeNull();
    expect(drainOutbound({ takeOutbound: () => new Uint8Array([1, 2, 3]) })).toEqual(
      new Uint8Array([1, 2, 3]),
    );
  });

  it('forwards outbound bytes into the provided sender', () => {
    const send = vi.fn();

    const sent = forwardOutbound({ takeOutbound: () => new Uint8Array([9, 8, 7]) }, send);

    expect(sent).toBe(true);
    expect(send).toHaveBeenCalledWith(new Uint8Array([9, 8, 7]));
  });
});
