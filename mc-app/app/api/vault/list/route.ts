import { NextResponse } from "next/server";
import path from "node:path";
import { readdir, stat } from "node:fs/promises";

type Scope = "mission-control" | "clawd";

function missionControlRoot() {
  return (
    process.env.MYO_MC_ROOT_DIR ||
    path.join(process.env.HOME || "", "clawd", "mission-control")
  );
}

function clawdRoot() {
  return (
    process.env.MYO_VAULT_ROOT_DIR ||
    path.join(process.env.HOME || "", "clawd")
  );
}

function rootDir(scope: Scope) {
  return scope === "clawd" ? clawdRoot() : missionControlRoot();
}

const ALLOWED_TOP_LEVEL_MISSION_CONTROL = new Set([
  "projects",
  "content",
  "ops",
  "team",
  "connections",
  "now",
  "activity",
]);

// For the full ~/clawd workspace, we still keep a conservative allowlist by default.
// (User asked for whole clawd; this covers the common folders we actually use.)
const ALLOWED_TOP_LEVEL_CLAWD = new Set([
  "mission-control",
  "projects",
  "agents",
  "skills",
  "scripts",
  "project-context",
  "memory",
  "content",
  "docs",
]);

async function walk(dir: string, rel: string, out: { path: string; mtimeMs: number; size: number }[], depth: number) {
  if (depth > 8) return;

  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const abs = path.join(dir, e.name);
    const nextRel = rel ? path.posix.join(rel, e.name) : e.name;

    if (e.isDirectory()) {
      await walk(abs, nextRel, out, depth + 1);
      continue;
    }

    if (!e.isFile()) continue;
    if (!e.name.toLowerCase().endsWith(".md")) continue;

    // Sanity: skip huge files
    const st = await stat(abs).catch(() => null);
    if (st && st.size > 2 * 1024 * 1024) continue;

    out.push({ path: nextRel, mtimeMs: st?.mtimeMs ? Number(st.mtimeMs) : 0, size: st?.size ? Number(st.size) : 0 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const top = (url.searchParams.get("top") || "").trim();
  const scope = ((url.searchParams.get("scope") || "mission-control") as Scope);

  const allowed = scope === "clawd" ? ALLOWED_TOP_LEVEL_CLAWD : ALLOWED_TOP_LEVEL_MISSION_CONTROL;
  const root = rootDir(scope);

  const tops = top ? [top] : Array.from(allowed.values());

  const files: { path: string; mtimeMs: number; size: number }[] = [];

  for (const t of tops) {
    if (!allowed.has(t)) continue;
    await walk(path.join(root, t), t, files, 0);
  }

  const filtered = q
    ? files.filter((f) => f.path.toLowerCase().includes(q))
    : files;

  // default sort: most recently modified first
  filtered.sort((a, b) => (b.mtimeMs || 0) - (a.mtimeMs || 0) || a.path.localeCompare(b.path));

  return NextResponse.json({
    ok: true,
    scope,
    root,
    files: filtered,
    allowedTopLevel: Array.from(allowed.values()),
  });
}
