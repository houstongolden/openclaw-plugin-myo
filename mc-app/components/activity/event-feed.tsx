"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import type { ActivityEvent } from "@/lib/log-format";

function kindBadge(kind: ActivityEvent["kind"]) {
  switch (kind) {
    case "cron":
      return <Badge variant="secondary">Cron</Badge>;
    case "tool":
      return <Badge variant="secondary">Tool</Badge>;
    case "session":
      return <Badge variant="secondary">Session</Badge>;
    case "gateway":
      return <Badge variant="secondary">Gateway</Badge>;
    default:
      return <Badge variant="outline">System</Badge>;
  }
}

export function EventFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <div className="space-y-2">
      {events.map((ev) => (
        <Card key={ev.id} className="p-3">
          <Collapsible>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {kindBadge(ev.kind)}
                  <div className="truncate text-sm font-semibold">{ev.title}</div>
                  <div className="text-xs text-muted-foreground">{new Date(ev.ts).toLocaleTimeString()}</div>
                  {ev.taskKey ? (
                    <Link
                      href={`/projects/myo-ai?tab=tasks&task=${encodeURIComponent(ev.taskKey)}`}
                      className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
                      title="Open related task"
                    >
                      task:{ev.taskKey}
                    </Link>
                  ) : null}
                </div>
                {ev.summary ? <div className="mt-1 text-sm text-muted-foreground">{ev.summary}</div> : null}
              </div>
              <CollapsibleTrigger className="rounded-xl border px-2 py-1 text-xs hover:bg-muted">
                <span className="inline-flex items-center gap-1">
                  Details <ChevronDown className="h-3 w-3" />
                </span>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-muted p-3 font-mono text-[11px] text-muted-foreground">
                {ev.details}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  );
}
