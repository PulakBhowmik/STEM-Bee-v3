import { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const contestId = request.nextUrl.searchParams.get("contestId");

    if (!contestId) {
      return fail("contestId is required.");
    }

    const supabase = getSupabaseAdmin();
    const [teamsResult, scoresResult, questionCount] = await Promise.all([
      supabase
        .from("teams")
        .select("id,team_code,display_name")
        .eq("contest_id", contestId)
        .order("team_code", { ascending: true }),
      supabase
        .from("team_scores")
        .select("team_id,score,correct_count,submitted_count,updated_at")
        .eq("contest_id", contestId),
      supabase.from("questions").select("id", { count: "exact", head: true }).eq("contest_id", contestId),
    ]);

    if (teamsResult.error) {
      throw teamsResult.error;
    }

    if (scoresResult.error) {
      throw scoresResult.error;
    }

    const scoreByTeam = new Map((scoresResult.data ?? []).map((score) => [score.team_id, score]));
    const rows = (teamsResult.data ?? [])
      .map((team) => {
        const score = scoreByTeam.get(team.id);

        return {
          team_id: team.id,
          team_code: team.team_code,
          display_name: team.display_name,
          score: score?.score ?? 0,
          correct_count: score?.correct_count ?? 0,
          submitted_count: score?.submitted_count ?? 0,
          total_questions: questionCount.count ?? 0,
          updated_at: score?.updated_at ?? null,
        };
      })
      .sort((a, b) => b.score - a.score || b.correct_count - a.correct_count || a.team_code.localeCompare(b.team_code));

    return ok({ rows, generatedAt: new Date().toISOString() });
  } catch (error) {
    return routeError(error);
  }
}
