import { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { getContestPhase, statusFromAction } from "@/lib/contest";
import { fail, ok, routeError } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";

const statusSchema = z.object({
  action: z.enum(["start", "end"]),
});

type Context = {
  params: Promise<{ contestId: string }>;
};

export async function PATCH(request: NextRequest, context: Context) {
  try {
    await requireAdmin(request);
    const { contestId } = await context.params;
    const body = statusSchema.parse(await request.json());

    const { data: contest, error: contestError } = await getSupabaseAdmin()
      .from("contests")
      .select("id,title,start_at,end_at,status")
      .eq("id", contestId)
      .single();

    if (contestError || !contest) {
      return fail("Contest not found.", 404);
    }

    const phase = getContestPhase(contest);

    if (body.action === "start") {
      if (phase !== "before") {
        return fail(
          phase === "running"
            ? "Contest has already started."
            : "Contest has ended and cannot be restarted.",
          409,
        );
      }

      const [questionCount, teamCount] = await Promise.all([
        getSupabaseAdmin().from("questions").select("id", { count: "exact", head: true }).eq("contest_id", contestId),
        getSupabaseAdmin().from("teams").select("id", { count: "exact", head: true }).eq("contest_id", contestId),
      ]);

      if ((questionCount.count ?? 0) === 0 || (teamCount.count ?? 0) === 0) {
        return fail("Upload questions and generate teams before starting.");
      }
    }

    if (body.action === "end" && phase === "ended") {
      return fail("Contest is already ended.", 409);
    }

    const patch =
      body.action === "start"
        ? { status: statusFromAction(body.action), start_at: new Date().toISOString() }
        : { status: statusFromAction(body.action) };

    const { data, error } = await getSupabaseAdmin()
      .from("contests")
      .update(patch)
      .eq("id", contestId)
      .select("id,title,start_at,end_at,status,created_at")
      .single();

    if (error) {
      throw error;
    }

    return ok({ contest: data });
  } catch (error) {
    return routeError(error);
  }
}
