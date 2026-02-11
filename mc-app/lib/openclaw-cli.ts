import { execFile } from "node:child_process";
import { promisify } from "node:util";

const pExecFile = promisify(execFile);

export type GatewayCallResult<T> = {
  ok: true;
  method: string;
  params: any;
  stdout: string;
  json: T;
} | {
  ok: false;
  method: string;
  params: any;
  stdout: string;
  stderr: string;
  error: string;
};

function openclawBin() {
  return process.env.OPENCLAW_BIN || "openclaw";
}

export async function gatewayCallJson<T>(method: string, params: any, opts?: { timeoutMs?: number })
: Promise<GatewayCallResult<T>> {
  const timeoutMs = Math.max(1000, Number(opts?.timeoutMs ?? 20000));
  const args = [
    "gateway",
    "call",
    method,
    "--json",
    "--timeout",
    String(timeoutMs),
    "--params",
    JSON.stringify(params ?? {}),
  ];

  try {
    const { stdout, stderr } = await pExecFile(openclawBin(), args, {
      timeout: timeoutMs + 1000,
      maxBuffer: 10 * 1024 * 1024,
      env: process.env,
    });

    const s = String(stdout || "").trim();
    const json = s ? (JSON.parse(s) as T) : ({} as T);

    return { ok: true, method, params, stdout: String(stdout || ""), json };
  } catch (err: any) {
    const stdout = String(err?.stdout || "");
    const stderr = String(err?.stderr || "");
    return {
      ok: false,
      method,
      params,
      stdout,
      stderr,
      error: err?.message || String(err),
    };
  }
}
