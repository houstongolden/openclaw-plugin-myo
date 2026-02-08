"use client";

import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PoliciesPage() {
  const [json, setJson] = React.useState("{}");

  async function load() {
    const j = await fetch("/api/ops/policies", { cache: "no-store" }).then((r) => r.json());
    setJson(JSON.stringify(j.policies || {}, null, 2));
  }

  React.useEffect(() => {
    load().catch(() => null);
  }, []);

  async function save() {
    try {
      const policies = JSON.parse(json);
      await fetch("/api/ops/policies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ policies }),
      });
      toast("Saved policies");
    } catch {
      toast("Invalid JSON");
    }
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold">Policies</div>
            <div className="text-sm text-muted-foreground">Caps, gates, and reaction matrix (MVP JSON editor).</div>
          </div>
          <Badge variant="secondary">MVP</Badge>
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">ops/policies.json</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={load}>
                Reload
              </Button>
              <Button onClick={save}>Save</Button>
            </div>
          </div>
          <Textarea value={json} onChange={(e) => setJson(e.target.value)} className="mt-3 font-mono text-xs" rows={20} />
          <div className="mt-3 text-xs text-muted-foreground">
            Next: replace with a proper UI (toggles, quotas, reaction-matrix table editor).
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
