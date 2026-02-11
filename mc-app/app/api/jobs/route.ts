import { NextResponse } from "next/server";
import { openclawJson } from "@/lib/openclaw";

function normalizeJobs(payload: any) {
  const jobs = Array.isArray(payload?.jobs)
    ? payload.jobs
    : Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.res?.jobs)
        ? payload.res.jobs
        : Array.isArray(payload?.res)
          ? payload.res
          : [];

  return jobs;
}

export async function GET() {
  try {
    // Prefer CLI list because it matches installed OpenClaw behavior reliably.
    const res = await openclawJson(["cron", "list", "--json", "--all"]);
    const jobs = normalizeJobs(res);
    return NextResponse.json({ ok: true, jobs, raw: res });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
