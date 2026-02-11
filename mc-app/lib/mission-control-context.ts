import path from "node:path";
import { readFile } from "node:fs/promises";

export type ProjectContext = {
  project: string;
  projectMd: string;
  tasksMd: string;
  topMd: string; // TOP.md if present; else NOW.md; else empty
  recentEvents: string; // raw text (last N lines)
};

function rootDir() {
  return process.env.MYO_MC_ROOT_DIR || path.join(process.env.HOME || "", "clawd", "mission-control");
}

async function readText(p: string) {
  return readFile(p, "utf-8").catch(() => "");
}

async function readLastLines(p: string, maxLines: number) {
  const text = await readText(p);
  if (!text) return "";
  const lines = text.split("\n");
  return lines.slice(Math.max(0, lines.length - maxLines)).join("\n").trim();
}

export async function loadProjectContext(project: string, opts?: { eventsLines?: number })
: Promise<ProjectContext> {
  const base = path.join(rootDir(), "projects", project);
  const [projectMd, tasksMd] = await Promise.all([
    readText(path.join(base, "PROJECT.md")),
    readText(path.join(base, "TASKS.md")),
  ]);

  // TOP.md is referenced in the spec; use it if it exists, otherwise fall back to NOW.md.
  const topPath = path.join(rootDir(), "TOP.md");
  const nowPath = path.join(rootDir(), "NOW.md");
  const topMd = (await readText(topPath)) || (await readText(nowPath));

  const recentEvents = await readLastLines(path.join(rootDir(), "ops", "events.jsonl"), opts?.eventsLines ?? 30);

  return {
    project,
    projectMd: projectMd || "(missing PROJECT.md)",
    tasksMd: tasksMd || "(missing TASKS.md)",
    topMd: topMd || "(missing TOP.md/NOW.md)",
    recentEvents: recentEvents || "(no recent events)",
  };
}

function truncateBlock(s: string, maxChars: number) {
  if (s.length <= maxChars) return s;
  return s.slice(0, Math.max(0, maxChars - 20)) + "\n…(truncated)…";
}

export function renderContextForOperator(ctx: ProjectContext, opts?: { maxCharsPerSection?: number }) {
  const max = Math.max(200, Number(opts?.maxCharsPerSection ?? 8000));
  return [
    `# Mission Control Context (project: ${ctx.project})`,
    "",
    "## PROJECT.md",
    truncateBlock(ctx.projectMd, max),
    "",
    "## TASKS.md",
    truncateBlock(ctx.tasksMd, max),
    "",
    "## TOP.md / NOW.md",
    truncateBlock(ctx.topMd, Math.min(max, 6000)),
    "",
    "## Recent events (ops/events.jsonl tail)",
    truncateBlock(ctx.recentEvents, Math.min(max, 4000)),
  ].join("\n");
}
