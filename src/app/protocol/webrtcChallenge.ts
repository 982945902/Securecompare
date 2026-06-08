import { decodeChallengeToken, encodeChallengeToken } from './challengeToken';
import { comparePrivateValues, type CompareOutcome } from './compareSession';
import { WebRtcByteTransport, type ByteTransport } from './webrtcTransport';

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
  sendSignal: (signal: SignalPayload) => void;
  waitForSignal: (kind: SignalKind) => Promise<SignalPayload>;
  onSignal: (handler: (signal: SignalPayload) => void) => () => void;
  close: () => void;
};

export type InviteChallengeSession = {
  token: string;
  waitForResult: () => Promise<CompareOutcome>;
  close: () => void;
};

const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const signalingTimeoutMs = 15000;
const dataChannelTimeoutMs = 20000;

export async function createInviteChallenge(
  categoryId: string,
  myValue: number,
): Promise<InviteChallengeSession> {
  const roomId = crypto.randomUUID();
  const signaling = await connectSignaling(roomId);
  const pc = new RTCPeerConnection(rtcConfig);
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

  const resultPromise = runCompareOverChannel(channel, myValue);
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
  const pc = new RTCPeerConnection(rtcConfig);
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
  const result = await runCompareOverChannel(channel, myValue);

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

function runCompareOverChannel(channel: RTCDataChannel, myValue: number): Promise<CompareOutcome> {
  return withTimeout(new Promise((resolve, reject) => {
    const transport = new WebRtcByteTransport(channel);
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let sent = false;

    const sendInput = () => {
      if (sent) return;
      sent = true;
      transport.send(encoder.encode(JSON.stringify({ type: 'input', value: myValue })));
    };

    waitForChannelOpen(channel, dataChannelTimeoutMs).then(sendInput).catch(reject);
    transport.onMessage(async (bytes) => {
      try {
        const message = JSON.parse(decoder.decode(bytes)) as { type?: string; value?: unknown };
        if (message.type !== 'input' || typeof message.value !== 'number') {
          return;
        }
        const result = await comparePrivateValues({ mine: myValue, peer: message.value });
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }), dataChannelTimeoutMs, 'DataChannel 比较超时，请确认发起方页面仍然打开，且没有在同一个标签页里打开挑战链接');
}

function connectSignaling(roomId: string): Promise<SignalingConnection> {
  const socket = new WebSocket(getSignalingUrl(roomId));
  const inbox: SignalingMessage[] = [];
  const waiters: Array<{ kind: SignalKind; resolve: (signal: SignalPayload) => void }> = [];
  const handlers = new Set<(signal: SignalPayload) => void>();

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data) as SignalingMessage;
    if (message.type !== 'signal') {
      inbox.push(message);
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

function getSignalingUrl(roomId: string): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
  const configured = env?.VITE_SIGNALING_URL;
  if (configured) {
    return `${configured.replace(/\/$/, '')}/ws?room=${encodeURIComponent(roomId)}`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:8787/ws?room=${encodeURIComponent(roomId)}`;
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
