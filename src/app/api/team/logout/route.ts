import { NextRequest, NextResponse } from "next/server";

import { getTeamSessionHash } from "@/lib/auth";
import { TEAM_COOKIE } from "@/lib/security";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const sessionHash = getTeamSessionHash(request);

  if (sessionHash) {
    await getSupabaseAdmin().from("team_sessions").update({ active: false }).eq("session_hash", sessionHash);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(TEAM_COOKIE, "", { maxAge: 0, path: "/" });

  return response;
}
