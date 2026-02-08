import { NextResponse } from "next/server";
import { ensureOps, opsPath, readJson, writeJson } from "@/lib/ops/store";
import type { OpsPolicies } from "@/lib/ops/types";

export async function GET() {
  await ensureOps();
  const policies = await readJson<OpsPolicies>(opsPath("policies.json"), {} as any);
  return NextResponse.json({ ok: true, policies });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const policies = (body.policies || {}) as OpsPolicies;
  await writeJson(opsPath("policies.json"), policies);
  return NextResponse.json({ ok: true });
}
