"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function AgentDetailPage() {
  const params = useParams();
  const id = String((params as any).id || "");

  const [agent, setAgent] = React.useState<any>(null);
  const [soul, setSoul] = React.useState("");
  const [heartbeat, setHeartbeat] = React.useState("");

  async function load() {
    const j = await fetch(`/api/team/agent?id=${encodeURIComponent(id)}`, { cache: "no-store" }).then((r) => r.json());
    setAgent(j.agent);
    setSoul(j.soul || "");
    setHeartbeat(j.heartbeat || "");
  }

  React.useEffect(() => {
    if (!id) return;
    load().catch(() => null);
  }, [id]);

  async function save() {
    await fetch("/api/team/agent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, agent, soul, heartbeat }),
    });
    toast("Saved");
  }

  if (!agent) {
    return (
      <AppShell>
        <div className="text-sm text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold">{agent.displayName}</div>
            <div className="text-sm text-muted-foreground">agent:{agent.id}</div>
          </div>
          <Badge variant="secondary">L{agent.level}</Badge>
        </div>

        <Card className="p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <div className="text-xs font-semibold text-muted-foreground">Display name</div>
              <Input value={agent.displayName} onChange={(e) => setAgent({ ...agent, displayName: e.target.value })} />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground">Role</div>
              <Input value={agent.role} onChange={(e) => setAgent({ ...agent, role: e.target.value })} />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground">Level</div>
              <Select
                value={String(agent.level)}
                onValueChange={(v) => setAgent({ ...agent, level: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">L1 — Observer</SelectItem>
                  <SelectItem value="2">L2 — Advisor</SelectItem>
                  <SelectItem value="3">L3 — Operator</SelectItem>
                  <SelectItem value="4">L4 — Autonomous</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3">
            <div className="text-xs font-semibold text-muted-foreground">Description</div>
            <Textarea value={agent.description || ""} onChange={(e) => setAgent({ ...agent, description: e.target.value })} />
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={save}>Save</Button>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">SOUL.md</div>
            <Badge variant="outline">editable</Badge>
          </div>
          <Textarea value={soul} onChange={(e) => setSoul(e.target.value)} className="mt-3 font-mono text-xs" rows={18} />
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">HEARTBEAT.md</div>
            <Badge variant="outline">editable</Badge>
          </div>
          <Textarea value={heartbeat} onChange={(e) => setHeartbeat(e.target.value)} className="mt-3 font-mono text-xs" rows={12} />
        </Card>

        <div className="text-xs text-muted-foreground">
          Next: per-connector tool scopes + project ACCESS.md permissions + “request access” flows.
        </div>
      </div>
    </AppShell>
  );
}
