import { decodeChallengeToken, encodeChallengeToken } from './challengeToken';
import type { CompareOutcome } from './compareSession';
import { mpzProtocolEngine } from './mpzProtocolEngine';
import { WebRtcByteTransport, WebSocketByteTransport, type ByteTransport } from './webrtcTransport';

type SignalKind = 'offer' | 'answer' | 'ice';

type SignalPayload = {
  kind: SignalKind;
  data: RTCSessionDescriptionInit | RTCIceCandidateInit | null;
};

type SignalingMessage =
  | { type: 'joined'; roomId: string; peers: number }
  | { type: 'signal'; signal: SignalPayload }
  | { type: 'error'; error: string };

type SignalingConnection = {
  socket: WebSocket;
  sendSignal: (signal: SignalPayload) => void;
  waitForSignal: (kind: SignalKind) => Promise<SignalPayload>;
  waitForPeers: (peers: number) => Promise<void>;
  onSignal: (handler: (signal: SignalPayload) => void) => () => void;
  close: () => void;
};

export type InviteChallengeSession = {
  token: string;
  waitForResult: () => Promise<CompareOutcome>;
  close: () => void;
};

const fallbackIceServers: RTCIceServer[] = [{ urls: 'stun:stun.cloudflare.com:3478' }];

type InviteTransportMode = 'websocket' | 'webrtc';

const signalingTimeoutMs = 15000;
const transportTimeoutMs = 20000;

export async function createInviteChallenge(
  categoryId: string,
  myValue: number,
): Promise<InviteChallengeSession> {
  const roomId = crypto.randomUUID();
  const signaling = await connectSignaling(roomId);
  if (getInviteTransportMode() === 'webrtc') {
    return createWebRtcInviteChallenge(categoryId, roomId, signaling, myValue);
  }

  const transport = new WebSocketByteTransport(signaling.socket);
  const resultPromise = runCompareOverWebSocketRelay(signaling, transport, myValue, 'challenger');

  return {
    token: encodeChallengeToken({ categoryId, roomId }),
    waitForResult: () => resultPromise,
    close: () => {
      transport.close();
      signaling.close();
    },
  };
}

async function createWebRtcInviteChallenge(
  categoryId: string,
  roomId: string,
  signaling: SignalingConnection,
  myValue: number,
): Promise<InviteChallengeSession> {
  const pc = new RTCPeerConnection(await createRtcConfig());
  const channel = pc.createDataChannel('securecompare', { ordered: true });
  const remoteCandidates = createRemoteCandidateQueue(pc);

  pc.addEventListener('icecandidate', (event) => {
    signaling.sendSignal({ kind: 'ice', data: event.candidate?.toJSON() ?? null });
  });

  signaling.onSignal(async (signal) => {
    if (signal.kind === 'answer') {
      await pc.setRemoteDescription(signal.data as RTCSessionDescriptionInit);
      await remoteCandidates.flush();
      return;
    }
    if (signal.kind === 'ice') {
      await remoteCandidates.add(signal.data as RTCIceCandidateInit | null);
    }
  });

  const resultPromise = runCompareOverChannel(channel, myValue, 'challenger');
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  signaling.sendSignal({ kind: 'offer', data: pc.localDescription!.toJSON() });

  return {
    token: encodeChallengeToken({ categoryId, roomId }),
    waitForResult: () => resultPromise,
    close: () => {
      channel.close();
      signaling.close();
      pc.close();
    },
  };
}

export async function acceptInviteChallenge(
  token: string,
  myValue: number,
): Promise<{ categoryId: string; result: CompareOutcome; close: () => void }> {
  const challenge = decodeChallengeToken(token);
  if (!challenge) {
    throw new Error('挑战链接无效');
  }

  const signaling = await connectSignaling(challenge.roomId);
  if (getInviteTransportMode() === 'webrtc') {
    return acceptWebRtcInviteChallenge(challenge, signaling, myValue);
  }

  const transport = new WebSocketByteTransport(signaling.socket);
  const result = await runCompareOverWebSocketRelay(signaling, transport, myValue, 'accepter');

  return {
    categoryId: challenge.categoryId,
    result,
    close: () => {
      transport.close();
      signaling.close();
    },
  };
}

