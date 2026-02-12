"use client";

import * as React from "react";
import { ChevronRight, Folder, FileText } from "lucide-react";

type VaultFile = { path: string; mtimeMs: number; size: number; __name?: string };
export type TreeNode = {
  name: string;
  path: string;
  files: VaultFile[];
  children: Map<string, TreeNode>;
};

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function Tree({
  node,
  selected,
  onSelect,
  depth,
}: {
  node: TreeNode;
  selected: string | null;
  onSelect: (p: string) => void;
  depth: number;
}) {
  const entries = Array.from(node.children.values()).sort((a, b) => a.name.localeCompare(b.name));
  const files = node.files
    .slice()
    .sort((a, b) => (b.mtimeMs || 0) - (a.mtimeMs || 0) || (a.__name || "").localeCompare(b.__name || ""));

  const [open, setOpen] = React.useState<boolean>(depth <= 1);

  // Root always open.
  React.useEffect(() => {
    if (depth === 0) setOpen(true);
  }, [depth]);

  return (
    <div className="space-y-1">
      {depth > 0 ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={clsx(
            "flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs font-semibold",
            "text-muted-foreground hover:bg-muted"
          )}
          style={{ paddingLeft: 8 + depth * 10 }}
          title="Click to expand/collapse"
        >
          <ChevronRight className={clsx("h-3.5 w-3.5 transition", open ? "rotate-90" : "rotate-0")} />
          <Folder className="h-3.5 w-3.5" />
          <span className="truncate">{node.name}</span>
        </button>
      ) : null}

      {open ? (
        <>
          {entries.map((child) => (
            <Tree key={child.path} node={child} selected={selected} onSelect={onSelect} depth={depth + 1} />
          ))}

          {files.map((f) => {
            const name = (f.__name || f.path.split("/").slice(-1)[0]) as string;
            const active = selected === f.path;
            return (
              <button
                key={f.path}
                onClick={() => onSelect(f.path)}
                className={clsx(
                  "w-full rounded-lg border px-2 py-1.5 text-left text-sm transition",
                  active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
                style={{ marginLeft: depth ? 8 + (depth + 1) * 10 : 0 }}
                title={f.path}
              >
                <div className="flex items-center gap-2">
                  <FileText className={clsx("h-4 w-4", active ? "opacity-90" : "text-muted-foreground")} />
                  <span className={clsx("truncate font-mono", active ? "" : "text-foreground")}>{name}</span>
                </div>
                <div
                  className={clsx(
                    "mt-0.5 truncate text-[11px]",
                    active ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}
                >
                  {f.path}
                </div>
              </button>
            );
          })}
        </>
      ) : null}
    </div>
  );
}
