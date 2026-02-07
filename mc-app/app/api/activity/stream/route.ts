import path from "node:path";
import { readFile, stat } from "node:fs/promises";

function logPath() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return path.join("/tmp/openclaw", `openclaw-${yyyy}-${mm}-${dd}.log`);
}

export async function GET() {
  const encoder = new TextEncoder();
  let lastSize = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send("hello", { ok: true });

      const tick = async () => {
        try {
          const p = logPath();
          const st = await stat(p);
          const size = st.size;
          if (lastSize === 0) {
            lastSize = Math.max(0, size - 32_000);
          }
          if (size > lastSize) {
            const buf = await readFile(p);
            const chunk = buf.subarray(lastSize);
            lastSize = size;
            const text = chunk.toString("utf-8");
            const lines = text.split(/\r?\n/).filter(Boolean).slice(-200);
            if (lines.length) send("lines", { lines, ts: Date.now() });
          }
        } catch {
          // ignore
        }
      };

      const interval = setInterval(tick, 800);
      const keepAlive = setInterval(() => send("ping", { ts: Date.now() }), 10_000);

      // @ts-expect-error
      controller._cleanup = () => {
        clearInterval(interval);
        clearInterval(keepAlive);
      };
    },
    cancel(reason) {
      // @ts-expect-error
      this._cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
