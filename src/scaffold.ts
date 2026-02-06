import path from "node:path";
import { ensureDir, writeTextFile, fileExists, readTextFile } from "./fs.js";
import { renderProjectMd, renderTasksMd, slugify } from "./templates.js";

export type ScaffoldOptions = {
  rootDir: string;
  overwrite?: boolean;
};

function defaultProjects() {
  return [
    {
      name: "Myo.ai",
      goal_title: "Ship a premium operator cockpit",
      goal_description: "Make the agent experience Manus-grade: run cards, artifacts, recovery, and clear object model.",
      status: "active",
      tasks: [
        { id: "local-myo-1", title: "Implement Run Cards + terminal states", status: "pending" },
        { id: "local-myo-2", title: "Inbox triage mode + keyboard shortcuts", status: "pending" },
        { id: "local-myo-3", title: "Artifacts-first Files with provenance", status: "pending" },
      ],
    },
    {
      name: "Inbox",
      goal_title: "Zero guilt input stream",
      goal_description: "Capture → classify → convert → archive. Always know what's next.",
      status: "active",
      tasks: [
        { id: "local-inbox-1", title: "Triage top 5", status: "pending" },
        { id: "local-inbox-2", title: "Convert 2 items to tasks", status: "pending" },
      ],
    },
    {
      name: "Fitness",
      goal_title: "Consistency",
      goal_description: "Swim primary, run secondary. Don’t break the chain.",
      status: "active",
      tasks: [{ id: "local-fit-1", title: "45-minute session", status: "pending" }],
    },
  ];
}

async function safeWrite(filePath: string, content: string, overwrite?: boolean) {
  if (!overwrite && (await fileExists(filePath))) return false;
  await writeTextFile(filePath, content);
  return true;
}

export async function scaffoldMissionControl(opts: ScaffoldOptions) {
  const root = opts.rootDir;
  const overwrite = !!opts.overwrite;

  await ensureDir(root);
  await ensureDir(path.join(root, "projects"));

  const created: string[] = [];

  // START_HERE.md is intentionally not overwritten unless overwrite=true
  const startHerePath = path.join(root, "START_HERE.md");
  if (!(await fileExists(startHerePath)) || overwrite) {
    const content = await readTextFile(startHerePath).catch(() => "");
    if (!content || overwrite) {
      await writeTextFile(
        startHerePath,
        "# Mission Control\n\nThis is your local-first Mission Control folder. It’s safe to use with zero cloud account.\n\n- Edit projects under `projects/`\n- Keep tasks in `TASKS.md`\n- Install cron templates with: `openclaw myo templates:install --pack daily-ops --yes`\n",
      );
      created.push(startHerePath);
    }
  }

  for (const p of defaultProjects()) {
    const slug = slugify(p.name);
    const dir = path.join(root, "projects", slug);
    await ensureDir(dir);

    const projectMdPath = path.join(dir, "PROJECT.md");
    const tasksMdPath = path.join(dir, "TASKS.md");

    const wroteProject = await safeWrite(projectMdPath, renderProjectMd(p), overwrite);
    const wroteTasks = await safeWrite(tasksMdPath, renderTasksMd({ tasks: p.tasks || [] }), overwrite);

    if (wroteProject) created.push(projectMdPath);
    if (wroteTasks) created.push(tasksMdPath);
  }

  return { createdCount: created.length, createdFiles: created };
}
