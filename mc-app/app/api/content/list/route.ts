import { NextResponse } from "next/server";
import path from "node:path";
import { readdir } from "node:fs/promises";

function rootDir() {
  return process.env.MYO_MC_ROOT_DIR || path.join(process.env.HOME || "", "clawd", "mission-control");
}

async function walk(dir: string, relBase: string, out: string[]) {
  const dirents = await readdir(dir, { withFileTypes: true });
  for (const d of dirents) {
    if (d.name.startsWith(".")) continue;
    const abs = path.join(dir, d.name);
    const rel = path.posix.join(relBase, d.name);
    if (d.isDirectory()) {
      await walk(abs, rel, out);
    } else {
      if (rel.endsWith(".md")) out.push(rel);
    }
  }
}

export async function GET() {
  const base = path.join(rootDir(), "content");
  try {
    const out: string[] = [];
    await walk(base, "", out);
    out.sort();
    return NextResponse.json({ ok: true, items: out });
  } catch (e: any) {
    return NextResponse.json({ ok: false, items: [], error: e?.message || String(e) });
  }
}
