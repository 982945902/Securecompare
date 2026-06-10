export function installLeaderboardRoutes({ server, leaderboardService }) {
  server.on('request', async (req, res) => {
    await handleLeaderboardRequest(req, res, leaderboardService);
  });
}

export async function handleLeaderboardRequest(req, res, leaderboardService) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (!url.pathname.startsWith('/leaderboard')) {
    return false;
  }

  writeCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }

  try {
    if (req.method === 'GET' && url.pathname === '/leaderboard/entries') {
      writeJson(res, 200, leaderboardService.listEntries({
        schemaId: url.searchParams.get('schemaId'),
      }));
      return true;
    }

    if (req.method === 'POST' && url.pathname === '/leaderboard/entries') {
      const body = await readJsonBody(req);
      const result = await leaderboardService.submitEntry(body);
      writeJson(res, 201, result);
      return true;
    }

    writeJson(res, 404, { error: 'not-found' });
    return true;
  } catch (error) {
    writeJson(res, 400, { error: error?.message ?? 'leaderboard-error' });
    return true;
  }
}

export function writeCorsHeaders(res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
}

function writeJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(text.length > 0 ? JSON.parse(text) : {});
      } catch {
        reject(new Error('invalid-json'));
      }
    });
    req.on('error', reject);
  });
}
