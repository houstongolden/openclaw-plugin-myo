import { NextResponse } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { openclawJson } from "@/lib/openclaw";

function rootDir() {
  return process.env.MYO_MC_ROOT_DIR || path.join(process.env.HOME || "", "clawd", "mission-control");
}

export async function GET() {
  const heartbeatPath = path.join(rootDir(), "HEARTBEAT.md");
  const heartbeatMd = await readFile(heartbeatPath, "utf-8").catch(() => "");

  // Best-effort: show cron jobs that look like heartbeat jobs.
  const cron = await openclawJson(["cron", "list", "--json", "--all"]).catch(() => null);
  const jobs = Array.isArray((cron as any)?.jobs) ? (cron as any).jobs : Array.isArray(cron) ? cron : [];
  const heartbeatJobs = jobs.filter((j: any) => {
    const name = String(j?.name || "").toLowerCase();
    return name.includes("heartbeat") || name.includes("fitness-check") || name.includes("morning-brief") || name.includes("afternoon-intel");
  });

  return NextResponse.json({ ok: true, heartbeatPath, heartbeatMd, heartbeatJobs });
}
