"use client";

import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Item = { id: string; ts: string; text: string };

type HbStatus = { ok: boolean; heartbeatPath: string; heartbeatMd: string; heartbeatJobs: any[] };

function Manage() {
  const [st, setSt] = React.useState<HbStatus | null>(null);

  async function refresh() {
    const j = await fetch("/api/heartbeats/status", { cache: "no-store" }).then((r) => r.json());
    setSt(j);
  }

  React.useEffect(() => {
    refresh().catch(() => setSt({ ok: false, heartbeatPath: "", heartbeatMd: "", heartbeatJobs: [] } as any));
  }, []);

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">HEARTBEAT.md</div>
            <div className="mt-1 text-xs text-muted-foreground">{st?.heartbeatPath || "—"}</div>
          </div>
          <button onClick={() => refresh()} className="rounded-lg border px-3 py-2 text-sm hover:bg-muted">Refresh</button>
        </div>
        <pre className="mt-3 max-h-[40vh] overflow-auto rounded-xl bg-muted p-3 text-xs text-muted-foreground">{st?.heartbeatMd || "(missing)"}</pre>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold">Scheduled heartbeat-related jobs</div>
        <div className="mt-2 text-sm text-muted-foreground">Pulled from OpenClaw cron list.</div>
        <pre className="mt-3 max-h-[40vh] overflow-auto rounded-xl bg-muted p-3 text-xs">{JSON.stringify(st?.heartbeatJobs || [], null, 2)}</pre>
      </Card>
    </div>
  );
}

function Feed() {
  const [items, setItems] = React.useState<Item[]>([]);
  const [cursor, setCursor] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [q, setQ] = React.useState("");

  async function loadMore(reset = false) {
    if (loading) return;
    setLoading(true);
    try {
      const nextCursor = reset ? 0 : cursor;
      const r = await fetch(`/api/heartbeats/feed?cursor=${nextCursor}&limit=10&q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      const j = await r.json();
      const page = Array.isArray(j.items) ? (j.items as Item[]) : [];
      setItems((prev) => (reset ? page : [...prev, ...page]));
      setCursor(j.nextCursor || 0);
      setHasMore(Boolean(j.hasMore));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadMore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search heartbeats…" />
        <Badge variant="secondary">Feed</Badge>
      </div>

      <div className="space-y-3">
        {/* sticky insights stub */}
        <Card className="sticky top-4 z-10 border bg-background/90 p-3 backdrop-blur">
          <div className="text-sm font-semibold">Key insights / actions</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Next: auto-summarize the visible feed into “actions + takeaways + ideas” and pin it here.
          </div>
        </Card>

        {items.map((it) => (
          <Card key={it.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Heartbeat</div>
              <div className="text-xs text-muted-foreground">{it.ts}</div>
            </div>
            <div className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{it.text || "(empty)"}</div>
          </Card>
        ))}

        {loading ? (
          <Card className="p-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
          </Card>
        ) : null}

        {hasMore ? (
          <button
            onClick={() => loadMore(false)}
            className="w-full rounded-xl border px-3 py-2 text-sm hover:bg-muted"
          >
            Load more
          </button>
        ) : (
          <div className="text-center text-sm text-muted-foreground">End of feed</div>
        )}
      </div>
    </div>
  );
}

export default function HeartbeatsPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <div className="text-2xl font-semibold">Heartbeats</div>
          <div className="text-sm text-muted-foreground">A clean feed of agent check-ins (newsletter-style).</div>
        </div>

        <Tabs defaultValue="feed">
          <TabsList>
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="manage">Manage Heartbeats</TabsTrigger>
          </TabsList>
          <TabsContent value="feed" className="mt-4">
            <Feed />
          </TabsContent>
          <TabsContent value="manage" className="mt-4">
            <Manage />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
