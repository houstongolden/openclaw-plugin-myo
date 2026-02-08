import { NextResponse } from "next/server";
import { appendJsonl, ensureOps, id, opsPath, readJson, readJsonl } from "@/lib/ops/store";
import type { OpsEvent, OpsPolicies, OpsProposal, OpsStep, OpsMission } from "@/lib/ops/types";

function gateCheck(policies: OpsPolicies, proposal: Partial<OpsProposal>) {
  // MVP gate: if proposal implies X posting, enforce x_autopost + quota placeholder.
  // We'll expand into STEP_KIND_GATES soon.
  const title = (proposal.title || "").toLowerCase();
  const mentionsX = title.includes("tweet") || title.includes("x ") || title.includes("post");

  if (mentionsX && policies?.x_autopost?.enabled === false) return { ok: false, reason: "x_autopost disabled" };

  return { ok: true };
}

export async function GET() {
  await ensureOps();
  const proposals = await readJsonl<OpsProposal>(opsPath("proposals.jsonl"), 5000);
  return NextResponse.json({ ok: true, proposals: proposals.sort((a, b) => (b.ts || 0) - (a.ts || 0)) });
}

export async function POST(req: Request) {
  await ensureOps();
  const body = await req.json().catch(() => ({}));

  const policies = (await readJson<OpsPolicies>(opsPath("policies.json"), {} as any)) as OpsPolicies;

  const proposal: OpsProposal = {
    id: id("prop"),
    ts: Date.now(),
    source: body.source || "manual",
    title: String(body.title || "Untitled proposal"),
    description: body.description ? String(body.description) : undefined,
    project: body.project ? String(body.project) : undefined,
    taskKey: body.taskKey ? String(body.taskKey) : undefined,
    status: "pending",
    gate: { ok: true },
  };

  const gate = gateCheck(policies, proposal);
  proposal.gate = gate;

  if (!gate.ok) {
    proposal.status = "rejected";
    proposal.rejectedAt = Date.now();
    proposal.rejectReason = gate.reason || "rejected by gate";
  }

  await appendJsonl(opsPath("proposals.jsonl"), proposal);

  const event: OpsEvent = {
    id: id("evt"),
    ts: Date.now(),
    kind: "proposal.created",
    title: proposal.title,
    details: proposal.description,
    proposalId: proposal.id,
    project: proposal.project,
    taskKey: proposal.taskKey,
    actor: "mission-control",
  };
  await appendJsonl(opsPath("events.jsonl"), event);

  // If auto-rejected by gate, also emit rejection event.
  if (proposal.status === "rejected") {
    await appendJsonl(opsPath("events.jsonl"), {
      id: id("evt"),
      ts: Date.now(),
      kind: "proposal.rejected",
      title: `Rejected: ${proposal.title}`,
      details: proposal.rejectReason,
      proposalId: proposal.id,
      project: proposal.project,
      taskKey: proposal.taskKey,
      actor: "gate",
    } satisfies OpsEvent);
  }

  return NextResponse.json({ ok: true, proposal });
}

export async function PATCH(req: Request) {
  // Approve/reject by rewriting the jsonl file (simple MVP)
  await ensureOps();
  const body = await req.json().catch(() => ({}));
  const proposalId = String(body.proposalId || "");
  const action = String(body.action || ""); // approve | reject

  const proposals = await readJsonl<OpsProposal>(opsPath("proposals.jsonl"), 5000);
  const idx = proposals.findIndex((p) => p.id === proposalId);
  if (idx === -1) return NextResponse.json({ ok: false, error: "Proposal not found" }, { status: 404 });

  const p = proposals[idx];
  if (action === "approve") {
    p.status = "approved";
    p.approvedAt = Date.now();

    // Create mission + queued step(s) (MVP: one step)
    const mission: OpsMission = {
      id: id("mis"),
      ts: Date.now(),
      proposalId: p.id,
      title: p.title,
      project: p.project,
      taskKey: p.taskKey,
      status: "running",
    };

    const step: OpsStep = {
      id: id("step"),
      ts: Date.now(),
      missionId: mission.id,
      kind: body.stepKind || "general",
      title: body.stepTitle || p.title,
      status: "queued",
    };

    await appendJsonl(opsPath("missions.jsonl"), mission);
    await appendJsonl(opsPath("steps.jsonl"), step);

    await appendJsonl(opsPath("events.jsonl"), {
      id: id("evt"),
      ts: Date.now(),
      kind: "proposal.approved",
      title: `Approved: ${p.title}`,
      proposalId: p.id,
      missionId: mission.id,
      stepId: step.id,
      project: p.project,
      taskKey: p.taskKey,
      actor: "human",
    } satisfies OpsEvent);

    await appendJsonl(opsPath("events.jsonl"), {
      id: id("evt"),
      ts: Date.now(),
      kind: "mission.created",
      title: mission.title,
      proposalId: p.id,
      missionId: mission.id,
      project: p.project,
      taskKey: p.taskKey,
      actor: "mission-control",
    } satisfies OpsEvent);

    await appendJsonl(opsPath("events.jsonl"), {
      id: id("evt"),
      ts: Date.now(),
      kind: "step.queued",
      title: step.title,
      proposalId: p.id,
      missionId: mission.id,
      stepId: step.id,
      project: p.project,
      taskKey: p.taskKey,
      actor: "mission-control",
    } satisfies OpsEvent);
  } else if (action === "reject") {
    p.status = "rejected";
    p.rejectedAt = Date.now();
    p.rejectReason = String(body.reason || "Rejected");

    await appendJsonl(opsPath("events.jsonl"), {
      id: id("evt"),
      ts: Date.now(),
      kind: "proposal.rejected",
      title: `Rejected: ${p.title}`,
      details: p.rejectReason,
      proposalId: p.id,
      project: p.project,
      taskKey: p.taskKey,
      actor: "human",
    } satisfies OpsEvent);
  }

  // Rewrite proposals.jsonl
  const { writeFile } = await import("node:fs/promises");
  await writeFile(
    opsPath("proposals.jsonl"),
    proposals.map((x) => JSON.stringify(x)).join("\n") + "\n",
    "utf-8",
  );

  return NextResponse.json({ ok: true });
}
