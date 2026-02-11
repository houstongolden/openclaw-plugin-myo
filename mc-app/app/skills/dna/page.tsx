"use client";

import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function SkillsDnaPage() {
  const [data, setData] = React.useState<any>(null);

  React.useEffect(() => {
    fetch("/api/skills-dna", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ ok: false }));
  }, []);

  const files = data?.files || {};

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold">Skills DNA</div>
            <div className="text-sm text-muted-foreground">
              Personality + operating system: soul, model routing, and tool posture.
            </div>
          </div>
          <Badge variant="secondary">source of truth</Badge>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <Card className="p-4">
              <div className="text-sm font-semibold">What lives here</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>SOUL.md: persona + rules</li>
                <li>Model routing: what models to use for what</li>
                <li>Tool posture: safety rails + external comms policy</li>
              </ul>
              <div className="mt-3 text-sm text-muted-foreground">
                Next: add a structured “Model Policy” editor (JSON) + validation.
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="mt-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">DNA files</div>
                <Badge variant="outline">read-only (for now)</Badge>
              </div>
              <div className="mt-4">
                <Accordion type="single" collapsible>
                  {Object.entries(files).map(([k, v]: any) => (
                    <AccordionItem key={k} value={k}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{k}</Badge>
                          <span className="text-xs text-muted-foreground">{v?.path}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ScrollArea className="h-[50vh] rounded-xl border bg-muted/30 p-3">
                          <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{v?.text || ""}</pre>
                        </ScrollArea>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
