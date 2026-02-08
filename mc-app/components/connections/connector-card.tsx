"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ConnectorCard({ connector }: { connector: any }) {
  const [open, setOpen] = React.useState(false);

  const statusVariant =
    connector.status === "connected" ? "default" : connector.status === "error" ? "destructive" : "secondary";

  return (
    <>
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold">{connector.name}</div>
              <Badge variant={statusVariant as any}>{connector.status}</Badge>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{connector.description}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">via {connector.kind}</Badge>
              {(connector.provides || []).slice(0, 4).map((p: string) => (
                <Badge key={p} variant="secondary">
                  {p}
                </Badge>
              ))}
            </div>
            {connector.statusDetail ? <div className="mt-2 text-xs text-muted-foreground">{connector.statusDetail}</div> : null}
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={() => setOpen(true)}>{connector.status === "connected" ? "Manage" : "Connect"}</Button>
            <Button variant="outline" onClick={() => setOpen(true)}>
              Permissions
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{connector.status === "connected" ? `Manage ${connector.name}` : `Connect ${connector.name}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Card className="p-3">
              <div className="text-sm font-semibold">Connection method</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Connected via <span className="font-mono">{connector.kind}</span>.
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-sm font-semibold">Per-agent approval</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Next: this modal becomes the “Grant permissions” flow (like your Tasklet screenshots) with scopes/tool chips + allowlist per agent.
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-sm font-semibold">Tools / scopes</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(connector.tools || []).map((t: string) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </div>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
