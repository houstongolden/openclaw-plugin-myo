"use client";

import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function OpsWorkerPage() {
  const [state, setState] = React.useState<any>(null);
  const [alive, setAlive] = React.useState(false);

  async function refresh() {
    const j = await fetch("/api/ops/worker", { cache: "no-store" }).then((r) => r.json());
    setState(j.state);
    setAlive(Boolean(j.alive));
  }

  React.useEffect(() => {
    refresh().catch(() => null);
    const t = setInterval(() => refresh().catch(() => null), 3000);
    return () => clearInterval(t);
  }, []);

  async function start() {
    await fetch("/api/ops/worker", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "start" }) });
    await refresh();
  }

  async function stop() {
    await fetch("/api/ops/worker", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "stop" }) });
    await refresh();
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold">Ops Worker</div>
            <div className="text-sm text-muted-foreground">Single local executor for queued ops steps (closed-loop automation).</div>
          </div>
          <Badge variant={alive ? "default" : "secondary"}>{alive ? "running" : "stopped"}</Badge>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={start} disabled={alive}>Start worker</Button>
            <Button onClick={stop} variant="outline" disabled={!alive}>Stop worker</Button>
            <Link href="/ops/events" className="text-sm underline">View events</Link>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">State file: ~/clawd/mission-control/ops/worker.json</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-semibold">Current state</div>
          <pre className="mt-3 whitespace-pre-wrap break-words rounded-xl border bg-muted p-3 text-xs">{JSON.stringify(state, null, 2)}</pre>
          <div className="mt-2 text-xs text-muted-foreground">
            Step format MVP: append to ops/steps.jsonl with kind=openclaw and args=[...] (e.g. ["cron","list"]).
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
