import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SkillsPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold">Skills</div>
            <div className="text-sm text-muted-foreground">
              Capabilities installed into this agent (tools, workflows, and operating rules).
            </div>
          </div>
          <Badge variant="secondary">beta</Badge>
        </div>

        <Card className="p-4">
          <div className="text-sm font-semibold">Pages</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              <Link href="/skills/dna" className="text-foreground underline underline-offset-4">
                Skills DNA
              </Link>
              : persona + model routing + tool posture (source of truth).
            </li>
          </ul>
          <div className="mt-3 text-sm text-muted-foreground">
            Next: add an installed-skills registry (scan ~/clawd/skills) + per-skill docs.
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
