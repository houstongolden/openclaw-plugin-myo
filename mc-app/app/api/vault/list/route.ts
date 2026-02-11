import { NextResponse } from "next/server";
import path from "node:path";
import { readdir, stat } from "node:fs/promises";

function rootDir() {
  return (
    process.env.MYO_MC_ROOT_DIR ||
    path.join(process.env.HOME || "", "clawd", "mission-control")
  );
}

// Allowlist top-level folders we consider part of the Mission Control vault.
const ALLOWED_TOP_LEVEL = new Set([
  "projects",
  "content",
  "ops",
  "team",
  "connections",
  "now",
  "activity",
]);

async function walk(dir: string, rel: string, out: string[], depth: number) {
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

    out.push(nextRel);
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const top = (url.searchParams.get("top") || "").trim();

  const root = rootDir();

  const tops = top
    ? [top]
    : Array.from(ALLOWED_TOP_LEVEL.values());

  const files: string[] = [];

  for (const t of tops) {
    if (!ALLOWED_TOP_LEVEL.has(t)) continue;
    await walk(path.join(root, t), t, files, 0);
  }

  const filtered = q
    ? files.filter((f) => f.toLowerCase().includes(q))
    : files;

  filtered.sort((a, b) => a.localeCompare(b));

  return NextResponse.json({
    ok: true,
    root,
    files: filtered,
    allowedTopLevel: Array.from(ALLOWED_TOP_LEVEL.values()),
  });
}
