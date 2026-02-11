"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, Copy } from "lucide-react";
import { toast } from "sonner";

export function EventsPanel() {
  const [items, setItems] = React.useState<any[]>([]);

  async function refresh() {
    const j = await fetch("/api/ops/events?limit=400", { cache: "no-store" }).then((r) => r.json());
    setItems(Array.isArray(j.events) ? j.events : []);
  }

  React.useEffect(() => {
    refresh().catch(() => null);
  }, []);

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Structured timeline (durable stream)</div>
        <Button variant="outline" size="sm" onClick={() => refresh()}>
          Refresh
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((e) => (
          <Card key={e.id} className="p-3">
            <Collapsible>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{e.kind}</Badge>
                    <div className="text-sm font-semibold">{e.title}</div>
                    <div className="text-xs text-muted-foreground">{new Date(e.ts).toLocaleTimeString()}</div>
                    {e.actor ? <div className="text-xs text-muted-foreground">{e.actor}</div> : null}
                  </div>
                  {e.details ? <div className="mt-1 text-sm text-muted-foreground line-clamp-2">{e.details}</div> : null}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copy(JSON.stringify(e, null, 2))}
                    aria-label="Copy event"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <CollapsibleTrigger className="rounded-xl border px-2 py-1 text-xs hover:bg-muted">
                    <span className="inline-flex items-center gap-1">
                      Details <ChevronDown className="h-3 w-3" />
                    </span>
                  </CollapsibleTrigger>
                </div>
              </div>

              <CollapsibleContent>
                <pre className="mt-3 max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-xl bg-muted p-3 font-mono text-[11px] text-muted-foreground">
                  {JSON.stringify(e, null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}

        {!items.length ? <div className="text-sm text-muted-foreground">No events yet.</div> : null}
      </div>
    </div>
  );
}
