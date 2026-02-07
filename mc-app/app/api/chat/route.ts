import { NextResponse } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

function rootDir() {
  return process.env.MYO_MC_ROOT_DIR || path.join(process.env.HOME || "", "clawd", "mission-control");
}

const Body = z.object({
  project: z.string().default(""),
  message: z.string().default(""),
  messages: z.any().optional(),
});

export async function POST(req: Request) {
  const body = Body.parse(await req.json().catch(() => ({})));
  const project = body.project;
  const message = body.message;

  // MVP "chat works": respond via OpenAI using local project context.
  // (Next step: route to OpenClaw sessions/tools; gateway-call doesn't support chat.completions.)
  let projectMd = "";
  let tasksMd = "";
  try {
    projectMd = await readFile(path.join(rootDir(), "projects", project, "PROJECT.md"), "utf-8");
  } catch {}
  try {
    tasksMd = await readFile(path.join(rootDir(), "projects", project, "TASKS.md"), "utf-8");
  } catch {}

  const sys = [
    `You are Mission Control — a local-first operator assistant.`,
    `Be concise and actionable.`,
    `Never claim you ran tools unless the user explicitly did.`,
    `If you suggest edits to TASKS.md/PROJECT.md, provide the exact diff snippet.`,
  ].join("\n");

  const ctx = [
    `Project: ${project}`,
    `PROJECT.md:\n${projectMd || "(missing)"}`,
    `TASKS.md:\n${tasksMd || "(missing)"}`,
  ].join("\n\n");

  const result = await generateText({
    model: openai("gpt-4o-mini"),
    system: sys,
    prompt: `${ctx}\n\nUser: ${message}`,
    maxOutputTokens: 500,
  });

  return NextResponse.json({ ok: true, reply: result.text });
}
