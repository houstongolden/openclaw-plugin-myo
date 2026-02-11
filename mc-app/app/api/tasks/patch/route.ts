import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { patchTaskInProjectTasksMd } from "@/lib/tasks-md";

const Body = z.object({
  project: z.string().min(1),
  taskKey: z.string().min(1),
  patch: z
    .object({
      title: z.string().optional(),
      status: z.enum(["inbox", "assigned", "in_progress", "review", "done"]).optional(),
      priority: z.enum(["low", "med", "high"]).optional(),
      agent: z.string().nullable().optional(),
      done: z.boolean().optional(),
    })
    .default({}),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const { project, taskKey, patch } = parsed.data;
  const res = await patchTaskInProjectTasksMd({ project, taskKey, patch });

  if (!res.ok) {
    return NextResponse.json(res, { status: 404 });
  }

  // Refresh task-driven pages
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath(`/projects/${encodeURIComponent(project)}`);

  return NextResponse.json(res);
}
