export type MyoclawSyncPayload = {
  user: { id: string; full_name?: string | null; timezone?: string | null };
  projects: Array<any>;
  tasks: Array<any>;
  jobs: Array<any>;
  memorySeed?: string | null;
};

export type MyoclawSession = {
  key: string;
  title?: string;
  channel?: string;
  agent?: string;
  status?: string;
  last_message_at?: string;
  updated_at?: string;
};

export async function fetchMyoclawSessions(params: {
  apiBaseUrl: string;
  apiKey: string;
  limit?: number;
  activeMinutes?: number;
}): Promise<MyoclawSession[]> {
  const sp = new URLSearchParams();
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.activeMinutes) sp.set("activeMinutes", String(params.activeMinutes));

  const url = `${params.apiBaseUrl.replace(/\/$/, "")}/api/myoclaw/sessions${sp.toString() ? `?${sp.toString()}` : ""}`;
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
    typeof json?.error === "string" ? json.error : json?.error?.message || `HTTP ${res.status}`;

  if (!res.ok || json?.success === false) throw new Error(errMsg);

  return (json.data || []) as MyoclawSession[];
}

export type JobUpdate = {
  id: string;
  enabled?: boolean;
  cron_expression?: string;
  timezone?: string;
};

export async function updateMyoclawJobs(params: {
  apiBaseUrl: string;
  apiKey: string;
  updates: JobUpdate[];
}): Promise<void> {
  const url = `${params.apiBaseUrl.replace(/\/$/, "")}/api/myoclaw/jobs/update`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ updates: params.updates }),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    const msg = json?.error?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
}

export async function importGatewayCronJobs(params: {
  apiBaseUrl: string;
  apiKey: string;
  jobs: any[];
  gatewayId?: string;
}): Promise<{ upserted: number }> {
  const url = `${params.apiBaseUrl.replace(/\/$/, "")}/api/myoclaw/jobs/import`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ jobs: params.jobs, gatewayId: params.gatewayId }),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    const msg = json?.error?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return { upserted: json?.data?.upserted || 0 };
}

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
