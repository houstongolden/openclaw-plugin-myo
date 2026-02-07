"use client";

import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ConnectionsPage() {
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetch("/api/connections", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setItems(Array.isArray(j.items) ? j.items : []))
      .catch(() => setItems([]));
  }, []);

  const filtered = q ? items.filter((x) => x.key.toLowerCase().includes(q.toLowerCase())) : items;

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold">Connections</div>
            <div className="text-sm text-muted-foreground">Env vars + API keys (masked) + integration health.</div>
          </div>
          <Badge variant="secondary">masked</Badge>
        </div>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search env vars…" />
            <Badge variant="outline">{filtered.length}</Badge>
          </div>

          <div className="mt-4 overflow-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Present</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 250).map((it) => (
                  <TableRow key={it.key}>
                    <TableCell className="font-mono text-xs">{it.key}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{it.value}</TableCell>
                    <TableCell>{it.present ? "Yes" : "No"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            Values are masked by default. Next: per-connector health checks + “re-auth” buttons.
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
