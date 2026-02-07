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

    if (u.pathname === '/api/projects') {
      const projectsDir = path.join(rootDir, 'projects');
      let names = [];
      try {
        const dirents = await (await import('node:fs/promises')).readdir(projectsDir, { withFileTypes: true });
        names = dirents.filter((d) => d.isDirectory()).map((d) => d.name).sort();
      } catch {}
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ projects: names }));
      return;
    }

    if (u.pathname === '/api/project') {
      const name = String(u.searchParams.get('name') || '');
      const safe = normalizeRelPath(name);
      if (!safe) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid name' }));
        return;
      }
      const base = path.join(rootDir, 'projects', safe);
      const files = [];
      for (const f of ['PROJECT.md', 'TASKS.md']) {
        try {
          const st = await stat(path.join(base, f));
          if (st.isFile()) files.push(f);
        } catch {}
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ name: safe, files }));
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
    :root { --border:#e5e7eb; --muted:#6b7280; --bg:#ffffff; --panel:#f9fafb; --text:#111827; }
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 0; background:var(--bg); color:var(--text); }
    header { padding: 10px 14px; border-bottom: 1px solid var(--border); display:flex; gap:12px; align-items:center; }
    header b { font-weight: 650; }
    header a { color:var(--text); text-decoration:none; }
    header a:hover { text-decoration:underline; }
    .layout { display:flex; min-height: calc(100vh - 48px); }
    nav { width: 280px; border-right:1px solid var(--border); background:var(--panel); padding: 12px; box-sizing:border-box; }
    nav .section { margin-bottom: 14px; }
    nav .section h4 { margin: 8px 0; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color:var(--muted); }
    nav a.item { display:block; padding: 8px 10px; border-radius: 10px; color:var(--text); text-decoration:none; }
    nav a.item:hover { background:#eef2ff; }
    main { flex: 1; padding: 18px; }
    .cards { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 14px; }
    .card { border:1px solid var(--border); border-radius: 14px; padding: 12px; background:#fff; }
    .card b { display:block; margin-bottom: 6px; }
    .card p { margin:0; color:var(--muted); font-size: 13px; }
    #doc { max-width: 980px; }
    pre { background:#0b1020; color:#e5e7eb; padding:12px; border-radius:12px; overflow:auto; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  </style>
</head>
<body>
  <header>
    <b>Myo Mission Control</b>
    <span style="color:var(--muted)">•</span>
    <a href="/?path=START_HERE.md">Start Here</a>
    <a href="/?path=JOBS.md">Jobs</a>
  </header>
  <div class="layout">
    <nav>
      <div class="section">
        <h4>Overview</h4>
        <a class="item" href="/?path=START_HERE.md">Start Here</a>
        <a class="item" href="/?path=JOBS.md">Jobs</a>
      </div>
      <div class="section">
        <h4>Projects</h4>
        <div id="projects">Loading…</div>
      </div>
    </nav>
    <main>
      <div class="cards">
        <div class="card"><b>Projects</b><p>Context + goals + tasks. Local-first.</p></div>
        <div class="card"><b>Tasks</b><p>Edit TASKS.md in a project to queue work.</p></div>
        <div class="card"><b>Jobs</b><p>Automation schedules (OpenClaw cron).</p></div>
      </div>
      <div id="doc">Loading…</div>
    </main>
  </div>

  <script type="module">
    const params = new URLSearchParams(location.search);
    const p = params.get('path') || 'START_HERE.md';
    const doc = document.getElementById('doc');
    const projectsEl = document.getElementById('projects');

    async function renderMarkdown(md) {
      try {
        const { marked } = await import('https://cdn.jsdelivr.net/npm/marked@15.0.12/lib/marked.esm.js');
        doc.innerHTML = marked.parse(md);
      } catch (e) {
        const pre = document.createElement('pre');
        pre.textContent = md;
        doc.replaceChildren(pre);
      }
    }

    async function loadDoc() {
      const rawUrl = '/raw?path=' + encodeURIComponent(p);
      let md = '';
      try {
        const r = await fetch(rawUrl);
        md = await r.text();
      } catch (e) {
        doc.textContent = 'Failed to load ' + p;
        return;
      }
      await renderMarkdown(md);
    }

    async function loadProjects() {
      try {
        const r = await fetch('/api/projects');
        const j = await r.json();
        const names = Array.isArray(j.projects) ? j.projects : [];
        if (!names.length) { projectsEl.textContent = '(none yet)'; return; }
        projectsEl.textContent = '';
        for (const name of names) {
          const a1 = document.createElement('a');
          a1.className = 'item';
          a1.href = '/?path=' + encodeURIComponent('projects/' + name + '/TASKS.md');
          a1.textContent = name + ' → tasks';
          const a2 = document.createElement('a');
          a2.className = 'item';
          a2.href = '/?path=' + encodeURIComponent('projects/' + name + '/PROJECT.md');
          a2.textContent = name + ' → project';
          projectsEl.appendChild(a1);
          projectsEl.appendChild(a2);
        }
      } catch (e) {
        projectsEl.textContent = 'Failed to load projects';
      }
    }

    loadProjects();
    loadDoc();
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
