import { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { getContestPhase } from "@/lib/contest";
import { fail, ok, routeError } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";
import { importQuestionsZip } from "@/lib/zip-import";

export const runtime = "nodejs";
export const maxDuration = 60;

type Context = {
  params: Promise<{ contestId: string }>;
};

export async function POST(request: NextRequest, context: Context) {
  try {
    const admin = await requireAdmin(request);
    const { contestId } = await context.params;
    const { data: contest, error: contestError } = await getSupabaseAdmin()
      .from("contests")
      .select("id,status,start_at,end_at")
      .eq("id", contestId)
      .single();

    if (contestError || !contest) {
      return fail("Contest not found.", 404);
    }

    if (getContestPhase(contest) !== "before") {
      return fail("Questions can only be uploaded before the contest starts.");
    }

    const formData = await request.formData();
    const zipFile = formData.get("zip");

    if (!(zipFile instanceof File)) {
      return fail("Upload a ZIP file using the form field named zip.");
    }

    const result = await importQuestionsZip(contestId, zipFile);

    await getSupabaseAdmin().from("audit_events").insert({
      contest_id: contestId,
      actor_type: "admin",
      actor_id: admin.id,
      event_type: "questions_imported",
      payload: result,
    });

    return ok(result);
  } catch (error) {
    return routeError(error);
  }
}
