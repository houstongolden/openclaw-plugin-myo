import { NextResponse } from "next/server";
import { readPermissions, writePermissions } from "@/lib/connections/store";
import { readdir } from "node:fs/promises";
import path from "node:path";

const CONNECTORS = [
  "gmail",
  "google_calendar",
  "notion",
  "x",
  "github",
  "strava",
  "openai",
  "anthropic",
] as const;

function agentsDir() {
  return path.join(process.env.HOME || "", "clawd", "agents");
}

async function listAgentIds() {
  const dirents = await readdir(agentsDir(), { withFileTypes: true });
  return dirents
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name)
    .sort();
}

export async function POST() {
  const agentIds = await listAgentIds().catch(() => [] as string[]);
  const perms = await readPermissions().catch(() => ({ allow: {} as any }));

  for (const connectorId of CONNECTORS) {
    if (!perms.allow[connectorId]) perms.allow[connectorId] = {};
    for (const agentId of agentIds) {
      perms.allow[connectorId][agentId] = { all: true };
    }
  }

  await writePermissions(perms);
  return NextResponse.json({ ok: true, agentIds, connectors: CONNECTORS });
}
