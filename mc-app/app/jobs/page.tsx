"use client";

import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function JobsPage() {
  const [q, setQ] = React.useState("");
  const [raw, setRaw] = React.useState<any>(null);

  React.useEffect(() => {
    fetch("/api/jobs/list", { cache: "no-store" })
      .then((r) => r.json())
      .then(setRaw)
      .catch(() => setRaw({ ok: false }));
  }, []);

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <div className="text-2xl font-semibold">Jobs</div>
          <div className="text-sm text-muted-foreground">Recurring job runs + a clean management surface.</div>
        </div>

        <Tabs defaultValue="feed">
          <TabsList>
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="manage">Manage Jobs</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-4">
            <Card className="sticky top-4 z-10 border bg-background/90 p-3 backdrop-blur">
              <div className="text-sm font-semibold">Key insights / actions</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Next: summarize recent runs → failures + trends + recommendations.
              </div>
            </Card>

            <div className="mt-3 space-y-3">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Job runs feed</div>
                  <Badge variant="secondary">WIP</Badge>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Next: aggregate cron run history into a newsletter-like feed with pagination + filters.
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="manage" className="mt-4">
            <div className="flex items-center gap-2">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jobs…" />
              <Badge variant="secondary">Manage</Badge>
            </div>

            <Card className="mt-3 p-4">
              <div className="text-sm font-semibold">Installed jobs (raw)</div>
              <div className="mt-2 text-xs text-muted-foreground">First pass: show what cron.list returns.</div>
              <pre className="mt-3 max-h-[60vh] overflow-auto rounded-xl bg-muted p-3 text-xs">
                {JSON.stringify(raw, null, 2)}
              </pre>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
