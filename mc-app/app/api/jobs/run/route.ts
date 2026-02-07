import { NextResponse } from "next/server";
import { openclawJson } from "@/lib/openclaw";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const jobId = String(body.jobId || body.id || "");
  if (!jobId) return NextResponse.json({ ok: false, error: "Missing jobId" }, { status: 400 });

  const res = await openclawJson(["cron", "run", "--id", jobId, "--json"]);
  return NextResponse.json({ ok: true, res });
}
