import fs from "node:fs/promises";
import path from "node:path";

export async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

export async function writeTextFile(filePath: string, content: string) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, "utf8");
}

export async function fileExists(p: string) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}
