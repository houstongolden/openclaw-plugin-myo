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

const Body = z.object({
  project: z.string().default("inbox"),
  title: z.string().min(1),
  priority: z.enum(["low", "med", "high"]).default("med"),
  tags: z.array(z.string()).optional().default([]),
});

function formatLine(args: { title: string; priority: string; tags: string[] }) {
  const tags = args.tags
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : `#${t}`))
    .join(" ");
  const id = `mc-${Date.now().toString(36)}`;
  return `- [ ] ${args.title} status:inbox pri:${args.priority} ${tags} (id:${id})`.replace(/\s+/g, " ").trim();
}

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const { project, title, priority, tags } = body.data;

  const base = rootDir();
  const tasksPath = path.join(base, "projects", project, "TASKS.md");

  await mkdir(path.dirname(tasksPath), { recursive: true });

  const prev = await readFile(tasksPath, "utf-8").catch(() => "# Tasks\n\n");
  const line = formatLine({ title, priority, tags });

  const next = prev.trimEnd() + "\n" + line + "\n";
  await writeFile(tasksPath, next, "utf-8");

  return NextResponse.json({ ok: true, tasksPath, line });
}
