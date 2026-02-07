import { NextResponse } from "next/server";

const SENSITIVE = [
  "KEY",
  "TOKEN",
  "SECRET",
  "PASSWORD",
  "PASS",
  "API",
  "AUTH",
  "COOKIE",
  "PRIVATE",
];

function isSensitive(k: string) {
  const u = k.toUpperCase();
  return SENSITIVE.some((s) => u.includes(s));
}

function mask(v: string) {
  if (!v) return "";
  if (v.length <= 6) return "***";
  return `${v.slice(0, 3)}…${v.slice(-3)}`;
}

export async function GET() {
  const env = process.env;
  const keys = Object.keys(env).sort();

  // Only expose a safe, curated view. Values are masked by default.
  const items = keys.map((k) => {
    const v = String(env[k] ?? "");
    const sensitive = isSensitive(k);
    return {
      key: k,
      sensitive,
      value: sensitive ? mask(v) : v,
      present: Boolean(v),
    };
  });

  return NextResponse.json({ ok: true, items });
}
