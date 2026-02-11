"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function TaskCapture() {
  const [title, setTitle] = React.useState("");
  const [project, setProject] = React.useState("inbox");
  const [priority, setPriority] = React.useState<"low" | "med" | "high">("med");
  const [tags, setTags] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function submit() {
    const t = title.trim();
    if (!t) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tasks/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: t,
          project,
          priority,
          tags: tags
            .split(/[ ,]+/g)
            .map((x) => x.trim())
            .filter(Boolean),
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Failed");
      toast.success("Captured", { description: `${project} • pri:${priority}` });
      setTitle("");
      setTags("");
    } catch (e: any) {
      toast.error("Capture failed", { description: String(e?.message || e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary">Omni Inbox</Badge>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Capture a task…"
        className="min-w-[280px] flex-1"
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
      />

      <Select value={project} onValueChange={setProject}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Project" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="inbox">inbox</SelectItem>
          <SelectItem value="hubify">hubify</SelectItem>
          <SelectItem value="myo-ai">myo-ai</SelectItem>
          <SelectItem value="mission-control-plugin">mission-control-plugin</SelectItem>
          <SelectItem value="fitness">fitness</SelectItem>
          <SelectItem value="bamf">bamf</SelectItem>
        </SelectContent>
      </Select>

      <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="low">low</SelectItem>
          <SelectItem value="med">med</SelectItem>
          <SelectItem value="high">high</SelectItem>
        </SelectContent>
      </Select>

      <Input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="#tags"
        className="w-[200px] font-mono"
      />

      <Button onClick={submit} disabled={loading || !title.trim()}>
        Add
      </Button>
    </div>
  );
}
