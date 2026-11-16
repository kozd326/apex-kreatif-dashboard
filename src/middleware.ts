import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/google-calendar" || pathname === "/privacy/google-calendar")
    return NextResponse.next();
  if (process.env.NODE_ENV === "development" && pathname === "/preview")
    return NextResponse.next();
  if (
    pathname === "/scald" ||
    pathname.startsWith("/scald/") ||
    pathname.startsWith("/demos/")
  ) {
    return NextResponse.next();
  }
  const retired = [
    "leads",
    "agents",
    "assistant",
    "automations",
    "growth",
    "import-csv",
    "lifecycle",
    "outreach",
    "sales-control",
    "sequences",
    "solutions",
    "today-calls",
    "proposals",
    "content",
    "ads",
    "guide",
    "onboarding",
    "reports",
    "sales",
    "team",
    "templates",
    "workspace",
  ];
  if (retired.includes(pathname.split("/")[1]))
    return NextResponse.redirect(new URL("/archive", request.url));
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
