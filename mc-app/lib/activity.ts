export type ActivityItem = {
  ts: number;
  level: "info" | "warn" | "error";
  source: "gateway" | "cron" | "heartbeat" | "system";
  text: string;
};

export function summarizeLines(lines: string[], maxLines = 3) {
  const cleaned = lines
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(-50)
    .filter((l) => !l.includes("[baseline-browser-mapping]"));
  return cleaned.slice(-maxLines);
}

export function classifyLine(line: string): ActivityItem["source"] {
  const l = line.toLowerCase();
  if (l.includes("cron:")) return "cron";
  if (l.includes("heartbeat")) return "heartbeat";
  if (l.includes("error") || l.includes("warn")) return "gateway";
  return "system";
}
