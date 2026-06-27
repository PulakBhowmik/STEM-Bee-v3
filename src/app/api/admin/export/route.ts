import { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { fail, routeError } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";

function csvEscape(value: unknown) {
  const text = String(value ?? "");

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const contestId = request.nextUrl.searchParams.get("contestId");

    if (!contestId) {
      return fail("contestId is required.");
    }

    const supabase = getSupabaseAdmin();
    const [contestResult, teamsResult, questionsResult, submissionsResult, scoresResult] = await Promise.all([
      supabase.from("contests").select("title").eq("id", contestId).single(),
      supabase.from("teams").select("id,team_code,display_name").eq("contest_id", contestId),
      supabase.from("questions").select("id,serial").eq("contest_id", contestId).order("serial", { ascending: true }),
      supabase
        .from("submissions")
        .select("team_id,question_id,submitted_answer,is_correct,points_awarded,submitted_at")
        .eq("contest_id", contestId),
      supabase.from("team_scores").select("team_id,score,correct_count,submitted_count").eq("contest_id", contestId),
    ]);

    for (const result of [contestResult, teamsResult, questionsResult, submissionsResult, scoresResult]) {
      if (result.error) {
        throw result.error;
      }
    }

    const scoreByTeam = new Map((scoresResult.data ?? []).map((score) => [score.team_id, score]));
    const submissionByTeamQuestion = new Map(
      (submissionsResult.data ?? []).map((submission) => [
        `${submission.team_id}:${submission.question_id}`,
        submission,
      ]),
    );
    const header = [
      "team_code",
      "display_name",
      "score",
      "correct_count",
      "submitted_count",
      ...(questionsResult.data ?? []).flatMap((question) => [
        `q${question.serial}_answer`,
        `q${question.serial}_result`,
      ]),
    ];

    const lines = [header.map(csvEscape).join(",")];

    for (const team of teamsResult.data ?? []) {
      const score = scoreByTeam.get(team.id);
      const cells = [
        team.team_code,
        team.display_name,
        score?.score ?? 0,
        score?.correct_count ?? 0,
        score?.submitted_count ?? 0,
      ];

      for (const question of questionsResult.data ?? []) {
        const submission = submissionByTeamQuestion.get(`${team.id}:${question.id}`);
        cells.push(submission?.submitted_answer ?? "", submission ? (submission.is_correct ? "correct" : "incorrect") : "");
      }

      lines.push(cells.map(csvEscape).join(","));
    }

    const title = contestResult.data?.title?.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "contest";

    return new Response(lines.join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${title}-results.csv"`,
      },
    });
  } catch (error) {
    return routeError(error);
  }
}
