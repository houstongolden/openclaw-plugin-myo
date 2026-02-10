import { NextResponse } from "next/server";
import { generateNowMarkdown, writeNowFile } from "@/lib/now";

export async function GET() {
  const { md } = await generateNowMarkdown();
  return NextResponse.json({ md });
}

export async function POST() {
  const { md } = await generateNowMarkdown();
  const path = await writeNowFile(md);
  return NextResponse.json({ ok: true, path, md });
}
