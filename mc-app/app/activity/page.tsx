"use client";

import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AgentLane } from "@/components/activity/agent-lane";
import { EventFeed } from "@/components/activity/event-feed";
import { toEvents } from "@/lib/log-format";

type Session = {
  sessionKey?: string;
  key?: string;
  label?: string;
  agentId?: string;
  agent_id?: string;
  kind?: string;
  updatedAt?: string;
  lastMessage?: any;
};

function getSessionKey(s: Session) {
  return String(s.sessionKey || s.key || "");
}

export default function ActivityPage() {
  const [lines, setLines] = React.useState<string[]>([]);
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [activeKey, setActiveKey] = React.useState<string>("all");

  React.useEffect(() => {
    const ev = new EventSource("/api/activity/stream");
    ev.addEventListener("lines", (e: any) => {
      try {
        const j = JSON.parse(e.data);
        const incoming: string[] = Array.isArray(j.lines) ? j.lines : [];
        setLines((prev) => [...prev, ...incoming].slice(-2000));
      } catch {}
    });

    // Persist snapshots periodically so history is rewindable.
    const t = setInterval(() => {
      fetch("/api/activity/store?action=pull&lines=800", { cache: "no-store" }).catch(() => null);
    }, 5000);

    // Refresh sessions list for multi-agent UI.
    const s = setInterval(() => {
      fetch("/api/agents?limit=50", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => setSessions(Array.isArray(j.sessions) ? j.sessions : []))
        .catch(() => null);
    }, 3000);
    fetch("/api/agents?limit=50", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setSessions(Array.isArray(j.sessions) ? j.sessions : []))
      .catch(() => null);

    return () => {
      ev.close();
      clearInterval(t);
      clearInterval(s);
    };
  }, []);

  const filtered = React.useMemo(() => {
    if (activeKey === "all") return lines;
    return lines.filter((l) => l.includes(activeKey));
  }, [lines, activeKey]);

  const events = React.useMemo(() => toEvents(filtered), [filtered]);

  const sessionItems = React.useMemo(() => {
    const out = sessions
      .map((s) => {
        const key = getSessionKey(s as any);
        const label = (s as any).label || (s as any).name || (s as any).agentId || (s as any).agent_id || key;
        return { key, label, raw: s };
      })
      .filter((x) => x.key)
      .slice(0, 20);
    return out;
  }, [sessions]);

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold">Live</div>
            <div className="text-sm text-muted-foreground">
              Intelligent compact stream + per-session filter. Saved to your vault for rewind.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">SSE</Badge>
            <Badge variant="outline">saved</Badge>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Agents / Sessions</div>
              <Badge variant="secondary">{sessionItems.length}</Badge>
            </div>
            <div className="mt-2 space-y-1">
              <button
                onClick={() => setActiveKey("all")}
                className={
                  "w-full rounded-xl border px-3 py-2 text-left text-sm hover:bg-muted " +
                  (activeKey === "all" ? "bg-muted" : "")
                }
              >
                All activity
              </button>
              {sessionItems.map((s) => {
                const isActive = lines.slice(-400).some((l) => l.includes(s.key));
                return (
                  <AgentLane
                    key={s.key}
                    active={isActive}
                    label={s.label}
                    sessionKey={s.key}
                    selected={activeKey === s.key}
                    onSelect={() => setActiveKey(s.key)}
                  />
                );
              })}
              {!sessionItems.length ? (
                <div className="text-sm text-muted-foreground">No sessions found (yet).</div>
              ) : null}
            </div>
          </Card>

          <Card className="p-3">
            <ScrollArea className="h-[75vh]">
              {!events.length ? <div className="p-3 text-sm text-muted-foreground">Waiting for activity…</div> : null}
              <div className="p-1">
                <EventFeed events={events} />
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
