import { createServer, get } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WebSocket from 'ws';
import { createSignalingServer } from './signaling.mjs';

const servers = [];
const sockets = [];
const originalTurnKeyId = process.env.CLOUDFLARE_TURN_KEY_ID;
const originalTurnApiToken = process.env.CLOUDFLARE_TURN_KEY_API_TOKEN;
const originalTurnTtl = process.env.TURN_CREDENTIAL_TTL_SECONDS;

afterEach(async () => {
  restoreEnv('CLOUDFLARE_TURN_KEY_ID', originalTurnKeyId);
  restoreEnv('CLOUDFLARE_TURN_KEY_API_TOKEN', originalTurnApiToken);
  restoreEnv('TURN_CREDENTIAL_TTL_SECONDS', originalTurnTtl);
  vi.restoreAllMocks();
  sockets.splice(0).forEach((socket) => socket.close());
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve) => {
          server.close(resolve);
        }),
    ),
  );
});

describe('signaling server', () => {
  it('replays the latest offer to a peer that joins later', async () => {
    const { url } = await startServer();
    const roomId = 'room-offer-replay';
    const alice = await connect(`${url}/ws?room=${roomId}`);

    alice.send(JSON.stringify({ type: 'signal', signal: { kind: 'offer', data: 'offer-sdp' } }));

    const bob = await connect(`${url}/ws?room=${roomId}`);

    await expect(bob.nextSignal('offer')).resolves.toEqual({
      type: 'signal',
      signal: { kind: 'offer', data: 'offer-sdp' },
    });
  });

  it('relays answers to the existing peer in the room', async () => {
    const { url } = await startServer();
    const roomId = 'room-answer-relay';
    const alice = await connect(`${url}/ws?room=${roomId}`);
    const bob = await connect(`${url}/ws?room=${roomId}`);

    bob.send(JSON.stringify({ type: 'signal', signal: { kind: 'answer', data: 'answer-sdp' } }));

    await expect(alice.nextSignal('answer')).resolves.toEqual({
      type: 'signal',
      signal: { kind: 'answer', data: 'answer-sdp' },
    });
  });

  it('relays comparison data messages to other peers in the room', async () => {
    const { url } = await startServer();
    const roomId = 'room-data-relay';
    const alice = await connect(`${url}/ws?room=${roomId}`);
    const bob = await connect(`${url}/ws?room=${roomId}`);

    alice.send(JSON.stringify({ type: 'data', data: 'AQIDBA==' }));

    await expect(bob.nextData()).resolves.toEqual({
      type: 'data',
      data: 'AQIDBA==',
    });
    await expect(alice.nextData(25)).rejects.toThrow('timed out');
  });

  it('notifies existing peers when another peer joins the room', async () => {
    const { url } = await startServer();
    const roomId = 'room-peer-count';
    const alice = await connect(`${url}/ws?room=${roomId}`);

    await expect(alice.nextJoined()).resolves.toMatchObject({ peers: 1 });

    const bob = await connect(`${url}/ws?room=${roomId}`);

    await expect(alice.nextJoined()).resolves.toMatchObject({ peers: 2 });
    await expect(bob.nextJoined()).resolves.toMatchObject({ peers: 2 });
  });

  it('replays gathered ice candidates to a peer that joins later', async () => {
    const { url } = await startServer();
    const roomId = 'room-ice-replay';
    const alice = await connect(`${url}/ws?room=${roomId}`);

    alice.send(JSON.stringify({ type: 'signal', signal: { kind: 'ice', data: { candidate: 'a' } } }));
    alice.send(JSON.stringify({ type: 'signal', signal: { kind: 'ice', data: { candidate: 'b' } } }));

    const bob = await connect(`${url}/ws?room=${roomId}`);

    await expect(bob.nextSignal('ice')).resolves.toEqual({
      type: 'signal',
      signal: { kind: 'ice', data: { candidate: 'a' } },
    });
    await expect(bob.nextSignal('ice')).resolves.toEqual({
      type: 'signal',
      signal: { kind: 'ice', data: { candidate: 'b' } },
    });
  });

  it('serves leaderboard routes when a leaderboard service is attached', async () => {
    const leaderboardService = {
      listEntries: ({ schemaId }) => ({
        buckets: [{ bucketId: schemaId, count: 1, entries: [] }],
      }),
    };
    const { httpUrl } = await startServer({ leaderboardService });

    const response = await fetch(`${httpUrl}/leaderboard/entries?schemaId=score-v1`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      buckets: [{ bucketId: 'score-v1', count: 1, entries: [] }],
    });
  });

  it('serves a public STUN fallback when TURN credentials are not configured', async () => {
    delete process.env.CLOUDFLARE_TURN_KEY_ID;
    delete process.env.CLOUDFLARE_TURN_KEY_API_TOKEN;
    const { httpUrl } = await startServer();

    const response = await requestJson(`${httpUrl}/api/ice-servers`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }],
    });
  });

  it('generates short-lived Cloudflare TURN credentials server-side', async () => {
    process.env.CLOUDFLARE_TURN_KEY_ID = 'turn-key-id';
    process.env.CLOUDFLARE_TURN_KEY_API_TOKEN = 'turn-token';
    process.env.TURN_CREDENTIAL_TTL_SECONDS = '3600';
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          iceServers: [
            { urls: ['stun:stun.cloudflare.com:3478'] },
            {
              urls: [
                'turn:turn.cloudflare.com:3478?transport=udp',
                'turn:turn.cloudflare.com:53?transport=udp',
                'turns:turn.cloudflare.com:443?transport=tcp',
              ],
              username: 'user',
              credential: 'credential',
            },
          ],
        }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      ),
    );
    const { httpUrl } = await startServer();

    const response = await requestJson(`${httpUrl}/api/ice-servers`);

    expect(response.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://rtc.live.cloudflare.com/v1/turn/keys/turn-key-id/credentials/generate-ice-servers',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer turn-token',
          'content-type': 'application/json',
        }),
        body: JSON.stringify({ ttl: 3600 }),
      }),
    );
    expect(response.body).toEqual({
      iceServers: [
        { urls: ['stun:stun.cloudflare.com:3478'] },
        {
          urls: [
            'turn:turn.cloudflare.com:3478?transport=udp',
            'turns:turn.cloudflare.com:443?transport=tcp',
          ],
          username: 'user',
          credential: 'credential',
        },
      ],
    });
  });
});

