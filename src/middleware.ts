import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { ADMIN_COOKIE } from "@/lib/auth-constants";

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export async function middleware(req: NextRequest) {
  const legacyRedirect = process.env.LEGACY_REDIRECT_URL?.trim();
  const { pathname } = req.nextUrl;

  // Old deploy: block registration API; UI shows a modal with the new link.
  if (legacyRedirect && pathname.startsWith("/api/register")) {
    const dest = new URL("/", legacyRedirect.endsWith("/") ? legacyRedirect : `${legacyRedirect}/`);
    return NextResponse.redirect(dest, 307);
  }

  const isAdminPath =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (!isAdminPath) {
    return NextResponse.next();
  }

  const isLoginPage = pathname === "/admin/login";
  const isLoginApi = pathname === "/api/admin/login";

  if (isLoginApi) {
    return NextResponse.next();
  }

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const key = secretKey();
  let valid = false;
  if (token && key) {
    try {
      await jwtVerify(token, key);
      valid = true;
    } catch {
      valid = false;
    }
  }

  if (isLoginPage) {
    if (valid) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.next();
  }

  if (!valid) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|images/).*)",
  ],
};
