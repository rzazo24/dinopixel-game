// Shared helpers for the test suites: tiny test reporter, in-memory Upstash-style Redis,
// a local server that runs ./api/*.js like Vercel Functions, and a minimal Chrome DevTools client.
// No npm dependencies: needs Node 22+ (global WebSocket/fetch) and a Chrome/Chromium binary.
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function freePort() {
  return new Promise((res) => {
    const s = net.createServer();
    s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); });
  });
}

/* ---------- reporter ---------- */
export function suite(name) {
  let fails = 0, total = 0;
  console.log('\n== ' + name);
  return {
    check(label, cond, detail) {
      total++;
      if (cond) console.log('  ok    ' + label);
      else { fails++; console.log('  FAIL  ' + label + (detail !== undefined ? '   -> ' + JSON.stringify(detail) : '')); }
    },
    done() {
      console.log(`-- ${name}: ${total - fails}/${total} passed`);
      return fails;
    },
  };
}

/* ---------- in-memory Redis (only the commands the API uses) ---------- */
export async function startMockRedis(port) {
  const kv = new Map(), z = new Map(), h = new Map();
  const zs = (k) => z.get(k) || (z.set(k, new Map()), z.get(k));
  const hs = (k) => h.get(k) || (h.set(k, new Map()), h.get(k));
  function run(c) {
    const [op, ...a] = c; const O = String(op).toUpperCase();
    switch (O) {
      case 'SET': { const nx = a.slice(2).map(String).includes('NX'); if (nx && kv.has(a[0])) return null; kv.set(a[0], String(a[1])); return 'OK'; }
      case 'INCR': { const v = Number(kv.get(a[0]) || 0) + 1; kv.set(a[0], String(v)); return v; }
      case 'EXPIRE': return 1;
      case 'ZADD': {
        const m = zs(a[0]); let i = 1, gt = false, ch = false;
        for (; ['GT', 'CH', 'NX', 'XX'].includes(String(a[i])); i++) { if (a[i] === 'GT') gt = true; if (a[i] === 'CH') ch = true; }
        const sc = Number(a[i]), mem = String(a[i + 1]), cur = m.get(mem);
        if (cur === undefined) { m.set(mem, sc); return 1; }
        if (gt && sc <= cur) return 0;
        m.set(mem, sc); return ch ? 1 : 0;
      }
      case 'ZREM': return zs(a[0]).delete(String(a[1])) ? 1 : 0;
      case 'ZCARD': return zs(a[0]).size;
      case 'ZSCORE': { const v = zs(a[0]).get(String(a[1])); return v === undefined ? null : String(v); }
      case 'ZREVRANK': { const arr = [...zs(a[0]).entries()].sort((x, y) => y[1] - x[1]); const i = arr.findIndex((e) => e[0] === String(a[1])); return i < 0 ? null : i; }
      case 'ZREVRANGE': { const arr = [...zs(a[0]).entries()].sort((x, y) => y[1] - x[1]).slice(Number(a[1]), Number(a[2]) + 1); return arr.flatMap((e) => [e[0], String(e[1])]); }
      case 'HSET': hs(a[0]).set(String(a[1]), String(a[2])); return 1;
      case 'HDEL': return hs(a[0]).delete(String(a[1])) ? 1 : 0;
      case 'HMGET': return a.slice(1).map((f) => hs(a[0]).get(String(f)) ?? null);
      default: throw new Error('unsupported ' + O);
    }
  }
  const server = http.createServer((req, res) => {
    if (req.headers.authorization !== 'Bearer test') { res.writeHead(401); return res.end('{"error":"unauthorized"}'); }
    let b = '';
    req.on('data', (d) => { b += d; });
    req.on('end', () => {
      const body = JSON.parse(b);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (req.url === '/pipeline') res.end(JSON.stringify(body.map((c) => { try { return { result: run(c) }; } catch (e) { return { error: e.message }; } })));
      else { try { res.end(JSON.stringify({ result: run(body) })); } catch (e) { res.end(JSON.stringify({ error: e.message })); } }
    });
  });
  await new Promise((r) => server.listen(port, r));
  return { close: () => server.close(), reset: () => { kv.clear(); z.clear(); h.clear(); } };
}

