import { NextResponse } from "next/server";
import path from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";

function root() {
  return process.env.MYO_MC_ROOT_DIR || path.join(process.env.HOME || "", "clawd", "mission-control");
}

function opsDir() {
  return path.join(root(), "ops");
}

function pidFile() {
  return path.join(opsDir(), "worker.json");
}

function workerScript() {
  // extension root: ~/.openclaw/extensions/myo
  return path.join(process.cwd(), "..", "..", "src", "ops-worker.mjs");
}

async function ensure() {
  await mkdir(opsDir(), { recursive: true });
}

function isAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  await ensure();
  const raw = await readFile(pidFile(), "utf-8").catch(() => "");
  try {
    const j = JSON.parse(raw);
    const pid = Number(j.pid);
    return NextResponse.json({ ok: true, state: j, alive: pid ? isAlive(pid) : false });
  } catch {
    return NextResponse.json({ ok: true, state: null, alive: false });
  }
}

export async function POST(req: Request) {
  await ensure();
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");

  if (action === "start") {
    // If already running, no-op
    const current = await readFile(pidFile(), "utf-8").catch(() => "");
    try {
      const j = JSON.parse(current);
      const pid = Number(j.pid);
      if (pid && isAlive(pid)) {
        return NextResponse.json({ ok: true, started: false, state: j, alive: true });
      }
    } catch {}

    const child = spawn(process.execPath, [workerScript()], {
      detached: true,
      stdio: "ignore",
      env: { ...process.env, MYO_MC_ROOT_DIR: root() },
      cwd: path.join(process.cwd(), "..", ".."),
    });
    child.unref();

    const state = {
      pid: child.pid,
      workerId: `mc-worker-${child.pid}`,
      startedAt: Date.now(),
      lastTickAt: null,
      version: 1,
    };
    await writeFile(pidFile(), JSON.stringify(state, null, 2) + "\n", "utf-8");
    return NextResponse.json({ ok: true, started: true, state, alive: true });
  }

  if (action === "stop") {
    const raw = await readFile(pidFile(), "utf-8").catch(() => "");
    try {
      const j = JSON.parse(raw);
      const pid = Number(j.pid);
      if (pid && isAlive(pid)) {
        process.kill(pid, "SIGTERM");
        return NextResponse.json({ ok: true, stopped: true });
      }
    } catch {}
    return NextResponse.json({ ok: true, stopped: false });
  }

  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
