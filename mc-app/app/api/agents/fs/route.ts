import { NextResponse } from "next/server";
import path from "node:path";
import { readdir } from "node:fs/promises";

export async function GET() {
  const dir = path.join(process.env.HOME || "", "clawd", "agents");
  try {
    const dirents = await readdir(dir, { withFileTypes: true });
    const agents = dirents.filter((d) => d.isDirectory() && !d.name.startsWith('.')).map((d) => d.name).sort();
    return NextResponse.json({ ok: true, agents });
  } catch (e: any) {
    return NextResponse.json({ ok: false, agents: [], error: e?.message || String(e) });
  }
}
