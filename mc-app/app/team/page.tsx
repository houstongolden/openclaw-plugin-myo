"use client";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as React from "react";
import { TeamDashboard } from "@/components/team/team-dashboard";

export default function TeamPage() {
  async function createPreset(preset: string) {
    const r = await fetch("/api/team/presets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ preset }),
    }).then((x) => x.json());
    if (!r.ok) {
      toast(r.error || "Failed");
      return;
    }
    toast(`Created agent: ${r.agentId}`);
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">MVP</div>
          <Badge variant="secondary">Fleet view</Badge>
        </div>

        <TeamDashboard />

        <Card className="p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold">Presets</div>
              <div className="mt-1 text-xs text-muted-foreground">One-click creation of specialist agents under ~/clawd/agents/</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => createPreset("scout")}>
                + Scout
              </Button>
              <Button variant="outline" size="sm" onClick={() => createPreset("analyst")}>
                + Analyst
              </Button>
              <Button variant="outline" size="sm" onClick={() => createPreset("builder")}>
                + Builder
              </Button>
              <Button variant="outline" size="sm" onClick={() => createPreset("content")}>
                + Content
              </Button>
              <Button variant="outline" size="sm" onClick={() => createPreset("auditor")}>
                + Auditor
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
