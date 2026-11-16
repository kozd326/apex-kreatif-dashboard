import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(req: NextRequest) {
  const token_hash = req.nextUrl.searchParams.get("token_hash");
  const type = req.nextUrl.searchParams.get("type");
  if (
    token_hash &&
    ["recovery", "invite", "magiclink", "email"].includes(type || "")
  ) {
    const db = await createClient();
    const { error } = await db.auth.verifyOtp({
      token_hash,
      type: type as "recovery",
    });
    if (!error)
      return NextResponse.redirect(
        new URL(
          type === "recovery" || type === "invite"
            ? "/auth/reset-password"
            : "/dashboard",
          req.url,
        ),
      );
  }
  return NextResponse.redirect(new URL("/login?error=expired", req.url));
}
