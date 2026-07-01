import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getContestPhase } from "@/lib/contest";
import { fail, routeError } from "@/lib/http";
import { COOKIE_MAX_AGE, TEAM_COOKIE, hashToken, randomToken, verifyPassword } from "@/lib/security";
import { getSupabaseAdmin } from "@/lib/supabase";

const loginSchema = z.object({
  teamCode: z.string().trim().min(2),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = loginSchema.parse(await request.json());
    const supabase = getSupabaseAdmin();
    const { data: candidates, error } = await supabase
      .from("teams")
      .select("id,contest_id,team_code,display_name,password_hash,contests!teams_contest_id_fkey(id,title,start_at,end_at,status,created_at)")
      .eq("team_code", body.teamCode.toUpperCase());

    if (error) {
      throw error;
    }

    // Team codes are only unique within a contest, so the same code (e.g.
    // "TEAM-01") can exist across multiple contest generations over time.
    // Only the team belonging to the one contest that hasn't ended yet is a
    // valid login target; older contests' rows are historical records.
    const match = (candidates ?? [])
      .map((row) => ({ ...row, contest: Array.isArray(row.contests) ? row.contests[0] : row.contests }))
      .find((row) => row.contest && getContestPhase(row.contest) !== "ended");

    if (!match || !(await verifyPassword(body.password, match.password_hash))) {
      return fail("Invalid team code or password.", 401);
    }

    const team = match;
    const contest = match.contest;
    const phase = getContestPhase(contest);

    if (phase === "draft") {
      return fail("This contest is not open yet.", 403);
    }

    const token = randomToken();

    await supabase.from("team_sessions").update({ active: false }).eq("team_id", team.id).eq("active", true);

    const { error: sessionError } = await supabase.from("team_sessions").insert({
      contest_id: team.contest_id,
      team_id: team.id,
      session_hash: hashToken(token),
      active: true,
      user_agent: request.headers.get("user-agent"),
    });

    if (sessionError) {
      throw sessionError;
    }

    const response = NextResponse.json({
      team: {
        id: team.id,
        team_code: team.team_code,
        display_name: team.display_name,
      },
      contest,
      phase,
    });
    response.cookies.set(TEAM_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error) {
    return routeError(error);
  }
}
