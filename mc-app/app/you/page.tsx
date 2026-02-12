"use client";

import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type NowApi = {
  ok: boolean;
  top?: string;
  inProgress?: any[];
  queued?: any[];
  recentlyDone?: any[];
  attention?: { needsTriage?: boolean; message?: string };
};

type TeamStatusApi = {
  ok: boolean;
  status: Record<string, { now: string[]; next: string[]; blocked: string[]; last5: string[] }>;
};

export default function YouPage() {
  const [now, setNow] = React.useState<NowApi | null>(null);
  const [team, setTeam] = React.useState<TeamStatusApi | null>(null);

  async function refresh() {
    const [n, t] = await Promise.all([
      fetch("/api/now", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ ok: false })),
      fetch("/api/team/status", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ ok: false, status: {} })),
    ]);
    setNow(n);
    setTeam(t);
  }

  React.useEffect(() => {
    refresh();
  }, []);

  const needsHouston = Object.entries(team?.status || {})
    .filter(([_, s]) => (s.blocked || []).length > 0)
    .slice(0, 8);

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
                <div className="mt-1 text-xs text-muted-foreground">Blockers pulled from agent status (Now/Next/Blocked).</div>
              </div>
              <Badge variant={needsHouston.length ? "destructive" : "secondary"}>{needsHouston.length || 0}</Badge>
            </div>

            <div className="mt-3 space-y-2">
              {!needsHouston.length ? (
                <div className="text-sm text-muted-foreground">Nothing blocked right now.</div>
              ) : null}
              {needsHouston.map(([id, s]) => (
                <div key={id} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">{id}</div>
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/team?agent=${encodeURIComponent(id)}`}>Open agent</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/projects/mission-control-plugin?tab=chat`}>Jump to chat</Link>
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {(s.blocked || []).slice(0, 3).map((b, i) => (
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
                <div className="text-sm font-semibold">Momentum</div>
                <div className="mt-1 text-xs text-muted-foreground">Quick reassurance + wins (WIP).</div>
              </div>
              <Badge variant="secondary">WIP</Badge>
            </div>

            <div className="mt-3 space-y-3">
              <div className="rounded-xl border p-3">
                <div className="text-xs font-semibold text-muted-foreground">Agent team shipped</div>
                <div className="mt-1 text-sm">24h / 7d / 30d: <span className="text-muted-foreground">(next)</span></div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-xs font-semibold text-muted-foreground">Fitness snapshot</div>
                <div className="mt-1 text-sm">Strava: <span className="text-muted-foreground">(placeholder — wire next)</span></div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-xs font-semibold text-muted-foreground">Affirmation</div>
                <div className="mt-1 text-sm">You’re building a compounding system. Keep it simple. Keep it moving.</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold">Now</div>
                <div className="mt-1 text-xs text-muted-foreground">From tasks across projects.</div>
              </div>
              <Badge variant="secondary">{(now as any)?.inProgress?.length ?? "—"}</Badge>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              {(now as any)?.inProgress?.length ? "Open Dashboard → In progress to see details." : "No in-progress tasks detected."}
            </div>
            <div className="mt-3">
              <Button asChild variant="outline" size="sm">
                <Link href="/">Open Dashboard</Link>
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold">Messages (later)</div>
                <div className="mt-1 text-xs text-muted-foreground">Slack DMs + sales emails with safe client/prospect verification.</div>
              </div>
              <Badge variant="outline">placeholder</Badge>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              We’ll add Slack + Gmail once the control plane is stable and the “needs Houston” loop is tight.
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
