"use client";

import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { WorkerPanel } from "@/components/ops/worker-panel";
import { EventsPanel } from "@/components/ops/events-panel";

export default function OpsHome() {
  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold">Ops</div>
            <div className="text-sm text-muted-foreground">
              Closed-loop control plane: proposals → missions → steps → events.
            </div>
          </div>
          <Badge variant="secondary">MVP</Badge>
        </div>

        <Tabs defaultValue="events">
          <TabsList>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="worker">Worker</TabsTrigger>
            <TabsTrigger value="proposals">Proposals</TabsTrigger>
            <TabsTrigger value="missions">Missions</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-4">
            <EventsPanel />
          </TabsContent>

          <TabsContent value="worker" className="mt-4">
            <WorkerPanel />
          </TabsContent>

          <TabsContent value="proposals" className="mt-4">
            <div className="text-sm text-muted-foreground">
              Open full page: <Link className="underline" href="/ops/proposals">/ops/proposals</Link>
            </div>
          </TabsContent>
          <TabsContent value="missions" className="mt-4">
            <div className="text-sm text-muted-foreground">
              Open full page: <Link className="underline" href="/ops/missions">/ops/missions</Link>
            </div>
          </TabsContent>
          <TabsContent value="policies" className="mt-4">
            <div className="text-sm text-muted-foreground">
              Open full page: <Link className="underline" href="/ops/policies">/ops/policies</Link>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
