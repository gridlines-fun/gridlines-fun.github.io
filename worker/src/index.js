import { DurableObject } from 'cloudflare:workers';
import { handle, join, leave, pub } from './room.js';

const DAY = 24 * 3600 * 1000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/ws\/([A-Za-z0-9]{4})$/);
    if (!m) return new Response('Settlement Ledger server is running.', { status: 200 });
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    const allowed = env.ALLOWED_ORIGIN;   /* optional: your GitHub Pages address, e.g. https://you.github.io */
    const origin = request.headers.get('Origin');
    if (allowed && origin && origin !== allowed) return new Response('Origin not allowed', { status: 403 });
    const id = env.ROOMS.idFromName(m[1].toUpperCase());
    return env.ROOMS.get(id).fetch(request);
  },
};

/* One Durable Object per room code. It only moves messages between the sockets and room.js. */
export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));   /* keep-alives never wake the room */
  }
  async load() { return (await this.ctx.storage.get('room')) || null; }
  async save(room) { await this.ctx.storage.put('room', room); await this.ctx.storage.setAlarm(Date.now() + DAY); }

  async fetch(request) {
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);   /* hibernation API: idle rooms cost nothing */
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  send(ws, msg) { try { ws.send(JSON.stringify(msg)); } catch (e) {} }
  /* sockets only remember a token; the slot comes from the room, so renumbering never leaves one stale */
  deliver(room, outs, you) {
    const socks = this.ctx.getWebSockets().map((ws) => {
      const tok = (ws.deserializeAttachment() || {}).token;
      const p = room && room.players.find((x) => x.token === tok);
      return { ws, slot: p ? p.slot : null };
    });
    for (const { to, msg } of outs) {
      if (to === 'you') { if (you) this.send(you, msg); continue; }
      for (const s of socks) {
        if (s.slot == null || !(to === 'all' || to === s.slot)) continue;
        this.send(s.ws, msg.t === 'players' || msg.t === 'start' ? { ...msg, you: s.slot } : msg);
      }
    }
  }

  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 400000) return;
    let msg; try { msg = JSON.parse(raw); } catch (e) { return; }
    let room = await this.load();
    if (msg.t === 'create' || msg.t === 'join') {
      const r = join(room, msg, crypto.randomUUID());
      if (r.error) return this.send(ws, { t: 'err', msg: r.error });
      room = r.room;
      ws.serializeAttachment({ token: r.player.token });
      await this.save(room);
      this.send(ws, { t: 'joined', slot: r.player.slot, token: r.player.token, room: pub(room) });
      this.deliver(room, [{ to: 'all', msg: { t: 'players', room: pub(room) } }], ws);
      return;
    }
    const tok = (ws.deserializeAttachment() || {}).token;
    const me = room && room.players.find((x) => x.token === tok);
    if (!me) return;
    const outs = handle(room, me.slot, msg, {});
    await this.save(room);
    this.deliver(room, outs, ws);
  }

  async webSocketClose(ws) {
    const room = await this.load();
    if (!room) return;
    const outs = leave(room, (ws.deserializeAttachment() || {}).token);
    await this.save(room);
    this.deliver(room, outs, null);
  }
  async webSocketError(ws) { return this.webSocketClose(ws); }
  async alarm() { await this.ctx.storage.deleteAll(); }   /* rooms vanish a day after their last activity */
}
