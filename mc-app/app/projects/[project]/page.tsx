import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectChat } from "@/components/chat/project-chat";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { parseTasksMd } from "@/lib/tasks";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import path from "node:path";
import { readFile } from "node:fs/promises";

function rootDir() {
  return process.env.MYO_MC_ROOT_DIR || path.join(process.env.HOME || "", "clawd", "mission-control");
}

export default async function ProjectPage({ params }: { params: Promise<{ project: string }> }) {
  const { project } = await params;

  const base = path.join(rootDir(), "projects", project);
  const [projectMd, tasksMd] = await Promise.all([
    readFile(path.join(base, "PROJECT.md"), "utf-8").catch(() => ""),
    readFile(path.join(base, "TASKS.md"), "utf-8").catch(() => ""),
  ]);

  const tasks = parseTasksMd(tasksMd || "", project);

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <div className="text-2xl font-semibold">{project}</div>
          <div className="text-sm text-muted-foreground">Project hub: docs, tasks, and project-scoped chat.</div>
        </div>

        <Tabs defaultValue="tasks">
          <TabsList>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="docs">Docs</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Kanban</div>
                <div className="text-xs text-muted-foreground">Parsed from TASKS.md</div>
              </div>
              <div className="mt-4">
                <KanbanBoard tasks={tasks as any} />
              </div>
            </Card>

            <Card className="mt-3 p-4">
              <div className="text-sm font-semibold">TASKS.md (raw)</div>
              <pre className="mt-3 max-h-[50vh] overflow-auto rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                {tasksMd || "(missing)"}
              </pre>
            </Card>
          </TabsContent>

          <TabsContent value="docs" className="mt-4">
            <Card className="p-4">
              <div className="text-sm font-semibold">PROJECT.md</div>
              <div className="prose prose-neutral dark:prose-invert mt-4 max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{projectMd || "(missing)"}</ReactMarkdown>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="mt-4">
            <ProjectChat project={project} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
