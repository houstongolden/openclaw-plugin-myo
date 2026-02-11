"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

type Scope = "mission-control" | "clawd";

type VaultFile = { path: string; mtimeMs: number; size: number };

type ListRes = {
  ok: boolean;
  scope: Scope;
  root: string;
  files: VaultFile[];
  allowedTopLevel: string[];
};

type ReadRes = {
  ok: boolean;
  scope: Scope;
  root: string;
  file: string;
  abs: string;
  md: string;
  error?: string;
};

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function VaultBrowser() {
  const [scope, setScope] = React.useState<Scope>("clawd");
  const [q, setQ] = React.useState("");
  const dq = useDebounced(q, 150);
  const [loading, setLoading] = React.useState(false);
  const [list, setList] = React.useState<ListRes | null>(null);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [doc, setDoc] = React.useState<ReadRes | null>(null);
  const [docLoading, setDocLoading] = React.useState(false);

  const selectedFile = React.useMemo(() => {
    if (!selected || !list?.files?.length) return null;
    return list.files.find((f) => f.path === selected) || null;
  }, [selected, list]);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch(`/api/vault/list?scope=${encodeURIComponent(scope)}&q=${encodeURIComponent(dq)}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as ListRes;
      setList(json);
      if (!selected && json.files?.length) setSelected(json.files[0].path);
      if (selected && !json.files.some((f) => f.path === selected)) {
        setSelected(json.files[0]?.path || null);
      }
    } catch (e: any) {
      toast.error("Failed to load vault index");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  React.useEffect(() => {
    async function load() {
      if (!selected) {
        setDoc(null);
        return;
      }
      setDocLoading(true);
      try {
        const res = await fetch(`/api/vault/read?scope=${encodeURIComponent(scope)}&file=${encodeURIComponent(selected)}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as ReadRes;
        setDoc(json);
      } catch {
        setDoc({ ok: false, file: selected, abs: "", md: "", error: "Failed to read" } as any);
      } finally {
        setDocLoading(false);
      }
    }
    load();
  }, [selected]);

  async function copy(text: string, label = "Copied") {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  }

  const files = list?.files || [];

  function groupKey(p: string) {
    const parts = p.split("/");
    if (scope === "mission-control") {
      const top = parts[0] || "(root)";
      const second = parts[1];
      if (top === "projects" && second) return `projects/${second}`;
      return top;
    }

    // scope=clawd
    const top = parts[0] || "(root)";
    if (top === "mission-control" && parts[1] === "projects" && parts[2]) {
      return `mission-control/projects/${parts[2]}`;
    }
    return top;
  }

  const grouped = React.useMemo(() => {
    const map = new Map<string, VaultFile[]>();
    for (const f of files) {
      const k = groupKey(f.path);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(f);
    }
    const entries = Array.from(map.entries());
    // sort groups alphabetically but keep projects first-ish
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    for (const [, arr] of entries) {
      // already sorted by API (mtime desc). keep that order.
      // cap per group to avoid huge lists, but not too aggressive.
    }
    return entries;
  }, [files, scope]);

  return (
    <TooltipProvider>
      <div className="grid grid-cols-[320px_1fr] gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border bg-background px-1 py-1">
              <button
                className={
                  "rounded-lg px-2 py-1 text-xs " +
                  (scope === "clawd" ? "bg-primary text-primary-foreground" : "hover:bg-muted")
                }
                onClick={() => setScope("clawd")}
              >
                ~/clawd
              </button>
              <button
                className={
                  "rounded-lg px-2 py-1 text-xs " +
                  (scope === "mission-control" ? "bg-primary text-primary-foreground" : "hover:bg-muted")
                }
                onClick={() => setScope("mission-control")}
              >
                mission-control
              </button>
            </div>

            <Input
              placeholder="Search markdown…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={refresh} disabled={loading}>
                  <RefreshCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </div>

          <div className="text-xs text-muted-foreground">
            Root: <span className="font-mono">{list?.root || "…"}</span>
            {selectedFile?.mtimeMs ? (
              <span className="ml-2">• updated {new Date(selectedFile.mtimeMs).toLocaleString()}</span>
            ) : null}
          </div>

          <Separator />

          <ScrollArea className="h-[70vh] pr-2">
            <div className="space-y-4">
              {files.length === 0 ? (
                <div className="text-sm text-muted-foreground p-2">No markdown files found.</div>
              ) : (
                grouped.map(([group, items]) => (
                  <div key={group}>
                    <div className="mb-2 text-xs font-semibold text-muted-foreground">
                      {group}
                      <span className="ml-2 font-normal">({items.length})</span>
                    </div>
                    <div className="space-y-1">
                      {items.slice(0, 200).map((f) => {
                        const active = f.path === selected;
                        const name = f.path.split("/").slice(-1)[0];
                        return (
                          <button
                            key={f.path}
                            className={
                              "w-full text-left rounded-lg px-2 py-1.5 text-sm " +
                              (active ? "bg-primary text-primary-foreground" : "hover:bg-muted")
                            }
                            onClick={() => setSelected(f.path)}
                            title={f.path}
                          >
                            <div className={"truncate " + (active ? "" : "text-foreground")}>
                              <span className="font-mono">{name}</span>
                            </div>
                            <div className={"mt-0.5 truncate text-[11px] " + (active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                              {f.path}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm text-muted-foreground">Preview</div>
              <div className="font-mono text-sm truncate">{selected || "—"}</div>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selected && copy(selected, "Copied relative path")}
                    disabled={!selected}
                  >
                    <Copy className="h-4 w-4 mr-2" /> Copy path
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copies vault-relative path</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => doc?.abs && copy(doc.abs, "Copied absolute path")}
                    disabled={!doc?.abs}
                  >
                    <Copy className="h-4 w-4 mr-2" /> Copy abs
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copies absolute path on this machine</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="rounded-xl border bg-background p-4 h-[70vh] overflow-auto">
            {docLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : doc?.ok ? (
              <article className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.md}</ReactMarkdown>
              </article>
            ) : (
              <div className="text-sm text-destructive">{doc?.error || "Failed to load"}</div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
