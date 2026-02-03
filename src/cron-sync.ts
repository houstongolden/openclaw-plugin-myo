import type { PluginRuntime } from "openclaw/plugin-sdk";
import { myoJobToCronName, type MyoJobLike } from "./jobs.js";

type LoggerLike = {
  info?: (msg: string) => void;
  warn?: (msg: string) => void;
  error?: (msg: string) => void;
};

type CronJob = {
  id: string;
  name: string;
  enabled: boolean;
  schedule?: { kind: string; expr?: string; tz?: string };
  payload?: { kind: string; message?: string; text?: string };
  agentId?: string;
  sessionTarget?: string;
  wakeMode?: string;
};

function eq(a: any, b: any) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

async function run(runtime: PluginRuntime, command: string[], logger?: LoggerLike) {
  const res = await runtime.system.runCommandWithTimeout(command, { timeoutMs: 20_000 });
  if ((res.code ?? 0) !== 0) {
    const msg = `[myo] cron-sync: command failed: ${command.join(" ")}\n${res.stderr || res.stdout || ""}`.trim();
    logger?.warn?.(msg);
    throw new Error(msg);
  }
  return res.stdout || "";
}

export async function syncMyoJobsToOpenClawCron(params: {
  runtime: PluginRuntime;
  logger?: LoggerLike;
  jobs: MyoJobLike[];
  dryRun?: boolean;
}) {
  const { runtime, logger } = params;
  const jobs = params.jobs || [];

  let existing: CronJob[] = [];
  try {
    const out = await run(runtime, ["openclaw", "cron", "list", "--all", "--json"], logger);
    const json = JSON.parse(out);
    existing = Array.isArray(json?.jobs) ? (json.jobs as CronJob[]) : [];
  } catch (err: any) {
    logger?.warn?.(`[myo] cron-sync: could not list cron jobs (skipping cron sync): ${err?.message || String(err)}`);
    return;
  }

  const byName = new Map(existing.map((j) => [j.name, j] as const));

  for (const mj of jobs) {
    const name = myoJobToCronName(mj);
    const cronExpr = mj.cron_expression || "";
    const tz = mj.timezone || "";
    const enabled = mj.enabled !== false;

    // Best-effort mapping of payload.
    const payloadKind = mj.payload_kind || "systemEvent";
    const systemEvent = payloadKind === "systemEvent" ? mj.payload_text : undefined;
    const message = payloadKind === "agentTurn" ? mj.payload_text : undefined;

    const agentId = mj.agent_id;
    const sessionTarget = mj.session_target;
    const wakeMode = mj.wake_mode;

    const cur = byName.get(name);

    if (!cur) {
      const cmd = [
        "openclaw",
        "cron",
        "add",
        "--name",
        name,
        ...(mj.description ? ["--description", mj.description] : []),
        "--cron",
        cronExpr,
        ...(tz ? ["--tz", tz] : []),
        ...(payloadKind === "systemEvent" && systemEvent ? ["--system-event", systemEvent] : []),
        ...(payloadKind === "agentTurn" && message ? ["--message", message] : []),
        ...(agentId ? ["--agent", agentId] : []),
        ...(sessionTarget ? ["--session", sessionTarget] : []),
        ...(wakeMode ? ["--wake", wakeMode] : []),
        ...(enabled ? [] : ["--disabled"]),
        "--json",
      ];

      if (params.dryRun) {
        logger?.info?.(`[myo] cron-sync --dry-run: would add cron job ${name}`);
      } else {
        await run(runtime, cmd, logger);
        logger?.info?.(`[myo] cron-sync: added ${name}`);
      }
      continue;
    }

    const desired = {
      enabled,
      schedule: { kind: "cron", expr: cronExpr, tz },
      payload: payloadKind === "agentTurn" ? { kind: "agentTurn", message } : { kind: "systemEvent", text: systemEvent },
      agentId: agentId ?? cur.agentId,
      sessionTarget: sessionTarget ?? cur.sessionTarget,
      wakeMode: wakeMode ?? cur.wakeMode,
    };

    const differs =
      cur.enabled !== desired.enabled ||
      !eq(cur.schedule?.expr, desired.schedule.expr) ||
      !eq(cur.schedule?.tz || "", desired.schedule.tz || "") ||
      (payloadKind === "systemEvent" && systemEvent && !eq(cur.payload?.text, systemEvent)) ||
      (payloadKind === "agentTurn" && message && !eq(cur.payload?.message, message));

    if (!differs) continue;

    const cmd = [
      "openclaw",
      "cron",
      "edit",
      cur.id,
      "--cron",
      cronExpr,
      ...(tz ? ["--tz", tz] : []),
      ...(payloadKind === "systemEvent" && systemEvent ? ["--system-event", systemEvent] : []),
      ...(payloadKind === "agentTurn" && message ? ["--message", message] : []),
      ...(desired.enabled ? ["--enable"] : ["--disable"]),
      "--json",
    ];

    if (params.dryRun) {
      logger?.info?.(`[myo] cron-sync --dry-run: would edit cron job ${name} (${cur.id})`);
    } else {
      await run(runtime, cmd, logger);
      logger?.info?.(`[myo] cron-sync: updated ${name}`);
    }
  }
}
