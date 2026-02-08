"use client";

import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ConnectorCard } from "@/components/connections/connector-card";
import { ConnectorIcon } from "@/components/connections/connector-icons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ConnectionsPage() {
  const [q, setQ] = React.useState("");
  const [data, setData] = React.useState<any>(null);
  const [agents, setAgents] = React.useState<string[]>([]);
  const [permissions, setPermissions] = React.useState<any>({ allow: {} });
  const [requests, setRequests] = React.useState<any[]>([]);

  async function refresh() {
    const j = await fetch("/api/connections-v2", { cache: "no-store" }).then((r) => r.json());
    setData(j);
    setPermissions(j.permissions || { allow: {} });
    const a = await fetch("/api/agents/fs", { cache: "no-store" }).then((r) => r.json());
    setAgents(Array.isArray(a.agents) ? a.agents : []);
    const r = await fetch("/api/connections-v2/requests", { cache: "no-store" }).then((x) => x.json());
    setRequests(Array.isArray(r.items) ? r.items : []);
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

  function toolAllowed(connectorId: string, agent: string, tool: string) {
    const p = permissions?.allow?.[connectorId]?.[agent];
    if (p?.all) return true;
    const list: string[] = Array.isArray(p?.tools) ? p.tools : [];
    return list.includes(tool);
  }

  async function persist(next: any, toastMsg?: string, desc?: string) {
    setPermissions(next);
    await fetch("/api/connections-v2/permissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ permissions: next }),
    });
    if (toastMsg) toast(toastMsg, desc ? { description: desc } : undefined);
  }

  async function toggleAllow(connectorId: string, agent: string, on: boolean) {
    const next = structuredClone(permissions || { allow: {} });
    next.allow = next.allow || {};
    next.allow[connectorId] = next.allow[connectorId] || {};
    next.allow[connectorId][agent] = next.allow[connectorId][agent] || {};
    next.allow[connectorId][agent].all = on;
    if (on) {
      // when granting all, clear tool list to avoid confusion
      delete next.allow[connectorId][agent].tools;
    }
    await persist(next, on ? "Granted" : "Revoked", `${agent} → ${connectorId}`);
  }

  async function toggleTool(connectorId: string, agent: string, tool: string, on: boolean) {
    const next = structuredClone(permissions || { allow: {} });
    next.allow = next.allow || {};
    next.allow[connectorId] = next.allow[connectorId] || {};
    next.allow[connectorId][agent] = next.allow[connectorId][agent] || {};
    // If specific tools granted, ensure not-all
    next.allow[connectorId][agent].all = false;
    const list: string[] = Array.isArray(next.allow[connectorId][agent].tools) ? next.allow[connectorId][agent].tools : [];
    const set = new Set(list);
    if (on) set.add(tool);
    else set.delete(tool);
    next.allow[connectorId][agent].tools = Array.from(set.values()).sort();
    await persist(next, on ? "Granted scope" : "Revoked scope", `${agent} → ${connectorId}:${tool}`);
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
            <TabsTrigger value="requests">Requests</TabsTrigger>
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

            <div className="mt-3 grid gap-3 grid-cols-1">
              {filtered.map((c: any) => (
                <ConnectorCard key={c.id} connector={c} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="mt-4">
            <Card className="p-4">
              <div className="text-sm font-semibold">Per-agent approvals</div>
              <div className="mt-1 text-sm text-muted-foreground">
                This is the permissions boundary: which agents can use which connectors and which tool scopes.
              </div>
            </Card>

            <div className="mt-3 grid gap-3">
              {connectors.map((c: any) => (
                <Card key={c.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl border bg-background">
                        <ConnectorIcon id={c.id} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{c.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">via {c.kind} • {c.statusDetail}</div>
                      </div>
                    </div>
                    <Badge variant={c.status === "connected" ? "default" : "secondary"}>{c.status}</Badge>
                  </div>

                  <div className="mt-3 space-y-2">
                    {agents.map((a) => (
                      <div key={a} className="rounded-xl border p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm">agent:{a}</div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-muted-foreground">all</div>
                            <Switch checked={isAllowed(c.id, a)} onCheckedChange={(v) => toggleAllow(c.id, a, Boolean(v))} />
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {(c.tools || []).map((t: string) => (
                            <button
                              key={t}
                              className={
                                "rounded-full border px-2 py-1 text-xs " +
                                (toolAllowed(c.id, a, t)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background text-muted-foreground hover:text-foreground")
                              }
                              onClick={() => toggleTool(c.id, a, t, !toolAllowed(c.id, a, t))}
                              type="button"
                              title={`${a} → ${c.id}:${t}`}
                            >
                              {t}
                            </button>
                          ))}
                          {!Array.isArray(c.tools) || !c.tools.length ? (
                            <div className="text-xs text-muted-foreground">No scopes defined for this connector yet.</div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    {!agents.length ? <div className="text-sm text-muted-foreground">No agents found in ~/clawd/agents.</div> : null}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="mt-4">
            <Card className="p-4">
              <div className="text-sm font-semibold">Permission requests</div>
              <div className="mt-1 text-sm text-muted-foreground">When an agent needs access, it should create a request. Approve here.</div>
              <div className="mt-3 flex items-center gap-2">
                <Button variant="outline" onClick={refresh}>Refresh</Button>
              </div>
            </Card>

            <div className="mt-3 grid gap-3">
              {requests.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">agent:{r.agentId} → {r.connectorId}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()} • {r.reason || ""}</div>
                    </div>
                    <Badge variant={r.status === "pending" ? "secondary" : r.status === "approved" ? "default" : "destructive"}>{r.status}</Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(r.tools || []).length ? (r.tools || []).map((t: string) => (
                      <Badge key={t} variant="outline">{t}</Badge>
                    )) : <div className="text-xs text-muted-foreground">(requested: all)</div>}
                  </div>

                  {r.status === "pending" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        onClick={async () => {
                          // grant requested scopes (or all)
                          if ((r.tools || []).length) {
                            for (const t of r.tools) {
                              await toggleTool(r.connectorId, r.agentId, t, true);
                            }
                          } else {
                            await toggleAllow(r.connectorId, r.agentId, true);
                          }
                          await fetch("/api/connections-v2/requests", {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({ kind: "decide", id: r.id, status: "approved" }),
                          });
                          await refresh();
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          await fetch("/api/connections-v2/requests", {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({ kind: "decide", id: r.id, status: "rejected" }),
                          });
                          await refresh();
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </Card>
              ))}
              {!requests.length ? <div className="text-sm text-muted-foreground">No requests yet.</div> : null}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
