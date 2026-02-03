export type MyoclawSyncPayload = {
  user: { id: string; full_name?: string | null; timezone?: string | null };
  projects: Array<any>;
  tasks: Array<any>;
  /** Cron-like schedules (exact timing). */
  jobs: Array<any>;
  /** Heartbeat schedules (approx periodic check-ins). */
  heartbeats?: Array<any>;
  memorySeed?: string | null;
};

import { normalizeMyoApiBaseUrl } from "./url.js";

export async function fetchMyoclawSync(params: {
  apiBaseUrl: string;
  apiKey: string;
}): Promise<MyoclawSyncPayload> {
  const base = normalizeMyoApiBaseUrl(params.apiBaseUrl);
  const url = `${base.replace(/\/$/, "")}/api/myoclaw/sync`;
  const res = await fetch(url, {
    method: "GET",
    redirect: "manual",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get("location");
    throw new Error(
      `Myo API returned a redirect (HTTP ${res.status}) to ${loc || "(no location)"}. ` +
        `This can cause clients to drop Authorization. Use the canonical apiBaseUrl (try https://myo.ai).`,
    );
  }

  const jsonUnknown: unknown = await res.json().catch(() => ({}));
  const json = (jsonUnknown && typeof jsonUnknown === "object" ? (jsonUnknown as any) : {}) as any;

  const errMsg =
    typeof json?.error === "string"
      ? json.error
      : json?.error?.message || `HTTP ${res.status}`;

  if (!res.ok || json?.success === false) {
    throw new Error(errMsg);
  }

  return json.data as MyoclawSyncPayload;
}
