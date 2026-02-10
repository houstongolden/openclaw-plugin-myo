"use client";

import * as React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Task, TaskStatus } from "@/lib/tasks";

const COLS: Array<{ key: TaskStatus; title: string }> = [
  { key: "inbox", title: "Backlog" },
  { key: "assigned", title: "Queued" },
  { key: "in_progress", title: "In Progress" },
  { key: "review", title: "Review" },
  { key: "done", title: "Done" },
];

function priColor(p: string) {
  if (p === "high") return "destructive";
  if (p === "low") return "secondary";
  return "default";
}

export function KanbanBoard({ tasks, showDone = false }: { tasks: Task[]; showDone?: boolean }) {
  const by = React.useMemo(() => {
    const m = new Map<TaskStatus, Task[]>();
    for (const c of COLS) m.set(c.key, []);
    for (const t of tasks) {
      const arr = m.get(t.status) || [];
      arr.push(t);
      m.set(t.status, arr);
    }
    for (const [k, arr] of m.entries()) {
      arr.sort((a, b) => (a.priority === b.priority ? a.title.localeCompare(b.title) : priRank(b.priority) - priRank(a.priority)));
      m.set(k, arr);
    }
    return m;
  }, [tasks]);

  const cols = showDone ? COLS : COLS.filter((c) => c.key !== "done");

  return (
    <div className={`grid gap-3 ${showDone ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
      {cols.map((c) => {
        const items = by.get(c.key) || [];
        return (
          <div key={c.key} className="min-w-0">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold">{c.title}</div>
              <Badge variant="secondary">{items.length}</Badge>
            </div>
            <ScrollArea className="h-[70vh]">
              <div className="space-y-2 pr-2">
                {items.map((t) => (
                  <Link key={t.id} href={`/projects/${encodeURIComponent(t.project)}?tab=tasks`}>
                    <Card className="p-3 hover:bg-muted">
                      <div className="text-sm font-medium leading-snug">{t.title}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant={priColor(t.priority) as any} className="capitalize">
                          {t.priority}
                        </Badge>
                        <Badge variant="outline">{t.project}</Badge>
                        {t.agent ? (
                          <Badge variant="secondary">agent:{t.agent}</Badge>
                        ) : null}
                        {t.taskKey ? (
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {t.taskKey}
                          </Badge>
                        ) : null}
                        {t.tags.slice(0, 2).map((x) => (
                          <Badge key={x} variant="secondary">
                            #{x}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  </Link>
                ))}
                {!items.length ? <div className="text-xs text-muted-foreground">Empty</div> : null}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}

function priRank(p: string) {
  if (p === "high") return 3;
  if (p === "med") return 2;
  if (p === "low") return 1;
  return 2;
}
