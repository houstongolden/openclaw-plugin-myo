import { NextResponse } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { summarizeLines } from "@/lib/activity";

function logPath() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return path.join("/tmp/openclaw", `openclaw-${yyyy}-${mm}-${dd}.log`);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lines = Math.min(5000, Math.max(50, Number(searchParams.get("lines") || 300)));

  try {
    const txt = await readFile(logPath(), "utf-8");
    const all = txt.split(/\r?\n/);
    const tail = all.slice(-lines);
    const summary = summarizeLines(tail, 3);
    const lastTs = Date.now();
    return NextResponse.json({ ok: true, summary, tail, lastTs });
  } catch (e: any) {
    return NextResponse.json({ ok: false, summary: [], tail: [], error: e?.message || String(e) });
  }
}
