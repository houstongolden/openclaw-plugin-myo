import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listTasks } from "@/lib/vault";

function priRank(p: string) {
  if (p === "high") return 3;
  if (p === "med") return 2;
  if (p === "low") return 1;
  return 2;
}

export default async function Page() {
  const tasks = await listTasks().catch(() => []);

  const inProgress = tasks
    .filter((t) => t.status === "in_progress")
    .sort((a, b) => priRank(b.priority) - priRank(a.priority) || a.title.localeCompare(b.title));

  const queued = tasks
    .filter((t) => t.status === "assigned")
    .sort((a, b) => priRank(b.priority) - priRank(a.priority) || a.title.localeCompare(b.title));

  const recentDone = tasks
    .filter((t) => t.status === "done")
    .sort((a, b) => priRank(b.priority) - priRank(a.priority) || a.title.localeCompare(b.title))
    .slice(0, 15);

  const unassignedWip = inProgress.filter((t) => !t.agent);
  const queuedNoOwner = queued.filter((t) => !t.agent);

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <div className="text-2xl font-semibold">Now</div>
          <div className="text-sm text-muted-foreground">What’s in progress, what’s next, and what just shipped (from TASKS.md).</div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">In progress</div>
              <Badge variant="secondary">{inProgress.length}</Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Across all projects</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Queued next</div>
              <Badge variant="secondary">{queued.length}</Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Ready to pull</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Recently done</div>
              <Badge variant="secondary">{recentDone.length}</Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Most recent sample</div>
          </Card>
        </div>

        {(unassignedWip.length || queuedNoOwner.length) ? (
          <Card className="p-4 border-destructive/30">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Attention</div>
              <Badge variant="destructive">Needs triage</Badge>
            </div>
            <div className="mt-2 space-y-2 text-sm">
              {unassignedWip.length ? (
                <div>
                  <div className="text-xs text-muted-foreground">Unassigned WIP</div>
                  <div className="mt-1 text-sm">{unassignedWip.length} task(s) are in progress with no agent owner.</div>
                </div>
              ) : null}
              {queuedNoOwner.length ? (
                <div>
                  <div className="text-xs text-muted-foreground">Queued with no owner</div>
                  <div className="mt-1 text-sm">{queuedNoOwner.length} task(s) are queued with no agent owner.</div>
                </div>
              ) : null}
              <div className="pt-2">
                <Link href="/tasks?view=list&showDone=1" className="text-sm underline">Open tasks list →</Link>
              </div>
            </div>
          </Card>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-2">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">In progress</div>
              <Link href="/tasks?view=list" className="text-xs text-muted-foreground hover:text-foreground">View all</Link>
            </div>
            <div className="mt-3 space-y-2">
              {inProgress.slice(0, 10).map((t) => (
                <Link key={t.id} href={`/projects/${encodeURIComponent(t.project)}?tab=tasks`} className="block rounded-lg border px-3 py-2 hover:bg-muted">
                  <div className="text-sm font-medium">{t.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t.project} • pri:{t.priority}{t.agent ? ` • agent:${t.agent}` : ""}
                  </div>
                </Link>
              ))}
              {!inProgress.length ? <div className="text-sm text-muted-foreground">Nothing in progress.</div> : null}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Queued next</div>
              <Link href="/tasks?view=list" className="text-xs text-muted-foreground hover:text-foreground">View all</Link>
            </div>
            <div className="mt-3 space-y-2">
              {queued.slice(0, 10).map((t) => (
                <Link key={t.id} href={`/projects/${encodeURIComponent(t.project)}?tab=tasks`} className="block rounded-lg border px-3 py-2 hover:bg-muted">
                  <div className="text-sm font-medium">{t.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t.project} • pri:{t.priority}{t.agent ? ` • agent:${t.agent}` : ""}
                  </div>
                </Link>
              ))}
              {!queued.length ? <div className="text-sm text-muted-foreground">Nothing queued.</div> : null}
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Recently done</div>
            <Link href="/tasks?view=list&showDone=1" className="text-xs text-muted-foreground hover:text-foreground">Show done list</Link>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {recentDone.map((t) => (
              <div key={t.id} className="rounded-lg border px-3 py-2">
                <div className="text-sm font-medium">{t.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{t.project}</div>
              </div>
            ))}
            {!recentDone.length ? <div className="text-sm text-muted-foreground">No completed tasks found yet.</div> : null}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
