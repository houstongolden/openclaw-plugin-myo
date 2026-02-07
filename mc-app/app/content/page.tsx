"use client";

import * as React from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function ContentPage() {
  const [items, setItems] = React.useState<string[]>([]);
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    fetch("/api/content/list", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setItems(Array.isArray(j.items) ? j.items : []))
      .catch(() => setItems([]));
  }, []);

  const filtered = q ? items.filter((x) => x.toLowerCase().includes(q.toLowerCase())) : items;

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold">Content</div>
            <div className="text-sm text-muted-foreground">
              Drafts + scripts + research, separated from planning/memory.
            </div>
          </div>
          <Badge variant="secondary">Markdown-first</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search content…" />
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link key={p} href={`/raw?path=content/${encodeURIComponent(p)}`}>
              <Card className="p-4 hover:bg-muted">
                <div className="text-sm font-semibold">{p}</div>
                <div className="mt-1 text-xs text-muted-foreground">Open raw markdown (next: rich editor)</div>
              </Card>
            </Link>
          ))}
          {!filtered.length ? <div className="text-sm text-muted-foreground">No content files found.</div> : null}
        </div>

        <Card className="p-4">
          <div className="text-sm font-semibold">Planned structure</div>
          <div className="mt-2 text-sm text-muted-foreground">
            <div>content/</div>
            <ul className="mt-1 list-disc pl-5">
              <li>linkedin/</li>
              <li>x/</li>
              <li>newsletter/</li>
              <li>blog/</li>
              <li>youtube/</li>
              <li>research/</li>
              <li>ideas/</li>
            </ul>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
