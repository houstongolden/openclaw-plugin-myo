import path from "node:path";

export type MyoJobLike = {
  id?: string;
  name?: string;
  description?: string;
  cron_expression?: string;
  timezone?: string;
  enabled?: boolean;
  // Optional OpenClaw-ish payload hints.
  payload_kind?: "systemEvent" | "agentTurn";
  payload_text?: string;
  agent_id?: string;
  session_target?: "main" | "isolated";
  wake_mode?: "now" | "next-heartbeat";
};

export function myoJobToCronName(job: MyoJobLike) {
  const id = (job.id || "").trim();
  if (id) return `myo:${id}`;
  const base = (job.name || job.description || job.cron_expression || "job").trim() || "job";
  return `myo:${base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48)}`;
}

export function myoJobToJobFileStem(job: MyoJobLike) {
  return myoJobToCronName(job).replace(/^myo:/, "");
}

export function renderJobMd(job: MyoJobLike) {
  const cron = job.cron_expression || "";
  const tz = job.timezone || "";
  const enabled = job.enabled !== false;
  const payloadKind = job.payload_kind || "systemEvent";
  const payloadText = job.payload_text || "(no payload_text provided by API)";

  return [
    `# JOB: ${job.name || job.id || "(unnamed)"}`,
    "",
    `- id: ${job.id || "(none)"}`,
    `- enabled: ${enabled ? "true" : "false"}`,
    `- cron: ${cron || "(none)"}`,
    `- timezone: ${tz || "(none)"}`,
    `- kind: ${payloadKind}`,
    job.agent_id ? `- agent_id: ${job.agent_id}` : null,
    job.session_target ? `- session_target: ${job.session_target}` : null,
    job.wake_mode ? `- wake_mode: ${job.wake_mode}` : null,
    "",
    "## Payload",
    "",
    payloadText,
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function getJobsDir(rootDir: string) {
  return path.join(rootDir, "jobs");
}
