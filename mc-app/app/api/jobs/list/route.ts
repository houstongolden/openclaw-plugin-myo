import { NextResponse } from "next/server";
import { openclawCall } from "@/lib/openclaw";

export async function GET() {
  // Uses OpenClaw gateway call → cron.list
  // Note: method name may vary across versions; this is a first pass.
  const res = await openclawCall({ method: "cron.list", params: { includeDisabled: true } });
  return NextResponse.json({ ok: true, res });
}
