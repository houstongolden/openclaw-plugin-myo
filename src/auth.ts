import os from "node:os";
import path from "node:path";
import { fileExists, readTextFile } from "./fs.js";

export type DiscoveredKey = {
  apiKey: string;
  source: string;
};

function expandHome(p: string) {
  if (!p) return p;
  return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;
}

async function tryReadApiKeyFromJsonFile(filePath: string): Promise<DiscoveredKey | null> {
  const p = expandHome(filePath);
  if (!(await fileExists(p))) return null;
  const text = await readTextFile(p).catch(() => "");
  if (!text.trim()) return null;
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }

  const candidates = [
    json?.apiKey,
    json?.api_key,
    json?.MYO_API_KEY,
    json?.myo_api_key,
    json?.token, // fallback if they store a bearer token as token
  ].filter(Boolean);

  const apiKey = typeof candidates[0] === "string" ? (candidates[0] as string) : null;
  if (!apiKey) return null;
  return { apiKey, source: p };
}

async function tryReadApiKeyFromTextFile(filePath: string): Promise<DiscoveredKey | null> {
  const p = expandHome(filePath);
  if (!(await fileExists(p))) return null;
  const text = await readTextFile(p).catch(() => "").then((t) => t.trim());
  if (!text) return null;
  return { apiKey: text, source: p };
}

/**
 * Best-effort discovery of an API key from a "local myo session".
 *
 * There is no guaranteed standard location yet. We try a few common paths
 * and formats so `openclaw myo import-key` can work when running alongside
 * other Myo tooling.
 */
export async function discoverLocalMyoApiKey(opts?: { extraPaths?: string[] }): Promise<DiscoveredKey | null> {
  const envKey = process.env.MYO_API_KEY || process.env.MYO_APIKEY;
  if (envKey) return { apiKey: String(envKey), source: "env:MYO_API_KEY" };

  const pathsToTry = [
    ...(opts?.extraPaths || []),
    "~/.config/myo/session.json",
    "~/.config/myo/config.json",
    "~/.myo/session.json",
    "~/.myo/api-key",
    "~/Library/Application Support/myo/session.json",
  ];

  for (const p of pathsToTry) {
    const fromJson = await tryReadApiKeyFromJsonFile(p);
    if (fromJson) return fromJson;
    const fromText = await tryReadApiKeyFromTextFile(p);
    if (fromText) return fromText;
  }

  return null;
}
