import { NextResponse } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";

function vaultDir() {
  return process.env.MYO_MC_ROOT_DIR || path.join(process.env.HOME || "", "clawd", "mission-control");
}

function activityDir() {
  return path.join(vaultDir(), "activity");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const file = String(searchParams.get("file") || "");
  const cursor = Math.max(0, Number(searchParams.get("cursor") || 0));
  const limit = Math.min(500, Math.max(50, Number(searchParams.get("limit") || 200)));
  const q = String(searchParams.get("q") || "").toLowerCase();

  if (!file.endsWith(".jsonl")) return NextResponse.json({ ok: false, error: "Invalid file" }, { status: 400 });

  try {
    const txt = await readFile(path.join(activityDir(), file), "utf-8");
    let lines = txt.split(/\r?\n/).filter(Boolean);
    if (q) lines = lines.filter((l) => l.toLowerCase().includes(q));

    const page = lines.slice(cursor, cursor + limit);
    const items = page
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return { ts: Date.now(), level: "info", text: l };
        }
      })
      .sort((a: any, b: any) => (a.ts || 0) - (b.ts || 0));

    const nextCursor = cursor + page.length;
    const hasMore = nextCursor < lines.length;

    return NextResponse.json({ ok: true, items, nextCursor, hasMore, total: lines.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, items: [], nextCursor: 0, hasMore: false, error: e?.message || String(e) });
  }
}
