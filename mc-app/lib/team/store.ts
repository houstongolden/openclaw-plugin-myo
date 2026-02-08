import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

export type AgentLevel = 1 | 2 | 3 | 4;

export type TeamAgent = {
  id: string; // folder name under ~/clawd/agents
  displayName: string;
  role: string;
  level: AgentLevel;
  description?: string;
  // future: defaultModel, toolPolicy, connector scopes, project access
};

export type TeamRegistry = {
  orchestratorName?: string;
  agents: Record<string, TeamAgent>;
};

function vaultRoot() {
  return process.env.MYO_MC_ROOT_DIR || path.join(process.env.HOME || "", "clawd", "mission-control");
}

function teamDir() {
  return path.join(vaultRoot(), "team");
}

export function registryPath() {
  return path.join(teamDir(), "agents.json");
}

export async function ensureTeamStore() {
  await mkdir(teamDir(), { recursive: true });
  try {
    await readFile(registryPath(), "utf-8");
  } catch {
    const init: TeamRegistry = {
      orchestratorName: "Myo",
      agents: {},
    };
    await writeFile(registryPath(), JSON.stringify(init, null, 2) + "\n", "utf-8");
  }
}

export async function readRegistry(): Promise<TeamRegistry> {
  await ensureTeamStore();
  const txt = await readFile(registryPath(), "utf-8").catch(() => "{}");
  try {
    const parsed = JSON.parse(txt);
    return {
      orchestratorName: parsed.orchestratorName || "Myo",
      agents: parsed.agents || {},
    };
  } catch {
    return { orchestratorName: "Myo", agents: {} };
  }
}

export async function writeRegistry(reg: TeamRegistry) {
  await ensureTeamStore();
  await writeFile(registryPath(), JSON.stringify(reg, null, 2) + "\n", "utf-8");
}
