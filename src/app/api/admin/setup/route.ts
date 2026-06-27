import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSupabaseAdmin } from "@/lib/supabase";
import { COOKIE_MAX_AGE, ADMIN_COOKIE, hashPassword, signAdminToken } from "@/lib/security";
import { fail, ok, routeError } from "@/lib/http";

const setupSchema = z.object({
  setupToken: z.string().min(1),
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const setupToken = process.env.ADMIN_SETUP_TOKEN;

    if (!setupToken) {
      return fail("ADMIN_SETUP_TOKEN must be set before creating the first admin.", 500);
    }

    const body = setupSchema.parse(await request.json());

    if (body.setupToken !== setupToken) {
      return fail("Invalid setup token.", 403);
    }

    const supabase = getSupabaseAdmin();
    const { count, error: countError } = await supabase
      .from("admins")
      .select("id", { count: "exact", head: true });

    if (countError) {
      throw countError;
    }

    if ((count ?? 0) > 0) {
      return fail("Admin setup is already complete.", 409);
    }

    const { data, error } = await supabase
      .from("admins")
      .insert({
        name: body.name,
        email: body.email.toLowerCase(),
        password_hash: await hashPassword(body.password),
      })
      .select("id,name,email")
      .single();

    if (error) {
      throw error;
    }

    const response = NextResponse.json({ admin: data });
    response.cookies.set(ADMIN_COOKIE, signAdminToken(data.id), {
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

export async function GET() {
  try {
    const { count, error } = await getSupabaseAdmin()
      .from("admins")
      .select("id", { count: "exact", head: true });

    if (error) {
      throw error;
    }

    return ok({ hasAdmin: (count ?? 0) > 0 });
  } catch (error) {
    return routeError(error);
  }
}
