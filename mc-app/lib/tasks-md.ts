import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { vaultRoot } from "@/lib/vault";

type Patch = {
  title?: string;
  status?: "inbox" | "assigned" | "in_progress" | "review" | "done";
  priority?: "low" | "med" | "high";
  agent?: string | null;
  done?: boolean;
};

export async function patchTaskInProjectTasksMd(opts: {
  project: string;
  taskKey: string;
  patch: Patch;
}): Promise<{ ok: true; changed: boolean; file: string } | { ok: false; error: string }> {
  const project = String(opts.project || "").trim();
  const taskKey = String(opts.taskKey || "").trim();
  const patch = opts.patch || {};

  if (!project) return { ok: false, error: "Missing project" };
  if (!taskKey) return { ok: false, error: "Missing taskKey" };

  const fileAbs = path.join(vaultRoot(), "projects", project, "TASKS.md");
  const md = await readFile(fileAbs, "utf-8").catch(() => null);
  if (md == null) return { ok: false, error: `TASKS.md not found for project: ${project}` };

  const lines = md.split(/\r?\n/);
  const idx = lines.findIndex((l) => l.includes(`(id:${taskKey})`));
  if (idx < 0) return { ok: false, error: `Task id not found: ${taskKey}` };

  const orig = lines[idx];
  let line = orig;

  // Checkbox / done
  if (typeof patch.done === "boolean") {
    line = line.replace(/^\s*-\s*\[[ xX]\]/, (m) => m.replace(/\[[ xX]\]/, patch.done ? "[x]" : "[ ]"));
  }

  // Title (best-effort): replace the human title segment but keep tokens.
  if (typeof patch.title === "string" && patch.title.trim()) {
    // naive: strip tokens, then rebuild by replacing that part.
    // We replace everything after the checkbox up to first token occurrence.
    const rest = line.replace(/^\s*-\s*\[[ xX]\]\s*/, "");
    const tokenStart = rest.search(/\s+(status:|pri:|priority:|agent:|owner:|#|\(id:)/);
    const head = tokenStart >= 0 ? rest.slice(0, tokenStart).trim() : rest.trim();
    const tail = tokenStart >= 0 ? rest.slice(tokenStart) : "";
    if (head) {
      line = line.replace(rest, `${patch.title.trim()}${tail ? " " + tail.trimStart() : ""}`);
    }
  }

  const upsertToken = (key: string, value: string | null | undefined) => {
    if (value == null || value === "") return;
    const re = new RegExp(`\\b${key}:([^\\s]+)`);
    if (re.test(line)) {
      line = line.replace(re, `${key}:${value}`);
    } else {
      line = `${line} ${key}:${value}`;
    }
  };

  if (patch.status) upsertToken("status", patch.status);
  if (patch.priority) upsertToken("pri", patch.priority);
  if (patch.agent !== undefined) {
    if (patch.agent === null || patch.agent === "") {
      line = line.replace(/\s+agent:[^\s]+/g, "").replace(/\s+owner:[^\s]+/g, "");
    } else {
      upsertToken("agent", patch.agent);
    }
  }

  line = line.replace(/\s+$/g, "");

  const changed = line !== orig;
  if (changed) {
    lines[idx] = line;
    await writeFile(fileAbs, lines.join("\n"), "utf-8");
  }

  return { ok: true, changed, file: fileAbs };
}
