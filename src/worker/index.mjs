import { DurableObject } from 'cloudflare:workers';

const fallbackIceServers = [{ urls: 'stun:stun.cloudflare.com:3478' }];

export class InviteRoom extends DurableObject {
  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    await this.replayLatestSignals(server);
    this.broadcastPresence();

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    if (typeof message !== 'string') {
      ws.send(JSON.stringify({ type: 'error', error: 'invalid-message' }));
      return;
    }

    const roomMessage = parseJson(message);
    if (!isRoomMessage(roomMessage)) {
      ws.send(JSON.stringify({ type: 'error', error: 'invalid-message' }));
      return;
    }

    if (roomMessage.type === 'signal') {
      await this.saveLatestSignal(roomMessage.signal);
    }

    const encoded = JSON.stringify(roomMessage);
    for (const client of this.ctx.getWebSockets()) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(encoded);
      }
    }
  }

  webSocketClose(ws, code, reason) {
    ws.close(code, reason);
    this.broadcastPresence();
  }

  webSocketError(ws, error) {
    console.error('Invite room WebSocket error', error);
    ws.close(1011, 'WebSocket error');
    this.broadcastPresence();
  }

  async replayLatestSignals(ws) {
    const latest = await this.ctx.storage.get('latestSignals');
    if (!latest) return;

    if (latest.offer) {
      ws.send(JSON.stringify({ type: 'signal', signal: latest.offer }));
    }
    if (latest.answer) {
      ws.send(JSON.stringify({ type: 'signal', signal: latest.answer }));
    }
    for (const candidate of latest.ice ?? []) {
      ws.send(JSON.stringify({ type: 'signal', signal: candidate }));
    }
  }

  async saveLatestSignal(signal) {
    const latest = (await this.ctx.storage.get('latestSignals')) ?? { ice: [] };
    if (signal.kind === 'offer') {
      latest.offer = signal;
    }
    if (signal.kind === 'answer') {
      latest.answer = signal;
    }
    if (signal.kind === 'ice') {
      latest.ice = [...(latest.ice ?? []), signal].slice(-128);
    }
    await this.ctx.storage.put('latestSignals', latest);
  }

  broadcastPresence() {
    const sockets = this.ctx.getWebSockets();
    const message = JSON.stringify({ type: 'joined', peers: sockets.length });
    for (const client of sockets) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/healthz') {
      return Response.json({ ok: true });
    }

    if (url.pathname === '/api/ice-servers') {
      return handleIceServersRequest(request, env);
    }

    if (url.pathname === '/ws') {
      const roomId = url.searchParams.get('room');
      if (!roomId) {
        return new Response('Missing room', { status: 400 });
      }
      const room = env.INVITE_ROOMS.getByName(roomId);
      return room.fetch(request);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleIceServersRequest(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method !== 'GET') {
    return new Response('Method not allowed', {
      status: 405,
      headers: { ...corsHeaders(request), allow: 'GET, OPTIONS' },
    });
  }

  const iceServers = await getIceServers(env);
  return Response.json(
    { iceServers },
    {
      headers: {
        ...corsHeaders(request),
        'cache-control': 'no-store',
      },
    },
  );
}

async function getIceServers(env) {
  if (!env.CLOUDFLARE_TURN_KEY_ID || !env.CLOUDFLARE_TURN_KEY_API_TOKEN) {
    return fallbackIceServers;
  }

  const ttl = Number.parseInt(env.TURN_CREDENTIAL_TTL_SECONDS ?? '86400', 10);
  const response = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(env.CLOUDFLARE_TURN_KEY_ID)}/credentials/generate-ice-servers`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.CLOUDFLARE_TURN_KEY_API_TOKEN}`,
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

function corsHeaders(request) {
  return {
    'access-control-allow-origin': request.headers.get('Origin') ?? '*',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type, accept',
    vary: 'origin',
  };
}

function parseJson(data) {
  try {
    return JSON.parse(data);
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
