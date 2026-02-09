"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Item = { name: string; kind: "dir" | "file"; size?: number | null };

export default function AgentFilesPage() {
  const params = useParams();
  const id = String((params as any).id || "");

  const [cwd, setCwd] = React.useState<string>("");
  const [items, setItems] = React.useState<Item[]>([]);
  const [selected, setSelected] = React.useState<string>("");
  const [text, setText] = React.useState<string>("");
  const [q, setQ] = React.useState("");

  async function list(nextPath?: string) {
    const p = typeof nextPath === "string" ? nextPath : cwd;
    const j = await fetch(`/api/team/files?agent=${encodeURIComponent(id)}&mode=list&path=${encodeURIComponent(p)}`, { cache: "no-store" }).then((r) => r.json());
    if (!j.ok) {
      toast("Failed to list", { description: j.error });
      return;
    }
    setCwd(j.path || "");
    setItems(Array.isArray(j.items) ? j.items : []);
  }

  async function openFile(rel: string) {
    const j = await fetch(`/api/team/files?agent=${encodeURIComponent(id)}&mode=get&path=${encodeURIComponent(rel)}`, { cache: "no-store" }).then((r) => r.json());
    if (!j.ok) {
      toast("Failed to open", { description: j.error });
      return;
    }
    setSelected(rel);
    setText(j.text || "");
  }

  async function save() {
    if (!selected) return;
    const r = await fetch(`/api/team/files`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agent: id, path: selected, text }),
    }).then((x) => x.json());
    if (!r.ok) {
      toast("Save failed", { description: r.error });
      return;
    }
    toast("Saved", { description: selected });
  }

  React.useEffect(() => {
    if (!id) return;
    list("").catch(() => null);
  }, [id]);

  const shown = q ? items.filter((it) => it.name.toLowerCase().includes(q.toLowerCase())) : items;

  function join(a: string, b: string) {
    if (!a) return b;
    return `${a.replace(/\/$/, "")}/${b}`;
  }

  function parent(p: string) {
    const parts = p.split("/").filter(Boolean);
    parts.pop();
    return parts.join("/");
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold">Agent Files</div>
            <div className="text-sm text-muted-foreground">agent:{id} • local filesystem editor (vault). Gateway editing next.</div>
          </div>
          <Link href={`/team/agents/${encodeURIComponent(id)}`} className="text-sm underline">
            Back to agent
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <Card className="p-3 md:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold">/{cwd || ""}</div>
                <div className="text-xs text-muted-foreground">~/clawd/agents/{id}</div>
              </div>
              <Button variant="outline" onClick={() => list(cwd)}>
                Refresh
              </Button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" />
              <Button variant="outline" onClick={() => list(parent(cwd))} disabled={!cwd}>
                Up
              </Button>
            </div>

            <div className="mt-3 space-y-1">
              {shown.map((it) => (
                <button
                  key={it.name}
                  type="button"
                  className="w-full rounded-xl border px-3 py-2 text-left hover:bg-muted"
                  onClick={() => {
                    if (it.kind === "dir") list(join(cwd, it.name));
                    else openFile(join(cwd, it.name));
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{it.name}</div>
                    <Badge variant="secondary">{it.kind}</Badge>
                  </div>
                  {it.kind === "file" ? <div className="mt-1 text-xs text-muted-foreground">{it.size ?? ""} bytes</div> : null}
                </button>
              ))}
              {!shown.length ? <div className="text-sm text-muted-foreground">No files.</div> : null}
            </div>
          </Card>

          <Card className="p-3 md:col-span-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Editor</div>
                <div className="text-xs text-muted-foreground">{selected || "Select a file"}</div>
              </div>
              <Button onClick={save} disabled={!selected}>
                Save
              </Button>
            </div>

            <Textarea value={text} onChange={(e) => setText(e.target.value)} className="mt-3 font-mono text-xs" rows={28} />
          </Card>
        </div>

        <div className="text-xs text-muted-foreground">
          Next: gateway-host file editing via `agents.files.*` so Mission Control can manage remote gateways too.
        </div>
      </div>
    </AppShell>
  );
}
