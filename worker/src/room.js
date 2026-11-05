/* Settlement Ledger online: the rules of one room, with no network code in it.
   The Cloudflare Durable Object (index.js) feeds it messages and sends back what it returns. */

const MAX_PLAYERS = 4;
const RAID_FOOD = 6;

export const EVENTS = [
  { key: 'harvest', scope: 'all', title: 'Golden harvest', text: 'Every valley brings in a bumper crop.', fx: { food: 0.5 } },
  { key: 'festival', scope: 'all', title: 'Midsummer festival', text: 'Songs carry from village to village.', fx: { sat: 6 } },
  { key: 'drought', scope: 'all', title: 'Dry season', text: 'The rivers run low and stores shrink.', fx: { food: -0.3 } },
  { key: 'plague', scope: 'top', title: 'Plague in the biggest village', text: 'Crowded villages suffer first.', fx: { health: -8, sat: -3 }, kill: 0.05 },
  { key: 'caravan', scope: 'low', title: 'Trade caravan', text: 'Merchants favour the smallest settlement.', fx: { materials: 0.8, food: 0.4 } },
  { key: 'goldrush', scope: 'one', title: 'Stone and ore', text: 'One village strikes a rich seam.', fx: { materials: 1.2 } },
];

export function newRoom(code, mode, now) {
  return { code, mode, created: now, phase: 'lobby', season: 1, players: [], relations: {}, offers: [], layout: null, feed: [] };
}

const pub = (r) => ({
  code: r.code, mode: r.mode, phase: r.phase, season: r.season, layout: r.layout, relations: r.relations, offers: r.offers,
  players: r.players.map((p) => ({ slot: p.slot, name: p.name, connected: p.connected, ready: !!p.ready, done: !!p.done, away: !!p.away, stats: p.stats || null, result: p.result || null })),
});
const key = (a, b) => (a < b ? a + '-' + b : b + '-' + a);
const atWar = (r, a, b) => r.relations[key(a, b)] === 'war';
const clean = (s, n) => String(s == null ? '' : s).replace(/[<>]/g, '').trim().slice(0, n);
const num = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));

function layoutFor(n) {
  /* plots on a shared map: two side by side, three in a triangle, four in a square */
  const cells = n === 2 ? [[0, 0], [1, 0]] : n === 3 ? [[0, 0], [1, 0], [0.5, 1]] : [[0, 0], [1, 0], [0, 1], [1, 1]];
  return { n, plots: cells.map((c, i) => ({ slot: i, x: c[0], y: c[1] })) };
}
function adjacent(r, a, b) {
  if (r.layout.n !== 4) return true;
  const pa = r.layout.plots[a], pb = r.layout.plots[b];
  return pa.x === pb.x || pa.y === pb.y;   /* in the square, corners across the diagonal are far */
}

const out = (to, msg) => ({ to, msg });
const feed = (r, text) => { r.feed.push(text); r.feed = r.feed.slice(-40); return out('all', { t: 'feed', text }); };
const sync = (r) => out('all', { t: 'players', room: pub(r) });

