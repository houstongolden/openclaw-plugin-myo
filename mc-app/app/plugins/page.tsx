"use client";

import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PluginsPage() {
  const [q, setQ] = React.useState("");
  const [data, setData] = React.useState<any>(null);

  React.useEffect(() => {
    fetch("/api/plugins", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ ok: false }));
  }, []);

  const plugins = Array.isArray(data?.plugins) ? data.plugins : [];
  const filtered = q
    ? plugins.filter((p: any) => String(p.id).toLowerCase().includes(q.toLowerCase()))
    : plugins;

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold">Plugins</div>
            <div className="text-sm text-muted-foreground">Installed OpenClaw extensions on this machine.</div>
          </div>
          <Badge variant="secondary">local</Badge>
        </div>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search plugins…" />
            <Badge variant="outline">{filtered.length}</Badge>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p: any) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{p.id}</div>
                  <Badge variant={p.manifest ? "default" : "secondary"}>{p.manifest ? "plugin" : "folder"}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{p.dir}</div>
                <div className="mt-3">
                  <ScrollArea className="h-[160px] rounded-xl border bg-muted/30 p-2">
                    <pre className="text-[11px] text-muted-foreground">
{JSON.stringify({
  plugin: p.manifest?.id || null,
  name: p.pkg?.name || null,
  version: p.pkg?.version || null,
  commands: p.manifest?.commands?.length || null,
}, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              </Card>
            ))}
            {!filtered.length ? <div className="text-sm text-muted-foreground">No plugins found.</div> : null}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
