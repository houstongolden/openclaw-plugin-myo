"use client";

import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export default function ActivityPage() {
  const [lines, setLines] = React.useState<string[]>([]);

  React.useEffect(() => {
    const ev = new EventSource("/api/activity/stream");
    ev.addEventListener("lines", (e: any) => {
      try {
        const j = JSON.parse(e.data);
        const incoming: string[] = Array.isArray(j.lines) ? j.lines : [];
        setLines((prev) => [...prev, ...incoming].slice(-2000));
      } catch {}
    });

    // Persist snapshots periodically so history is rewindable.
    const t = setInterval(() => {
      fetch("/api/activity/store?action=pull&lines=800", { cache: "no-store" }).catch(() => null);
    }, 5000);

    return () => {
      ev.close();
      clearInterval(t);
    };
  }, []);

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold">Live</div>
            <div className="text-sm text-muted-foreground">
              Compact activity stream. (Next: per-agent lanes + durable timeline.)
            </div>
          </div>
          <Badge variant="secondary">SSE</Badge>
        </div>

        <Card className="p-3">
          <ScrollArea className="h-[75vh]">
            <div className="space-y-1 pr-3 font-mono text-[12px] leading-relaxed">
              {lines.map((l, i) => (
                <div key={i} className="whitespace-pre-wrap break-words text-muted-foreground">
                  {l}
                </div>
              ))}
              {!lines.length ? <div className="text-sm text-muted-foreground">Waiting for activity…</div> : null}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </AppShell>
  );
}
