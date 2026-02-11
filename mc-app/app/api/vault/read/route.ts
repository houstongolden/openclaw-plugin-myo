import { NextResponse } from "next/server";
import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { z } from "zod";

function rootDir() {
  return (
    process.env.MYO_MC_ROOT_DIR ||
    path.join(process.env.HOME || "", "clawd", "mission-control")
  );
}

const ALLOWED_TOP_LEVEL = new Set([
  "projects",
  "content",
  "ops",
  "team",
  "connections",
  "now",
  "activity",
]);

const Query = z.object({
  file: z.string().min(1),
});

function isSafeRel(rel: string) {
  if (rel.includes("..")) return false;
  if (path.isAbsolute(rel)) return false;
  const norm = rel.replace(/\\/g, "/");
  const top = norm.split("/")[0];
  if (!ALLOWED_TOP_LEVEL.has(top)) return false;
  if (!norm.toLowerCase().endsWith(".md")) return false;
  return true;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = Query.safeParse({ file: url.searchParams.get("file") || "" });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
  }

  const rel = parsed.data.file;
  if (!isSafeRel(rel)) {
    return NextResponse.json({ ok: false, error: "Invalid path" }, { status: 400 });
  }

  const root = rootDir();
  const abs = path.join(root, rel);

  const st = await stat(abs).catch(() => null);
  if (!st || !st.isFile()) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  if (st.size > 2 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "File too large" }, { status: 413 });
  }

  const md = await readFile(abs, "utf-8").catch(() => "");

  return NextResponse.json({ ok: true, file: rel, abs, md });
}
