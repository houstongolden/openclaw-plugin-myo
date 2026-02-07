"use client";

import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export default function ActivityHistoryPage() {
  const [files, setFiles] = React.useState<string[]>([]);
  const [file, setFile] = React.useState<string>("");
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<any[]>([]);
  const [cursor, setCursor] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);

  async function refreshFiles() {
    const j = await fetch("/api/activity/store?action=list", { cache: "no-store" }).then((r) => r.json());
    const f = Array.isArray(j.files) ? j.files : [];
    setFiles(f);
    if (!file && f.length) setFile(f[0]);
  }

  async function load(reset = false) {
    const cur = reset ? 0 : cursor;
    const j = await fetch(
      `/api/activity/history?file=${encodeURIComponent(file)}&cursor=${cur}&limit=200&q=${encodeURIComponent(q)}`,
      { cache: "no-store" },
    ).then((r) => r.json());

    const page = Array.isArray(j.items) ? j.items : [];
    setItems((prev) => (reset ? page : [...prev, ...page]));
    setCursor(j.nextCursor || 0);
    setHasMore(Boolean(j.hasMore));
  }

  React.useEffect(() => {
    refreshFiles().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!file) return;
    load(true).catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, q]);

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold">Activity History</div>
            <div className="text-sm text-muted-foreground">Rewindable, searchable timeline saved to your vault.</div>
          </div>
          <Badge variant="secondary">jsonl</Badge>
        </div>

        <Card className="p-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              <Badge variant="outline">File</Badge>
              <select
                value={file}
                onChange={(e) => setFile(e.target.value)}
                className="h-9 rounded-xl border bg-background px-3 text-sm"
              >
                {files.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search history…" className="md:max-w-[360px]" />
          </div>
        </Card>

        <Card className="p-3">
          <ScrollArea className="h-[70vh]">
            <div className="space-y-1 pr-3 font-mono text-[12px]">
              {items.map((it, idx) => (
                <div key={idx} className="whitespace-pre-wrap break-words text-muted-foreground">
                  {new Date(it.ts || Date.now()).toLocaleTimeString()} {it.level || "info"} — {it.text}
                </div>
              ))}
              {!items.length ? <div className="text-sm text-muted-foreground">No items.</div> : null}
            </div>
          </ScrollArea>
          <div className="mt-3 flex justify-center">
            {hasMore ? (
              <Button variant="outline" onClick={() => load(false)}>
                Load more
              </Button>
            ) : (
              <div className="text-sm text-muted-foreground">End</div>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
