import { NextResponse } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";

function workingPath() {
  // This is where the gateway watchdog heartbeat is logging in this setup.
  return path.join(process.cwd(), "..", "..", "..", "..", "clawd", "agents", "myo", "memory", "WORKING.md");
}

type Item = { id: string; ts: string; text: string };

function extractItems(md: string): Item[] {
  const lines = md.split(/\r?\n/);
  const items: Item[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^##\s+\[(.+?)\]\s+Heartbeat/i);
    if (m) {
      const ts = m[1];
      const buf: string[] = [];
      i++;
      for (; i < lines.length; i++) {
        const l = lines[i];
        if (l.startsWith("## ")) {
          i--; // let outer see it
          break;
        }
        buf.push(l);
      }
      const text = buf.join("\n").trim();
      items.push({ id: stableId(ts + text), ts, text });
    }
  }

  return items.reverse(); // newest first
}

function stableId(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `hb_${(h >>> 0).toString(16)}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cursor = Math.max(0, Number(searchParams.get("cursor") || 0));
  const limit = Math.min(50, Math.max(5, Number(searchParams.get("limit") || 10)));
  const q = String(searchParams.get("q") || "").toLowerCase();

  try {
    const md = await readFile(workingPath(), "utf-8");
    let items = extractItems(md);
    if (q) items = items.filter((x) => (x.text + " " + x.ts).toLowerCase().includes(q));

    const page = items.slice(cursor, cursor + limit);
    const nextCursor = cursor + page.length;
    const hasMore = nextCursor < items.length;

    return NextResponse.json({ ok: true, items: page, nextCursor, hasMore });
  } catch (e: any) {
    return NextResponse.json({ ok: false, items: [], nextCursor: 0, hasMore: false, error: e?.message || String(e) });
  }
}
