import { describe, expect, it } from 'vitest';
import { plaintextPrototypeEngine } from './compareEngine';
import { comparePrivateValues } from './compareSession';

describe('private compare session', () => {
  it('returns the comparison direction without revealing the peer value', async () => {
    await expect(comparePrivateValues({ mine: 12, peer: 10 })).resolves.toEqual('win');
    await expect(comparePrivateValues({ mine: 7, peer: 7 })).resolves.toEqual('draw');
    await expect(comparePrivateValues({ mine: 3, peer: 9 })).resolves.toEqual('lose');
  });

  it('keeps the legacy plaintext prototype marked as a development adapter', () => {
    expect(plaintextPrototypeEngine.info).toMatchObject({
      mpcReady: false,
      peerInputTransport: 'plaintext-datachannel',
    });
  });
});
