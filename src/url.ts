export function normalizeMyoApiBaseUrl(input: string, fallback = "https://myo.ai") {
  const raw = (input || "").trim();
  const v = raw || fallback;
  // Default to https:// when user provides host only.
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  // Strip trailing slashes.
  return withProto.replace(/\/+$/, "");
}

// Back-compat alias for older internal callers.
export const normalizeBaseUrl = normalizeMyoApiBaseUrl;