/* returns { room, out:[{to:'all'|slot|'you', msg}] } and mutates room in place */
export function handle(room, slot, msg, ctx) {
  const o = [];
  const me = room.players.find((p) => p.slot === slot);
  const t = msg && msg.t;
  if (!t) return o;

  if (t === 'start') {
    if (!me || slot !== 0 || room.phase !== 'lobby') return o;
    const live = room.players.filter((p) => p.connected);
    if (live.length < 2) return [out('you', { t: 'err', msg: 'You need at least two players.' })];
    room.players = live.map((p, i) => Object.assign(p, { slot: i }));   /* re-number so plots are 0..n-1 */
    room.phase = 'play';
    room.layout = layoutFor(room.players.length);
    room.base = msg.base || null;
    o.push(out('all', { t: 'start', room: pub(room), base: room.base }));
    return o;
  }
  if (!me) return o;

  if (t === 'chat') { o.push(out('all', { t: 'chat', slot, name: me.name, text: clean(msg.text, 140) })); return o; }

  if (room.phase !== 'play') return o;

  if (t === 'stats') { me.stats = sanitizeStats(msg.stats); o.push(sync(room)); return o; }

  if (t === 'war') {
    const b = num(msg.target, 0, MAX_PLAYERS - 1);
    const them = room.players.find((p) => p.slot === b);
    if (!them || b === slot || me.done || them.done || atWar(room, slot, b)) return o;
    room.relations[key(slot, b)] = 'war';
    room.offers = room.offers.filter((x) => key(x.from, x.to) !== key(slot, b));
    o.push(feed(room, me.name + ' has declared war on ' + them.name + '!'), sync(room));
    return o;
  }
  if (t === 'peace') {
    const b = num(msg.target, 0, MAX_PLAYERS - 1);
    const them = room.players.find((p) => p.slot === b);
    if (!them || !atWar(room, slot, b)) return o;
    const back = room.offers.find((x) => x.from === b && x.to === slot);
    if (back) {
      delete room.relations[key(slot, b)];
      room.offers = room.offers.filter((x) => key(x.from, x.to) !== key(slot, b));
      o.push(feed(room, me.name + ' and ' + them.name + ' have made peace.'));
    } else if (!room.offers.find((x) => x.from === slot && x.to === b)) {
      room.offers.push({ from: slot, to: b });
      o.push(feed(room, me.name + ' offers peace to ' + them.name + '.'));
    }
    o.push(sync(room));
    return o;
  }
  if (t === 'gift') {
    const b = num(msg.to, 0, MAX_PLAYERS - 1), amt = num(msg.amt, 1, 30), res = msg.res === 'materials' ? 'materials' : 'food';
    const them = room.players.find((p) => p.slot === b);
    if (!them || b === slot || me.done || atWar(room, slot, b)) return o;
    o.push(out(b, { t: 'gift', from: slot, name: me.name, res, amt }), feed(room, me.name + ' sent ' + amt + ' ' + res + ' to ' + them.name + '.'));
    return o;
  }
  if (t === 'ready') {
    if (me.done) return o;
    me.stats = sanitizeStats(msg.stats);
    if (num(msg.season, 0, 999) < room.season) {   /* arrived after the season already began: start without a barrier */
      o.push(out('you', { t: 'go', season: room.season, late: true, results: null, event: null }));
      return o;
    }
    me.ready = true; me.away = false;
    me.attack = msg.attack == null ? null : num(msg.attack, 0, MAX_PLAYERS - 1);
    o.push(sync(room));
    o.push(...maybeGo(room));
    return o;
  }
  if (t === 'skip') {   /* the host stops waiting for players who have not locked in */
    if (slot !== 0) return o;
    room.players.forEach((p) => { if (!p.ready && !p.done) p.away = true; });
    o.push(...maybeGo(room));
    return o;
  }
  if (t === 'final') {
    if (me.done) return o;
    me.done = true; me.ready = false;
    me.result = { pop: num(msg.pop, 0, 9999), built: num(msg.built, 0, 999), rank: clean(msg.rank, 40), seasons: num(msg.seasons, 0, 999), look: msg.look && typeof msg.look === 'object' ? msg.look : null };
    o.push(feed(room, me.name + ' finished with ' + me.result.pop + ' settlers.'));
    if (room.players.every((p) => p.done)) {
      room.phase = 'over';
      o.push(out('all', { t: 'board', room: pub(room) }));
    } else {
      o.push(sync(room), ...maybeGo(room));
    }
    return o;
  }
  return o;
}

function sanitizeStats(s) {
  s = s || {};
  return { pop: num(s.pop, 0, 9999), soldiers: num(s.soldiers, 0, 9999), towers: num(s.towers, 0, 99), knowledge: num(s.knowledge, 0, 9999), food: num(s.food, 0, 99999), materials: num(s.materials, 0, 99999), built: num(s.built, 0, 999) };
}

export function maybeGo(room) {
  const live = room.players.filter((p) => !p.done && p.connected && !p.away);
  if (!live.length || !live.every((p) => p.ready)) return [];
  const results = resolve(room);
  const event = rollEvent(room, results);
  const season = room.season;
  room.season += 1;
  room.players.forEach((p) => { p.ready = false; p.away = false; p.attack = null; });
  room.offers = [];
  const o = [out('all', { t: 'go', season, results, event: event ? { key: event.key, title: event.title, text: event.text } : null })];
  results.lines.forEach((l) => o.push(feed(room, l)));
  if (event) o.push(feed(room, event.title + '. ' + event.text));
  o.push(sync(room));
  return o;
}

