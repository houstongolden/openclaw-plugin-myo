import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { listTasks } from "@/lib/vault";
import { TaskCapture } from "@/components/tasks/task-capture";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; showDone?: string }>;
}) {
  const sp = await searchParams;
  const view = sp.view === "list" ? "list" : "kanban";
  const showDone = sp.view === "list" ? sp.showDone === "1" : sp.showDone === "1";

  const allTasks = await listTasks().catch(() => []);
  const tasks = showDone ? allTasks : allTasks.filter((t) => t.status !== "done");

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
              href={`/tasks?view=kanban${showDone ? "&showDone=1" : ""}`}
              className={`rounded-lg px-3 py-2 ${view === "kanban" ? "bg-muted" : "hover:bg-muted/50"}`}
            >
              Kanban
            </Link>
            <Link
              href={`/tasks?view=list${showDone ? "&showDone=1" : ""}`}
              className={`rounded-lg px-3 py-2 ${view === "list" ? "bg-muted" : "hover:bg-muted/50"}`}
            >
              List
            </Link>
          </div>
        </div>

        <Card className="p-4">
          <TaskCapture />
        </Card>

        {view === "kanban" ? (
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Board</div>
              <Link
                href={`/tasks?view=kanban${showDone ? "" : "&showDone=1"}`}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {showDone ? "Hide done" : "Show done"}
              </Link>
            </div>
            <KanbanBoard tasks={tasks as any} showDone={showDone} />
          </Card>
        ) : (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Compact list</div>
              <Link
                href={`/tasks?view=list${showDone ? "" : "&showDone=1"}`}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {showDone ? "Hide done" : "Show done"}
              </Link>
            </div>
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
