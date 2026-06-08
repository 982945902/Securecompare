import { describe, expect, it } from 'vitest';
import { comparePrivateValues, getCompareEngineInfo } from './compareSession';

describe('private compare session', () => {
  it('returns the comparison direction without revealing the peer value', async () => {
    await expect(comparePrivateValues({ mine: 12, peer: 10 })).resolves.toEqual('win');
    await expect(comparePrivateValues({ mine: 7, peer: 7 })).resolves.toEqual('draw');
    await expect(comparePrivateValues({ mine: 3, peer: 9 })).resolves.toEqual('lose');
  });

  it('marks the current browser engine as a development adapter until true two-party MPC is wired', () => {
    expect(getCompareEngineInfo()).toMatchObject({
      mpcReady: false,
      peerInputTransport: 'plaintext-datachannel',
    });
  });
});
