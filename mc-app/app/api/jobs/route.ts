import { NextResponse } from "next/server";
import { openclawJson } from "@/lib/openclaw";

export async function GET() {
  // Prefer CLI since gateway-call method names can vary.
  const res = await openclawJson(["cron", "list", "--json", "--include-disabled"]);
  return NextResponse.json({ ok: true, jobs: res?.jobs ?? res });
}
