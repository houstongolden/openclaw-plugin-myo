import { NextResponse } from "next/server";
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { readRegistry, writeRegistry } from "@/lib/team/store";

function agentDir(agentId: string) {
  return path.join(process.env.HOME || "", "clawd", "agents", agentId);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const agentId = String(searchParams.get("id") || "");
  if (!agentId) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const [registry, soul, heartbeat] = await Promise.all([
    readRegistry(),
    readFile(path.join(agentDir(agentId), "SOUL.md"), "utf-8").catch(() => ""),
    readFile(path.join(agentDir(agentId), "HEARTBEAT.md"), "utf-8").catch(() => ""),
  ]);

  return NextResponse.json({ ok: true, agent: registry.agents[agentId] || null, soul, heartbeat });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const agentId = String(body.id || "");
  if (!agentId) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  // Update registry fields
  const registry = await readRegistry();
  registry.agents[agentId] = { ...registry.agents[agentId], ...body.agent, id: agentId };
  if (body.orchestratorName) registry.orchestratorName = String(body.orchestratorName);
  await writeRegistry(registry);

  // Optional file edits (MVP: allow editing SOUL.md from UI)
  if (typeof body.soul === "string") {
    await writeFile(path.join(agentDir(agentId), "SOUL.md"), body.soul, "utf-8");
  }
  if (typeof body.heartbeat === "string") {
    await writeFile(path.join(agentDir(agentId), "HEARTBEAT.md"), body.heartbeat, "utf-8");
  }

  return NextResponse.json({ ok: true });
}
