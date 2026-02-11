import { NextResponse } from "next/server";
import path from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { z } from "zod";

function rootDir() {
  return (
    process.env.MYO_MC_ROOT_DIR ||
    path.join(process.env.HOME || "", "clawd", "mission-control")
  );
}

function topPath() {
  return path.join(rootDir(), "now", "TOP.md");
}

export async function GET() {
  const p = topPath();
  const md = await readFile(p, "utf-8").catch(() => "# Top 3\n\n- (edit me)\n- (edit me)\n- (edit me)\n");
  return NextResponse.json({ ok: true, path: p, md });
}

const Body = z.object({ md: z.string() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid" }, { status: 400 });

  const p = topPath();
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, parsed.data.md, "utf-8");
  return NextResponse.json({ ok: true, path: p });
}
