export type MyoclawSyncPayload = {
  user: { id: string; full_name?: string | null; timezone?: string | null };
  projects: Array<any>;
  tasks: Array<any>;
  jobs: Array<any>;
  memorySeed?: string | null;
};

export async function fetchMyoclawSync(params: {
  apiBaseUrl: string;
  apiKey: string;
}): Promise<MyoclawSyncPayload> {
  const url = `${params.apiBaseUrl.replace(/\/$/, "")}/api/myoclaw/sync`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
  });

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
