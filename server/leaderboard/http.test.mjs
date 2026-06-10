import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { createDemoBrowserLeaderboardCrypto } from './demoBrowserCrypto.mjs';
import { createLeaderboardService } from './service.mjs';
import { handleLeaderboardRequest } from './http.mjs';

const servers = [];
const tempDirs = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve) => {
          server.close(resolve);
        }),
    ),
  );
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('leaderboard HTTP API', () => {
  it('accepts encrypted entries and returns ordered leaderboard buckets', async () => {
    const { url } = await startLeaderboardServer();
    const browserCrypto = await createDemoBrowserLeaderboardCrypto({
      valueBits: 8,
      maxClients: 8,
      seed: 11,
    });

    await postJson(url, encryptedEntry(browserCrypto, 'high', 200));
    await postJson(url, encryptedEntry(browserCrypto, 'low', 9));
    await postJson(url, encryptedEntry(browserCrypto, 'mid-a', 169));
    await postJson(url, encryptedEntry(browserCrypto, 'mid-b', 169));

    const response = await fetch(`${url}/leaderboard/entries?schemaId=score-v1`);
    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(payload.buckets.map((bucket) => bucket.entries.map((entry) => entry.entryId))).toEqual([
      ['low'],
      ['mid-a', 'mid-b'],
      ['high'],
    ]);
    expect(payload.buckets.map((bucket) => [bucket.rankStart, bucket.rankEnd, bucket.count])).toEqual([
      [1, 1, 1],
      [2, 3, 2],
      [4, 4, 1],
    ]);
  });
});

async function startLeaderboardServer() {
  const dir = await mkdtemp(join(tmpdir(), 'securecompare-leaderboard-api-'));
  tempDirs.push(dir);
  const service = await createLeaderboardService({
    eventLogPath: join(dir, 'events.jsonl'),
  });
  const server = createServer(async (req, res) => {
    if (await handleLeaderboardRequest(req, res, service)) {
      return;
    }
    res.writeHead(404);
    res.end('Not found');
  });
  await new Promise((resolve) => server.listen(0, resolve));
  servers.push(server);
  const address = server.address();
  return { url: `http://127.0.0.1:${address.port}` };
}

function encryptedEntry(browserCrypto, entryId, value) {
  return browserCrypto.encryptEntry({
    schemaId: 'score-v1',
    entryId,
    label: entryId,
    value,
    submittedAt: '2026-06-10T00:00:00.000Z',
  });
}

async function postJson(baseUrl, body) {
  const response = await fetch(`${baseUrl}/leaderboard/entries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  expect(response.status).toBe(201);
  return response.json();
}
