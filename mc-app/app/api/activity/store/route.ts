import { NextResponse } from "next/server";
import path from "node:path";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { openclawJson } from "@/lib/openclaw";

function vaultDir() {
  return process.env.MYO_MC_ROOT_DIR || path.join(process.env.HOME || "", "clawd", "mission-control");
}

function activityDir() {
  return path.join(vaultDir(), "activity");
}

function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// MVP: list available activity files.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "list";

  await mkdir(activityDir(), { recursive: true });

  if (action === "list") {
    const files = (await readdir(activityDir()).catch(() => [])).filter((f) => f.endsWith(".jsonl")).sort().reverse();
    return NextResponse.json({ ok: true, files });
  }

  if (action === "pull") {
    // Pull latest N lines from today's openclaw log and store as jsonl snapshots.
    const lines = Math.min(5000, Math.max(200, Number(searchParams.get("lines") || 800)));
    const logRes = await openclawJson(["logs", "tail", "--lines", String(lines), "--json"]).catch(() => null as any);

    // Fallback: if logs.tail isn't available, return a no-op.
    if (!logRes) return NextResponse.json({ ok: false, error: "openclaw logs tail unavailable" });

    const entries: any[] = Array.isArray(logRes.entries) ? logRes.entries : Array.isArray(logRes) ? logRes : [];
    const out = entries
      .map((e) => ({
        ts: typeof e.ts === "number" ? e.ts : Date.now(),
        level: e.level || "info",
        text: e.message || e.text || JSON.stringify(e),
        meta: e,
      }))
      .slice(-lines);

    const file = path.join(activityDir(), `${todayKey()}.jsonl`);
    // Append by rewriting (simple, safe MVP)
    const existing = await readFile(file, "utf-8").catch(() => "");
    const existingSet = new Set(existing.split(/\r?\n/).filter(Boolean));
    const append = out
      .map((x) => JSON.stringify(x))
      .filter((l) => !existingSet.has(l));

    if (append.length) {
      const { writeFile } = await import("node:fs/promises");
      await writeFile(file, (existing ? existing + "\n" : "") + append.join("\n") + "\n", "utf-8");
    }

    return NextResponse.json({ ok: true, appended: append.length, file: path.basename(file) });
  }

  return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
}
