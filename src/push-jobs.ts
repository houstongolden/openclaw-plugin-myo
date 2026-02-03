import path from "node:path";
import { readTextFile } from "./fs.js";
import type { JobUpdate } from "./push.js";

// - [x] 0 8 * * * (America/Los_Angeles) (id:uuid)
const JOB_LINE_RE = /^\s*-\s*\[(?<checked>[ xX])\]\s+(?<cron>.+?)\s+\((?<tz>[^)]+)\)\s+\(id:(?<id>[a-zA-Z0-9-_]+)\)\s*$/;

export async function collectJobUpdatesFromRoot(rootDir: string): Promise<JobUpdate[]> {
  const file = path.join(rootDir, "JOBS.md");
  const text = await readTextFile(file).catch(() => "");
  if (!text) return [];

  const updates: JobUpdate[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(JOB_LINE_RE);
    if (!m) continue;
    const id = (m as any).groups?.id as string;
    if (!id) continue;

    const checked = ((m as any).groups?.checked || "").toLowerCase() === "x";
    const cron = String((m as any).groups?.cron || "").trim();
    const tz = String((m as any).groups?.tz || "UTC").trim();

    updates.push({ id, enabled: checked, cron_expression: cron, timezone: tz });
  }

  const byId = new Map<string, JobUpdate>();
  for (const u of updates) byId.set(u.id, u);
  return [...byId.values()];
}
