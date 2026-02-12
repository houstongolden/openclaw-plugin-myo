import { NextResponse } from "next/server";
import path from "node:path";
import { writeFile, stat, mkdir } from "node:fs/promises";
import { z } from "zod";

type Scope = "mission-control" | "clawd";

function missionControlRoot() {
  return process.env.MYO_MC_ROOT_DIR || path.join(process.env.HOME || "", "clawd", "mission-control");
}

function clawdRoot() {
  return process.env.MYO_VAULT_ROOT_DIR || path.join(process.env.HOME || "", "clawd");
}

function rootDir(scope: Scope) {
  return scope === "clawd" ? clawdRoot() : missionControlRoot();
}

const ALLOWED_TOP_LEVEL_MISSION_CONTROL = new Set(["projects", "content", "ops", "team", "connections", "now", "activity"]);
const ALLOWED_TOP_LEVEL_CLAWD = new Set(["mission-control", "projects", "agents", "skills", "scripts", "project-context", "memory", "content", "docs"]);

const Body = z.object({
  file: z.string().min(1),
  scope: z.optional(z.enum(["mission-control", "clawd"])).default("mission-control"),
  md: z.string(),
});

function isSafeRel(rel: string, scope: Scope) {
  if (rel.includes("..")) return false;
  if (path.isAbsolute(rel)) return false;
  const norm = rel.replace(/\\/g, "/");
  const top = norm.split("/")[0];
  const allowed = scope === "clawd" ? ALLOWED_TOP_LEVEL_CLAWD : ALLOWED_TOP_LEVEL_MISSION_CONTROL;
  if (!allowed.has(top)) return false;
  if (!norm.toLowerCase().endsWith(".md")) return false;
  return true;
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

  const scope = parsed.data.scope as Scope;
  const rel = parsed.data.file;
  if (!isSafeRel(rel, scope)) return NextResponse.json({ ok: false, error: "Invalid path" }, { status: 400 });

  const root = rootDir(scope);
  const abs = path.join(root, rel);

  // ensure parent directory exists
  await mkdir(path.dirname(abs), { recursive: true });

  // basic size guard
  if (parsed.data.md.length > 2 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "Content too large" }, { status: 413 });
  }

  await writeFile(abs, parsed.data.md, "utf-8");
  const st = await stat(abs).catch(() => null);

  return NextResponse.json({ ok: true, scope, file: rel, abs, mtimeMs: st?.mtimeMs ? Number(st.mtimeMs) : 0, size: st?.size ? Number(st.size) : 0 });
}
