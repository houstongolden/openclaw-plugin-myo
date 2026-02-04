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

function normalizeApiBaseUrl(input: string) {
  const s = String(input || "").replace(/\/$/, "");
  // myo.ai redirects to www.myo.ai (307). Node fetch drops Authorization headers on cross-origin redirects.
  // Normalize so auth headers are preserved.
  return s.replace(/^https?:\/\/myo\.ai$/i, "https://www.myo.ai");
}

export async function fetchMyoclawSessions(params: {
  apiBaseUrl: string;
  apiKey: string;
  limit?: number;
  activeMinutes?: number;
}): Promise<MyoclawSession[]> {
  const sp = new URLSearchParams();
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.activeMinutes) sp.set("activeMinutes", String(params.activeMinutes));

  const base = normalizeApiBaseUrl(params.apiBaseUrl);
  const url = `${base}/api/myoclaw/sessions${sp.toString() ? `?${sp.toString()}` : ""}`;
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
  const base = normalizeApiBaseUrl(params.apiBaseUrl);
  const url = `${base}/api/myoclaw/jobs/update`;
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
  const base = normalizeApiBaseUrl(params.apiBaseUrl);
  const url = `${base}/api/myoclaw/jobs/import`;
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
  const base = normalizeApiBaseUrl(params.apiBaseUrl);
  const url = `${base}/api/myoclaw/sync`;
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

// ============================================================================
// Heartbeat API
// ============================================================================

export type HeartbeatPayload = {
  version?: string;
  sessionCount?: number;
  memoryMB?: number;
  cpuPercent?: number;
  uptimeSeconds?: number;
  channels?: string[];
  capabilities?: string[];
  agent?: string;
};

export type HeartbeatResponse = {
  success: boolean;
  serverTime: number;
  gatewayId: string;
};

export async function sendHeartbeat(params: {
  apiBaseUrl: string;
  apiKey: string;
  payload?: HeartbeatPayload;
}): Promise<HeartbeatResponse> {
  const base = normalizeApiBaseUrl(params.apiBaseUrl);
  const url = `${base}/api/myoclaw/heartbeat`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params.payload || {}),
  });

  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    const msg = json?.error?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return json as HeartbeatResponse;
}

// ============================================================================
// Session Sync API
// ============================================================================

export type SessionSyncPayload = {
  key: string;
  title?: string;
  channel?: string;
  agent?: string;
  status?: string;
  message_count?: number;
  token_count?: number;
  last_message_at?: string;
  messages?: Array<{
    index: number;
    role: string;
    content: string;
    tool_calls?: unknown[];
    tool_result?: unknown;
    input_tokens?: number;
    output_tokens?: number;
    timestamp?: string;
  }>;
  context?: Record<string, unknown>;
  pending_tasks?: string[];
  active_work?: string;
};

export type SessionSyncResponse = {
  success: boolean;
  data: {
    synced: number;
    messagesInserted: number;
  };
};

export async function syncSessions(params: {
  apiBaseUrl: string;
  apiKey: string;
  sessions: SessionSyncPayload[];
}): Promise<SessionSyncResponse> {
  const base = normalizeApiBaseUrl(params.apiBaseUrl);
  const url = `${base}/api/myoclaw/sessions/sync`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sessions: params.sessions }),
  });

  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    const msg = json?.error?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return json as SessionSyncResponse;
}
