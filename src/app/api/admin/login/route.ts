import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSupabaseAdmin } from "@/lib/supabase";
import { ADMIN_COOKIE, COOKIE_MAX_AGE, signAdminToken, verifyPassword } from "@/lib/security";
import { fail, routeError } from "@/lib/http";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = loginSchema.parse(await request.json());
    const { data, error } = await getSupabaseAdmin()
      .from("admins")
      .select("id,name,email,password_hash")
      .eq("email", body.email.toLowerCase())
      .single();

    if (error || !data || !(await verifyPassword(body.password, data.password_hash))) {
      return fail("Invalid email or password.", 401);
    }

    const response = NextResponse.json({
      admin: {
        id: data.id,
        name: data.name,
        email: data.email,
      },
    });
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
