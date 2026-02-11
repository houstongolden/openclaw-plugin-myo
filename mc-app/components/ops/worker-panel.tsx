"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function WorkerPanel() {
  const [state, setState] = React.useState<any>(null);
  const [alive, setAlive] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

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

  async function act(action: "start" | "stop") {
    setLoading(true);
    try {
      await fetch("/api/ops/worker", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Worker</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Local executor for queued Ops steps.
            </div>
          </div>
          <Badge variant={alive ? "default" : "secondary"}>{alive ? "running" : "stopped"}</Badge>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={() => act("start")} disabled={alive || loading}>
            Start
          </Button>
          <Button onClick={() => act("stop")} variant="outline" disabled={!alive || loading}>
            Stop
          </Button>
          <Button onClick={() => refresh()} variant="outline" disabled={loading}>
            Refresh
          </Button>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          State file: <span className="font-mono">~/clawd/mission-control/ops/worker.json</span>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold">State</div>
        <pre className="mt-3 max-h-[45vh] overflow-auto whitespace-pre-wrap break-words rounded-xl border bg-muted p-3 text-[11px] text-muted-foreground">
          {JSON.stringify(state, null, 2)}
        </pre>
      </Card>
    </div>
  );
}
