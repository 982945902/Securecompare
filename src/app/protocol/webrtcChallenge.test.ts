import { describe, expect, it } from 'vitest';
import { resolveInviteTransportMode } from './webrtcChallenge';

describe('invite transport mode', () => {
  it('defaults invite challenges to the server WebSocket relay', () => {
    expect(resolveInviteTransportMode({})).toBe('websocket');
  });

  it('allows WebRTC to be enabled explicitly', () => {
    expect(resolveInviteTransportMode({ VITE_INVITE_TRANSPORT: 'webrtc' })).toBe('webrtc');
  });

  it('falls back to WebSocket relay for unknown values', () => {
    expect(resolveInviteTransportMode({ VITE_INVITE_TRANSPORT: 'turn' })).toBe('websocket');
  });
});
