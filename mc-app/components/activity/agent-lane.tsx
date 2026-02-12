"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

export function AgentLane({
  active: activeProp,
  label,
  sessionKey,
  selected,
  onSelect,
}: {
  active: boolean;
  label: string;
  sessionKey: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const [mini, setMini] = React.useState<string[]>([]);
  const [active, setActive] = React.useState<boolean>(activeProp);

  React.useEffect(() => {
    let alive = true;
    if (!sessionKey) return;
    fetch(`/api/activity/agent-summary?key=${encodeURIComponent(sessionKey)}&max=3`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const lines = Array.isArray(j.lines) ? j.lines : [];
        setMini(lines);
        // Source of truth for "active": if we saw any recent lines for this lane.
        setActive(lines.length > 0);
      })
      .catch(() => {
        if (!alive) return;
        setMini([]);
        setActive(false);
      });
    return () => {
      alive = false;
    };
  }, [sessionKey]);

  return (
    <HoverCard openDelay={250}>
      <HoverCardTrigger asChild>
        <button
          onClick={onSelect}
          className={
            "w-full rounded-xl border px-3 py-2 text-left text-sm hover:bg-muted " +
            (selected ? "bg-muted" : "")
          }
        >
          <div className="flex items-center justify-between gap-2">
            <div className="truncate font-medium">{label}</div>
            <span className={"relative h-2 w-2 rounded-full " + (active ? "bg-emerald-500" : "bg-muted-foreground")}>
              {active ? <span className="absolute inset-0 rounded-full bg-emerald-500/60 animate-ping" /> : null}
            </span>
          </div>
          <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{sessionKey}</div>
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-[420px]">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold">Last activity</div>
          <Badge variant={active ? "default" : "secondary"}>{active ? "Active" : "Idle"}</Badge>
        </div>
        <div className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground">
          {mini.length ? mini.map((l, i) => <div key={i}>{l}</div>) : <div>(no recent lines for this agent)</div>}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
