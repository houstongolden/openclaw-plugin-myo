import { NextResponse } from "next/server";
import path from "node:path";
import { stat } from "node:fs/promises";
import { z } from "zod";
import { isSafeRel, readSnippet, vaultRootDir, type VaultScope } from "../../../../lib/vault-files";

const Query = z.object({
  file: z.string().min(1),
  scope: z.optional(z.enum(["mission-control", "clawd"]))
    .default("mission-control"),
  maxLines: z.coerce.number().optional().default(40),
  maxChars: z.coerce.number().optional().default(8000),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = Query.safeParse({
    file: url.searchParams.get("file") || "",
    scope: (url.searchParams.get("scope") as any) || "mission-control",
    maxLines: url.searchParams.get("maxLines") || undefined,
    maxChars: url.searchParams.get("maxChars") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
  }

  const rel = parsed.data.file;
  const scope = parsed.data.scope as VaultScope;
  const maxLines = Math.min(200, Math.max(1, parsed.data.maxLines));
  const maxChars = Math.min(50_000, Math.max(200, parsed.data.maxChars));

  if (!isSafeRel(rel, scope)) {
    return NextResponse.json({ ok: false, error: "Invalid path" }, { status: 400 });
  }

  const root = vaultRootDir(scope);
  const abs = path.join(root, rel);

  const st = await stat(abs).catch(() => null);
  if (!st || !st.isFile()) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  if (st.size > 2 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "File too large" }, { status: 413 });
  }

  const { snippet, truncated, totalLines } = await readSnippet(abs, maxLines, maxChars);

  return NextResponse.json({
    ok: true,
    scope,
    file: rel,
    ext: path.extname(rel).toLowerCase(),
    size: Number(st.size) || 0,
    mtimeMs: Number(st.mtimeMs) || 0,
    maxLines,
    maxChars,
    truncated,
    totalLines,
    snippet,
  });
}
