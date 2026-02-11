import { NextResponse } from "next/server";
import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { z } from "zod";

type Scope = "mission-control" | "clawd";

function missionControlRoot() {
  return (
    process.env.MYO_MC_ROOT_DIR ||
    path.join(process.env.HOME || "", "clawd", "mission-control")
  );
}

function clawdRoot() {
  return (
    process.env.MYO_VAULT_ROOT_DIR ||
    path.join(process.env.HOME || "", "clawd")
  );
}

function rootDir(scope: Scope) {
  return scope === "clawd" ? clawdRoot() : missionControlRoot();
}

const ALLOWED_TOP_LEVEL_MISSION_CONTROL = new Set([
  "projects",
  "content",
  "ops",
  "team",
  "connections",
  "now",
  "activity",
]);

const ALLOWED_TOP_LEVEL_CLAWD = new Set([
  "mission-control",
  "projects",
  "agents",
  "skills",
  "scripts",
  "project-context",
  "memory",
  "content",
  "docs",
]);

const Query = z.object({
  file: z.string().min(1),
  scope: z.optional(z.enum(["mission-control", "clawd"])).default("mission-control"),
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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = Query.safeParse({
    file: url.searchParams.get("file") || "",
    scope: (url.searchParams.get("scope") as any) || "mission-control",
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
  }

  const rel = parsed.data.file;
  const scope = parsed.data.scope as Scope;

  if (!isSafeRel(rel, scope)) {
    return NextResponse.json({ ok: false, error: "Invalid path" }, { status: 400 });
  }

  const root = rootDir(scope);
  const abs = path.join(root, rel);

  const st = await stat(abs).catch(() => null);
  if (!st || !st.isFile()) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  if (st.size > 2 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "File too large" }, { status: 413 });
  }

  const md = await readFile(abs, "utf-8").catch(() => "");

  return NextResponse.json({ ok: true, scope, root, file: rel, abs, md });
}
