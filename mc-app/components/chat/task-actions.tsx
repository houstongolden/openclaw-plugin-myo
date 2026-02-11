"use client";

import Link from "next/link";

export function TaskActionsPanel({ project }: { project: string }) {
  // Placeholder panel. The project chat can still function without task actions.
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Task actions</div>
          <div className="text-xs text-muted-foreground">
            Quick actions for TASKS.md (WIP)
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
            href={`/projects/${encodeURIComponent(project)}`}
          >
            Project
          </Link>
          <Link className="rounded-md border px-2 py-1 text-xs hover:bg-muted" href={`/tasks`}>
            All tasks
          </Link>
        </div>
      </div>
    </div>
  );
}
