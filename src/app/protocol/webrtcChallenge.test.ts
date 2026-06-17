import { describe, expect, it } from 'vitest';
import { dataChannelTimeoutMs } from './webrtcChallenge';

describe('webrtc challenge timeouts', () => {
  it('allows five minutes for the WebRTC data channel to open', () => {
    expect(dataChannelTimeoutMs).toBe(5 * 60 * 1000);
  });
});
