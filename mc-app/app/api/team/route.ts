import { NextResponse } from "next/server";
import path from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { readRegistry, writeRegistry } from "@/lib/team/store";

function agentsDir() {
  return path.join(process.env.HOME || "", "clawd", "agents");
}

async function listAgentFolders() {
  const dirents = await readdir(agentsDir(), { withFileTypes: true });
  return dirents.filter((d) => d.isDirectory() && !d.name.startsWith('.')).map((d) => d.name).sort();
}

export async function GET() {
  const [folders, registry] = await Promise.all([listAgentFolders().catch(() => []), readRegistry()]);

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

  return NextResponse.json({ ok: true, registry, folders });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const registry = body.registry;
  if (!registry) return NextResponse.json({ ok: false, error: "Missing registry" }, { status: 400 });
  await writeRegistry(registry);
  return NextResponse.json({ ok: true });
}
