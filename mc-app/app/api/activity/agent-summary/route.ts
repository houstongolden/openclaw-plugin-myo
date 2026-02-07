import { NextResponse } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";

function vaultDir() {
  return process.env.MYO_MC_ROOT_DIR || path.join(process.env.HOME || "", "clawd", "mission-control");
}

function activityDir() {
  return path.join(vaultDir(), "activity");
}

function todayFile() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}.jsonl`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = String(searchParams.get("key") || "");
  const max = Math.min(20, Math.max(3, Number(searchParams.get("max") || 3)));

  if (!key) return NextResponse.json({ ok: false, lines: [] }, { status: 400 });

  try {
    const txt = await readFile(path.join(activityDir(), todayFile()), "utf-8");
    const lines = txt
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-8000)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return { ts: Date.now(), text: l };
        }
      })
      .filter((it: any) => typeof it.text === "string" && it.text.includes(key))
      .slice(-max)
      .map((it: any) => it.text);

    return NextResponse.json({ ok: true, lines });
  } catch (e: any) {
    return NextResponse.json({ ok: false, lines: [], error: e?.message || String(e) });
  }
}
