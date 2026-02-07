import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectChat } from "@/components/chat/project-chat";

export default async function ProjectPage({ params }: { params: Promise<{ project: string }> }) {
  const { project } = await params;

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <div className="text-2xl font-semibold">{project}</div>
          <div className="text-sm text-muted-foreground">Project hub: docs, tasks, and project-scoped chat.</div>
        </div>

        <Tabs defaultValue="chat">
          <TabsList>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="docs">Docs</TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="mt-4">
            <ProjectChat project={project} />
          </TabsContent>
          <TabsContent value="tasks" className="mt-4">
            <Card className="p-4">
              <div className="text-sm font-semibold">TASKS.md</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Next: render + edit TASKS.md in-browser (Kanban view + markdown view).
              </div>
            </Card>
          </TabsContent>
          <TabsContent value="docs" className="mt-4">
            <Card className="p-4">
              <div className="text-sm font-semibold">PROJECT.md</div>
              <div className="mt-2 text-sm text-muted-foreground">Next: render + edit PROJECT.md in-browser.</div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