async function acceptWebRtcInviteChallenge(
  challenge: { categoryId: string; roomId: string },
  signaling: SignalingConnection,
  myValue: number,
): Promise<{ categoryId: string; result: CompareOutcome; close: () => void }> {
  const pc = new RTCPeerConnection(await createRtcConfig());
  const remoteCandidates = createRemoteCandidateQueue(pc);

  pc.addEventListener('icecandidate', (event) => {
    signaling.sendSignal({ kind: 'ice', data: event.candidate?.toJSON() ?? null });
  });

  signaling.onSignal(async (signal) => {
    if (signal.kind === 'ice') {
      await remoteCandidates.add(signal.data as RTCIceCandidateInit | null);
    }
  });

  const channelPromise = new Promise<RTCDataChannel>((resolve) => {
    pc.addEventListener('datachannel', (event) => resolve(event.channel), { once: true });
  });

  const offer = await signaling.waitForSignal('offer');
  await pc.setRemoteDescription(offer.data as RTCSessionDescriptionInit);
  await remoteCandidates.flush();
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  signaling.sendSignal({ kind: 'answer', data: pc.localDescription!.toJSON() });

  const channel = await channelPromise;
  const result = await runCompareOverChannel(channel, myValue, 'accepter');

  return {
    categoryId: challenge.categoryId,
    result,
    close: () => {
      channel.close();
      signaling.close();
      pc.close();
    },
  };
}

function runCompareOverChannel(
  channel: RTCDataChannel,
  myValue: number,
  role: 'challenger' | 'accepter',
): Promise<CompareOutcome> {
  return withTimeout(new Promise((resolve, reject) => {
    const transport = new WebRtcByteTransport(channel);

    waitForChannelOpen(channel, transportTimeoutMs)
      .then(() => mpzProtocolEngine.run({ myValue, role, transport }))
      .then(resolve)
      .catch(reject);
  }), transportTimeoutMs, 'mpz 协议比较超时，请确认发起方页面仍然打开，且没有在同一个标签页里打开挑战链接');
}

function runCompareOverWebSocketRelay(
  signaling: SignalingConnection,
  transport: ByteTransport,
  myValue: number,
  role: 'challenger' | 'accepter',
): Promise<CompareOutcome> {
  return withTimeout(
    signaling
      .waitForPeers(2)
      .then(() => mpzProtocolEngine.run({ myValue, role, transport })),
    transportTimeoutMs,
    '服务端房间连接超时，请确认双方页面同时在线',
  );
}

function connectSignaling(roomId: string): Promise<SignalingConnection> {
  const socket = new WebSocket(getSignalingUrl(roomId));
  const inbox: SignalingMessage[] = [];
  const waiters: Array<{ kind: SignalKind; resolve: (signal: SignalPayload) => void }> = [];
  const peerWaiters: Array<{ peers: number; resolve: () => void }> = [];
  const handlers = new Set<(signal: SignalPayload) => void>();
  let latestPeerCount = 0;

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data) as SignalingMessage;
    if (message.type === 'joined') {
      latestPeerCount = message.peers;
      for (let index = peerWaiters.length - 1; index >= 0; index -= 1) {
        if (latestPeerCount >= peerWaiters[index].peers) {
          const [waiter] = peerWaiters.splice(index, 1);
          waiter.resolve();
        }
      }
      return;
    }
    if (message.type !== 'signal') {
      return;
    }

    const waiterIndex = waiters.findIndex((waiter) => waiter.kind === message.signal.kind);
    if (waiterIndex >= 0) {
      const [waiter] = waiters.splice(waiterIndex, 1);
      waiter.resolve(message.signal);
    } else {
      inbox.push(message);
    }
    handlers.forEach((handler) => handler(message.signal));
  });

  return new Promise((resolve, reject) => {
    socket.addEventListener(
      'open',
      () =>
        resolve({
          socket,
          sendSignal: (signal) => socket.send(JSON.stringify({ type: 'signal', signal })),
          waitForSignal: (kind) => {
            const index = inbox.findIndex(
              (message) => message.type === 'signal' && message.signal.kind === kind,
            );
            if (index >= 0) {
              const [message] = inbox.splice(index, 1) as Extract<
                SignalingMessage,
                { type: 'signal' }
              >[];
              return Promise.resolve(message.signal);
            }
            return withTimeout(
              new Promise((signalResolve) =>
                waiters.push({ kind, resolve: signalResolve }),
              ),
              signalingTimeoutMs,
              kind === 'offer'
                ? '没有收到挑战者握手，请确认对方页面仍然打开'
                : '没有收到对方握手响应，请稍后重试',
            );
          },
          waitForPeers: (peers) => {
            if (latestPeerCount >= peers) {
              return Promise.resolve();
            }
            return withTimeout(
              new Promise((peersResolve) =>
                peerWaiters.push({ peers, resolve: peersResolve }),
              ),
              signalingTimeoutMs,
              '等待对方进入房间超时，请确认双方页面同时在线',
            );
          },
          onSignal: (handler) => {
            handlers.add(handler);
            return () => handlers.delete(handler);
          },
          close: () => socket.close(),
        }),
      { once: true },
    );
    socket.addEventListener('error', () => reject(new Error('Signaling server 连接失败')), {
      once: true,
    });
  });
}

