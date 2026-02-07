import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function Page() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <div className="text-2xl font-semibold">Good evening</div>
          <div className="text-sm text-muted-foreground">Your local second brain + OpenClaw control plane.</div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Next actions</div>
              <Badge variant="secondary">MVP</Badge>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Coming next: aggregate tasks across projects → show today’s queue.
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Agent Ops</div>
              <Badge variant="secondary">MVP</Badge>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Coming next: sessions, active runs, failures, cost/time budget.
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Jobs</div>
              <Badge variant="secondary">live soon</Badge>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Coming next: enable/disable/run-now cron templates from the UI.
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="text-sm font-semibold">Definition of done (for this app)</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Looks like Vercel + Notion + ChatGPT had a baby.</li>
            <li>Runs locally, no Myo.ai account required.</li>
            <li>Projects / tasks / docs / chat are first-class.</li>
            <li>Chat supports @file autocomplete from your Mission Control vault.</li>
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
