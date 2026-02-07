import { NextResponse } from "next/server";
import { openclawJson } from "@/lib/openclaw";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const jobId = String(body.jobId || body.id || "");
  const enabled = Boolean(body.enabled);
  if (!jobId) return NextResponse.json({ ok: false, error: "Missing jobId" }, { status: 400 });

  const res = await openclawJson(["cron", "edit", "--id", jobId, "--patch", JSON.stringify({ enabled }), "--json"]);
  return NextResponse.json({ ok: true, res });
}
