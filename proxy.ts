import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth/server";

// Signed-out visitors go to the one sign-in page. Roles (super admin, institute admin, staff…) and the
// admin sign-in code are checked on the server in each area's layout.
const signedInGate = auth.middleware({ loginUrl: "/login" });

/** Admin pages anyone may open (one-time setup of the first super admin). */
const PUBLIC_ADMIN_PATHS = ["/admin/setup"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // There is no separate admin sign-in any more; keep old links working
  if (pathname === "/admin/login") return NextResponse.redirect(new URL("/login", request.url));
  if (PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();
  return signedInGate(request);
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