/* ---------- static site + API functions, like Vercel ---------- */
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
export async function startSite(port, redisPort) {
  process.env.KV_REST_API_URL = 'http://localhost:' + redisPort;
  process.env.KV_REST_API_TOKEN = 'test';
  const require = createRequire(import.meta.url);
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname.startsWith('/api/')) {
      const name = u.pathname.slice(5), file = path.join(ROOT, 'api', name + '.js');
      if (name.startsWith('_') || name.includes('/') || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
      let raw = ''; for await (const c of req) raw += c;
      req.query = Object.fromEntries(u.searchParams);
      req.body = raw && /json/.test(req.headers['content-type'] || '') ? JSON.parse(raw) : raw || undefined;
      res.status = (c) => { res.statusCode = c; return res; };
      res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
      try { await require(file)(req, res); } catch (e) { res.statusCode = 500; res.end('{"error":"crash"}'); console.error(e); }
      return;
    }
    const f = path.join(ROOT, u.pathname === '/' ? 'index.html' : u.pathname);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(port, r));
  return { base: 'http://localhost:' + port, close: () => server.close() };
}

// Runs an API handler in a clean process WITHOUT Redis env vars (the "ranking not configured" case).
export function runUnconfigured(handlerFile, req = {}) {
  const code = `const h=require(${JSON.stringify(path.join(ROOT, 'api', handlerFile))});
    const res={s:0,setHeader(){},status(c){this.s=c;return this},json(o){console.log(JSON.stringify({status:this.s,body:o}))}};
    Promise.resolve(h(${JSON.stringify({ method: 'GET', query: {}, headers: {}, ...req })},res));`;
  const r = spawnSync(process.execPath, ['-e', code], { env: { PATH: process.env.PATH }, encoding: 'utf8' });
  return JSON.parse(r.stdout.trim());
}

/* ---------- Chrome DevTools client ---------- */
function chromeBin() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  for (const b of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    if (spawnSync('which', [b]).status === 0) return b;
  }
  throw new Error('No Chrome/Chromium found (set CHROME_BIN)');
}
export async function launchChrome({ width = 1000, height = 560, mobile = false } = {}) {
  const port = await freePort();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dinopixel-chrome-'));
  const proc = spawn(chromeBin(), ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required',
    `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 80 && !target; i++) {
    try { target = (await (await fetch(`http://localhost:${port}/json`)).json()).find((t) => t.type === 'page'); } catch { /* not up yet */ }
    if (!target) await sleep(250);
  }
  if (!target) throw new Error('Chrome did not start');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let id = 0; const pend = new Map(); const errors = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); }
    else if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  async function ev(expr) {
    const r = (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result;
    if (r.exceptionDetails) throw new Error('page error: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result?.value;
  }
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  return {
    send, ev, errors,
    async goto(url, wait = 900) { await send('Page.navigate', { url }); await sleep(wait); },
    async waitFor(expr, timeout = 15000, step = 100) {
      const t0 = Date.now();
      while (Date.now() - t0 < timeout) { try { if (await ev(expr)) return true; } catch { /* page not ready */ } await sleep(step); }
      return false;
    },
    async screenshot(file) { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(file, Buffer.from(r.result.data, 'base64')); },
    async close() {
      try { ws.close(); } catch { /* ignore */ }
      const exited = new Promise((r) => { proc.once('exit', r); setTimeout(r, 3000); });
      proc.kill('SIGKILL');
      await exited;                                     // Chrome may still be writing its profile: wait before deleting it
      try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 }); } catch { /* temp dir: leaving it is harmless */ }
    },
  };
}
