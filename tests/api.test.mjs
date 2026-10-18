// API tests: validation, anti-cheat, weekly + all-time boards, animal icons, delete, rate limits.
import { createRequire } from 'node:module';
import path from 'node:path';
import { ROOT, sleep, freePort, suite, startMockRedis, startSite, runUnconfigured } from './lib.mjs';

const t = suite('API');
const redisPort = await freePort(), sitePort = await freePort();
const redis = await startMockRedis(redisPort);
const site = await startSite(sitePort, redisPort);
const B = site.base;
const L = createRequire(import.meta.url)(path.join(ROOT, 'api', '_lib.js'));

const get = async (p) => { const r = await fetch(B + p); return { status: r.status, body: await r.json().catch(() => null) }; };
const post = async (p, body) => { const r = await fetch(B + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => null) }; };
const token = async () => (await get('/api/start')).body.t;
const pid = (c) => c.repeat(32);
const submit = async (o) => post('/api/score', { pid: pid('a'), nick: 'ana', animal: 'dino', score: 30, t: await token(), ...o });

try {
  /* ---- not configured ---- */
  t.check('start -> 503 without Redis', runUnconfigured('start.js').status === 503);
  t.check('ranking -> 503 without Redis', runUnconfigured('ranking.js').status === 503);
  t.check('score -> 503 without Redis', runUnconfigured('score.js', { method: 'POST', body: {} }).status === 503);

  /* ---- run token ---- */
  const tk = await get('/api/start');
  t.check('start issues a signed token', tk.status === 200 && /^\d{13}\.[a-f0-9]{16}\.[a-f0-9]{32}$/.test(tk.body.t), tk.body);
  t.check('GET /api/score -> 405', (await get('/api/score')).status === 405);
  t.check('_lib is not a public route', (await get('/api/_lib')).status === 404);

  /* ---- validation + anti-cheat ---- */
  t.check('forged token -> 403', (await submit({ t: '1111111111111.aaaaaaaaaaaaaaaa.bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' })).status === 403);
  t.check('impossible score for elapsed time -> 422', (await submit({ score: 50000 })).status === 422);
  t.check('unknown animal -> 400', (await submit({ animal: 'lion' })).status === 400);
  t.check('bad pid -> 400', (await submit({ pid: 'nope' })).status === 400);
  t.check('score 0 -> 400', (await submit({ score: 0 })).status === 400);
  t.check('nickname with symbols -> 400', (await submit({ nick: '<b>x</b>' })).status === 400);
  t.check('nickname too long -> 400', (await submit({ nick: 'abcdefghijk' })).status === 400);
  t.check('banned nickname (leet speak) -> 400', (await submit({ nick: 'xPuT4x' })).body?.error === 'banned');

  /* ---- a valid run lands on all four boards, in capitals ---- */
  const tok1 = await token();
  const ok = await submit({ nick: 'raúl_9', animal: 'cat', score: 40, t: tok1 });
  t.check('valid score accepted', ok.status === 200 && ok.body.ok, ok.body);
  t.check('rank info for global, animal and week', ok.body.all.rank === 1 && ok.body.animal.rank === 1 && ok.body.week.all.rank === 1 && ok.body.week.animal.rank === 1, ok.body);
  t.check('week reset time is the next Monday 00:00 UTC', new Date(ok.body.week.endsAt).getUTCDay() === 1 && ok.body.week.endsAt % 3600000 === 0 && ok.body.week.endsAt > Date.now(), ok.body.week);
  t.check('a token can be used only once', (await submit({ nick: 'raúl_9', animal: 'cat', score: 40, t: tok1 })).status === 409);

  let g = (await get('/api/ranking?board=all&period=all')).body;
  t.check('all-time board stores the nickname in capitals', g.rows[0].n === 'RAÚL_9', g.rows);
  t.check('all-time row remembers the animal', g.rows[0].a === 'cat', g.rows[0]);
  let w = (await get('/api/ranking?board=all&period=week')).body;
  t.check('weekly board has the run + countdown target', w.rows[0]?.n === 'RAÚL_9' && w.rows[0].a === 'cat' && w.endsAt === ok.body.week.endsAt, w);
  const cat = (await get('/api/ranking?board=cat&period=week')).body;
  t.check('per-animal board uses the board animal as icon', cat.rows[0]?.a === 'cat');
  t.check('another animal board is empty', (await get('/api/ranking?board=dino&period=week')).body.rows.length === 0);

  /* ---- ordering, bests and icons ---- */
  await submit({ pid: pid('b'), nick: 'leo', animal: 'dino', score: 55 });
  await submit({ pid: pid('c'), nick: 'eva', animal: 'bunny', score: 20 });
  g = (await get('/api/ranking?board=all&period=week&pid=' + pid('c'))).body;
  t.check('sorted by score', g.rows.map((r) => r.n).join() === 'LEO,RAÚL_9,EVA', g.rows.map((r) => r.n));
  t.check('player is marked and located', g.me?.r === 3 && g.rows[2].me === true, g.me);
  await submit({ pid: pid('b'), nick: 'leo', animal: 'dog', score: 10 });
  g = (await get('/api/ranking?board=all&period=all')).body;
  t.check('a lower score never lowers the best (nor changes the icon)', g.rows[0].n === 'LEO' && g.rows[0].s === 55 && g.rows[0].a === 'dino', g.rows[0]);
  await submit({ pid: pid('b'), nick: 'leo', animal: 'dog', score: 60 });
  g = (await get('/api/ranking?board=all&period=all')).body;
  t.check('a better score with another animal updates best and icon', g.rows[0].s === 60 && g.rows[0].a === 'dog', g.rows[0]);
  t.check('invalid board / period', (await get('/api/ranking?board=zzz')).status === 400 && (await get('/api/ranking?board=all&period=nonsense')).body.period === 'all');

  /* ---- rename + delete ---- */
  const ren = await post('/api/name', { pid: pid('c'), nick: 'eva maría' });
  t.check('rename a player already on the board', ren.body?.saved === true && ren.body.nick === 'EVA MARÍA', ren.body);
  t.check('name check for an unknown player is not saved', (await post('/api/name', { pid: pid('d'), nick: 'nuevo' })).body?.saved === false);
  t.check('banned nickname rejected on rename', (await post('/api/name', { pid: pid('c'), nick: 'nazi' })).status === 400);
  const del = await post('/api/delete', { pid: pid('c') });
  t.check('delete removes every board entry (global, animal, weekly x2)', del.body?.ok && del.body.removed >= 4, del.body);
  const after = (await get('/api/ranking?board=all&period=week')).body;
  const afterAll = (await get('/api/ranking?board=all&period=all')).body;
  const afterBunny = (await get('/api/ranking?board=bunny&period=all')).body;
  t.check('deleted player is gone from all boards', !after.rows.some((r) => r.n.startsWith('EVA')) && !afterAll.rows.some((r) => r.n.startsWith('EVA')) && afterBunny.rows.length === 0);
  t.check('other players are untouched', after.rows.length === 2);
  t.check('delete validates pid', (await post('/api/delete', { pid: 'nope' })).status === 400);

  /* ---- week maths ---- */
  const wk = (iso) => L.weekInfo(Date.parse(iso)).id;
  t.check('week: Sunday belongs to the week that started the Monday before', wk('2026-10-18T23:59:59Z') === '2026-10-12');
  t.check('week: Monday 00:00 UTC starts a new week', wk('2026-10-19T00:00:00Z') === '2026-10-19' && wk('2026-10-18T23:59:59Z') !== wk('2026-10-19T00:00:00Z'));
  t.check('week: crosses a year boundary', wk('2027-01-01T12:00:00Z') === '2026-12-28');
  t.check('week: length is 7 days', L.weekInfo(Date.parse('2026-10-14T10:00:00Z')).end - L.weekInfo(Date.parse('2026-10-14T10:00:00Z')).start === 7 * 864e5);
  t.check('recent weeks: current plus the two before', L.recentWeekIds(3, Date.parse('2026-10-18T10:00:00Z')).join() === '2026-10-12,2026-10-05,2026-09-28');

  /* ---- rate limit on ranking reads that carry a pid (they skip the CDN cache) ---- */
  let last = 0;
  for (let i = 0; i < 301; i++) last = (await fetch(`${B}/api/ranking?board=all&pid=${pid('e')}`)).status;
  t.check('301st ranking read with a pid from the same IP -> 429', last === 429, last);
  t.check('reads without a pid are not limited (they are cached by the CDN)', (await fetch(`${B}/api/ranking?board=all`)).status === 200);
} catch (e) {
  t.check('suite crashed: ' + e.message, false);
}
site.close(); redis.close();
process.exit(t.done() ? 1 : 0);
