"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, RefreshCw, Edit3, Save } from "lucide-react";
import { Tree, type TreeNode as TreeNodeComponent } from "@/components/vault/tree";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

type Scope = "mission-control" | "clawd";

type VaultFile = { path: string; mtimeMs: number; size: number };

type TreeNode = TreeNodeComponent;

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
  const [scope, setScope] = React.useState<Scope>("mission-control");
  const [q, setQ] = React.useState("");
  const dq = useDebounced(q, 150);
  const [loading, setLoading] = React.useState(false);
  const [list, setList] = React.useState<ListRes | null>(null);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [doc, setDoc] = React.useState<ReadRes | null>(null);
  const [docLoading, setDocLoading] = React.useState(false);
  const [mode, setMode] = React.useState<"preview" | "edit">("preview");
  const [draft, setDraft] = React.useState<string>("");
  const [saving, setSaving] = React.useState<boolean>(false);
  const [projectFilter, setProjectFilter] = React.useState<string>("");

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
        setDraft(json.md || "");
        setMode("preview");
      } catch {
        setDoc({ ok: false, file: selected, abs: "", md: "", error: "Failed to read" } as any);
        setDraft("");
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

  const projectSlugs = React.useMemo(() => {
    const set = new Set<string>();
    for (const f of files) {
      const parts = f.path.split("/");
      if (scope === "mission-control") {
        if (parts[0] === "projects" && parts[1]) set.add(parts[1]);
      } else {
        if (parts[0] === "mission-control" && parts[1] === "projects" && parts[2]) set.add(parts[2]);
      }
    }
    return Array.from(set).sort();
  }, [files, scope]);

  const filteredFiles = React.useMemo(() => {
    if (!projectFilter) return files;
    if (scope === "mission-control") return files.filter((f) => f.path.startsWith(`projects/${projectFilter}/`));
    return files.filter((f) => f.path.startsWith(`mission-control/projects/${projectFilter}/`));
  }, [files, projectFilter, scope]);

  function buildTree(items: VaultFile[]) {
    const root: TreeNode = { name: "(root)", path: "", files: [], children: new Map() };
    for (const f of items) {
      const parts = f.path.split("/");
      const fileName = parts.pop() || f.path;
      let node = root;
      let curPath = "";
      for (const p of parts) {
        curPath = curPath ? `${curPath}/${p}` : p;
        if (!node.children.has(p)) node.children.set(p, { name: p, path: curPath, files: [], children: new Map() });
        node = node.children.get(p)!;
      }
      node.files.push({ ...f, path: f.path });
      // keep fileName for rendering
      (node.files as any)[(node.files as any).length - 1].__name = fileName;
    }
    return root;
  }

  const tree = React.useMemo(() => buildTree(filteredFiles), [filteredFiles]);

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
            <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={refresh} disabled={loading}>
                  <RefreshCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </div>

          {projectSlugs.length ? (
            <div className="flex flex-wrap gap-2">
              <button
                className={"rounded-full border px-3 py-1 text-xs " + (!projectFilter ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                onClick={() => setProjectFilter("")}
              >
                All
              </button>
              {projectSlugs.slice(0, 20).map((slug) => (
                <button
                  key={slug}
                  className={"rounded-full border px-3 py-1 text-xs " + (projectFilter === slug ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                  onClick={() => setProjectFilter(slug)}
                >
                  {slug}
                </button>
              ))}
            </div>
          ) : null}

          <div className="text-xs text-muted-foreground">
            Root: <span className="font-mono">{list?.root || "…"}</span>
            {selectedFile?.mtimeMs ? (
              <span className="ml-2">• updated {new Date(selectedFile.mtimeMs).toLocaleString()}</span>
            ) : null}
          </div>

          <Separator />

          <ScrollArea className="h-[70vh] pr-2">
            <div className="space-y-3">
              {filteredFiles.length === 0 ? <div className="text-sm text-muted-foreground p-2">No markdown files found.</div> : null}
              <Tree node={tree} selected={selected} onSelect={setSelected} depth={0} />
            </div>
          </ScrollArea>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm text-muted-foreground">{mode === "edit" ? "Editing" : "Preview"}</div>
              <div className="font-mono text-sm truncate">{selected || "—"}</div>
              {selectedFile?.mtimeMs ? (
                <div className="mt-1 text-xs text-muted-foreground">Last edited: {new Date(selectedFile.mtimeMs).toLocaleString()}</div>
              ) : null}
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

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={mode === "edit" ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setMode((m) => (m === "edit" ? "preview" : "edit"))}
                    disabled={!doc?.ok}
                  >
                    <Edit3 className="h-4 w-4 mr-2" /> {mode === "edit" ? "Preview" : "Edit"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit this file</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={async () => {
                      if (!selected) return;
                      setSaving(true);
                      try {
                        const r = await fetch("/api/vault/write", {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ scope, file: selected, md: draft }),
                        }).then((x) => x.json());
                        if (!r.ok) throw new Error(r.error || "Failed");
                        toast.success("Saved");
                        await refresh();
                        setMode("preview");
                      } catch (e: any) {
                        toast.error(e?.message || "Save failed");
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={!doc?.ok || mode !== "edit" || saving}
                  >
                    <Save className={"h-4 w-4 mr-2 " + (saving ? "animate-pulse" : "")} /> Save
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save edits</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="rounded-xl border bg-background p-4 h-[70vh] overflow-auto">
            {docLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : doc?.ok ? (
              mode === "edit" ? (
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="h-full w-full resize-none rounded-xl border bg-background p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              ) : (
                <article className="prose prose-base dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-pre:bg-muted prose-pre:text-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.md}</ReactMarkdown>
                </article>
              )
            ) : (
              <div className="text-sm text-destructive">{doc?.error || "Failed to load"}</div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
