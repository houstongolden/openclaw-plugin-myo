import { NextResponse } from "next/server";
import { ensureOps, opsPath, readJsonl } from "@/lib/ops/store";
import type { OpsMission, OpsStep } from "@/lib/ops/types";

export async function GET() {
  await ensureOps();
  const missions = await readJsonl<OpsMission>(opsPath("missions.jsonl"), 5000);
  const steps = await readJsonl<OpsStep>(opsPath("steps.jsonl"), 10000);

  const stepsByMission = new Map<string, OpsStep[]>();
  for (const s of steps) {
    const arr = stepsByMission.get(s.missionId) || [];
    arr.push(s);
    stepsByMission.set(s.missionId, arr);
  }

  const items = missions
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))
    .map((m) => ({ ...m, steps: (stepsByMission.get(m.id) || []).sort((a, b) => (a.ts || 0) - (b.ts || 0)) }));

  return NextResponse.json({ ok: true, missions: items });
}
