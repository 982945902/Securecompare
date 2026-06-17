import { describe, expect, it } from 'vitest';
import { createRtcConfig, dataChannelTimeoutMs } from './webrtcChallenge';

describe('webrtc challenge timeouts', () => {
  it('allows five minutes for the WebRTC data channel to open', () => {
    expect(dataChannelTimeoutMs).toBe(5 * 60 * 1000);
  });
});

describe('webrtc ICE servers', () => {
  it('adds TURN credentials returned by the signaling service', async () => {
    const config = await createRtcConfig(async () => new Response(JSON.stringify({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'turn:turn.cloudflare.com:3478', username: 'u', credential: 'p' },
      ],
    })));

    expect(config.iceServers).toEqual([
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'turn:turn.cloudflare.com:3478', username: 'u', credential: 'p' },
    ]);
  });

  it('falls back to STUN when TURN credentials are unavailable', async () => {
    const config = await createRtcConfig(async () => new Response('nope', { status: 503 }));

    expect(config.iceServers).toEqual([{ urls: 'stun:stun.l.google.com:19302' }]);
  });
});
