import { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { fail, ok, routeError } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";

const contestSchema = z.object({
  title: z.string().min(2),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  status: z.enum(["draft", "scheduled"]).default("draft"),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const supabase = getSupabaseAdmin();
    const { data: contests, error } = await supabase
      .from("contests")
      .select("id,title,start_at,end_at,status,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const contestIds = (contests ?? []).map((contest) => contest.id);
    const counts = new Map<string, { questions: number; teams: number }>();

    for (const contestId of contestIds) {
      counts.set(contestId, { questions: 0, teams: 0 });
    }

    await Promise.all(
      contestIds.map(async (contestId) => {
        const [questionCount, teamCount] = await Promise.all([
          supabase.from("questions").select("id", { count: "exact", head: true }).eq("contest_id", contestId),
          supabase.from("teams").select("id", { count: "exact", head: true }).eq("contest_id", contestId),
        ]);

        counts.set(contestId, {
          questions: questionCount.count ?? 0,
          teams: teamCount.count ?? 0,
        });
      }),
    );

    return ok({
      contests: (contests ?? []).map((contest) => ({
        ...contest,
        counts: counts.get(contest.id) ?? { questions: 0, teams: 0 },
      })),
    });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = contestSchema.parse(await request.json());
    const start = new Date(body.startAt);
    const end = new Date(body.endAt);

    if (end <= start) {
      return fail("End time must be after start time.");
    }

    const { data, error } = await getSupabaseAdmin()
      .from("contests")
      .insert({
        title: body.title,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        status: body.status,
        created_by: admin.id,
      })
      .select("id,title,start_at,end_at,status,created_at")
      .single();

    if (error) {
      throw error;
    }

    return ok({ contest: data }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
