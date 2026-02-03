import path from "node:path";
import { listFilesRecursive, readTextFile } from "./fs.js";

export type TaskUpdate = { id: string; status: string };

// Parses lines like:
// - [x] Do thing  (id:abcd)
// - [ ] Do thing  (id:abcd)
const TASK_LINE_RE = /^\s*-\s*\[(?<checked>[ xX])\]\s+.*\(id:(?<id>[a-zA-Z0-9-_]+)\)\s*$/;

export async function collectTaskUpdatesFromRoot(
  rootDir: string,
  opts?: { includeUnchecked?: boolean },
): Promise<TaskUpdate[]> {
  const projectsDir = path.join(rootDir, "projects");
  const files = await listFilesRecursive(projectsDir, "TASKS.md").catch(() => [] as string[]);
  const updates: TaskUpdate[] = [];

  for (const f of files) {
    const text = await readTextFile(f).catch(() => "");
    for (const line of text.split("\n")) {
      const m = line.match(TASK_LINE_RE);
      if (!m) continue;

      const checked = ((m as any).groups?.checked || "").toLowerCase() === "x";
      const id = (m as any).groups?.id as string;
      if (!id) continue;

      if (checked) {
        updates.push({ id, status: "done" });
      } else if (opts?.includeUnchecked) {
        // Best-effort: treat unchecked as "pending" (not-done).
        updates.push({ id, status: "pending" });
      }
    }
  }

  // de-dupe (last write wins in case multiple mentions exist)
  const byId = new Map<string, TaskUpdate>();
  for (const u of updates) byId.set(u.id, u);
  return [...byId.values()];
}
