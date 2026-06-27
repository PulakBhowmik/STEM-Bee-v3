import { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { statusFromAction } from "@/lib/contest";
import { fail, ok, routeError } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";

const statusSchema = z.object({
  action: z.enum(["draft", "schedule", "start", "end"]),
});

type Context = {
  params: Promise<{ contestId: string }>;
};

export async function PATCH(request: NextRequest, context: Context) {
  try {
    await requireAdmin(request);
    const { contestId } = await context.params;
    const body = statusSchema.parse(await request.json());
    const nextStatus = statusFromAction(body.action);

    const { data: contest, error: contestError } = await getSupabaseAdmin()
      .from("contests")
      .select("id,title,start_at,end_at,status")
      .eq("id", contestId)
      .single();

    if (contestError || !contest) {
      return fail("Contest not found.", 404);
    }

    if (body.action === "schedule") {
      const [questionCount, teamCount] = await Promise.all([
        getSupabaseAdmin().from("questions").select("id", { count: "exact", head: true }).eq("contest_id", contestId),
        getSupabaseAdmin().from("teams").select("id", { count: "exact", head: true }).eq("contest_id", contestId),
      ]);

      if ((questionCount.count ?? 0) === 0 || (teamCount.count ?? 0) === 0) {
        return fail("Upload questions and generate teams before scheduling.");
      }
    }

    const patch =
      body.action === "start"
        ? {
            status: nextStatus,
            start_at: new Date().toISOString(),
          }
        : { status: nextStatus };

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
