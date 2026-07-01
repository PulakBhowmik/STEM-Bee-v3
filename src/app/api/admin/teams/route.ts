import { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { getContestPhase } from "@/lib/contest";
import { fail, ok, routeError } from "@/lib/http";
import { hashPassword, randomPassword } from "@/lib/security";
import { getSupabaseAdmin } from "@/lib/supabase";

const generateTeamsSchema = z.object({
  contestId: z.uuid(),
  count: z.number().int().min(1).max(20),
  prefix: z.string().trim().min(2).max(12).default("TEAM"),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const contestId = request.nextUrl.searchParams.get("contestId");

    if (!contestId) {
      return fail("contestId is required.");
    }

    const { data, error } = await getSupabaseAdmin()
      .from("teams")
      .select("id,contest_id,team_code,display_name,created_at")
      .eq("contest_id", contestId)
      .order("team_code", { ascending: true });

    if (error) {
      throw error;
    }

    return ok({ teams: data ?? [] });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = generateTeamsSchema.parse(await request.json());
    const supabase = getSupabaseAdmin();
    const { data: contest, error: contestError } = await supabase
      .from("contests")
      .select("id,status,start_at,end_at")
      .eq("id", body.contestId)
      .single();

    if (contestError || !contest) {
      return fail("Contest not found.", 404);
    }

    if (getContestPhase(contest) !== "before") {
      return fail("Teams can only be generated before the contest starts.");
    }

    const credentials = await Promise.all(
      Array.from({ length: body.count }, async (_, index) => {
        const teamNumber = String(index + 1).padStart(2, "0");
        const teamCode = `${body.prefix.toUpperCase()}-${teamNumber}`;
        const password = randomPassword();

        return {
          contest_id: body.contestId,
          team_code: teamCode,
          display_name: `Team ${teamNumber}`,
          password,
          password_hash: await hashPassword(password),
        };
      }),
    );

    const { error: deleteScoresError } = await supabase
      .from("team_scores")
      .delete()
      .eq("contest_id", body.contestId);

    if (deleteScoresError) {
      throw deleteScoresError;
    }

    const { error: deleteSessionsError } = await supabase
      .from("team_sessions")
      .delete()
      .eq("contest_id", body.contestId);

    if (deleteSessionsError) {
      throw deleteSessionsError;
    }

    const { error: deleteTeamsError } = await supabase.from("teams").delete().eq("contest_id", body.contestId);

    if (deleteTeamsError) {
      throw deleteTeamsError;
    }

    const teamsToInsert = credentials.map(({ contest_id, team_code, display_name, password_hash }) => ({
      contest_id,
      team_code,
      display_name,
      password_hash,
    }));

    const { data, error } = await supabase
      .from("teams")
      .insert(teamsToInsert)
      .select("id,contest_id,team_code,display_name");

    if (error) {
      throw error;
    }

    return ok({
      teams: data ?? [],
      credentials: credentials.map(({ team_code, display_name, password }) => ({
        team_code,
        display_name,
        password,
      })),
    });
  } catch (error) {
    return routeError(error);
  }
}
