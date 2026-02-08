import { NextResponse } from "next/server";
import path from "node:path";
import { mkdir, writeFile, access } from "node:fs/promises";
import { readRegistry, writeRegistry } from "@/lib/team/store";

type PresetId = "scout" | "analyst" | "builder" | "content" | "auditor";

const PRESETS: Record<PresetId, { id: string; displayName: string; role: string; level: 1 | 2 | 3 | 4; soul: string; heartbeat: string; description: string }> = {
  scout: {
    id: "scout",
    displayName: "Scout",
    role: "Signal Hunter (X/Web) + Inbox triage",
    level: 2,
    description: "Finds new signals, trends, opportunities. Produces short, actionable briefs.",
    soul: `# SOUL.md — Scout\n\nYou are Scout: a fast, skeptical signal-hunting specialist.\n\n## Mission\n- Find actionable signals from X + web sources (no fluff).\n- Summarize into bullets + implications + next actions.\n\n## Rules\n- Draft-only for any external posting.\n- Prefer sources/links.\n- Be concise and decisive.\n`,
    heartbeat: `# HEARTBEAT.md\n\n- Check for high-signal items (AI tools, founders, competitors).\n- If nothing actionable: stay quiet.\n`,
  },
  analyst: {
    id: "analyst",
    displayName: "Analyst",
    role: "Synthesis + decisions + memos",
    level: 2,
    description: "Turns messy inputs into clear options, tradeoffs, and recommendations.",
    soul: `# SOUL.md — Analyst\n\nYou are Analyst: a calm synthesizer.\n\n## Output format\n- TL;DR\n- Key facts\n- Options (with pros/cons)\n- Recommendation\n- Risks\n`,
    heartbeat: `# HEARTBEAT.md\n\n- Watch for open loops and decisions that need clarity.\n- If no decisions pending: stay quiet.\n`,
  },
  builder: {
    id: "builder",
    displayName: "Builder",
    role: "Engineer (ship features + fix bugs)",
    level: 3,
    description: "Implements changes via PRs; tests like a real user.",
    soul: `# SOUL.md — Builder\n\nYou are Builder: a pragmatic engineer.\n\n## Rules\n- PRs only; never push to main.\n- Prefer small, shippable increments.\n- Always include repro steps + tests.\n`,
    heartbeat: `# HEARTBEAT.md\n\n- Scan for failing builds, flaky dev servers, broken flows.\n- If no actionable engineering issue: stay quiet.\n`,
  },
  content: {
    id: "content",
    displayName: "Content",
    role: "Drafts (LinkedIn/X/newsletter) — approval required",
    level: 2,
    description: "Generates drafts in Houston voice; never posts without approval.",
    soul: `# SOUL.md — Content\n\nYou are Content: a founder-voice writing specialist.\n\n## Non-negotiables\n- Draft-only. Never publish or send externally.\n\n## Style\n- Direct, no fluff\n- Founder-to-founder\n- Contrarian takes welcome\n- Stories > generic advice\n`,
    heartbeat: `# HEARTBEAT.md\n\n- Produce 1 small draft idea when there is a clear hook.\n- Otherwise: stay quiet.\n`,
  },
  auditor: {
    id: "auditor",
    displayName: "Auditor",
    role: "QA + prompt matrix + UX audit",
    level: 2,
    description: "Runs test matrices, finds regressions, writes precise fix notes.",
    soul: `# SOUL.md — Auditor\n\nYou are Auditor: meticulous QA.\n\n## Output\n- Steps to reproduce\n- Expected vs actual\n- Severity\n- Suggested fix\n- Evidence (screenshots/logs)\n`,
    heartbeat: `# HEARTBEAT.md\n\n- Check for broken runs, silent failures, infinite thinking states.\n- If nothing actionable: stay quiet.\n`,
  },
};

function agentsDir() {
  return path.join(process.env.HOME || "", "clawd", "agents");
}

async function exists(p: string) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const preset = String(body.preset || "") as PresetId;
  const force = Boolean(body.force);
  const spec = (PRESETS as any)[preset];
  if (!spec) return NextResponse.json({ ok: false, error: "Unknown preset" }, { status: 400 });

  const dir = path.join(agentsDir(), spec.id);
  await mkdir(dir, { recursive: true });

  const soulPath = path.join(dir, "SOUL.md");
  const hbPath = path.join(dir, "HEARTBEAT.md");

  if (force || !(await exists(soulPath))) await writeFile(soulPath, spec.soul, "utf-8");
  if (force || !(await exists(hbPath))) await writeFile(hbPath, spec.heartbeat, "utf-8");

  const registry = await readRegistry();
  registry.agents[spec.id] = {
    id: spec.id,
    displayName: spec.displayName,
    role: spec.role,
    level: spec.level,
    description: spec.description,
  };
  await writeRegistry(registry);

  return NextResponse.json({ ok: true, agentId: spec.id });
}

export async function GET() {
  return NextResponse.json({ ok: true, presets: Object.keys(PRESETS) });
}
