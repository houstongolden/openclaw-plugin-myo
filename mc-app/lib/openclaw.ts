import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type OpenClawCall = {
  method: string;
  params?: any;
};

export async function openclawCall(call: OpenClawCall) {
  const args = ["gateway", "call", call.method, "--json"] as string[];
  if (call.params !== undefined) {
    args.push("--params", JSON.stringify(call.params));
  }

  const { stdout } = await execFileAsync("openclaw", args, {
    maxBuffer: 10 * 1024 * 1024,
  });

  try {
    return JSON.parse(String(stdout || "{}"));
  } catch {
    return { raw: String(stdout || "") };
  }
}
