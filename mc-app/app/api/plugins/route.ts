import { NextResponse } from "next/server";
import path from "node:path";
import { readdir, readFile, stat } from "node:fs/promises";

function extensionsDir() {
  return path.join(process.env.HOME || "", ".openclaw", "extensions");
}

export async function GET() {
  const dir = extensionsDir();
  try {
    const dirents = await readdir(dir, { withFileTypes: true });
    const plugins = [] as any[];

    for (const d of dirents) {
      if (!d.isDirectory()) continue;
      const pluginDir = path.join(dir, d.name);
      const manifestPath = path.join(pluginDir, "openclaw.plugin.json");
      const pkgPath = path.join(pluginDir, "package.json");

      let manifest: any = null;
      let pkg: any = null;

      try {
        const txt = await readFile(manifestPath, "utf-8");
        manifest = JSON.parse(txt);
      } catch {}
      try {
        const txt = await readFile(pkgPath, "utf-8");
        pkg = JSON.parse(txt);
      } catch {}

      const st = await stat(pluginDir).catch(() => null);

      plugins.push({
        id: d.name,
        dir: pluginDir,
        updatedAt: st ? st.mtime.toISOString() : null,
        manifest,
        pkg,
      });
    }

    plugins.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    return NextResponse.json({ ok: true, dir, plugins });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e), dir, plugins: [] });
  }
}
