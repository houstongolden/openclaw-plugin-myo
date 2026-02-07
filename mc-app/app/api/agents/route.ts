import { NextResponse } from "next/server";
import { openclawJson } from "@/lib/openclaw";

// Best-effort agent/session listing. CLI shape can vary; UI will degrade gracefully.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = String(Math.min(100, Math.max(10, Number(searchParams.get("limit") || 50))));

  const res = await openclawJson(["sessions", "list", "--json", "--limit", limit]).catch((e) => ({ ok: false, error: String(e) }));

  // Normalize a loose list
  const items = Array.isArray((res as any)?.sessions)
    ? (res as any).sessions
    : Array.isArray((res as any)?.items)
      ? (res as any).items
      : Array.isArray(res)
        ? res
        : [];

  return NextResponse.json({ ok: true, sessions: items, raw: res });
}
