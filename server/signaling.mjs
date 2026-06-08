import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';

const defaultPort = Number.parseInt(process.env.SIGNALING_PORT ?? '8787', 10);

export function createSignalingServer({ server }) {
  const rooms = new Map();
  const wss = new WebSocketServer({ noServer: true });

  server.on('request', (req, res) => {
    if (req.url === '/healthz') {
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

    ws.send(JSON.stringify({ type: 'joined', roomId, peers: room.clients.size }));
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
      if (!message || message.type !== 'signal' || !isSignal(message.signal)) {
        ws.send(JSON.stringify({ type: 'error', error: 'invalid-signal' }));
        return;
      }

      if (message.signal.kind === 'offer') {
        room.latest.offer = message.signal;
      }
      if (message.signal.kind === 'answer') {
        room.latest.answer = message.signal;
      }
      if (message.signal.kind === 'ice') {
        room.latest.ice.push(message.signal);
      }

      for (const client of room.clients) {
        if (client !== ws && client.readyState === client.OPEN) {
          client.send(JSON.stringify({ type: 'signal', signal: message.signal }));
        }
      }
    });

    ws.on('close', () => {
      room.clients.delete(ws);
      if (room.clients.size === 0) {
        rooms.delete(roomId);
      }
    });
  });

  return { wss, rooms };
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

function isSignal(signal) {
  return (
    signal &&
    typeof signal === 'object' &&
    (signal.kind === 'offer' || signal.kind === 'answer' || signal.kind === 'ice') &&
    'data' in signal
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = createServer();
  createSignalingServer({ server });
  server.listen(defaultPort, () => {
    console.log(`Securecompare signaling server listening on http://127.0.0.1:${defaultPort}`);
  });
}
