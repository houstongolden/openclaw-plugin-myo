"use client";

import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function MissionsPage() {
  const [items, setItems] = React.useState<any[]>([]);

  async function refresh() {
    const j = await fetch("/api/ops/missions", { cache: "no-store" }).then((r) => r.json());
    setItems(Array.isArray(j.missions) ? j.missions : []);
  }

  React.useEffect(() => {
    refresh().catch(() => null);
  }, []);

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold">Missions</div>
            <div className="text-sm text-muted-foreground">Execution units created from approved proposals.</div>
          </div>
          <Badge variant="secondary">MVP</Badge>
        </div>

        <div className="grid gap-3">
          {items.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{m.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    mission:{m.id} • proposal:{m.proposalId} • {new Date(m.ts).toLocaleString()}
                  </div>
                </div>
                <Badge variant={m.status === "failed" ? "destructive" : m.status === "succeeded" ? "default" : "secondary"}>{m.status}</Badge>
              </div>

              <div className="mt-3">
                <div className="text-xs font-semibold text-muted-foreground">Steps</div>
                <ScrollArea className="mt-2 h-[160px] rounded-xl border bg-muted/20 p-2">
                  <pre className="text-[11px] text-muted-foreground">{JSON.stringify(m.steps || [], null, 2)}</pre>
                </ScrollArea>
              </div>
            </Card>
          ))}
          {!items.length ? <div className="text-sm text-muted-foreground">No missions yet. Approve a proposal to create one.</div> : null}
        </div>
      </div>
    </AppShell>
  );
}
