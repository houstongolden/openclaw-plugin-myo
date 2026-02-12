import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function OfficePage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-semibold">Office</div>
            <div className="text-sm text-muted-foreground">Pixel-office workspace view (WIP) — this will visualize agents + collaboration.</div>
          </div>
          <Badge variant="secondary">Preview</Badge>
        </div>

        <Card className="relative overflow-hidden p-0">
          <div className="aspect-[16/9] w-full bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="max-w-[520px] rounded-2xl border bg-background/80 p-4 text-sm backdrop-blur">
              <div className="font-semibold">Coming next:</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                <li>Agents as sprites at desks (working/idle/blocked/error states)</li>
                <li>Click agent → drawer with Now/Next/Blocked + last 5 receipts</li>
                <li>Collaboration pings when agents message/handoff artifacts</li>
              </ul>
              <div className="mt-3 text-xs text-muted-foreground">
                (This page is here so you can see the feature surface immediately; we’ll wire it to the live event stream next.)
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
