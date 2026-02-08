import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { appendRequest, listRequests, appendAudit, appendDecision } from "@/lib/connections/requests";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || "200");
  const items = await listRequests(isFinite(limit) ? limit : 200);
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const kind = String(body.kind || "create");

  if (kind === "create") {
    const connectorId = String(body.connectorId || "");
    const agentId = String(body.agentId || "");
    if (!connectorId || !agentId) return NextResponse.json({ ok: false, error: "Missing connectorId/agentId" }, { status: 400 });

    const item = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      status: "pending" as const,
      connectorId,
      agentId,
      tools: Array.isArray(body.tools) ? body.tools.map(String) : [],
      reason: typeof body.reason === "string" ? body.reason : "",
    };
    await appendRequest(item);
    return NextResponse.json({ ok: true, item });
  }

  if (kind === "decide") {
    const id = String(body.id || "");
    const status = String(body.status || "") as any;
    if (!id || (status !== "approved" && status !== "rejected")) {
      return NextResponse.json({ ok: false, error: "Missing id/status" }, { status: 400 });
    }
    await appendDecision({ id, status, decidedBy: "houston", decisionNote: String(body.note || "") });
    return NextResponse.json({ ok: true });
  }

  if (kind === "audit") {
    await appendAudit(body.event || { type: "unknown" });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Unknown kind" }, { status: 400 });
}
