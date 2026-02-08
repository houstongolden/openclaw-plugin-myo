"use client";

import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ConnectorCard } from "@/components/connections/connector-card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ConnectionsPage() {
  const [q, setQ] = React.useState("");
  const [data, setData] = React.useState<any>(null);
  const [agents, setAgents] = React.useState<string[]>([]);
  const [permissions, setPermissions] = React.useState<any>({ allow: {} });

  async function refresh() {
    const j = await fetch("/api/connections-v2", { cache: "no-store" }).then((r) => r.json());
    setData(j);
    setPermissions(j.permissions || { allow: {} });
    const a = await fetch("/api/agents/fs", { cache: "no-store" }).then((r) => r.json());
    setAgents(Array.isArray(a.agents) ? a.agents : []);
  }

  React.useEffect(() => {
    refresh().catch(() => setData({ ok: false }));
  }, []);

  const connectors = Array.isArray(data?.connectors) ? data.connectors : [];
  const filtered = q
    ? connectors.filter((c: any) => `${c.name} ${c.id} ${c.kind}`.toLowerCase().includes(q.toLowerCase()))
    : connectors;

  function isAllowed(connectorId: string, agent: string) {
    return Boolean(permissions?.allow?.[connectorId]?.[agent]?.all);
  }

  async function toggleAllow(connectorId: string, agent: string, on: boolean) {
    const next = structuredClone(permissions || { allow: {} });
    next.allow = next.allow || {};
    next.allow[connectorId] = next.allow[connectorId] || {};
    next.allow[connectorId][agent] = next.allow[connectorId][agent] || {};
    next.allow[connectorId][agent].all = on;
    setPermissions(next);

    await fetch("/api/connections-v2/permissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ permissions: next }),
    });
    toast(on ? "Granted" : "Revoked", { description: `${agent} → ${connectorId}` });
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold">Connections</div>
            <div className="text-sm text-muted-foreground">Integrations + per-agent approvals (product UI, not env debug).</div>
          </div>
          <Badge variant="secondary">v2</Badge>
        </div>

        <Tabs defaultValue="integrations">
          <TabsList>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="permissions">Agent permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="integrations" className="mt-4">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search integrations…" />
                <Button variant="outline" onClick={refresh}>
                  Refresh
                </Button>
              </div>
            </Card>

            <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c: any) => (
                <ConnectorCard key={c.id} connector={c} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="mt-4">
            <Card className="p-4">
              <div className="text-sm font-semibold">Per-agent approvals</div>
              <div className="mt-1 text-sm text-muted-foreground">
                This is the permissions boundary: which agents can use which connectors. (Next: per-tool scopes, approval requests, audit log.)
              </div>
            </Card>

            <div className="mt-3 grid gap-3">
              {connectors.map((c: any) => (
                <Card key={c.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{c.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">via {c.kind} • {c.statusDetail}</div>
                    </div>
                    <Badge variant={c.status === "connected" ? "default" : "secondary"}>{c.status}</Badge>
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {agents.map((a) => (
                      <div key={a} className="flex items-center justify-between rounded-xl border px-3 py-2">
                        <div className="text-sm">agent:{a}</div>
                        <Switch
                          checked={isAllowed(c.id, a)}
                          onCheckedChange={(v) => toggleAllow(c.id, a, Boolean(v))}
                        />
                      </div>
                    ))}
                    {!agents.length ? <div className="text-sm text-muted-foreground">No agents found in ~/clawd/agents.</div> : null}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(c.tools || []).slice(0, 8).map((t: string) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                    {Array.isArray(c.tools) && c.tools.length > 8 ? <Badge variant="outline">+{c.tools.length - 8} more</Badge> : null}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
