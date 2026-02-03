import fs from "node:fs/promises";
import path from "node:path";

export async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

export async function writeTextFile(filePath: string, content: string) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, "utf8");
}

export async function readTextFile(filePath: string) {
  return await fs.readFile(filePath, "utf8");
}

export async function listFilesRecursive(rootDir: string, fileName: string) {
  const out: string[] = [];
  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) await walk(full);
      else if (ent.isFile() && ent.name === fileName) out.push(full);
    }
  }
  await walk(rootDir);
  return out;
}

export async function fileExists(p: string) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}
