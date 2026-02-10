export type TaskStatus = "inbox" | "assigned" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "med" | "high";

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  project: string;
  taskKey?: string; // extracted from (id:...)
  agent?: string | null; // agent:myo etc
  rawLine: string;
};

export function parseTasksMd(md: string, project: string): Task[] {
  const tasks: Task[] = [];
  const lines = String(md || "").split(/\r?\n/);

  for (const line of lines) {
    const m = line.match(/^\s*-\s*\[( |x)\]\s*(.+)$/i);
    if (!m) continue;
    const done = m[1].toLowerCase() === "x";
    const rest = m[2];

    const status = done ? "done" : (extractToken(rest, "status") as TaskStatus) || "inbox";
    const priority = (extractToken(rest, "pri") as TaskPriority) || (extractToken(rest, "priority") as TaskPriority) || "med";
    const tags = extractTags(rest);
    const agent = extractToken(rest, "agent") || extractToken(rest, "owner") || null;
    const taskKey = extractId(rest) || undefined;

    const title = rest
      .replace(/\s+status:[^\s]+/g, "")
      .replace(/\s+pri:[^\s]+/g, "")
      .replace(/\s+priority:[^\s]+/g, "")
      .replace(/\s+agent:[^\s]+/g, "")
      .replace(/\s+owner:[^\s]+/g, "")
      .replace(/\s+#[^\s]+/g, "")
      .trim();

    tasks.push({
      id: stableId(`${project}:${line}`),
      title,
      status: normalizeStatus(status),
      priority: normalizePriority(priority),
      tags,
      project,
      taskKey,
      agent,
      rawLine: line,
    });
  }

  return tasks;
}

function stableId(input: string) {
  // non-crypto stable hash
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `t_${(h >>> 0).toString(16)}`;
}

function extractToken(text: string, key: string) {
  const m = text.match(new RegExp(`\\b${key}:([^\\s]+)`));
  return m ? m[1] : null;
}

function extractTags(text: string) {
  const tags = (text.match(/#[^\s]+/g) || []).map((t) => t.slice(1).toLowerCase());
  return Array.from(new Set(tags));
}

function extractId(text: string) {
  const m = text.match(/\(id:([^\)]+)\)/i);
  return m ? m[1] : null;
}

function normalizeStatus(s: string): TaskStatus {
  const v = String(s || "").toLowerCase();

  // Aliases (we keep the internal enum stable but accept nicer user-facing words)
  if (v === "in-progress" || v === "inprogress") return "in_progress";
  if (v === "backlog" || v === "triage" || v === "todo") return "inbox";
  if (v === "queued" || v === "next" || v === "up_next") return "assigned";

  if (v === "inbox" || v === "assigned" || v === "review" || v === "done") return v as TaskStatus;
  if (v === "in_progress") return "in_progress";
  return "inbox";
}

function normalizePriority(p: string): TaskPriority {
  const v = String(p || "").toLowerCase();
  if (v === "low" || v === "med" || v === "high") return v as TaskPriority;
  if (v === "medium") return "med";
  return "med";
}
