import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function OpsHome() {
  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold">Ops</div>
            <div className="text-sm text-muted-foreground">Closed-loop control plane: proposals → missions → steps → events.</div>
          </div>
          <Badge variant="secondary">MVP</Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Link href="/ops/proposals">
            <Card className="p-4 hover:bg-muted">
              <div className="text-sm font-semibold">Proposals</div>
              <div className="mt-1 text-xs text-muted-foreground">Create + approve/reject with gates.</div>
            </Card>
          </Link>
          <Link href="/ops/missions">
            <Card className="p-4 hover:bg-muted">
              <div className="text-sm font-semibold">Missions</div>
              <div className="mt-1 text-xs text-muted-foreground">Steps + status + execution trail.</div>
            </Card>
          </Link>
          <Link href="/ops/policies">
            <Card className="p-4 hover:bg-muted">
              <div className="text-sm font-semibold">Policies</div>
              <div className="mt-1 text-xs text-muted-foreground">Caps, gates, reaction matrix.</div>
            </Card>
          </Link>
        </div>

        <Link href="/ops/events">
          <Card className="p-4 hover:bg-muted">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Events</div>
              <Badge variant="outline">timeline</Badge>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">The durable activity stream (structured).</div>
          </Card>
        </Link>
      </div>
    </AppShell>
  );
}
