"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function Top3Card() {
  const [md, setMd] = React.useState<string>("");
  const [path, setPath] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  async function load() {
    const j = await fetch("/api/now/top", { cache: "no-store" }).then((r) => r.json());
    setMd(j.md || "");
    setPath(j.path || "");
  }

  React.useEffect(() => {
    load().catch(() => null);
  }, []);

  async function save() {
    setLoading(true);
    try {
      const res = await fetch("/api/now/top", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ md }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Failed");
      toast.success("Saved Top 3");
    } catch (e: any) {
      toast.error("Save failed", { description: String(e?.message || e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Top 3</div>
          <div className="mt-1 text-xs text-muted-foreground font-mono">{path || "…"}</div>
        </div>
        <Badge variant="secondary">Editable</Badge>
      </div>

      <Textarea
        className="mt-3 min-h-[140px] font-mono text-xs"
        value={md}
        onChange={(e) => setMd(e.target.value)}
      />

      <div className="mt-3 flex items-center gap-2">
        <Button onClick={save} disabled={loading}>
          Save
        </Button>
        <Button variant="outline" onClick={load} disabled={loading}>
          Reload
        </Button>
      </div>
    </Card>
  );
}
