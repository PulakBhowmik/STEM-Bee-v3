import { NextRequest } from "next/server";
import { z } from "zod";

import { getTeamSessionHash, requireTeamSession } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";

const submitSchema = z.object({
  questionId: z.uuid(),
  answer: z.string().trim().min(1).max(200),
});

export async function POST(request: NextRequest) {
  try {
    await requireTeamSession(request);
    const sessionHash = getTeamSessionHash(request);

    if (!sessionHash) {
      return fail("Unauthorized", 401);
    }

    const body = submitSchema.parse(await request.json());
    const { data, error } = await getSupabaseAdmin().rpc("submit_spelling_answer", {
      p_session_hash: sessionHash,
      p_question_id: body.questionId,
      p_answer: body.answer,
    });

    if (error) {
      return fail(error.message, 400);
    }

    return ok({ submission: data });
  } catch (error) {
    return routeError(error);
  }
}
