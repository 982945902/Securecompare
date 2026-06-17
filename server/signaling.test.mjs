import { createServer } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { createSignalingServer } from './signaling.mjs';

const servers = [];
const sockets = [];

afterEach(async () => {
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

  it('serves fallback ICE servers for local WebRTC development', async () => {
    const { httpUrl } = await startServer();

    const response = await fetch(`${httpUrl}/turn-credentials`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
  });
});

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
      const waiterIndex = waiters.findIndex((waiter) => waiter.kind === message.signal?.kind);
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
    };
    sockets.push(client);
    socket.once('open', () => resolve(client));
    socket.once('error', reject);
  });
}
