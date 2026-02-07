import path from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { parseTasksMd, type Task } from "@/lib/tasks";

export function vaultRoot() {
  return process.env.MYO_MC_ROOT_DIR || path.join(process.env.HOME || "", "clawd", "mission-control");
}

export async function listProjects(): Promise<string[]> {
  const projectsDir = path.join(vaultRoot(), "projects");
  const dirents = await readdir(projectsDir, { withFileTypes: true });
  return dirents.filter((d) => d.isDirectory()).map((d) => d.name).sort();
}

export async function listTasks(project?: string): Promise<Task[]> {
  const root = vaultRoot();
  const projectsDir = path.join(root, "projects");

  const projects = project ? [project] : await listProjects();
  const tasks: Task[] = [];

  for (const p of projects) {
    try {
      const md = await readFile(path.join(projectsDir, p, "TASKS.md"), "utf-8");
      tasks.push(...parseTasksMd(md, p));
    } catch {
      // ignore missing
    }
  }

  return tasks;
}
