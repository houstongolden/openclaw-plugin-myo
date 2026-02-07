import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";

export default function ChatPage() {
  return (
    <AppShell>
      <Card className="p-4">
        <div className="text-2xl font-semibold">Chat</div>
        <div className="mt-2 text-sm text-muted-foreground">
          Next: global chat that can @project, @file, and dispatch jobs/tasks via OpenClaw.
        </div>
      </Card>
    </AppShell>
  );
}
