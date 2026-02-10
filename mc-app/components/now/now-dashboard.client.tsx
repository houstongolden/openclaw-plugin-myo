"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function NowDashboard() {
  const [md, setMd] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(true);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [err, setErr] = React.useState<string>("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch("/api/now", { cache: "no-store" });
      const j = await r.json();
      setMd(String(j?.md || ""));
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function saveNow() {
    setSaving(true);
    setErr("");
    try {
      const r = await fetch("/api/now", { method: "POST" });
      const j = await r.json();
      setMd(String(j?.md || ""));
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Now</div>
          <div className="text-xs text-muted-foreground">Live snapshot from your local TASKS.md</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            Refresh
          </Button>
          <Button size="sm" onClick={saveNow} disabled={saving}>
            Write NOW.md
          </Button>
        </div>
      </div>

      {err ? <div className="mt-3 text-sm text-destructive">{err}</div> : null}

      <div className="prose prose-neutral dark:prose-invert mt-4 max-w-none">
        {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : null}
        {!loading && !md ? <div className="text-sm text-muted-foreground">No data yet.</div> : null}
        {!loading && md ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown> : null}
      </div>
    </Card>
  );
}
