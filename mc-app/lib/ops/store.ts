import path from "node:path";
import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";

export function vaultRoot() {
  return process.env.MYO_MC_ROOT_DIR || path.join(process.env.HOME || "", "clawd", "mission-control");
}

export function opsDir() {
  return path.join(vaultRoot(), "ops");
}

export function opsPath(name: string) {
  return path.join(opsDir(), name);
}

export async function ensureOps() {
  await mkdir(opsDir(), { recursive: true });
  // Seed policies
  const policies = opsPath("policies.json");
  try {
    await readFile(policies, "utf-8");
  } catch {
    await writeFile(
      policies,
      JSON.stringify(
        {
          x_autopost: { enabled: false },
          x_daily_quota: { limit: 10 },
          reaction_matrix: { patterns: [] },
        },
        null,
        2,
      ) + "\n",
      "utf-8",
    );
  }

  for (const f of ["proposals.jsonl", "missions.jsonl", "steps.jsonl", "events.jsonl"]) {
    const p = opsPath(f);
    try {
      await readFile(p, "utf-8");
    } catch {
      await writeFile(p, "", "utf-8");
    }
  }
}

export async function readJson<T = any>(file: string, fallback: T): Promise<T> {
  try {
    const txt = await readFile(file, "utf-8");
    return JSON.parse(txt);
  } catch {
    return fallback;
  }
}

export async function writeJson(file: string, data: any) {
  await ensureOps();
  await writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export async function readJsonl<T = any>(file: string, limit = 5000): Promise<T[]> {
  await ensureOps();
  const txt = await readFile(file, "utf-8").catch(() => "");
  const lines = txt.split(/\r?\n/).filter(Boolean).slice(-limit);
  const out: T[] = [];
  for (const l of lines) {
    try {
      out.push(JSON.parse(l));
    } catch {
      // ignore
    }
  }
  return out;
}

export async function appendJsonl(file: string, item: any) {
  await ensureOps();
  await appendFile(file, JSON.stringify(item) + "\n", "utf-8");
}

export function id(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}
