"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskActionsPanel } from "@/components/chat/task-actions";

type Msg = { role: "user" | "assistant" | "system"; content: string };

function parseAtFile(text: string) {
  // naive: detect last "@" token
  const m = text.match(/@([^\s]*)$/);
  return m ? m[1] : null;
}

export function ProjectChat({ project }: { project: string }) {
  const [messages, setMessages] = React.useState<Msg[]>([
    {
      role: "system",
      content:
        "Project Chat is in truth-mode: it proxies to your local OpenClaw Gateway session. Pick a session, load history, and send a message.",
    },
  ]);

  const [input, setInput] = React.useState("");
  const [suggest, setSuggest] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  const [sessions, setSessions] = React.useState<any[]>([]);
  const [sessionKey, setSessionKey] = React.useState<string>("");
  const [includeContext, setIncludeContext] = React.useState(true);
  const [historyLoading, setHistoryLoading] = React.useState(false);

  React.useEffect(() => {
    const q = parseAtFile(input);
    let alive = true;
    if (q === null) {
      setSuggest([]);
      return;
    }
    const url = `/api/files/suggest?q=${encodeURIComponent(q)}&max=8`;
    fetch(url)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        setSuggest(Array.isArray(j.items) ? j.items : []);
      })
      .catch(() => {
        if (!alive) return;
        setSuggest([]);
      });
    return () => {
      alive = false;
    };
  }, [input]);

  React.useEffect(() => {
    let alive = true;
    const k = `mc.projectChat.sessionKey.${project}`;
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(k);
      if (saved) setSessionKey(saved);
    } catch {}

    fetch("/api/openclaw/sessions")
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const items = Array.isArray(j.sessions) ? j.sessions : [];
        setSessions(items);
        if (!saved && items[0]?.key) setSessionKey(String(items[0].key));
      })
      .catch(() => {
        if (!alive) return;
        setSessions([]);
      });

    return () => {
      alive = false;
    };
  }, [project]);

  React.useEffect(() => {
    if (!sessionKey) return;
    try {
      window.localStorage.setItem(`mc.projectChat.sessionKey.${project}`, sessionKey);
    } catch {}
  }, [project, sessionKey]);

  function extractTextParts(msg: any): string {
    const c = msg?.content;
    if (typeof c === "string") return c;
    if (!Array.isArray(c)) return "";
    return c
      .map((p: any) => {
        if (!p) return "";
        if (typeof p?.text === "string") return p.text;
        return "";
      })
      .filter(Boolean)
      .join("")
      .trim();
  }

  async function loadHistory(limit = 30) {
    if (!sessionKey) {
      setMessages((prev) => [...prev, { role: "system", content: "Pick a sessionKey first." }]);
      return;
    }
    setHistoryLoading(true);
    try {
      const r = await fetch(`/api/openclaw/chat/history?sessionKey=${encodeURIComponent(sessionKey)}&limit=${limit}`);
      const j = await r.json();
      if (!j?.ok) {
        setMessages((prev) => [...prev, { role: "system", content: `History error: ${j?.error || "(unknown)"}` }]);
        return;
      }
      const items = Array.isArray(j.messages) ? j.messages : [];
      const mapped: Msg[] = items
        .map((m: any) => {
          const role = m?.role === "user" ? "user" : m?.role === "assistant" ? "assistant" : "system";
          const text = extractTextParts(m) || "(non-text message)";
          return { role, content: text };
        })
        .filter((m: Msg) => m.content.trim());

      setMessages([
        {
          role: "system",
          content: `Loaded last ${mapped.length} messages from ${sessionKey}.`,
        },
        ...mapped,
      ]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function onSend() {
    const text = input.trim();
    if (!text) return;

    if (!sessionKey) {
      setMessages((prev) => [...prev, { role: "system", content: "Pick a sessionKey first." }]);
      return;
    }

    setInput("");
    setSuggest([]);

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project, sessionKey, message: text, includeContext }),
      });
      const j = await r.json();

      // Truth mode: show exactly what was sent and what came back.
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content:
            "→ openclaw gateway call chat.send\n" +
            JSON.stringify(j?.sent || {}, null, 2) +
            "\n\n← gateway result\n" +
            JSON.stringify(j?.send || {}, null, 2),
        },
      ]);

      const newMsgs = Array.isArray(j?.newMessages) ? j.newMessages : [];
      for (const m of newMsgs) {
        const role = m?.role === "assistant" ? "assistant" : m?.role === "user" ? "user" : "system";
        const out = extractTextParts(m);
        if (out) setMessages((prev) => [...prev, { role, content: out }]);
      }

      if (!j?.ok) {
        setMessages((prev) => [...prev, { role: "system", content: `Error: ${j?.error || "(unknown)"}` }]);
      }
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "system", content: `Error: ${e?.message || e}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Project</Badge>
        <div className="text-sm font-medium">{project}</div>
      </div>

      <TaskActionsPanel project={project} />

      <Card className="p-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-muted-foreground">Session</label>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={sessionKey}
              onChange={(e) => setSessionKey(e.target.value)}
            >
              <option value="">(select)</option>
              {sessions.map((s) => (
                <option key={String(s.key)} value={String(s.key)}>
                  {String(s.label || s.displayName || s.key)}
                </option>
              ))}
            </select>

            <button
              className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
              onClick={() => loadHistory(30)}
              disabled={historyLoading || !sessionKey}
            >
              {historyLoading ? "Loading…" : "Load history"}
            </button>

            <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={includeContext}
                onChange={(e) => setIncludeContext(e.target.checked)}
              />
              include project context
            </label>
          </div>
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <div
                className={
                  "inline-block max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed " +
                  (m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : m.role === "system"
                      ? "border bg-background text-foreground"
                      : "bg-muted")
                }
              >
                {m.content}
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Chat about ${project}… (type @ to reference files)`}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
            <Button onClick={onSend} disabled={loading}>
              Send
            </Button>
          </div>

          {suggest.length ? (
            <div className="flex flex-wrap gap-2">
              {suggest.map((s) => (
                <button
                  key={s}
                  className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                  onClick={() => {
                    setInput((prev) => prev.replace(/@([^\s]*)$/, `@${s} `));
                    setSuggest([]);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
