import { NextResponse } from "next/server";
import path from "node:path";
import { readdir, readFile, writeFile, stat } from "node:fs/promises";

function agentRoot(agentId: string) {
  return path.join(process.env.HOME || "", "clawd", "agents", agentId);
}

function safeJoin(root: string, rel: string) {
  const p = path.normalize(path.join(root, rel));
  if (!p.startsWith(root)) throw new Error("Path escape blocked");
  return p;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const agentId = String(searchParams.get("agent") || "");
  const rel = String(searchParams.get("path") || "");
  const mode = String(searchParams.get("mode") || "list");
  if (!agentId) return NextResponse.json({ ok: false, error: "Missing agent" }, { status: 400 });

  const root = agentRoot(agentId);

  try {
    if (mode === "get") {
      const fp = safeJoin(root, rel);
      const s = await stat(fp);
      if (!s.isFile()) return NextResponse.json({ ok: false, error: "Not a file" }, { status: 400 });
      const text = await readFile(fp, "utf-8");
      return NextResponse.json({ ok: true, path: rel, text });
    }

    // list
    const dir = safeJoin(root, rel || ".");
    const dirents = await readdir(dir, { withFileTypes: true });
    const items = await Promise.all(
      dirents
        .filter((d) => !d.name.startsWith(".") && d.name !== "node_modules")
        .map(async (d) => {
          const fp = path.join(dir, d.name);
          const s = await stat(fp).catch(() => null);
          return {
            name: d.name,
            kind: d.isDirectory() ? "dir" : "file",
            size: s?.isFile() ? s.size : null,
          };
        }),
    );

    return NextResponse.json({ ok: true, path: rel || "", items: items.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "dir" ? -1 : 1)) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const agentId = String(body.agent || "");
  const rel = String(body.path || "");
  const text = String(body.text ?? "");
  if (!agentId || !rel) return NextResponse.json({ ok: false, error: "Missing agent/path" }, { status: 400 });

  const root = agentRoot(agentId);
  try {
    const fp = safeJoin(root, rel);
    await writeFile(fp, text, "utf-8");
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
