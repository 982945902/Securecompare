import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { createLeaderboardService } from './leaderboard/service.mjs';
import { handleLeaderboardRequest } from './leaderboard/http.mjs';

const defaultPort = Number.parseInt(process.env.SIGNALING_PORT ?? '8787', 10);
const fallbackIceServers = [{ urls: 'stun:stun.cloudflare.com:3478' }];

export function createSignalingServer({ server, leaderboardService = null }) {
  const rooms = new Map();
  const wss = new WebSocketServer({ noServer: true });

  server.on('request', async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');

    if (leaderboardService && (await handleLeaderboardRequest(req, res, leaderboardService))) {
      return;
    }

    if (req.method === 'OPTIONS' && url.pathname === '/api/ice-servers') {
      writeCorsHeaders(req, res);
      res.writeHead(204);
      res.end();
      return;
    }
    if (url.pathname === '/api/ice-servers') {
      await handleIceServersRequest(req, res);
      return;
    }

    if (url.pathname === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    res.writeHead(404);
    res.end('Not found');
  });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '', 'http://localhost');
    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }

    const roomId = url.searchParams.get('room');
    if (!roomId) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, roomId);
    });
  });

  wss.on('connection', (ws, _request, roomId) => {
    const room = getRoom(rooms, roomId);
    room.clients.add(ws);

    broadcastPresence(room, roomId);
    if (room.latest.offer) {
      ws.send(JSON.stringify({ type: 'signal', signal: room.latest.offer }));
    }
    if (room.latest.answer) {
      ws.send(JSON.stringify({ type: 'signal', signal: room.latest.answer }));
    }
    for (const candidate of room.latest.ice) {
      ws.send(JSON.stringify({ type: 'signal', signal: candidate }));
    }

    ws.on('message', (data) => {
      const message = parseJson(data);
      if (!isRoomMessage(message)) {
        ws.send(JSON.stringify({ type: 'error', error: 'invalid-message' }));
        return;
      }

      if (message.type === 'signal') {
        if (message.signal.kind === 'offer') {
          room.latest.offer = message.signal;
        }
        if (message.signal.kind === 'answer') {
          room.latest.answer = message.signal;
        }
        if (message.signal.kind === 'ice') {
          room.latest.ice.push(message.signal);
        }
      }

      for (const client of room.clients) {
        if (client !== ws && client.readyState === client.OPEN) {
          client.send(JSON.stringify(message));
        }
      }
    });

    ws.on('close', () => {
      room.clients.delete(ws);
      if (room.clients.size === 0) {
        rooms.delete(roomId);
        return;
      }
      broadcastPresence(room, roomId);
    });
  });

  return { wss, rooms };
}

function broadcastPresence(room, roomId) {
  const message = JSON.stringify({ type: 'joined', roomId, peers: room.clients.size });
  for (const client of room.clients) {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  }
}

async function handleIceServersRequest(req, res) {
  if (req.method !== 'GET') {
    writeCorsHeaders(req, res);
    res.writeHead(405, { allow: 'GET, OPTIONS' });
    res.end('Method not allowed');
    return;
  }

  const iceServers = await getIceServers();
  writeCorsHeaders(req, res);
  res.writeHead(200, {
    'cache-control': 'no-store',
    'content-type': 'application/json',
  });
  res.end(JSON.stringify({ iceServers }));
}

async function getIceServers() {
  const turnKeyId = process.env.CLOUDFLARE_TURN_KEY_ID;
  const turnApiToken = process.env.CLOUDFLARE_TURN_KEY_API_TOKEN;
  if (!turnKeyId || !turnApiToken) {
    return fallbackIceServers;
  }

  const ttl = Number.parseInt(process.env.TURN_CREDENTIAL_TTL_SECONDS ?? '86400', 10);
  const response = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(turnKeyId)}/credentials/generate-ice-servers`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${turnApiToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ttl: Number.isFinite(ttl) && ttl > 0 ? ttl : 86400 }),
    },
  );
  if (!response.ok) {
    console.warn(`Cloudflare TURN credential request failed with HTTP ${response.status}`);
    return fallbackIceServers;
  }

  const payload = await response.json();
  if (!Array.isArray(payload.iceServers) || payload.iceServers.length === 0) {
    return fallbackIceServers;
  }
  return payload.iceServers.map(filterBrowserBlockedTurnUrls).filter((server) => {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    return urls.some(Boolean);
  });
}

function filterBrowserBlockedTurnUrls(server) {
  const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
  const filteredUrls = urls.filter((url) => typeof url === 'string' && !url.includes(':53?transport='));
  return {
    ...server,
    urls: Array.isArray(server.urls) ? filteredUrls : filteredUrls[0],
  };
}

function writeCorsHeaders(req, res) {
  const origin = req.headers.origin ?? '*';
  res.setHeader('access-control-allow-origin', origin);
  res.setHeader('access-control-allow-methods', 'GET, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type, accept');
  res.setHeader('vary', 'origin');
}

function getRoom(rooms, roomId) {
  const existing = rooms.get(roomId);
  if (existing) {
    return existing;
  }
  const room = { clients: new Set(), latest: { ice: [] } };
  rooms.set(roomId, room);
  return room;
}

function parseJson(data) {
  try {
    return JSON.parse(data.toString());
  } catch {
    return null;
  }
}

function isRoomMessage(message) {
  return (
    message &&
    typeof message === 'object' &&
    (
      (message.type === 'signal' && isSignal(message.signal)) ||
      (message.type === 'data' && isBase64Data(message.data))
    )
  );
}

function isSignal(signal) {
  return (
    signal &&
    typeof signal === 'object' &&
    (signal.kind === 'offer' || signal.kind === 'answer' || signal.kind === 'ice') &&
    'data' in signal
  );
}

function isBase64Data(data) {
  return typeof data === 'string' && data.length <= 131072 && /^[A-Za-z0-9+/]*={0,2}$/.test(data);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = createServer();
  const leaderboardService = await createLeaderboardService();
  createSignalingServer({ server, leaderboardService });
  server.listen(defaultPort, () => {
    console.log(`Securecompare signaling + leaderboard server listening on http://127.0.0.1:${defaultPort}`);
  });
}
