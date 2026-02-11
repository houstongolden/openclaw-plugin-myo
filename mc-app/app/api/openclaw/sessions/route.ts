import { NextResponse } from "next/server";
import { gatewayCallJson } from "@/lib/openclaw-cli";

export async function GET() {
  const res = await gatewayCallJson<any>("sessions.list", { limit: 50, includeGlobal: true, includeUnknown: true }, { timeoutMs: 20000 });
  if (!res.ok) return NextResponse.json(res, { status: 502 });
  return NextResponse.json({ ok: true, sessions: res.json?.sessions || [], defaults: res.json?.defaults || null });
}
