"use client";

import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type Job = {
  id?: string;
  jobId?: string;
  name?: string;
  enabled?: boolean;
  schedule?: any;
};

export default function JobsPage() {
  const [q, setQ] = React.useState("");
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [raw, setRaw] = React.useState<any>(null);

  async function refresh() {
    const j = await fetch("/api/jobs", { cache: "no-store" }).then((r) => r.json());
    const list = Array.isArray(j.jobs) ? j.jobs : Array.isArray(j) ? j : [];
    setJobs(list);
    setRaw(j);
  }

  React.useEffect(() => {
    refresh().catch(() => setRaw({ ok: false }));
  }, []);

  const filtered = q
    ? jobs.filter((x) => `${x.name || ""} ${(x.id || x.jobId) || ""}`.toLowerCase().includes(q.toLowerCase()))
    : jobs;

  async function runNow(jobId: string) {
    await fetch("/api/jobs/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    toast("Job triggered", { description: jobId });
  }

  async function toggle(jobId: string, enabled: boolean) {
    await fetch("/api/jobs/toggle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId, enabled }),
    });
    toast(enabled ? "Enabled" : "Disabled", { description: jobId });
    await refresh();
  }

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
              <div className="flex-1" />
              <Button variant="outline" onClick={() => refresh()}>
                Refresh
              </Button>
            </div>

            <Card className="mt-3 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Installed jobs</div>
                  <div className="mt-1 text-xs text-muted-foreground">Enable/disable + run now (MVP).</div>
                </div>
                <Badge variant="secondary">CLI-backed</Badge>
              </div>

              <div className="mt-4 overflow-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Enabled</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((job: any) => {
                      const id = String(job.jobId || job.id || "");
                      return (
                        <TableRow key={id}>
                          <TableCell className="font-medium">{job.name || "(unnamed)"}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{id}</TableCell>
                          <TableCell>{job.enabled ? "Yes" : "No"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => runNow(id)}>
                                Run now
                              </Button>
                              {job.enabled ? (
                                <Button size="sm" variant="outline" onClick={() => toggle(id, false)}>
                                  Disable
                                </Button>
                              ) : (
                                <Button size="sm" onClick={() => toggle(id, true)}>
                                  Enable
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <Card className="mt-3 p-4">
              <div className="text-sm font-semibold">Raw</div>
              <pre className="mt-3 max-h-[40vh] overflow-auto rounded-xl bg-muted p-3 text-xs">
                {JSON.stringify(raw, null, 2)}
              </pre>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
