"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Msg = { role: "user" | "assistant"; content: string };

function parseAtFile(text: string) {
  // naive: detect last "@" token
  const m = text.match(/@([^\s]*)$/);
  return m ? m[1] : null;
}

export function ProjectChat({ project }: { project: string }) {
  const [messages, setMessages] = React.useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Mission Control chat is bootstrapped. Next: wire this to your OpenClaw gateway + project files, and add @file autocomplete.",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [suggest, setSuggest] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

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

  async function onSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setSuggest([]);

    const next = [...messages, { role: "user", content: text } as Msg];
    setMessages(next);
    setLoading(true);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project, message: text, messages: next }),
      });
      const j = await r.json();
      setMessages((prev) => [...prev, { role: "assistant", content: String(j.reply || "(no reply)") }]);
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${e?.message || e}` }]);
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

      <Card className="p-3">
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <div
                className={
                  "inline-block max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed " +
                  (m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")
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
