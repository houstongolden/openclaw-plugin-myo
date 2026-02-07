import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { listProjects } from "@/lib/vault";

export default async function ProjectsPage() {
  const projects = await listProjects().catch(() => []);

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <div className="text-2xl font-semibold">Projects</div>
          <div className="text-sm text-muted-foreground">Markdown-first projects in your local Mission Control vault.</div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p} href={`/projects/${encodeURIComponent(p)}`}>
              <Card className="p-4 hover:bg-muted">
                <div className="text-sm font-semibold">{p}</div>
                <div className="mt-1 text-xs text-muted-foreground">Open PROJECT.md + TASKS.md + chat</div>
              </Card>
            </Link>
          ))}
          {!projects.length ? <div className="text-sm text-muted-foreground">No projects found.</div> : null}
        </div>
      </div>
    </AppShell>
  );
}
