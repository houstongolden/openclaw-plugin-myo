import { NextResponse } from "next/server";
import path from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { readRegistry, writeRegistry } from "@/lib/team/store";
import { readPermissions } from "@/lib/connections/store";

function agentsDir() {
  return path.join(process.env.HOME || "", "clawd", "agents");
}

async function listAgentFolders() {
  const dirents = await readdir(agentsDir(), { withFileTypes: true });
  return dirents.filter((d) => d.isDirectory() && !d.name.startsWith('.')).map((d) => d.name).sort();
}

export async function GET() {
  const [folders, registry, permissions] = await Promise.all([
    listAgentFolders().catch(() => []),
    readRegistry(),
    readPermissions().catch(() => ({ allow: {} })),
  ]);

  // hydrate defaults for any agent folder missing from registry
  for (const id of folders) {
    if (!registry.agents[id]) {
      registry.agents[id] = {
        id,
        displayName: id === "myo" ? (registry.orchestratorName || "Myo") : id,
        role: id === "myo" ? "Chief of Staff / Orchestrator" : "Specialist",
        level: id === "myo" ? 3 : 1,
        description: "",
      };
    }
  }

  // connector access summary per agent
  const allow = (permissions as any).allow || {};
  const connectorIds = Object.keys(allow);
  const access: Record<string, string[]> = {};
  for (const connectorId of connectorIds) {
    const byAgent = allow[connectorId] || {};
    for (const agentId of Object.keys(byAgent)) {
      if (!access[agentId]) access[agentId] = [];
      access[agentId].push(connectorId);
    }
  }

  return NextResponse.json({ ok: true, registry, folders, access });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const registry = body.registry;
  if (!registry) return NextResponse.json({ ok: false, error: "Missing registry" }, { status: 400 });
  await writeRegistry(registry);
  return NextResponse.json({ ok: true });
}
