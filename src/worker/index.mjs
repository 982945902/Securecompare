import { DurableObject } from 'cloudflare:workers';
import * as leaderboardWasm from '../app/protocol/leaderboard-wasm/securecompare_leaderboard_wasm.js';
import leaderboardWasmModule from '../app/protocol/leaderboard-wasm/securecompare_leaderboard_wasm_bg.wasm';

const fallbackIceServers = [{ urls: 'stun:stun.cloudflare.com:3478' }];
let leaderboardWasmPromise = null;

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

export class LeaderboardBoard extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS entries (
          entry_id TEXT PRIMARY KEY,
          schema_id TEXT NOT NULL,
          label TEXT NOT NULL,
          ciphertext TEXT NOT NULL,
          token TEXT NOT NULL,
          submitted_at TEXT,
          fingerprint TEXT,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_entries_fingerprint ON entries(fingerprint);
        CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at);
      `);
    });
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    try {
      if (request.method === 'GET' && url.pathname === '/leaderboard/entries') {
        const schemaId = url.searchParams.get('schemaId');
        if (!isValidIdentifier(schemaId)) {
          throw new Error('missing-schemaId');
        }
        return jsonResponse({ buckets: await this.listBuckets(schemaId) }, 200, request);
      }

      if (request.method === 'POST' && url.pathname === '/leaderboard/entries') {
        const entry = await readJsonRequest(request);
        validateLeaderboardEntry(entry);
        await this.upsertEntry(entry);
        const buckets = await this.listBuckets(entry.schemaId);
        return jsonResponse(
          {
            rankRange: rankRangeForEntry(buckets, entry.entryId),
            buckets,
          },
          201,
          request,
        );
      }

      return jsonResponse({ error: 'not-found' }, 404, request);
    } catch (error) {
      return jsonResponse({ error: error?.message ?? 'leaderboard-error' }, 400, request);
    }
  }

  async upsertEntry(entry) {
    const now = Date.now();
    if (isValidIdentifier(entry.fingerprint)) {
      this.ctx.storage.sql.exec(
        'DELETE FROM entries WHERE schema_id = ? AND fingerprint = ?',
        entry.schemaId,
        entry.fingerprint,
      );
    }

    this.ctx.storage.sql.exec(
      `INSERT OR REPLACE INTO entries (
        entry_id, schema_id, label, ciphertext, token, submitted_at, fingerprint, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      entry.entryId,
      entry.schemaId,
      entry.label ?? entry.entryId,
      entry.ciphertext,
      entry.token,
      entry.submittedAt ?? null,
      entry.fingerprint ?? null,
      now,
    );
  }

  async listBuckets(schemaId) {
    const entries = this.ctx.storage.sql
      .exec(
        `SELECT
          entry_id AS entryId,
          schema_id AS schemaId,
          label,
          ciphertext,
          token,
          submitted_at AS submittedAt,
          fingerprint
        FROM entries
        WHERE schema_id = ?
        ORDER BY created_at ASC`,
        schemaId,
      )
      .toArray();

    const buckets = [];
    for (const entry of entries) {
      await insertLeaderboardEntry(buckets, entry);
    }
    return publicBuckets(buckets);
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

    if (url.pathname === '/leaderboard/entries') {
      return handleLeaderboardRequest(request, env);
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

async function handleLeaderboardRequest(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  const url = new URL(request.url);
  if (request.method === 'GET') {
    const schemaId = url.searchParams.get('schemaId');
    if (!isValidIdentifier(schemaId)) {
      return jsonResponse({ error: 'missing-schemaId' }, 400, request);
    }
    return env.LEADERBOARDS.getByName(schemaId).fetch(request);
  }

  if (request.method === 'POST') {
    try {
      const entry = await readJsonRequest(request);
      validateLeaderboardEntry(entry);
      return env.LEADERBOARDS.getByName(entry.schemaId).fetch(
        new Request(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(entry),
        }),
      );
    } catch (error) {
      return jsonResponse({ error: error?.message ?? 'leaderboard-error' }, 400, request);
    }
  }

  return jsonResponse({ error: 'method-not-allowed' }, 405, request);
}

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
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, accept',
    vary: 'origin',
  };
}

function jsonResponse(payload, status, request) {
  return Response.json(payload, {
    status,
    headers: {
      ...corsHeaders(request),
      'cache-control': 'no-store',
    },
  });
}

async function readJsonRequest(request) {
  try {
    return await request.json();
  } catch {
    throw new Error('invalid-json');
  }
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

async function insertLeaderboardEntry(buckets, entry) {
  if (buckets.length === 0) {
    buckets.push(createLeaderboardBucket(entry));
    return;
  }

  let low = 0;
  let high = buckets.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const comparison = await compareLeaderboardEntries(entry, buckets[mid].representative);
    if (comparison === 'equal') {
      buckets[mid].entries.push(entry);
      return;
    }
    if (comparison === 'less') {
      high = mid;
    } else if (comparison === 'greater') {
      low = mid + 1;
    } else {
      throw new Error('invalid-compare-result');
    }
  }

  buckets.splice(low, 0, createLeaderboardBucket(entry));
}

function createLeaderboardBucket(entry) {
  return {
    bucketId: entry.entryId,
    representative: entry,
    entries: [entry],
  };
}

function publicBuckets(buckets) {
  let rank = 1;
  return buckets.map((bucket) => {
    const rankStart = rank;
    const rankEnd = rank + bucket.entries.length - 1;
    rank = rankEnd + 1;
    return {
      bucketId: bucket.bucketId,
      rankStart,
      rankEnd,
      count: bucket.entries.length,
      entries: bucket.entries.map((entry) => ({
        entryId: entry.entryId,
        label: entry.label ?? entry.entryId,
        submittedAt: entry.submittedAt ?? null,
      })),
    };
  });
}

function rankRangeForEntry(buckets, entryId) {
  for (const bucket of buckets) {
    if (bucket.entries.some((entry) => entry.entryId === entryId)) {
      return { start: bucket.rankStart, end: bucket.rankEnd };
    }
  }
  return null;
}

async function compareLeaderboardEntries(left, right) {
  const wasm = await loadLeaderboardWasm();
  return wasm.compareMhOre(fromBase64(left.ciphertext), fromBase64(right.token));
}

async function loadLeaderboardWasm() {
  if (!leaderboardWasmPromise) {
    leaderboardWasmPromise = leaderboardWasm.default({ module_or_path: leaderboardWasmModule }).then(
      () => leaderboardWasm,
    );
  }
  return leaderboardWasmPromise;
}

function validateLeaderboardEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    throw new Error('invalid-entry');
  }
  for (const field of ['schemaId', 'entryId']) {
    if (!isValidIdentifier(entry[field])) {
      throw new Error(`missing-${field}`);
    }
  }
  for (const field of ['ciphertext', 'token']) {
    if (!isBase64Data(entry[field])) {
      throw new Error(`missing-${field}`);
    }
  }
  if (entry.label !== undefined && (typeof entry.label !== 'string' || entry.label.length > 80)) {
    throw new Error('invalid-label');
  }
  if (
    entry.submittedAt !== undefined &&
    (typeof entry.submittedAt !== 'string' || entry.submittedAt.length > 40)
  ) {
    throw new Error('invalid-submittedAt');
  }
  if (entry.fingerprint !== undefined && !isValidIdentifier(entry.fingerprint)) {
    throw new Error('invalid-fingerprint');
  }
}

function isValidIdentifier(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 2048;
}

function fromBase64(text) {
  return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
}
