import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

function agentSoulPath() {
  return path.join(process.env.HOME || "", "clawd", "agents", "myo", "SOUL.md");
}

function workspaceSoulPath() {
  return path.join(process.env.HOME || "", "clawd", "SOUL.md");
}

function toolsPath() {
  return path.join(process.env.HOME || "", "clawd", "TOOLS.md");
}

export async function GET() {
  const [agentSoul, workspaceSoul, tools] = await Promise.all([
    readFile(agentSoulPath(), "utf-8").catch(() => ""),
    readFile(workspaceSoulPath(), "utf-8").catch(() => ""),
    readFile(toolsPath(), "utf-8").catch(() => ""),
  ]);

  return NextResponse.json({
    ok: true,
    files: {
      agentSoul: { path: agentSoulPath(), text: agentSoul },
      workspaceSoul: { path: workspaceSoulPath(), text: workspaceSoul },
      tools: { path: toolsPath(), text: tools },
    },
  });
}
