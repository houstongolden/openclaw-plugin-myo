import { NextResponse } from "next/server";
import { readPermissions, writePermissions } from "@/lib/connections/store";

export async function GET() {
  const perms = await readPermissions();
  return NextResponse.json({ ok: true, permissions: perms });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const permissions = body.permissions;
  if (!permissions) return NextResponse.json({ ok: false, error: "Missing permissions" }, { status: 400 });
  await writePermissions(permissions);
  return NextResponse.json({ ok: true });
}
