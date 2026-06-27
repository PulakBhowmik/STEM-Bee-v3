import type { NextRequest } from "next/server";

import { ADMIN_COOKIE, TEAM_COOKIE, hashToken, verifyAdminToken } from "@/lib/security";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Admin, Contest, Team } from "@/lib/types";

export async function getAdminFromRequest(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const verified = verifyAdminToken(token);

  if (!verified) {
    return null;
  }

  const { data, error } = await getSupabaseAdmin()
    .from("admins")
    .select("id,name,email")
    .eq("id", verified.adminId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Admin;
}

export async function requireAdmin(request: NextRequest) {
  const admin = await getAdminFromRequest(request);

  if (!admin) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return admin;
}

export type TeamSession = {
  id: string;
  contest_id: string;
  team_id: string;
  team: Team;
  contest: Contest;
};

export async function getTeamSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(TEAM_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const sessionHash = hashToken(token);
  const { data, error } = await getSupabaseAdmin()
    .from("team_sessions")
    .select(
      "id,contest_id,team_id,teams(id,contest_id,team_code,display_name),contests(id,title,start_at,end_at,status,created_at)",
    )
    .eq("session_hash", sessionHash)
    .eq("active", true)
    .single();

  if (error || !data) {
    return null;
  }

  await getSupabaseAdmin()
    .from("team_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    id: data.id,
    contest_id: data.contest_id,
    team_id: data.team_id,
    team: Array.isArray(data.teams) ? data.teams[0] : data.teams,
    contest: Array.isArray(data.contests) ? data.contests[0] : data.contests,
  } as TeamSession;
}

export function getTeamSessionHash(request: NextRequest) {
  const token = request.cookies.get(TEAM_COOKIE)?.value;

  return token ? hashToken(token) : null;
}

export async function requireTeamSession(request: NextRequest) {
  const session = await getTeamSessionFromRequest(request);

  if (!session) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return session;
}
