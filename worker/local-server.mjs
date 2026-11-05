/* The same room rules as a plain Node server. Use it on your own computer, or on Render (see README):
     cd worker && npm install && npm run local
   then open the game with  ?server=ws://localhost:8787  on the end of its address. */
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';
import { handle, join, leave, pub } from './src/room.js';

const rooms = new Map();           // code -> room
const socks = new Map();           // code -> Set of { ws, token }
const port = Number(process.env.PORT) || 8787;
/* a plain page for hosts that check the server is alive (Render does), and the WebSocket on the same port */
const http = createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('Settlement Ledger server is running.'); });
const wss = new WebSocketServer({ server: http });
const send = (ws, m) => { try { ws.send(JSON.stringify(m)); } catch (e) {} };
function deliver(code, room, outs, you) {
  for (const { to, msg } of outs) {
    if (to === 'you') { if (you) send(you, msg); continue; }
    for (const s of socks.get(code) || []) {
      const p = room.players.find((x) => x.token === s.token);
      if (!p || !(to === 'all' || to === p.slot)) continue;
      send(s.ws, msg.t === 'players' || msg.t === 'start' ? { ...msg, you: p.slot } : msg);
    }
  }
}
wss.on('connection', (ws, req) => {
  const m = (req.url || '').match(/^\/ws\/([A-Za-z0-9]{4})$/);
  if (!m) return ws.close();
  const code = m[1].toUpperCase(); let me = null;
  if (!socks.has(code)) socks.set(code, new Set());
  ws.on('message', (data) => {
    const raw = data.toString(); if (raw === 'ping') return send(ws, 'pong');
    let msg; try { msg = JSON.parse(raw); } catch (e) { return; }
    let room = rooms.get(code);
    if (msg.t === 'create' || msg.t === 'join') {
      const r = join(room, msg, randomUUID());
      if (r.error) return send(ws, { t: 'err', msg: r.error });
      rooms.set(code, r.room); me = { ws, token: r.player.token }; socks.get(code).add(me);
      send(ws, { t: 'joined', slot: r.player.slot, token: r.player.token, room: pub(r.room) });
      return deliver(code, r.room, [{ to: 'all', msg: { t: 'players', room: pub(r.room) } }], ws);
    }
    const p = room && me && room.players.find((x) => x.token === me.token);
    if (p) deliver(code, room, handle(room, p.slot, msg, {}), ws);
  });
  ws.on('close', () => {
    const room = rooms.get(code); if (!room || !me) return;
    socks.get(code).delete(me);
    deliver(code, room, leave(room, me.token), null);
  });
});
http.listen(port, () => console.log('Settlement Ledger room server on port ' + port));
