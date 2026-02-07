import { NextResponse } from "next/server";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

function rootDir() {
  return process.env.MYO_MC_ROOT_DIR || path.join(process.env.HOME || "", "clawd", "mission-control");
}

export async function GET() {
  const projectsDir = path.join(rootDir(), "projects");
  try {
    const dirents = await readdir(projectsDir, { withFileTypes: true });
    const projects = dirents.filter((d) => d.isDirectory()).map((d) => d.name).sort();
    return NextResponse.json({ projects });
  } catch (e: any) {
    return NextResponse.json({ projects: [], error: e?.message || String(e) }, { status: 200 });
  }
}
