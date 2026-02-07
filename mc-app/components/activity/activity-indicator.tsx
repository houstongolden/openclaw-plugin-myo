"use client";

import * as React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";

export function ActivityIndicator() {
  const [summary, setSummary] = React.useState<string[]>([]);
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const r = await fetch("/api/activity/recent?lines=200", { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        const s = Array.isArray(j.summary) ? j.summary : [];
        setSummary(s);
        // crude: active if last log lines include common activity tokens
        const blob = s.join("\n").toLowerCase();
        setActive(blob.includes("[plugins]") || blob.includes("cron") || blob.includes("ws") || blob.includes("node.list"));
      } catch {
        if (!alive) return;
        setSummary([]);
        setActive(false);
      }
    }

    load();
    const t = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/activity"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-muted"
            aria-label="Activity"
          >
            <span
              className={
                "h-3 w-3 rounded-full " +
                (active ? "bg-emerald-500" : "bg-muted-foreground")
              }
            />
            {active ? (
              <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-emerald-500/60" />
            ) : null}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="max-w-[360px]">
          <div className="text-xs font-semibold">Live activity</div>
          <div className="mt-1 space-y-1 text-xs text-muted-foreground">
            {summary.length ? summary.map((l, i) => <div key={i}>{l}</div>) : <div>(no recent lines)</div>}
          </div>
          <div className="mt-2 text-xs">Click to open feed →</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