function createRemoteCandidateQueue(pc: RTCPeerConnection) {
  const pending: Array<RTCIceCandidateInit | null> = [];

  return {
    add: async (candidate: RTCIceCandidateInit | null) => {
      if (!pc.remoteDescription) {
        pending.push(candidate);
        return;
      }
      await pc.addIceCandidate(candidate);
    },
    flush: async () => {
      while (pending.length > 0) {
        await pc.addIceCandidate(pending.shift() ?? null);
      }
    },
  };
}

function waitForChannelOpen(channel: RTCDataChannel, timeoutMs: number): Promise<void> {
  if (channel.readyState === 'open') {
    return Promise.resolve();
  }
  return withTimeout(new Promise((resolve, reject) => {
    channel.addEventListener('open', () => resolve(), { once: true });
    channel.addEventListener('error', () => reject(new Error('DataChannel 连接失败')), {
      once: true,
    });
  }), timeoutMs, 'DataChannel 连接超时，请确认双方页面同时在线；跨网络失败时才需要 TURN 中继');
}

export function resolveInviteTransportMode(env: Record<string, string | undefined>): InviteTransportMode {
  return env.VITE_INVITE_TRANSPORT === 'webrtc' ? 'webrtc' : 'websocket';
}

function getInviteTransportMode(): InviteTransportMode {
  const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
  return resolveInviteTransportMode(env ?? {});
}

function getSignalingUrl(roomId: string): string {
  return `${getRealtimeServiceWebSocketBaseUrl()}/ws?room=${encodeURIComponent(roomId)}`;
}

async function createRtcConfig(): Promise<RTCConfiguration> {
  return { iceServers: await loadIceServers() };
}

async function loadIceServers(): Promise<RTCIceServer[]> {
  try {
    const response = await fetch(`${getRealtimeServiceHttpBaseUrl()}/api/ice-servers`, {
      headers: { accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`ICE server endpoint returned ${response.status}`);
    }
    const payload = (await response.json()) as { iceServers?: RTCIceServer[] };
    if (Array.isArray(payload.iceServers) && payload.iceServers.length > 0) {
      return payload.iceServers;
    }
  } catch (error) {
    console.warn('Falling back to public STUN because ICE server config could not be loaded', error);
  }
  return fallbackIceServers;
}

function getRealtimeServiceWebSocketBaseUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
  const configured = env?.VITE_SIGNALING_URL;
  if (configured) {
    return configured.replace(/\/$/, '').replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:8787`;
}

function getRealtimeServiceHttpBaseUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
  const configured = env?.VITE_ICE_SERVERS_URL ?? env?.VITE_SIGNALING_URL;
  if (configured) {
    return configured.replace(/\/$/, '').replace(/^ws:/, 'http:').replace(/^wss:/, 'https:');
  }
  return `${window.location.protocol}//${window.location.hostname}:8787`;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then((value) => {
        window.clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeout);
        reject(error);
      });
  });
}
