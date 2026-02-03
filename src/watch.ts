import path from "node:path";
import { listFilesRecursive, readTextFile } from "./fs.js";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function hashText(s: string) {
  // fast, non-crypto hash
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return String(h >>> 0);
}

export async function watchTasksMd(params: {
  rootDir: string;
  intervalMs?: number;
  onChange: (changedFiles: string[]) => Promise<void>;
  logger?: { info: (msg: string) => void; error: (msg: string) => void };
}) {
  const projectsDir = path.join(params.rootDir, "projects");
  const intervalMs = Math.max(500, params.intervalMs ?? 3000);

  const logger = params.logger;
  const fingerprints = new Map<string, string>();

  async function snapshot(): Promise<string[]> {
    const files = await listFilesRecursive(projectsDir, "TASKS.md").catch(() => [] as string[]);
    const changed: string[] = [];
    for (const f of files) {
      const text = await readTextFile(f).catch(() => "");
      const fp = hashText(text);
      const prev = fingerprints.get(f);
      if (prev && prev !== fp) changed.push(f);
      fingerprints.set(f, fp);
    }

    // prune deleted
    for (const known of [...fingerprints.keys()]) {
      if (!files.includes(known)) fingerprints.delete(known);
    }

    return changed;
  }

  // prime
  await snapshot();
  logger?.info?.(`[myo] watch: polling ${projectsDir} every ${intervalMs}ms (Ctrl+C to stop)`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    await sleep(intervalMs);
    const changed = await snapshot();
    if (!changed.length) continue;
    try {
      await params.onChange(changed);
    } catch (err: any) {
      logger?.error?.(`[myo] watch: push failed: ${err?.message || String(err)}`);
    }
  }
}
