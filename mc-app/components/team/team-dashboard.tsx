"use client";

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Cpu, Shield, PenTool, Wrench, Users } from "lucide-react";

type TeamAgent = {
  id: string;
  displayName: string;
  role: string;
  level: number;
  description?: string;
};

type TeamApi = {
  ok: boolean;
  registry?: {
    orchestratorName?: string;
    agents?: Record<string, TeamAgent>;
  };
  folders?: string[];
  access?: Record<string, string[]>;
};

type SessionsApi = {
  ok: boolean;
  sessions: any[];
};

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatAgo(ms?: number) {
  if (typeof ms !== "number") return "—";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 60 * 60_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 24 * 60 * 60_000) return `${Math.round(ms / (60 * 60_000))}h`;
  return `${Math.round(ms / (24 * 60 * 60_000))}d`;
}

function groupFor(agent: TeamAgent): { key: string; label: string; icon: React.ReactNode } {
  const role = `${agent.role} ${agent.id}`.toLowerCase();
  if (agent.id === "myo" || agent.level >= 3) return { key: "core", label: "Core", icon: <Users className="h-4 w-4" /> };
  if (role.includes("ops") || role.includes("policy") || role.includes("security")) return { key: "ops", label: "Ops", icon: <Shield className="h-4 w-4" /> };
  if (role.includes("content") || role.includes("writer") || role.includes("draft") || role.includes("quill") || role.includes("echo")) return { key: "content", label: "Content", icon: <PenTool className="h-4 w-4" /> };
  if (role.includes("build") || role.includes("code") || role.includes("dev") || role.includes("engineer")) return { key: "builders", label: "Builders", icon: <Wrench className="h-4 w-4" /> };
  return { key: "specialists", label: "Specialists", icon: <Cpu className="h-4 w-4" /> };
}

