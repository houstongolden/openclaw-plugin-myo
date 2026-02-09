import path from "node:path";
import { readFile, writeFile, appendFile, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";

const WORKER_ID = process.env.MYO_OPS_WORKER_ID || `mc-worker-${process.pid}`;
const ROOT = process.env.MYO_MC_ROOT_DIR || path.join(process.env.HOME || "", "clawd", "mission-control");
const OPS_DIR = path.join(ROOT, "ops");
const STEPS = path.join(OPS_DIR, "steps.jsonl");
const EVENTS = path.join(OPS_DIR, "events.jsonl");
const PIDFILE = path.join(OPS_DIR, "worker.json");

const CLAIM_STALE_MS = Number(process.env.MYO_OPS_CLAIM_STALE_MS || 10 * 60 * 1000);
const POLL_MS = Number(process.env.MYO_OPS_POLL_MS || 2000);

function now() {
  return Date.now();
}

function id(prefix) {
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

async function ensureOps() {
  await mkdir(OPS_DIR, { recursive: true });
  for (const f of [STEPS, EVENTS]) {
    try {
      await readFile(f, "utf-8");
    } catch {
      await writeFile(f, "", "utf-8");
    }
  }
}

async function appendJsonl(file, obj) {
  await appendFile(file, JSON.stringify(obj) + "\n", "utf-8");
}

async function readJsonl(file, limit = 5000) {
  const txt = await readFile(file, "utf-8").catch(() => "");
  const lines = txt.split(/\r?\n/).filter(Boolean).slice(-limit);
  const out = [];
  for (const l of lines) {
    try {
      out.push(JSON.parse(l));
    } catch {}
  }
  return out;
}

function foldLastById(items) {
  const m = new Map();
  for (const it of items) {
    if (it?.id) m.set(it.id, it);
  }
  return Array.from(m.values()).sort((a, b) => (a.ts || 0) - (b.ts || 0));
}

async function emit(kind, title, details = "", extra = {}) {
  await appendJsonl(EVENTS, {
    id: id("evt"),
    ts: now(),
    kind,
    title,
    details,
    actor: WORKER_ID,
    ...extra,
  });
}

async function writeWorkerState(state) {
  await writeFile(
    PIDFILE,
    JSON.stringify(
      {
        pid: process.pid,
        workerId: WORKER_ID,
        startedAt: state.startedAt,
        lastTickAt: state.lastTickAt,
        lastStepId: state.lastStepId || null,
        lastError: state.lastError || null,
        version: 1,
      },
      null,
      2,
    ) + "\n",
    "utf-8",
  );
}

async function runOpenClaw(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("openclaw", args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve({ ok: true, out: out.trim() });
      reject(new Error(`openclaw ${args.join(" ")} failed (${code}): ${err.trim() || out.trim()}`));
    });
  });
}

async function executeStep(step) {
  const kind = String(step.kind || "");

  if (kind === "note") {
    return { ok: true, out: step.details || "" };
  }

  if (kind === "openclaw") {
    const args = Array.isArray(step.args) ? step.args.map(String) : [];
    if (!args.length) throw new Error("Missing step.args for kind=openclaw");
    return await runOpenClaw(args);
  }

  throw new Error(`Unknown step.kind: ${kind}`);
}

async function main() {
  await ensureOps();

  const state = { startedAt: now(), lastTickAt: now(), lastStepId: null, lastError: null };
  await writeWorkerState(state);
  await emit("note", "Ops worker started", `poll=${POLL_MS}ms stale=${CLAIM_STALE_MS}ms`, {});

  // keep-alive tick loop
  // eslint-disable-next-line no-constant-condition
  while (true) {
    state.lastTickAt = now();
    await writeWorkerState(state);

    const raw = await readJsonl(STEPS, 5000);
    const steps = foldLastById(raw);

    // pick first queued or stale-running
    const candidate = steps.find((s) => {
      const status = String(s.status || "");
      if (status === "queued") return true;
      if (status === "running") {
        const reservedAt = Number(s.reservedAt || 0);
        if (!reservedAt) return true;
        return now() - reservedAt > CLAIM_STALE_MS;
      }
      return false;
    });

    if (!candidate) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      continue;
    }

    const stepId = String(candidate.id);
    state.lastStepId = stepId;

    // claim
    const claimed = {
      ...candidate,
      ts: now(),
      status: "running",
      claimedBy: WORKER_ID,
      reservedAt: now(),
      lastError: undefined,
    };

    await appendJsonl(STEPS, claimed);
    await emit("step.claimed", `Claimed step: ${candidate.title || stepId}`, "", {
      stepId,
      missionId: candidate.missionId,
      project: candidate.project,
      taskKey: candidate.taskKey,
    });

    try {
      const res = await executeStep(candidate);
      const done = {
        ...claimed,
        ts: now(),
        status: "succeeded",
        completedAt: now(),
        output: res?.out || "",
      };
      await appendJsonl(STEPS, done);
      await emit("step.succeeded", `Succeeded: ${candidate.title || stepId}`, String(res?.out || ""), {
        stepId,
        missionId: candidate.missionId,
        project: candidate.project,
        taskKey: candidate.taskKey,
      });
    } catch (e) {
      const msg = e?.message || String(e);
      state.lastError = msg;
      const failed = {
        ...claimed,
        ts: now(),
        status: "failed",
        completedAt: now(),
        lastError: msg,
      };
      await appendJsonl(STEPS, failed);
      await emit("step.failed", `Failed: ${candidate.title || stepId}`, msg, {
        stepId,
        missionId: candidate.missionId,
        project: candidate.project,
        taskKey: candidate.taskKey,
      });
    }

    await new Promise((r) => setTimeout(r, 250));
  }
}

process.on("SIGTERM", async () => {
  try {
    await emit("note", "Ops worker stopping", "SIGTERM", {});
  } finally {
    process.exit(0);
  }
});

process.on("SIGINT", async () => {
  try {
    await emit("note", "Ops worker stopping", "SIGINT", {});
  } finally {
    process.exit(0);
  }
});

main().catch(async (e) => {
  try {
    await emit("note", "Ops worker crashed", e?.message || String(e), {});
  } finally {
    process.exit(1);
  }
});
