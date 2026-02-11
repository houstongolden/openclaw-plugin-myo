import path from "node:path";
import { readdir, stat, readFile } from "node:fs/promises";
import { parseTasksMd, type Task } from "@/lib/tasks";

// ------------------------------
// Existing Mission Control vault helpers
// ------------------------------

export function vaultRoot() {
  return process.env.MYO_MC_ROOT_DIR || path.join(process.env.HOME || "", "clawd", "mission-control");
}

export async function listProjects(): Promise<string[]> {
  const projectsDir = path.join(vaultRoot(), "projects");
  const dirents = await readdir(projectsDir, { withFileTypes: true });
  return dirents.filter((d) => d.isDirectory()).map((d) => d.name).sort();
}

export async function listTasks(project?: string): Promise<Task[]> {
  const root = vaultRoot();
  const projectsDir = path.join(root, "projects");

  const projects = project ? [project] : await listProjects();
  const tasks: Task[] = [];

  for (const p of projects) {
    try {
      const md = await readFile(path.join(projectsDir, p, "TASKS.md"), "utf-8");
      tasks.push(...parseTasksMd(md, p));
    } catch {
      // ignore missing
    }
  }

  return tasks;
}

// ------------------------------
// mc-011: safe file suggest/snippet helpers
// ------------------------------

export type VaultScope = "mission-control" | "clawd";

export function missionControlRoot() {
  return (
    process.env.MYO_MC_ROOT_DIR ||
    path.join(process.env.HOME || "", "clawd", "mission-control")
  );
}

export function clawdRoot() {
  return process.env.MYO_VAULT_ROOT_DIR || path.join(process.env.HOME || "", "clawd");
}

export function vaultRootDir(scope: VaultScope) {
  return scope === "clawd" ? clawdRoot() : missionControlRoot();
}

export const ALLOWED_TOP_LEVEL_MISSION_CONTROL = new Set([
  "projects",
  "content",
  "ops",
  "team",
  "connections",
  "now",
  "activity",
]);

export const ALLOWED_TOP_LEVEL_CLAWD = new Set([
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

export function allowedTopLevel(scope: VaultScope) {
  return scope === "clawd" ? ALLOWED_TOP_LEVEL_CLAWD : ALLOWED_TOP_LEVEL_MISSION_CONTROL;
}

export const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  ".turbo",
]);

// Only include reasonably safe text/code formats. (No .env, .key, .pem, binaries, etc.)
export const ALLOWED_EXT = new Set([
  ".md",
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
  ".html",
  ".sh",
  ".py",
  ".go",
  ".rs",
]);

export function isSafeRel(rel: string, scope: VaultScope) {
  if (!rel) return false;
  if (rel.includes("..")) return false;
  if (path.isAbsolute(rel)) return false;
  const norm = rel.replace(/\\/g, "/");
  const top = norm.split("/")[0];
  if (!allowedTopLevel(scope).has(top)) return false;

  const ext = path.extname(norm).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return false;

  return true;
}

export type VaultFileMeta = {
  path: string;
  size: number;
  mtimeMs: number;
  ext: string;
};

export async function walkFiles(
  absDir: string,
  relBase: string,
  out: VaultFileMeta[],
  opts: { depth: number; maxDepth: number; maxFileBytes: number }
) {
  if (opts.depth > opts.maxDepth) return;

  const entries = await readdir(absDir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    if (e.isDirectory() && IGNORE_DIRS.has(e.name)) continue;

    const abs = path.join(absDir, e.name);
    const rel = relBase ? path.posix.join(relBase, e.name) : e.name;

    if (e.isDirectory()) {
      await walkFiles(abs, rel, out, { ...opts, depth: opts.depth + 1 });
      continue;
    }

    if (!e.isFile()) continue;

    const ext = path.extname(e.name).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) continue;

    const st = await stat(abs).catch(() => null);
    if (!st || !st.isFile()) continue;
    if (st.size > opts.maxFileBytes) continue;

    out.push({ path: rel, size: Number(st.size) || 0, mtimeMs: Number(st.mtimeMs) || 0, ext });
  }
}

export async function readSnippet(absPath: string, maxLines: number, maxChars: number) {
  const raw = await readFile(absPath, "utf-8").catch(() => "");
  const lines = raw.split(/\r?\n/);
  const sliced = lines.slice(0, Math.max(1, maxLines));
  let snippet = sliced.join("\n");
  let truncated = lines.length > sliced.length;

  if (snippet.length > maxChars) {
    snippet = snippet.slice(0, maxChars);
    truncated = true;
  }

  return { snippet, truncated, totalLines: lines.length };
}
