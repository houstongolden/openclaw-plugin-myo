import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

export type ConnectionKind = "gog" | "bird" | "api_key" | "mcp" | "plugin";

export type ConnectorId =
  | "gmail"
  | "google_calendar"
  | "notion"
  | "x"
  | "slack"
  | "github"
  | "strava"
  | "openai"
  | "anthropic";

export type Connector = {
  id: ConnectorId;
  name: string;
  description: string;
  kind: ConnectionKind;
  accountLabel?: string;
  status: "connected" | "needs_setup" | "error";
  statusDetail?: string;
  provides: string[]; // e.g. ["Inbox", "Content", "Ops"]
  tools: string[]; // scope-like tool names
};

export type Permissions = {
  // connectorId -> agentName -> allowed tools
  allow: Record<string, Record<string, { all?: boolean; tools?: string[] }>>;
};

function vaultRoot() {
  return process.env.MYO_MC_ROOT_DIR || path.join(process.env.HOME || "", "clawd", "mission-control");
}

function connectionsDir() {
  return path.join(vaultRoot(), "connections");
}

export function permissionsPath() {
  return path.join(connectionsDir(), "permissions.json");
}

export async function ensureConnectionsStore() {
  await mkdir(connectionsDir(), { recursive: true });
  try {
    await readFile(permissionsPath(), "utf-8");
  } catch {
    const init: Permissions = { allow: {} };
    await writeFile(permissionsPath(), JSON.stringify(init, null, 2) + "\n", "utf-8");
  }
}

export async function readPermissions(): Promise<Permissions> {
  await ensureConnectionsStore();
  const txt = await readFile(permissionsPath(), "utf-8").catch(() => "{}");
  try {
    return JSON.parse(txt);
  } catch {
    return { allow: {} };
  }
}

export async function writePermissions(p: Permissions) {
  await ensureConnectionsStore();
  await writeFile(permissionsPath(), JSON.stringify(p, null, 2) + "\n", "utf-8");
}
