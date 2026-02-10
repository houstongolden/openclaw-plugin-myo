import { AppShell } from "@/components/app-shell";
import { NowDashboard } from "@/components/now/now-dashboard.client";

export default async function Page() {
  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <div className="text-2xl font-semibold">Now</div>
          <div className="text-sm text-muted-foreground">What’s in progress, what’s next, and what just shipped.</div>
        </div>
        <NowDashboard />
      </div>
    </AppShell>
  );
}
