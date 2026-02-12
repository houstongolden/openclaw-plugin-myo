"use client";

import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";

type NowApi = {
  ok: boolean;
  top?: string;
  inProgress?: unknown[];
  queued?: unknown[];
  recentlyDone?: unknown[];
  attention?: { needsTriage?: boolean; message?: string };
};

type TeamStatusApi = {
  ok: boolean;
  status: Record<string, { now: string[]; next: string[]; blocked: string[]; last5: string[] }>;
};

type TriageMap = Record<string, { ackAtMs?: number; snoozeUntilMs?: number }>;

const TRIAGE_KEY = "mc:needs-houston:triage:v1";

function loadTriage(): TriageMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(TRIAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function saveTriage(m: TriageMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TRIAGE_KEY, JSON.stringify(m));
}

function isSnoozed(triage: TriageMap, agentId: string) {
  const until = triage?.[agentId]?.snoozeUntilMs || 0;
  return until > Date.now();
}

export default function YouPage() {
  const [now, setNow] = React.useState<NowApi | null>(null);
  const [team, setTeam] = React.useState<TeamStatusApi | null>(null);
  const [triage, setTriage] = React.useState<TriageMap>({});

  async function refresh() {
    const [n, t] = await Promise.all([
      fetch("/api/now", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ ok: false })),
      fetch("/api/team/status", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => ({ ok: false, status: {} })),
    ]);
    setNow(n);
    setTeam(t);
  }

  React.useEffect(() => {
    setTriage(loadTriage());
    refresh();
  }, []);

  function updateTriage(next: TriageMap) {
    setTriage(next);
    saveTriage(next);
  }

  const needsHoustonRaw = Object.entries(team?.status || {}).filter(([, s]) => (s.blocked || []).length > 0);
  const needsHouston = needsHoustonRaw.filter(([id]) => !isSnoozed(triage, id)).slice(0, 12);
  const snoozedCount = needsHoustonRaw.length - needsHouston.length;

  function ack(agentId: string) {
    const next = { ...triage, [agentId]: { ...(triage[agentId] || {}), ackAtMs: Date.now() } };
    updateTriage(next);
    toast.success(`Acknowledged ${agentId}`);
  }

  function snooze(agentId: string, ms: number) {
    const until = Date.now() + ms;
    const next = { ...triage, [agentId]: { ...(triage[agentId] || {}), snoozeUntilMs: until } };
    updateTriage(next);
    toast.success(`Snoozed ${agentId}`, { description: `until ${new Date(until).toLocaleTimeString()}` });
  }

  async function copyBlockers(agentId: string, blockers: string[]) {
    const text = [`${agentId} — blocked:`, ...blockers.map((b) => `- ${b}`)].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied blockers");
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-2xl font-semibold">You</div>
            <div className="text-sm text-muted-foreground">The only stuff that matters to you right now.</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refresh()}>
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="p-4 lg:col-span-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold">Needs Houston</div>
                <div className="mt-1 text-xs text-muted-foreground">Blockers pulled from agent status (Blocked).</div>
              </div>
              <div className="flex items-center gap-2">
                {snoozedCount ? <Badge variant="outline">Snoozed {snoozedCount}</Badge> : null}
                <Badge variant={needsHoustonRaw.length ? "destructive" : "secondary"}>{needsHoustonRaw.length || 0}</Badge>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {!needsHoustonRaw.length ? (
                <div className="text-sm text-muted-foreground">Nothing blocked right now.</div>
              ) : null}

              {needsHoustonRaw.length && !needsHouston.length ? (
                <div className="text-sm text-muted-foreground">All blockers are snoozed.</div>
              ) : null}

              {needsHouston.map(([id, s]) => (
                <div key={id} className="rounded-xl border p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold">{id}</div>
                      <Badge variant="destructive">Blocked</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/team?agent=${encodeURIComponent(id)}`}>Open agent</Link>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => copyBlockers(id, (s.blocked || []).slice(0, 10))}>
                        Copy
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => ack(id)}>
                        Ack
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => snooze(id, 30 * 60 * 1000)}>
                        Snooze 30m
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => snooze(id, 2 * 60 * 60 * 1000)}>
                        Snooze 2h
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {(s.blocked || []).slice(0, 5).map((b, i) => (
                      <div key={i}>• {b}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold">Now</div>
                <div className="mt-1 text-xs text-muted-foreground">From tasks across projects.</div>
              </div>
              <Badge variant="secondary">{now?.inProgress?.length ?? "—"}</Badge>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              {now?.inProgress?.length ? "Open Live to see what’s moving." : "No in-progress tasks detected."}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/live">Open Live</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/projects">Projects</Link>
              </Button>
            </div>
          </Card>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold">Momentum</div>
                <div className="mt-1 text-xs text-muted-foreground">Quick reassurance + wins (trimmed).</div>
              </div>
              <Badge variant="secondary">Lean</Badge>
            </div>
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border p-3">
                <div className="text-xs font-semibold text-muted-foreground">Reminder</div>
                <div className="mt-1 text-sm">Keep the loop tight: unblock → assign → ship.</div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold">Messages (later)</div>
                <div className="mt-1 text-xs text-muted-foreground">Slack + Gmail after the control plane is stable.</div>
              </div>
              <Badge variant="outline">hidden</Badge>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">Not in the core loop yet.</div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
