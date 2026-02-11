import { NextResponse } from "next/server";
import { z } from "zod";
import { gatewayCallJson } from "@/lib/openclaw-cli";
import { loadProjectContext, renderContextForOperator } from "@/lib/mission-control-context";

const Body = z.object({
  project: z.string().default(""),
  sessionKey: z.string().default(""),
  message: z.string().default(""),
  includeContext: z.boolean().optional().default(true),
});

function extractTextParts(msg: any): string {
  const c = msg?.content;
  if (typeof c === "string") return c;
  if (!Array.isArray(c)) return "";
  return c
    .map((p) => {
      if (!p) return "";
      if (typeof p?.text === "string") return p.text;
      if (typeof p?.thinking === "string") return "";
      if (typeof p?.content === "string") return p.content;
      return "";
    })
    .filter(Boolean)
    .join("")
    .trim();
}

export async function POST(req: Request) {
  const body = Body.parse(await req.json().catch(() => ({})));
  const project = body.project.trim();
  const sessionKey = body.sessionKey.trim();
  const userMessage = body.message;

  if (!project) return NextResponse.json({ ok: false, error: "Missing project" }, { status: 400 });
  if (!sessionKey) return NextResponse.json({ ok: false, error: "Missing sessionKey (pick a Gateway session)" }, { status: 400 });
  if (!userMessage.trim()) return NextResponse.json({ ok: false, error: "Missing message" }, { status: 400 });

  const ctx = body.includeContext ? await loadProjectContext(project) : null;
  const contextBlock = ctx ? renderContextForOperator(ctx) : "";

  const sentText = ctx
    ? `${contextBlock}\n\n---\n\nUser message:\n${userMessage}`
    : userMessage;

  const historyBefore = await gatewayCallJson<any>("chat.history", { sessionKey, limit: 40 }, { timeoutMs: 20000 });
  if (!historyBefore.ok) {
    return NextResponse.json({
      ok: false,
      error: "Failed to load chat history",
      historyBefore,
    }, { status: 502 });
  }

  const idempotencyKey = `mc:${project}:${Date.now()}`;
  const send = await gatewayCallJson<any>(
    "chat.send",
    { sessionKey, message: sentText, idempotencyKey },
    { timeoutMs: 60000 },
  );

  if (!send.ok) {
    return NextResponse.json({ ok: false, error: "Gateway chat.send failed", send, historyBefore }, { status: 502 });
  }

  // Poll for a new assistant message (truthy: we return before/after and the raw gateway results).
  const beforeCount = Array.isArray(historyBefore.json?.messages) ? historyBefore.json.messages.length : 0;
  const deadline = Date.now() + 60000;
  let historyAfter: any = null;
  let newMessages: any[] = [];

  while (Date.now() < deadline) {
    const h = await gatewayCallJson<any>("chat.history", { sessionKey, limit: 80 }, { timeoutMs: 20000 });
    if (h.ok) {
      historyAfter = h;
      const msgs = Array.isArray(h.json?.messages) ? h.json.messages : [];
      if (msgs.length > beforeCount) {
        newMessages = msgs.slice(Math.max(0, beforeCount));
        const hasAssistant = newMessages.some((m) => m?.role === "assistant" && extractTextParts(m));
        if (hasAssistant) break;
      }
    }
    await new Promise((r) => setTimeout(r, 750));
  }

  return NextResponse.json({
    ok: true,
    project,
    sessionKey,
    includeContext: !!ctx,
    context: ctx,
    sent: {
      method: "chat.send",
      params: { sessionKey, idempotencyKey, message: sentText },
    },
    send,
    historyBefore,
    historyAfter,
    newMessages,
  });
}
