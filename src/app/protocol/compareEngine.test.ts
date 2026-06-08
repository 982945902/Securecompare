import { afterEach, describe, expect, it } from 'vitest';
import { MemoryByteTransport } from './webrtcTransport';
import { plaintextPrototypeEngine } from './compareEngine';
import { __setMpzWasmModuleForTest, mpzProtocolEngine } from './mpzProtocolEngine';

afterEach(() => {
  __setMpzWasmModuleForTest(null);
});

describe('compare protocol engines', () => {
  it('runs the current prototype engine over byte transports', async () => {
    const [challengerTransport, accepterTransport] = MemoryByteTransport.pair();

    await expect(
      Promise.all([
        plaintextPrototypeEngine.run({
          myValue: 170,
          role: 'challenger',
          transport: challengerTransport,
        }),
        plaintextPrototypeEngine.run({
          myValue: 165,
          role: 'accepter',
          transport: accepterTransport,
        }),
      ]),
    ).resolves.toEqual(['win', 'lose']);
  });

  it('makes the prototype plaintext transport explicit', () => {
    expect(plaintextPrototypeEngine.info).toMatchObject({
      id: 'plaintext-prototype-v1',
      mpcReady: false,
      peerInputTransport: 'plaintext-datachannel',
    });
  });

  it('runs the mpz message-pump engine over byte transports', async () => {
    __setMpzWasmModuleForTest({
      default: async () => undefined,
      WasmComparePumpSession: FakeWasmComparePumpSession,
    });
    const [challengerTransport, accepterTransport] = MemoryByteTransport.pair();

    await expect(
      Promise.all([
        mpzProtocolEngine.run({
          myValue: 170,
          role: 'challenger',
          transport: challengerTransport,
        }),
        mpzProtocolEngine.run({
          myValue: 165,
          role: 'accepter',
          transport: accepterTransport,
        }),
      ]),
    ).resolves.toEqual(['win', 'lose']);
  });

  it('marks the mpz engine as a message-only protocol adapter', () => {
    expect(mpzProtocolEngine.info).toMatchObject({
      id: 'mpz-message-engine',
      mpcReady: true,
      peerInputTransport: 'mpc-messages',
    });
  });
});

class FakeWasmComparePumpSession {
  private sent = false;
  private done = false;

  constructor(
    readonly role: string,
    readonly value: number,
  ) {}

  takeOutbound(): Uint8Array {
    if (this.sent) {
      return new Uint8Array();
    }
    this.sent = true;
    return new Uint8Array([1]);
  }

  pushInbound(bytes: Uint8Array): void {
    if (bytes.byteLength > 0) {
      this.done = true;
    }
  }

  isDone(): boolean {
    return this.done;
  }

  resultCode(): number {
    return 1;
  }

  error(): string | undefined {
    return undefined;
  }

  closeRemote(): void {}

  free(): void {}
}