function resolve(room) {
  const res = {}; const lines = [];
  room.players.forEach((p) => { res[p.slot] = { food: 0, materials: 0, kill: 0, captured: 0, sat: 0, health: 0, lines: [] }; });
  const bonus = (s) => 1 + Math.min(0.3, s.knowledge / 200);
  room.players.forEach((a) => {
    if (a.attack == null || a.done) return;
    const d = room.players.find((p) => p.slot === a.attack);
    if (!d || !atWar(room, a.slot, d.slot) || d.done) return;
    const sa = a.stats || sanitizeStats(), sd = d.stats || sanitizeStats();
    const far = adjacent(room, a.slot, d.slot) ? 1 : 0.8;
    const ap = (sa.soldiers + 0.12 * sa.pop) * 1.2 * bonus(sa) * far * (0.75 + Math.random() * 0.5);
    const dp = (sd.soldiers * 1.25 + 0.12 * sd.pop + sd.towers * 3) * bonus(sd) * (0.75 + Math.random() * 0.5);
    const m = (ap - dp) / Math.max(1, ap + dp);
    if (Math.abs(m) < 0.04) {
      res[a.slot].kill += 1; res[d.slot].kill += 1;
      const l = a.name + "'s raid on " + d.name + ' ended in a bloody stalemate.';
      lines.push(l); res[a.slot].lines.push(l); res[d.slot].lines.push(l);
    } else if (m > 0) {
      const food = Math.min(sd.food, Math.round(sd.food * (0.15 + 0.2 * m))), mat = Math.min(sd.materials, Math.round(sd.materials * (0.15 + 0.2 * m)));
      const dead = Math.max(1, Math.round(sd.pop * (0.04 + 0.08 * m))), taken = m > 0.25 ? Math.min(2, Math.floor(dead / 2)) : 0, lost = Math.max(0, Math.round(sa.pop * 0.02));
      res[a.slot].food += food; res[a.slot].materials += mat; res[a.slot].captured += taken; res[a.slot].kill += lost;
      res[d.slot].food -= food; res[d.slot].materials -= mat; res[d.slot].kill += dead + taken;
      lines.push(a.name + ' defeated ' + d.name + ' and took ' + food + ' food and ' + mat + ' materials.');
      res[a.slot].lines.push('Your raid on ' + d.name + ' succeeded: ' + food + ' food, ' + mat + ' materials' + (taken ? ', ' + taken + ' captured settlers' : '') + (lost ? '; you lost ' + lost + '.' : '.'));
      res[d.slot].lines.push(a.name + ' raided you: ' + (dead + taken) + ' settlers lost, ' + food + ' food and ' + mat + ' materials taken.');
    } else {
      const lost = Math.max(1, Math.round(sa.pop * (0.05 + 0.08 * -m))), foodW = Math.min(sa.food, Math.round(sa.food * 0.1));
      res[a.slot].kill += lost; res[a.slot].food -= foodW; res[d.slot].food += foodW;
      lines.push(d.name + ' held off ' + a.name + "'s raid.");
      res[a.slot].lines.push('Your raid on ' + d.name + ' failed: ' + lost + ' settlers lost.');
      res[d.slot].lines.push('You held off ' + a.name + "'s raid and captured " + foodW + ' food.');
    }
  });
  res.lines = lines;
  return res;
}

function rollEvent(room, results) {
  const live = room.players.filter((p) => !p.done);
  if (live.length < 2 || Math.random() < 0.3) return null;
  const e = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  const pop = (p) => (p.stats ? p.stats.pop : 10);
  let targets = live;
  if (e.scope === 'top') targets = [live.reduce((a, b) => (pop(b) > pop(a) ? b : a))];
  else if (e.scope === 'low') targets = [live.reduce((a, b) => (pop(b) < pop(a) ? b : a))];
  else if (e.scope === 'one') targets = [live[Math.floor(Math.random() * live.length)]];
  targets.forEach((p) => {
    const r = results[p.slot], n = pop(p);
    if (e.fx.food) r.food += Math.round(e.fx.food * n);
    if (e.fx.materials) r.materials += Math.round(e.fx.materials * n);
    if (e.fx.sat) r.sat += e.fx.sat;
    if (e.fx.health) r.health += e.fx.health;
    if (e.kill) r.kill += Math.max(1, Math.round(e.kill * n));
    r.lines.push(e.title + ': ' + e.text);
  });
  return e;
}

/* membership */
export function addPlayer(room, name, token, now) {
  const slot = room.players.length;
  const p = { slot, name: clean(name, 16) || 'Player ' + (slot + 1), token, connected: true, ready: false, done: false, away: false, stats: null, attack: null };
  room.players.push(p);
  return p;
}
/* create or join (or come back with a token). Returns { room, player } or { error } */
export function join(room, msg, token) {
  const code = String(msg.code || '').toUpperCase();
  if (msg.t === 'create') {
    if (room && room.players.some((p) => p.connected)) return { error: 'That code is taken. Try again.' };
    room = newRoom(code, msg.mode === '3' || msg.mode === 'E' ? msg.mode : '6', Date.now());
  } else if (!room) return { error: 'No room with that code.' };
  let p = msg.token && room.players.find((x) => x.token === msg.token);
  if (p) { p.connected = true; p.away = false; if (msg.name) p.name = clean(msg.name, 16); }
  else {
    if (!canJoin(room)) return { error: room.phase === 'lobby' ? 'That room is full.' : 'That game has already started.' };
    p = addPlayer(room, msg.name, token, Date.now());
  }
  return { room, player: p };
}
/* a socket closed: in the lobby the player leaves their plot, in play they are marked away so nobody waits for them */
export function leave(room, token) {
  const p = room.players.find((x) => x.token === token);
  if (!p) return [];
  p.connected = false;
  if (room.phase === 'lobby') room.players = room.players.filter((x) => x !== p).map((x, i) => Object.assign(x, { slot: i }));
  const o = [out('all', { t: 'players', room: pub(room) })];
  if (room.phase === 'play') o.push(...maybeGo(room));
  return o;
}
export const canJoin = (room) => room.phase === 'lobby' && room.players.length < MAX_PLAYERS;
export { pub, maybeGo as _maybeGo, MAX_PLAYERS, RAID_FOOD };
