import { NextResponse } from "next/server";
import { z } from "zod";
import { gatewayCallJson } from "@/lib/openclaw-cli";

const Q = z.object({
  sessionKey: z.string().default(""),
  limit: z.coerce.number().optional().default(40),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = Q.parse({
    sessionKey: searchParams.get("sessionKey") || "",
    limit: searchParams.get("limit") || undefined,
  });

  const sessionKey = q.sessionKey.trim();
  if (!sessionKey) return NextResponse.json({ ok: false, error: "Missing sessionKey" }, { status: 400 });

  const res = await gatewayCallJson<any>("chat.history", { sessionKey, limit: q.limit }, { timeoutMs: 20000 });
  if (!res.ok) return NextResponse.json(res, { status: 502 });
  return NextResponse.json({ ok: true, ...res.json });
}