function restoreEnv(name, value) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    get(url, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('error', reject);
      response.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({
          status: response.statusCode,
          body: JSON.parse(body),
        });
      });
    }).on('error', reject);
  });
}

async function startServer(options = {}) {
  const server = createServer();
  createSignalingServer({ server, ...options });
  await new Promise((resolve) => server.listen(0, resolve));
  servers.push(server);
  const address = server.address();
  return {
    url: `ws://127.0.0.1:${address.port}`,
    httpUrl: `http://127.0.0.1:${address.port}`,
  };
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const inbox = [];
    const waiters = [];
    socket.on('message', (data) => {
      const message = JSON.parse(data.toString());
      const waiterIndex = waiters.findIndex(
        (waiter) =>
          waiter.kind === (
            message.type === 'data' || message.type === 'joined'
              ? message.type
              : message.signal?.kind
          ),
      );
      if (waiterIndex >= 0) {
        const [waiter] = waiters.splice(waiterIndex, 1);
        waiter.resolve(message);
      } else {
        inbox.push(message);
      }
    });
    const client = {
      send: (message) => socket.send(message),
      close: () => socket.close(),
      nextSignal: (kind) => {
        const index = inbox.findIndex((message) => message.signal?.kind === kind);
        if (index >= 0) {
          const [message] = inbox.splice(index, 1);
          return Promise.resolve(message);
        }
        return new Promise((resolve) => waiters.push({ kind, resolve }));
      },
      nextJoined: () => {
        const index = inbox.findIndex((message) => message.type === 'joined');
        if (index >= 0) {
          const [message] = inbox.splice(index, 1);
          return Promise.resolve(message);
        }
        return new Promise((resolve) => waiters.push({ kind: 'joined', resolve }));
      },
      nextData: (timeoutMs = 1000) => {
        const index = inbox.findIndex((message) => message.type === 'data');
        if (index >= 0) {
          const [message] = inbox.splice(index, 1);
          return Promise.resolve(message);
        }
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('timed out')), timeoutMs);
          waiters.push({
            kind: 'data',
            resolve: (message) => {
              clearTimeout(timeout);
              resolve(message);
            },
          });
        });
      },
    };
    sockets.push(client);
    socket.once('open', () => resolve(client));
    socket.once('error', reject);
  });
}
