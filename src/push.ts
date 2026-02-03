import path from "node:path";
import { listFilesRecursive, readTextFile } from "./fs.js";

export type TaskUpdate = { id: string; status: string };

// Parses lines like: - [x] Do thing  (id:abcd)
const TASK_LINE_RE = /^- \[( |x|X)\] .*\(id:([a-zA-Z0-9-_]+)\)\s*$/;

export async function collectTaskUpdatesFromRoot(rootDir: string): Promise<TaskUpdate[]> {
  const projectsDir = path.join(rootDir, "projects");
  const files = await listFilesRecursive(projectsDir, "TASKS.md").catch(() => []);
  const updates: TaskUpdate[] = [];

  for (const f of files) {
    const text = await readTextFile(f).catch(() => "");
    for (const line of text.split("\n")) {
      const m = line.match(TASK_LINE_RE);
      if (!m) continue;
      const checked = (m[1] || "").toLowerCase() === "x";
      const id = m[2];
      if (checked) updates.push({ id, status: "done" });
    }
  }

  // de-dupe
  const seen = new Set<string>();
  return updates.filter((u) => (seen.has(u.id) ? false : (seen.add(u.id), true)));
}
