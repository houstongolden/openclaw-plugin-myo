"use client";

import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type Proposal = any;

export default function ProposalsPage() {
  const [items, setItems] = React.useState<Proposal[]>([]);
  const [title, setTitle] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [project, setProject] = React.useState("myo-ai");
  const [taskKey, setTaskKey] = React.useState("");

  async function refresh() {
    const j = await fetch("/api/ops/proposals", { cache: "no-store" }).then((r) => r.json());
    setItems(Array.isArray(j.proposals) ? j.proposals : []);
  }

  React.useEffect(() => {
    refresh().catch(() => null);
  }, []);

  async function create() {
    const j = await fetch("/api/ops/proposals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, description: desc, source: "manual", project, taskKey: taskKey || undefined }),
    }).then((r) => r.json());

    if (j?.proposal?.status === "rejected") {
      toast("Rejected by gate", { description: j.proposal.rejectReason || "" });
    } else {
      toast("Proposal created");
    }

    setTitle("");
    setDesc("");
    setTaskKey("");
    await refresh();
  }

  async function approve(proposalId: string) {
    await fetch("/api/ops/proposals", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proposalId, action: "approve", stepKind: "general" }),
    });
    toast("Approved → mission created");
    await refresh();
  }

  async function reject(proposalId: string) {
    await fetch("/api/ops/proposals", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proposalId, action: "reject", reason: "Rejected" }),
    });
    toast("Rejected");
    await refresh();
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold">Proposals</div>
            <div className="text-sm text-muted-foreground">Single entry point + gates → approve → missions + steps.</div>
          </div>
          <Badge variant="secondary">MVP</Badge>
        </div>

        <Card className="p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-semibold">New proposal</div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" />
              <div className="grid gap-2 md:grid-cols-2">
                <Input value={project} onChange={(e) => setProject(e.target.value)} placeholder="Project (e.g. myo-ai)" />
                <Input value={taskKey} onChange={(e) => setTaskKey(e.target.value)} placeholder="Task id (optional)" />
              </div>
              <Button onClick={create} disabled={!title.trim()}>
                Create proposal
              </Button>
              <div className="text-xs text-muted-foreground">
                Gate example: if title implies posting to X and x_autopost is disabled, it auto-rejects.
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold">Why this matters</div>
              <div className="text-sm text-muted-foreground">
                This is the “closed loop” entry point from the Voxyz thread: triggers/reactions/API all create proposals here so caps/gates
                apply consistently.
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Queue</div>
            <Button variant="outline" onClick={refresh}>
              Refresh
            </Button>
          </div>
          <div className="mt-3 overflow-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Gate</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell>{p.status}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.gate?.ok ? "ok" : p.gate?.reason}</TableCell>
                    <TableCell className="text-xs">{p.project || ""}</TableCell>
                    <TableCell className="text-right">
                      {p.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => approve(p.id)}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => reject(p.id)}>
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
