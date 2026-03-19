import { NextRequest, NextResponse } from "next/server";
import { search, recentAgents } from "@/lib/search";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit") ?? 10),
    50,
  );

  if (!q) {
    const recent = await recentAgents(limit);
    return NextResponse.json({ results: recent });
  }

  const results = await search(q, limit);
  return NextResponse.json({ results });
}
