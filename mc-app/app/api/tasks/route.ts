import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseTasksMd, type Task } from "@/lib/tasks";

function rootDir() {
  return process.env.MYO_MC_ROOT_DIR || path.join(process.env.HOME || "", "clawd", "mission-control");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");

  const base = rootDir();
  const projectsDir = path.join(base, "projects");

  let projects: string[] = [];
  try {
    // if project specified, single
    if (project) {
      projects = [project];
    } else {
      const { readdir } = await import("node:fs/promises");
      const dirents = await readdir(projectsDir, { withFileTypes: true });
      projects = dirents.filter((d) => d.isDirectory()).map((d) => d.name);
    }
  } catch {
    projects = project ? [project] : [];
  }

  const tasks: Task[] = [];
  for (const p of projects) {
    try {
      const md = await readFile(path.join(projectsDir, p, "TASKS.md"), "utf-8");
      tasks.push(...parseTasksMd(md, p));
    } catch {
      // ignore missing
    }
  }

  return NextResponse.json({ tasks });
}
