import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { listTasks } from "@/lib/vault";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const sp = await searchParams;
  const view = sp.view === "list" ? "list" : "kanban";

  const tasks = await listTasks().catch(() => []);

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold">Mission Control</div>
            <div className="text-sm text-muted-foreground">Tasks across your local projects.</div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link
              href={"/tasks?view=kanban"}
              className={`rounded-lg px-3 py-2 ${view === "kanban" ? "bg-muted" : "hover:bg-muted/50"}`}
            >
              Kanban
            </Link>
            <Link
              href={"/tasks?view=list"}
              className={`rounded-lg px-3 py-2 ${view === "list" ? "bg-muted" : "hover:bg-muted/50"}`}
            >
              List
            </Link>
          </div>
        </div>

        {view === "kanban" ? (
          <Card className="p-4">
            <KanbanBoard tasks={tasks as any} />
          </Card>
        ) : (
          <Card className="p-4">
            <div className="text-sm font-semibold">Compact list</div>
            <div className="mt-4 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left py-2 pr-3">Project</th>
                    <th className="text-left py-2 pr-3">Task</th>
                    <th className="text-left py-2 pr-3">Status</th>
                    <th className="text-left py-2 pr-3">Priority</th>
                    <th className="text-left py-2 pr-3">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id} className="border-t border-border/50 align-top">
                      <td className="py-2 pr-3 text-muted-foreground">{t.project}</td>
                      <td className="py-2 pr-3 font-medium">{t.title}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{t.status}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{t.priority}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{t.tags?.length ? t.tags.join(", ") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
