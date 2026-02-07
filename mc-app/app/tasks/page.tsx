import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { listTasks } from "@/lib/vault";

export default async function TasksPage() {
  const tasks = await listTasks().catch(() => []);
  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <div className="text-2xl font-semibold">Mission Control</div>
          <div className="text-sm text-muted-foreground">Kanban view across your local projects.</div>
        </div>
        <Card className="p-4">
          <KanbanBoard tasks={tasks as any} />
        </Card>
      </div>
    </AppShell>
  );
}
