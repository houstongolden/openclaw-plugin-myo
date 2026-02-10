import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { listProjects, vaultRoot } from "@/lib/vault";
import { parseTasksMd, type Task } from "@/lib/tasks";

function mdEscape(s: string) {
  return String(s || "").replaceAll("|", "\\|");
}

export type NowSnapshot = {
  generatedAt: string;
  projects: Array<{
    name: string;
    counts: Record<string, number>;
    topInProgress: Task[];
    topQueued: Task[];
    recentDone: Task[];
  }>;
};

export async function generateNowMarkdown(): Promise<{ md: string; snapshot: NowSnapshot }> {
  const root = vaultRoot();
  const projects = await listProjects().catch(() => []);

  const snap: NowSnapshot = {
    generatedAt: new Date().toISOString(),
    projects: [],
  };

  for (const p of projects) {
    const tasksPath = path.join(root, "projects", p, "TASKS.md");
    const tasksMd = await readFile(tasksPath, "utf-8").catch(() => "");
    const tasks = parseTasksMd(tasksMd || "", p);

    const counts = {
      backlog: tasks.filter((t) => t.status === "inbox").length,
      queued: tasks.filter((t) => t.status === "assigned").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      review: tasks.filter((t) => t.status === "review").length,
      done: tasks.filter((t) => t.status === "done").length,
    };

    const priRank = (pri: string) => (pri === "high" ? 3 : pri === "med" ? 2 : 1);
    const sortByPri = (a: Task, b: Task) => priRank(b.priority) - priRank(a.priority) || a.title.localeCompare(b.title);

    const topInProgress = tasks.filter((t) => t.status === "in_progress").sort(sortByPri).slice(0, 5);
    const topQueued = tasks.filter((t) => t.status === "assigned").sort(sortByPri).slice(0, 5);
    const recentDone = tasks.filter((t) => t.status === "done").sort(sortByPri).slice(0, 8);

    snap.projects.push({ name: p, counts, topInProgress, topQueued, recentDone });
  }

  // Sort projects: ones with in_progress/queued first
  snap.projects.sort((a, b) =>
    (b.counts.in_progress + b.counts.queued) - (a.counts.in_progress + a.counts.queued) || a.name.localeCompare(b.name),
  );

  let md = `# NOW\n\n_Last updated: ${snap.generatedAt}_\n\n`;

  md += `## At a glance\n\n`;
  md += `| Project | In Progress | Queued | Review | Backlog | Done |\n|---|---:|---:|---:|---:|---:|\n`;
  for (const p of snap.projects) {
    md += `| ${mdEscape(p.name)} | ${p.counts.in_progress} | ${p.counts.queued} | ${p.counts.review} | ${p.counts.backlog} | ${p.counts.done} |\n`;
  }

  for (const p of snap.projects) {
    md += `\n---\n\n## ${mdEscape(p.name)}\n\n`;

    if (p.topInProgress.length) {
      md += `**In progress**\n`;
      for (const t of p.topInProgress) md += `- ${mdEscape(t.title)}${t.agent ? ` _(agent:${t.agent})_` : ""} (pri:${t.priority})\n`;
      md += `\n`;
    }

    if (p.topQueued.length) {
      md += `**Queued next**\n`;
      for (const t of p.topQueued) md += `- ${mdEscape(t.title)}${t.agent ? ` _(agent:${t.agent})_` : ""} (pri:${t.priority})\n`;
      md += `\n`;
    }

    if (!p.topInProgress.length && !p.topQueued.length) {
      md += `_No active work queued right now._\n\n`;
    }

    if (p.recentDone.length) {
      md += `**Recently done (sample)**\n`;
      for (const t of p.recentDone) md += `- ${mdEscape(t.title)}\n`;
      md += `\n`;
    }
  }

  return { md, snapshot: snap };
}

export async function writeNowFile(md: string) {
  const root = vaultRoot();
  const outPath = path.join(root, "NOW.md");
  await writeFile(outPath, md, "utf-8");
  return outPath;
}
