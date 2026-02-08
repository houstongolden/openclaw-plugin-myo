import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readPermissions } from "@/lib/connections/store";

const execFileAsync = promisify(execFile);

async function birdReady() {
  try {
    const { stdout } = await execFileAsync("bird", ["check", "--plain"], { timeout: 5000 });
    return String(stdout || "").includes("Ready");
  } catch {
    return false;
  }
}

export async function GET() {
  const env = process.env;

  const [xReady, perms] = await Promise.all([birdReady(), readPermissions()]);

  // NOTE: This is a *product* view, not raw env. We infer best-effort.
  const connectors = [
    {
      id: "gmail",
      name: "Gmail",
      description: "Email threads + messages for Omni Inbox and follow-ups.",
      kind: "gog",
      status: "needs_setup",
      statusDetail: "Connect via gog (OAuth)",
      provides: ["Inbox"],
      tools: ["search_threads", "get_threads", "get_messages"],
    },
    {
      id: "google_calendar",
      name: "Google Calendar",
      description: "Events, scheduling, and time-blocking.",
      kind: "gog",
      status: "needs_setup",
      statusDetail: "Connect via gog (OAuth)",
      provides: ["Inbox", "Ops"],
      tools: ["list_calendars", "search_events", "create_event", "edit_event"],
    },
    {
      id: "notion",
      name: "Notion",
      description: "Mentions/notifications + tasks/pages.",
      kind: "api_key",
      status: env.NOTION_API_KEY ? "connected" : "needs_setup",
      statusDetail: env.NOTION_API_KEY ? "API key present" : "Add NOTION_API_KEY",
      provides: ["Inbox", "Projects"],
      tools: ["search", "read_page", "create_page"],
    },
    {
      id: "x",
      name: "X (Twitter)",
      description: "Trends, threads, DMs/mentions (where supported) for signal + Inbox.",
      kind: "bird",
      status: xReady ? "connected" : "needs_setup",
      statusDetail: xReady ? "bird cookie auth OK" : "Run `bird check` / ensure Chrome cookies",
      provides: ["Inbox", "Content"],
      tools: ["read", "thread", "search", "mentions"],
    },
    {
      id: "github",
      name: "GitHub",
      description: "Issues/PRs/notifications.",
      kind: "plugin",
      status: "connected",
      statusDetail: "gh CLI available",
      provides: ["Inbox", "Ops"],
      tools: ["issues", "prs", "notifications"],
    },
    {
      id: "strava",
      name: "Strava",
      description: "Fitness accountability.",
      kind: "plugin",
      status: "connected",
      statusDetail: "Strava skill configured",
      provides: ["Ops"],
      tools: ["activities", "streak"],
    },
    {
      id: "openai",
      name: "OpenAI",
      description: "Models for chat + summarization.",
      kind: "api_key",
      status: env.OPENAI_API_KEY ? "connected" : "needs_setup",
      statusDetail: env.OPENAI_API_KEY ? "API key present" : "Add OPENAI_API_KEY",
      provides: ["Chat"],
      tools: ["models"],
    },
    {
      id: "anthropic",
      name: "Anthropic",
      description: "Models for agent reasoning and coding.",
      kind: "api_key",
      status: env.ANTHROPIC_API_KEY ? "connected" : "needs_setup",
      statusDetail: env.ANTHROPIC_API_KEY ? "API key present" : "Add ANTHROPIC_API_KEY",
      provides: ["Chat"],
      tools: ["models"],
    },
  ];

  return NextResponse.json({ ok: true, connectors, permissions: perms });
}
