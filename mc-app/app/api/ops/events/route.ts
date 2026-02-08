import { NextResponse } from "next/server";
import { ensureOps, opsPath, readJsonl } from "@/lib/ops/store";
import type { OpsEvent } from "@/lib/ops/types";

export async function GET(req: Request) {
  await ensureOps();
  const { searchParams } = new URL(req.url);
  const limit = Math.min(5000, Math.max(50, Number(searchParams.get("limit") || 400)));

  const events = await readJsonl<OpsEvent>(opsPath("events.jsonl"), limit);
  return NextResponse.json({ ok: true, events: events.sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, limit) });
}
