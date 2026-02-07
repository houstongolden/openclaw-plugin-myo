import { NextResponse } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { openclawCall } from "@/lib/openclaw";

function rootDir() {
  return process.env.MYO_MC_ROOT_DIR || path.join(process.env.HOME || "", "clawd", "mission-control");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const project = String(body.project || "");
  const message = String(body.message || "");

  // MVP: load project context (PROJECT.md + TASKS.md), then ask OpenClaw to respond.
  let projectMd = "";
  let tasksMd = "";
  try {
    projectMd = await readFile(path.join(rootDir(), "projects", project, "PROJECT.md"), "utf-8");
  } catch {}
  try {
    tasksMd = await readFile(path.join(rootDir(), "projects", project, "TASKS.md"), "utf-8");
  } catch {}

  const prompt = [
    `You are an operator-grade assistant inside a local Mission Control UI.`,
    `The user is chatting in the context of project: ${project}.`,
    `Rules: do not send external messages without explicit approval.`,
    `If you propose file edits, describe them clearly and ask for confirmation.`,
    ``,
    `PROJECT.md:\n${projectMd || "(missing)"}`,
    ``,
    `TASKS.md:\n${tasksMd || "(missing)"}`,
    ``,
    `User message:\n${message}`,
  ].join("\n");

  // Call OpenClaw in a simple way: ask it to respond in plain text.
  const res = await openclawCall({ method: "chat.completions", params: { prompt } });

  // Fallback: if the method isn't available, return the prompt so we can debug.
  const reply = (res as any)?.text || (res as any)?.result?.text || (res as any)?.response || null;
  return NextResponse.json({ reply: reply || "(stub) Gateway method not wired yet; next step is to route via sessions_send or a dedicated gateway method.", debug: { usedMethod: "chat.completions" } });
}
