"use client";

import * as React from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function TeamPage() {
  const [data, setData] = React.useState<any>(null);
  const [q, setQ] = React.useState("");
  const [orchestrator, setOrchestrator] = React.useState("Myo");

  async function refresh() {
    const j = await fetch("/api/team", { cache: "no-store" }).then((r) => r.json());
    setData(j);
    setOrchestrator(j?.registry?.orchestratorName || "Myo");
  }

  React.useEffect(() => {
    refresh().catch(() => setData({ ok: false }));
  }, []);

  const agents: any[] = data?.registry?.agents ? Object.values(data.registry.agents) : [];
  const filtered = q ? agents.filter((a) => `${a.displayName} ${a.id} ${a.role}`.toLowerCase().includes(q.toLowerCase())) : agents;

  async function saveOrchestrator() {
    const reg = structuredClone(data.registry);
    reg.orchestratorName = orchestrator;
    // keep myo displayName in sync
    if (reg.agents?.myo) reg.agents.myo.displayName = orchestrator;
    await fetch("/api/team", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ registry: reg }),
    });
    toast("Saved");
    await refresh();
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold">Team</div>
            <div className="text-sm text-muted-foreground">Agent roster, roles, levels, and permissions.</div>
          </div>
          <Badge variant="secondary">MVP</Badge>
        </div>

        <Card className="p-4">
          <div className="text-sm font-semibold">Orchestrator</div>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
            <Input value={orchestrator} onChange={(e) => setOrchestrator(e.target.value)} placeholder="Orchestrator name (e.g. Myo / Jarvis)" />
            <Button onClick={saveOrchestrator}>Save</Button>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            This is the primary coordinating agent name shown across Mission Control.
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search agents…" />
            <Button variant="outline" onClick={refresh}>
              Refresh
            </Button>
          </div>
        </Card>

        <div className="space-y-3">
          {filtered.map((a) => (
            <Link key={a.id} href={`/team/agents/${encodeURIComponent(a.id)}`}>
              <Card className="p-4 hover:bg-muted">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{a.displayName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">agent:{a.id} • L{a.level} • {a.role}</div>
                  </div>
                  <Badge variant={a.level >= 3 ? "default" : "secondary"}>L{a.level}</Badge>
                </div>
                {a.description ? <div className="mt-2 text-sm text-muted-foreground">{a.description}</div> : null}
              </Card>
            </Link>
          ))}
          {!filtered.length ? <div className="text-sm text-muted-foreground">No agents found.</div> : null}
        </div>
      </div>
    </AppShell>
  );
}
