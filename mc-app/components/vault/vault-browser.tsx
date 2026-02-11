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

type ListRes = {
  ok: boolean;
  root: string;
  files: string[];
  allowedTopLevel: string[];
};

type ReadRes = {
  ok: boolean;
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
  const [q, setQ] = React.useState("");
  const dq = useDebounced(q, 150);
  const [loading, setLoading] = React.useState(false);
  const [list, setList] = React.useState<ListRes | null>(null);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [doc, setDoc] = React.useState<ReadRes | null>(null);
  const [docLoading, setDocLoading] = React.useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch(`/api/vault/list?q=${encodeURIComponent(dq)}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as ListRes;
      setList(json);
      if (!selected && json.files?.length) setSelected(json.files[0]);
      if (selected && !json.files.includes(selected)) {
        setSelected(json.files[0] || null);
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
        const res = await fetch(`/api/vault/read?file=${encodeURIComponent(selected)}`, {
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

  return (
    <TooltipProvider>
      <div className="grid grid-cols-[320px_1fr] gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
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
          </div>

          <Separator />

          <ScrollArea className="h-[70vh] pr-2">
            <div className="space-y-1">
              {files.length === 0 ? (
                <div className="text-sm text-muted-foreground p-2">No markdown files found.</div>
              ) : (
                files.map((f) => {
                  const active = f === selected;
                  return (
                    <button
                      key={f}
                      className={
                        "w-full text-left rounded-lg px-2 py-1.5 text-sm font-mono " +
                        (active ? "bg-primary text-primary-foreground" : "hover:bg-muted")
                      }
                      onClick={() => setSelected(f)}
                    >
                      {f}
                    </button>
                  );
                })
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
