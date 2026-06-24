import { describe, expect, it } from 'vitest';
import {
  getRealtimeServiceHttpBaseUrl,
  getRealtimeServiceWebSocketBaseUrl,
  resolveInviteTransportMode,
} from './webrtcChallenge';

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

describe('invite realtime service URL', () => {
  it('uses the local signaling server during localhost development', () => {
    setWindowLocation('http://localhost:5173/');

    expect(getRealtimeServiceWebSocketBaseUrl()).toBe('ws://localhost:8787');
    expect(getRealtimeServiceHttpBaseUrl()).toBe('http://localhost:8787');
  });

  it('uses the current origin on deployed hosts', () => {
    setWindowLocation('https://securecompare.renchong258.workers.dev/');

    expect(getRealtimeServiceWebSocketBaseUrl()).toBe(
      'wss://securecompare.renchong258.workers.dev',
    );
    expect(getRealtimeServiceHttpBaseUrl()).toBe(
      'https://securecompare.renchong258.workers.dev',
    );
  });
});

function setWindowLocation(url: string) {
  const location = new URL(url) as URL & Pick<Location, 'host' | 'hostname' | 'protocol'>;
  Object.defineProperty(globalThis, 'window', {
    value: { location },
    configurable: true,
  });
}
