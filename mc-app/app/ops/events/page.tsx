"use client";

import * as React from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function EventsPage() {
  const [items, setItems] = React.useState<any[]>([]);

  async function refresh() {
    const j = await fetch("/api/ops/events?limit=400", { cache: "no-store" }).then((r) => r.json());
    setItems(Array.isArray(j.events) ? j.events : []);
  }

  React.useEffect(() => {
    refresh().catch(() => null);
  }, []);

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold">Events</div>
            <div className="text-sm text-muted-foreground">Structured timeline (the replacement for raw logs).</div>
          </div>
          <Badge variant="secondary">MVP</Badge>
        </div>

        <div className="space-y-2">
          {items.map((e) => (
            <Card key={e.id} className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{e.kind}</Badge>
                    <div className="text-sm font-semibold">{e.title}</div>
                    <div className="text-xs text-muted-foreground">{new Date(e.ts).toLocaleTimeString()}</div>
                    {e.taskKey ? (
                      <Link
                        href={`/projects/${encodeURIComponent(e.project || "myo-ai")}?tab=tasks&task=${encodeURIComponent(e.taskKey)}`}
                        className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
                      >
                        task:{e.taskKey}
                      </Link>
                    ) : null}
                  </div>
                  {e.details ? <div className="mt-1 text-sm text-muted-foreground">{e.details}</div> : null}
                </div>
                <div className="text-xs text-muted-foreground">{e.actor || ""}</div>
              </div>
            </Card>
          ))}
          {!items.length ? <div className="text-sm text-muted-foreground">No events yet.</div> : null}
        </div>
      </div>
    </AppShell>
  );
}
