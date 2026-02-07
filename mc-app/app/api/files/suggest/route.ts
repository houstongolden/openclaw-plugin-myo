import { NextResponse } from "next/server";
import { readdir } from "node:fs/promises";
import path from "node:path";

function rootDir() {
  return process.env.MYO_MC_ROOT_DIR || path.join(process.env.HOME || "", "clawd", "mission-control");
}

async function walk(dir: string, relBase: string, out: string[], max: number) {
  if (out.length >= max) return;
  const dirents = await readdir(dir, { withFileTypes: true });
  for (const d of dirents) {
    if (out.length >= max) return;
    if (d.name.startsWith(".")) continue;
    const abs = path.join(dir, d.name);
    const rel = path.posix.join(relBase, d.name);
    if (d.isDirectory()) {
      if (["node_modules", ".git", ".next", "dist", "build"].includes(d.name)) continue;
      await walk(abs, rel, out, max);
    } else {
      if (rel.endsWith(".md") || rel.endsWith(".json")) out.push(rel);
    }
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = String(searchParams.get("q") || "").toLowerCase();
  const max = Math.min(200, Math.max(20, Number(searchParams.get("max") || 60)));

  const out: string[] = [];
  try {
    await walk(rootDir(), "", out, 2000);
    const filtered = q ? out.filter((p) => p.toLowerCase().includes(q)).slice(0, max) : out.slice(0, max);
    return NextResponse.json({ items: filtered });
  } catch (e: any) {
    return NextResponse.json({ items: [], error: e?.message || String(e) });
  }
}
