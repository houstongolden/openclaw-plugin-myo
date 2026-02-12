export type ActivityEvent = {
  id: string;
  ts: number;
  kind: "cron" | "tool" | "gateway" | "session" | "system";
  title: string;
  summary?: string;
  details?: string;
  level?: "info" | "warn" | "error";
  taskKey?: string | null;
};

function stableId(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `ev_${(h >>> 0).toString(16)}`;
}

export function toEvents(lines: string[]): ActivityEvent[] {
  const out: ActivityEvent[] = [];
  for (const line of lines) {
    const ts = guessTs(line) ?? Date.now();
    const lower = line.toLowerCase();

    const taskKey = extractTaskKey(line);

    // Gateway / transport noise (keep, but classify so UI can hide by default)
    if (lower.includes("gateway/ws") || lower.includes("handshake") || lower.includes("unauthorized conn") || lower.includes("openclaw-control-ui")) {
      const isUnauthorized = lower.includes("unauthorized") || lower.includes("handshake") || lower.includes("auth");
      out.push({
        id: stableId(line),
        ts,
        kind: "gateway",
        title: isUnauthorized ? "Gateway auth" : "Gateway",
        summary: compactGateway(line),
        details: line,
        level: isUnauthorized ? "warn" : "info",
        taskKey,
      });
      continue;
    }

    if (lower.includes("cron:")) {
      const title = extractAfter(line, "Cron:") || "Cron";
      out.push({ id: stableId(line), ts, kind: "cron", title: title.trim(), details: line, taskKey });
      continue;
    }

    if (
      lower.includes("tool") &&
      (lower.includes("exec") || lower.includes("edit") || lower.includes("browser") || lower.includes("read") || lower.includes("write"))
    ) {
      out.push({ id: stableId(line), ts, kind: "tool", title: "Tool", summary: compact(line), details: line, taskKey });
      continue;
    }

    if (lower.includes("sessions") || lower.includes("session")) {
      out.push({ id: stableId(line), ts, kind: "session", title: "Session", summary: compact(line), details: line, taskKey });
      continue;
    }

    if (lower.includes("error") || lower.includes("fatal") || lower.includes("exception")) {
      out.push({ id: stableId(line), ts, kind: "system", title: "Error", summary: compact(line), details: line, level: "error", taskKey });
      continue;
    }

    out.push({ id: stableId(line), ts, kind: "system", title: "Activity", summary: compact(line), details: line, taskKey });
  }

  return out.sort((a, b) => b.ts - a.ts).slice(0, 400);
}

function compactGateway(line: string) {
  // Prefer a short, human summary over raw JSON blobs.
  const lower = line.toLowerCase();
  if (lower.includes("unauthorized")) return "Unauthorized (auth/handshake failed)";
  const m = line.match(/"cause"\s*:\s*"([^"]+)"/);
  if (m?.[1]) return `Cause: ${m[1]}`;
  return compact(line);
}

function compact(line: string) {
  return line.length > 140 ? line.slice(0, 140) + "…" : line;
}

function extractAfter(text: string, needle: string) {
  const idx = text.indexOf(needle);
  if (idx === -1) return null;
  return text.slice(idx + needle.length);
}

function guessTs(line: string): number | null {
  // If line contains ISO-like date, try parse.
  const m = line.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/);
  if (m) {
    const t = Date.parse(m[0]);
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

function extractTaskKey(line: string) {
  // task ids look like (id:local-myo-1)
  const m = line.match(/\(id:([^\)]+)\)/i);
  return m ? m[1] : null;
}
