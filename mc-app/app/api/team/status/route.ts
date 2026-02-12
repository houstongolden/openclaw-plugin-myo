import { NextResponse } from "next/server";
import path from "node:path";
import { readFile, readdir } from "node:fs/promises";

function agentsDir() {
  return path.join(process.env.HOME || "", "clawd", "agents");
}

function parseSection(md: string, heading: string): string[] {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inSection = false;
  for (const line of lines) {
    const h = line.match(/^##\s+(.*)$/);
    if (h) {
      inSection = h[1].trim().toLowerCase() === heading.toLowerCase();
      continue;
    }
    if (!inSection) continue;
    const m = line.match(/^\s*[-*]\s+(.*)$/);
    if (m) {
      const t = m[1].trim();
      if (t) out.push(t);
    }
  }
  return out;
}

export type AgentStatus = {
  id: string;
  now: string[];
  next: string[];
  blocked: string[];
  last5: string[];
};

function parseLast5(md: string): string[] {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inSection = false;
  for (const line of lines) {
    const h = line.match(/^##\s+Last 5 tasks done/i);
    if (h) {
      inSection = true;
      continue;
    }
    if (inSection) {
      if (/^##\s+/.test(line)) break;
      const m = line.match(/^\s*\d+\)\s+(.*)$/);
      if (m) {
        const t = m[1].trim();
        if (t) out.push(t);
      }
    }
  }
  return out;
}

async function listAgentIds() {
  const dirents = await readdir(agentsDir(), { withFileTypes: true });
  return dirents
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name)
    .sort();
}

export async function GET() {
  const ids = await listAgentIds().catch(() => [] as string[]);

  const items = await Promise.all(
    ids.map(async (id) => {
      const statusPath = path.join(agentsDir(), id, "status.md");
      const txt = await readFile(statusPath, "utf-8").catch(() => "");
      const st: AgentStatus = {
        id,
        now: parseSection(txt, "Now"),
        next: parseSection(txt, "Next"),
        blocked: parseSection(txt, "Blocked"),
        last5: parseLast5(txt).slice(0, 5),
      };
      return st;
    })
  );

  const byId: Record<string, AgentStatus> = {};
  for (const it of items) byId[it.id] = it;
  return NextResponse.json({ ok: true, status: byId });
}
