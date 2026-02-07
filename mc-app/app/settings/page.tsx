import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <div className="text-2xl font-semibold">Settings</div>
          <div className="text-sm text-muted-foreground">Theme, vault location, gateway connection, and defaults.</div>
        </div>

        <Card className="p-4">
          <div className="text-sm font-semibold">Vault</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Default: <code className="rounded bg-muted px-1 py-0.5">~/clawd/mission-control</code>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
