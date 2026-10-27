import { NextResponse, type NextRequest } from "next/server";
import { bearerToken, verifyToken } from "@/lib/jwt";

// everything under /api needs a valid token except these
const PUBLIC_ROUTES = ["/api/health", "/api/auth/register", "/api/auth/login"];

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": process.env.FRONTEND_ORIGIN || "http://localhost:3000",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "600",
  };
}

export async function middleware(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders() });
  }

  const isPublic = PUBLIC_ROUTES.includes(req.nextUrl.pathname);
  if (!isPublic) {
    const raw = bearerToken(req);
    const token = raw ? await verifyToken(raw) : null;
    if (!token) {
      return NextResponse.json(
        { error: raw ? "Your session has expired, log in again" : "You need to log in" },
        { status: 401, headers: corsHeaders() },
      );
    }
  }

  const res = NextResponse.next();
  for (const [k, v] of Object.entries(corsHeaders())) res.headers.set(k, v);
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
