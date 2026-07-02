import { NextRequest } from "next/server";

import { getTeamSessionFromRequest } from "@/lib/auth";
import { getContestPhase } from "@/lib/contest";
import { getAudioBucket } from "@/lib/env";
import { ok, routeError } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";

// A signed audio URL stays valid for a long window and the underlying file
// never changes during a contest, so regenerating one on every poll (every
// few seconds, for every question, for every team) is wasted work and the
// single largest load source at scale. Cache each question's URL by storage
// path and reuse it until it is close to expiring. The cache lives at module
// scope, so it is shared across every request handled by the same serverless
// instance and reused identically by all teams.
const SIGNED_URL_TTL_SECONDS = 2 * 60 * 60; // 2 hours
const SIGNED_URL_REFRESH_BEFORE_MS = 20 * 60 * 1000; // regenerate when < 20 min left
const signedUrlCache = new Map<string, { url: string; expiresAtMs: number }>();

async function getCachedSignedUrl(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  bucket: string,
  storagePath: string,
) {
  const cached = signedUrlCache.get(storagePath);
  const now = Date.now();

  if (cached && cached.expiresAtMs - now > SIGNED_URL_REFRESH_BEFORE_MS) {
    return cached.url;
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (error) {
    throw error;
  }

  signedUrlCache.set(storagePath, {
    url: data.signedUrl,
    expiresAtMs: now + SIGNED_URL_TTL_SECONDS * 1000,
  });

  return data.signedUrl;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getTeamSessionFromRequest(request);

    if (!session) {
      return ok({ authenticated: false });
    }

    const supabase = getSupabaseAdmin();
    const phase = getContestPhase(session.contest);
    const [questionsResult, submissionsResult, scoreResult] = await Promise.all([
      supabase
        .from("questions")
        .select("id,serial,audio_storage_path,audio_file_name,points,hint")
        .eq("contest_id", session.contest_id)
        .order("serial", { ascending: true }),
      supabase
        .from("submissions")
        .select("question_id,submitted_answer,is_correct,points_awarded,submitted_at")
        .eq("contest_id", session.contest_id)
        .eq("team_id", session.team_id),
      supabase
        .from("team_scores")
        .select("score,correct_count,submitted_count,updated_at")
        .eq("contest_id", session.contest_id)
        .eq("team_id", session.team_id)
        .maybeSingle(),
    ]);

    if (questionsResult.error) {
      throw questionsResult.error;
    }

    if (submissionsResult.error) {
      throw submissionsResult.error;
    }

    if (scoreResult.error) {
      throw scoreResult.error;
    }

    const submissionByQuestion = new Map(
      (submissionsResult.data ?? []).map((submission) => [submission.question_id, submission]),
    );
    const bucket = getAudioBucket();
    const questions = await Promise.all(
      (questionsResult.data ?? []).map(async (question) => {
        const submission = submissionByQuestion.get(question.id);
        const audioUrl =
          phase === "running"
            ? await getCachedSignedUrl(supabase, bucket, question.audio_storage_path)
            : null;

        return {
          id: question.id,
          serial: question.serial,
          points: question.points,
          audioUrl,
          hint: phase === "running" ? question.hint : null,
          submitted: Boolean(submission),
          submittedAnswer: submission?.submitted_answer ?? null,
          result: submission ? (submission.is_correct ? "correct" : "incorrect") : null,
          pointsAwarded: submission?.points_awarded ?? 0,
        };
      }),
    );

    return ok({
      phase,
      team: session.team,
      contest: session.contest,
      score: scoreResult.data ?? {
        score: 0,
        correct_count: 0,
        submitted_count: 0,
        updated_at: null,
      },
      questions,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    return routeError(error);
  }
}