function AgentRow({
  agent,
  connectors,
  onOpen,
}: {
  agent: TeamAgent;
  connectors: string[];
  onOpen: () => void;
}) {
  const initials = agent.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <button
      type="button"
      onClick={onOpen}
      className={clsx(
        "group flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition",
        "bg-card/40 hover:bg-muted/60"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={clsx("h-9 w-9 rounded-xl border", "bg-gradient-to-br from-indigo-500/40 to-fuchsia-500/30")}
        >
          <div className="flex h-full w-full items-center justify-center text-xs font-semibold">{initials || "A"}</div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold leading-none">{agent.displayName}</div>
            <Badge variant={agent.level >= 3 ? "default" : "secondary"} className="h-5 px-2">
              L{agent.level}
            </Badge>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            agent:{agent.id} • {agent.role}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {connectors.length ? (
          <Badge variant="outline" className="hidden sm:inline-flex">
            {connectors.length} connectors
          </Badge>
        ) : (
          <Badge variant="outline" className="hidden sm:inline-flex opacity-70">
            no access
          </Badge>
        )}
        <div className="text-xs text-muted-foreground opacity-0 transition group-hover:opacity-100">Open</div>
      </div>
    </button>
  );
}

export function TeamDashboard() {
  const [data, setData] = React.useState<TeamApi | null>(null);
  const [sessions, setSessions] = React.useState<SessionsApi | null>(null);
  const [q, setQ] = React.useState("");

  const [openAgentId, setOpenAgentId] = React.useState<string | null>(null);
  const [openAgent, setOpenAgent] = React.useState<any>(null);

  async function refresh() {
    const j = await fetch("/api/team", { cache: "no-store" }).then((r) => r.json());
    setData(j);
  }

  async function refreshSessions() {
    const j = await fetch("/api/agents?limit=50", { cache: "no-store" }).then((r) => r.json());
    setSessions(j);
  }

  React.useEffect(() => {
    refresh().catch(() => setData({ ok: false } as any));
    refreshSessions().catch(() => setSessions({ ok: false, sessions: [] } as any));
  }, []);

  React.useEffect(() => {
    if (!openAgentId) {
      setOpenAgent(null);
      return;
    }
    fetch(`/api/team/agent?id=${encodeURIComponent(openAgentId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setOpenAgent(j))
      .catch(() => setOpenAgent(null));
  }, [openAgentId]);

  const access = data?.access || {};
  const agents: TeamAgent[] = data?.registry?.agents ? Object.values(data.registry.agents) : [];

  const filtered = q
    ? agents.filter((a) => `${a.displayName} ${a.id} ${a.role} ${a.description || ""}`.toLowerCase().includes(q.toLowerCase()))
    : agents;

  const groups = new Map<string, { label: string; icon: React.ReactNode; agents: TeamAgent[] }>();
  for (const a of filtered) {
    const g = groupFor(a);
    const cur = groups.get(g.key) || { label: g.label, icon: g.icon, agents: [] as TeamAgent[] };
    cur.agents.push(a);
    groups.set(g.key, cur);
  }

  const orderedGroupKeys = ["core", "ops", "builders", "specialists", "content"].filter((k) => groups.has(k));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl font-semibold">Team / Fleet</div>
          <div className="text-sm text-muted-foreground">Grouped agent roster with quick access to files + sessions.</div>
        </div>
        <div className="flex items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search agents…" className="w-[260px]" />
          <Button variant="outline" onClick={() => { refresh(); refreshSessions(); }}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {orderedGroupKeys.map((k) => {
          const g = groups.get(k)!;
          return <GroupPanel key={k} label={g.label} icon={g.icon} agents={g.agents} access={access} onOpen={(id) => setOpenAgentId(id)} />;
        })}
        {!orderedGroupKeys.length ? (
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">No agents found.</div>
          </Card>
        ) : null}
      </div>

      <Sheet open={!!openAgentId} onOpenChange={(v) => setOpenAgentId(v ? openAgentId : null)}>
        <SheetContent side="right" className="w-[420px] sm:w-[520px]">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>{openAgent?.agent?.displayName || openAgentId || "Agent"}</span>
              {openAgent?.agent?.level ? <Badge variant="secondary">L{openAgent.agent.level}</Badge> : null}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4">
            <Tabs defaultValue="profile">
              <TabsList>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
                <TabsTrigger value="sessions">Sessions</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-4">
                <div className="space-y-3">
                  <Card className="p-4">
                    <div className="text-xs font-semibold text-muted-foreground">Role</div>
                    <div className="mt-1 text-sm">{openAgent?.agent?.role || "—"}</div>
                    {openAgent?.agent?.description ? (
                      <div className="mt-3 text-sm text-muted-foreground">{openAgent.agent.description}</div>
                    ) : null}
                    <Separator className="my-3" />
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground">Connector access</div>
                        <div className="mt-1 text-sm">{(access[openAgentId || ""] || []).length || 0}</div>
                      </div>
                      <Link href={`/team/agents/${encodeURIComponent(openAgentId || "")}`} className="text-xs underline">
                        Full settings
                      </Link>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="text-xs font-semibold text-muted-foreground">Quick actions</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/chat?agent=${encodeURIComponent(openAgentId || "")}`}>Open chat</Link>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => refreshSessions()}>
                        Refresh sessions
                      </Button>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">(Chat deep-link is best-effort; will improve once chat supports agent routing.)</div>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="files" className="mt-4">
                <div className="space-y-3">
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">SOUL.md</div>
                      <Link href={`/team/agents/${encodeURIComponent(openAgentId || "")}`} className="text-xs underline">
                        Edit
                      </Link>
                    </div>
                    <pre className={clsx("mt-3 max-h-[240px] overflow-auto rounded-lg border p-3 text-xs", "bg-muted/30")}
                    >{(openAgent?.soul || "").slice(0, 4000) || "(missing)"}</pre>
                  </Card>

                  <Card className="p-4">
                    <div className="text-sm font-semibold">HEARTBEAT.md</div>
                    <pre className={clsx("mt-3 max-h-[220px] overflow-auto rounded-lg border p-3 text-xs", "bg-muted/30")}
                    >{(openAgent?.heartbeat || "").slice(0, 3000) || "(missing)"}</pre>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="sessions" className="mt-4">
                <Card className="p-0">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold">Recent sessions</div>
                      <div className="text-xs text-muted-foreground">From openclaw sessions list (global).</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => refreshSessions()}>
                      Refresh
                    </Button>
                  </div>
                  <Separator />
                  <ScrollArea className="h-[420px]">
                    <div className="p-3">
                      {(sessions?.sessions || []).map((s: any) => (
                        <div key={String(s.key || s.sessionId)} className="rounded-xl border p-3">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-mono text-muted-foreground">{s.key || s.sessionId}</div>
                            <Badge variant="outline" className="h-5 px-2">
                              {formatAgo(s.ageMs)}
                            </Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {s.model ? <span>model: {s.model}</span> : null}
                            {typeof s.totalTokens === "number" ? <span>tokens: {s.totalTokens}</span> : null}
                            {typeof s.contextTokens === "number" ? <span>ctx: {s.contextTokens}</span> : null}
                          </div>
                        </div>
                      ))}
                      {!(sessions?.sessions || []).length ? (
                        <div className="text-sm text-muted-foreground">No sessions found.</div>
                      ) : null}
                    </div>
                  </ScrollArea>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function GroupPanel({
  label,
  icon,
  agents,
  access,
  onOpen,
}: {
  label: string;
  icon: React.ReactNode;
  agents: TeamAgent[];
  access: Record<string, string[]>;
  onOpen: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(true);

  const levels = agents.reduce(
    (acc, a) => {
      acc[a.level] = (acc[a.level] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <Card className={clsx("p-4", "bg-gradient-to-b from-card/70 to-card/30")}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">{icon}</div>
            <div>
              <div className="text-sm font-semibold">{label}</div>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge variant="secondary">{agents.length} agents</Badge>
                {Object.keys(levels)
                  .sort((a, b) => Number(b) - Number(a))
                  .map((lvl) => (
                    <Badge key={lvl} variant="outline" className="opacity-80">
                      L{lvl}: {levels[lvl]}
                    </Badge>
                  ))}
              </div>
            </div>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Toggle group">
              <ChevronDown className={clsx("h-4 w-4 transition", open ? "rotate-180" : "rotate-0")} />
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="mt-4 space-y-2">
            {agents
              .slice()
              .sort((a, b) => (b.level - a.level) || a.displayName.localeCompare(b.displayName))
              .map((a) => (
                <AgentRow
                  key={a.id}
                  agent={a}
                  connectors={access[a.id] || []}
                  onOpen={() => onOpen(a.id)}
                />
              ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
