import { NextResponse } from "next/server";
import path from "node:path";
import {
  allowedTopLevel,
  vaultRootDir,
  walkFiles,
  type VaultFileMeta,
  type VaultScope,
} from "../../../../lib/vault-files";

function scorePath(p: string, q: string) {
  const s = p.toLowerCase();
  const qq = q.toLowerCase();
  if (!qq) return 0;
  if (s === qq) return 10_000;
  if (s.endsWith("/" + qq)) return 4_000;
  const base = s.split("/").pop() || s;
  if (base === qq) return 3_000;
  if (base.startsWith(qq)) return 2_000;
  const i = s.indexOf(qq);
  if (i >= 0) return 1_000 - Math.min(900, i);
  return 0;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const scope = ((url.searchParams.get("scope") || "mission-control") as VaultScope);
  const max = Math.min(50, Math.max(1, Number(url.searchParams.get("max") || 12)));

  const allowed = allowedTopLevel(scope);
  const root = vaultRootDir(scope);

  const files: VaultFileMeta[] = [];
  for (const t of allowed.values()) {
    await walkFiles(path.join(root, t), t, files, {
      depth: 0,
      maxDepth: 10,
      maxFileBytes: 2 * 1024 * 1024,
    });
  }

  const ql = q.toLowerCase();
  const filtered = ql ? files.filter((f) => f.path.toLowerCase().includes(ql)) : files;

  filtered.sort((a, b) => {
    const sa = scorePath(a.path, ql);
    const sb = scorePath(b.path, ql);
    if (sb !== sa) return sb - sa;
    if ((b.mtimeMs || 0) !== (a.mtimeMs || 0)) return (b.mtimeMs || 0) - (a.mtimeMs || 0);
    return a.path.localeCompare(b.path);
  });

  return NextResponse.json({ ok: true, scope, q, max, items: filtered.slice(0, max) });
}
