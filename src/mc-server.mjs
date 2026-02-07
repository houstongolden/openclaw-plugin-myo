#!/usr/bin/env node
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import http from 'node:http';

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeRelPath(p) {
  const cleaned = String(p || '').replaceAll('\\', '/');
  const stripped = cleaned.replace(/^\/+/, '');
  const normalized = path.posix.normalize(stripped);
  if (normalized.startsWith('..')) return '';
  return normalized;
}

function getArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

const rootDir = getArg('root-dir', process.cwd());
const host = getArg('host', '127.0.0.1');
const port = Number(getArg('port', '0'));

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url || '/', `http://${host}`);

    if (u.pathname === '/__health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (u.pathname === '/raw') {
      const rel = normalizeRelPath(u.searchParams.get('path') || '');
      const abs = path.join(rootDir, rel);
      if (!rel) {
        res.writeHead(400, { 'content-type': 'text/plain' });
        res.end('Invalid path');
        return;
      }
      const st = await stat(abs);
      if (!st.isFile()) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('Not found');
        return;
      }
      const buf = await readFile(abs);
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(buf);
      return;
    }

    const rel = normalizeRelPath(u.searchParams.get('path') || 'START_HERE.md');
    const title = rel || 'Mission Control';

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} — Mission Control</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 0; }
    header { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; display:flex; gap:12px; align-items:center; }
    header b { font-weight: 600; }
    header a { color:#111827; text-decoration:none; }
    header a:hover { text-decoration:underline; }
    #app { padding: 20px; max-width: 980px; margin: 0 auto; }
    pre { background:#0b1020; color:#e5e7eb; padding:12px; border-radius:10px; overflow:auto; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  </style>
</head>
<body>
  <header>
    <b>Myo Mission Control</b>
    <span style="color:#6b7280">•</span>
    <a href="/?path=START_HERE.md">Start Here</a>
    <a href="/?path=JOBS.md">Jobs</a>
  </header>
  <div id="app">Loading…</div>
  <script type="module">
    const params = new URLSearchParams(location.search);
    const p = params.get('path') || 'START_HERE.md';
    const app = document.getElementById('app');

    async function load() {
      const rawUrl = '/raw?path=' + encodeURIComponent(p);
      let md = '';
      try {
        const r = await fetch(rawUrl);
        md = await r.text();
      } catch (e) {
        app.textContent = 'Failed to load ' + p;
        return;
      }

      try {
        const { marked } = await import('https://cdn.jsdelivr.net/npm/marked@15.0.12/lib/marked.esm.js');
        app.innerHTML = marked.parse(md);
      } catch (e) {
        const pre = document.createElement('pre');
        pre.textContent = md;
        app.replaceChildren(pre);
      }
    }

    load();
  </script>
</body>
</html>`;

    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end(String(err?.message || err));
  }
});

server.listen(port, host, () => {
  const addr = server.address();
  const actualPort = typeof addr === 'object' && addr ? addr.port : port;
  const url = `http://${host}:${actualPort}/?path=START_HERE.md`;
  // Print URL as the very first line so wrappers can capture it.
  process.stdout.write(url + '\n');
});
