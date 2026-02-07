import { NextResponse } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";

function rootDir() {
  return process.env.MYO_MC_ROOT_DIR || path.join(process.env.HOME || "", "clawd", "mission-control");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const project = String(searchParams.get("project") || "");
  if (!project) return NextResponse.json({ ok: false, error: "Missing project" }, { status: 400 });

  const base = path.join(rootDir(), "projects", project);
  const [projectMd, tasksMd] = await Promise.all([
    readFile(path.join(base, "PROJECT.md"), "utf-8").catch(() => ""),
    readFile(path.join(base, "TASKS.md"), "utf-8").catch(() => ""),
  ]);

  return NextResponse.json({ ok: true, project, projectMd, tasksMd });
}
