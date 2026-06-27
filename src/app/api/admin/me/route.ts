import { NextRequest } from "next/server";

import { getAdminFromRequest } from "@/lib/auth";
import { ok, routeError } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);

    return ok({ admin });
  } catch (error) {
    return routeError(error);
  }
}
