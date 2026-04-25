import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/portal", "/setup", "/api/auth", "/preview"];

function isTokenValid(token: string): boolean {
  try {
    const [, payloadB64] = token.split(".");
    if (!payloadB64) return false;
    const payload = JSON.parse(atob(payloadB64));
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("iron-viking-token")?.value;

  if (pathname.startsWith("/api/")) {
    if (!token || !isTokenValid(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!token || !isTokenValid(token)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|audio|images).*)"],
};
