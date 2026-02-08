import path from "node:path";
import { mkdir, readFile, appendFile, writeFile } from "node:fs/promises";

export type PermissionRequest = {
  id: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  connectorId: string;
  agentId: string;
  tools?: string[]; // requested tool scopes
  reason?: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionNote?: string;
};

function vaultRoot() {
  return process.env.MYO_MC_ROOT_DIR || path.join(process.env.HOME || "", "clawd", "mission-control");
}

function connectionsDir() {
  return path.join(vaultRoot(), "connections");
}

export function requestsPath() {
  return path.join(connectionsDir(), "requests.jsonl");
}

export function auditPath() {
  return path.join(connectionsDir(), "audit.jsonl");
}

export async function ensureRequestStore() {
  await mkdir(connectionsDir(), { recursive: true });
  try {
    await readFile(requestsPath(), "utf-8");
  } catch {
    await writeFile(requestsPath(), "", "utf-8");
  }
  try {
    await readFile(auditPath(), "utf-8");
  } catch {
    await writeFile(auditPath(), "", "utf-8");
  }
}

export async function listRequests(limit = 500): Promise<PermissionRequest[]> {
  await ensureRequestStore();
  const txt = await readFile(requestsPath(), "utf-8").catch(() => "");
  const lines = txt.split("\n").filter(Boolean);

  // fold by id (append-only log); last write wins
  const byId = new Map<string, PermissionRequest>();
  for (const line of lines.slice(-limit)) {
    try {
      const item = JSON.parse(line) as PermissionRequest;
      if (item?.id) byId.set(item.id, item);
    } catch {
      // ignore
    }
  }

  return Array.from(byId.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function appendDecision(params: {
  id: string;
  status: "approved" | "rejected";
  decidedBy?: string;
  decisionNote?: string;
}) {
  await ensureRequestStore();
  const items = await listRequests();
  const existing = items.find((x) => x.id === params.id);
  if (!existing) return;

  const next: PermissionRequest = {
    ...existing,
    status: params.status,
    decidedAt: new Date().toISOString(),
    decidedBy: params.decidedBy || "houston",
    decisionNote: params.decisionNote || "",
  };

  await appendFile(requestsPath(), JSON.stringify(next) + "\n", "utf-8");
  await appendFile(
    auditPath(),
    JSON.stringify({ type: `permission_request.${params.status}`, at: next.decidedAt, id: next.id, connectorId: next.connectorId, agentId: next.agentId, tools: next.tools || [] }) +
      "\n",
    "utf-8"
  );
}

export async function appendRequest(req: PermissionRequest) {
  await ensureRequestStore();
  await appendFile(requestsPath(), JSON.stringify(req) + "\n", "utf-8");
  await appendFile(
    auditPath(),
    JSON.stringify({ type: "permission_request.created", at: req.createdAt, id: req.id, connectorId: req.connectorId, agentId: req.agentId, tools: req.tools || [] }) +
      "\n",
    "utf-8"
  );
}

export async function appendAudit(event: any) {
  await ensureRequestStore();
  await appendFile(auditPath(), JSON.stringify({ ...event, at: new Date().toISOString() }) + "\n", "utf-8");
}
