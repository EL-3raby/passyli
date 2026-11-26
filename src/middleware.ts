import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Lightweight in-memory sliding-window rate limiter for Edge/Node middleware
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up stale entries every 3 minutes
let lastCleanup = Date.now();
function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup > 180000) {
    lastCleanup = now;
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now > entry.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }
}

function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  cleanupStaleEntries();
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, retryAfterSeconds: 0 };
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, retryAfter) };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count, retryAfterSeconds: 0 };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Path Traversal & Null Byte Injection Defense
  if (
    pathname.includes("..") ||
    pathname.includes("//") ||
    pathname.includes("%00") ||
    pathname.includes("\\")
  ) {
    return new NextResponse("Bad Request — Suspicious Path", { status: 400 });
  }

  // 2. Client IP Resolution (Vercel / Proxy / Fallback)
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  // 3. API Security & Rate Limiting Shield
  if (pathname.startsWith("/api/")) {
    const method = request.method.toUpperCase();

    // Anti-CSRF Origin Validation for Mutating Requests
    if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
      const origin = request.headers.get("origin");
      const host = request.headers.get("host");
      if (origin && host) {
        try {
          const originHost = new URL(origin).host;
          if (originHost !== host && !originHost.endsWith(".vercel.app")) {
            return NextResponse.json(
              { success: false, error: "Cross-Origin Request Blocked" },
              { status: 403 }
            );
          }
        } catch {
          return NextResponse.json(
            { success: false, error: "Invalid Request Origin" },
            { status: 403 }
          );
        }
      }
    }

    // Specific Rate Limits per endpoint
    if (pathname.startsWith("/api/staff/session")) {
      // Anti-Brute-Force for Staff PIN: 10 attempts per minute
      const limit = checkRateLimit(`staff_pin_${clientIp}`, 10, 60000);
      if (!limit.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: "تم تجاوز الحد الأقصى للمحاولات. يرجى الانتظار دقيقة واحدة ثم إعادة المحاولة.",
          },
          {
            status: 429,
            headers: { "Retry-After": String(limit.retryAfterSeconds) },
          }
        );
      }
    } else if (pathname.startsWith("/api/send-booking-email")) {
      // Email Rate Limit: max 5 emails per minute per IP
      const limit = checkRateLimit(`email_send_${clientIp}`, 5, 60000);
      if (!limit.allowed) {
        return NextResponse.json(
          { success: false, error: "Too many email requests" },
          {
            status: 429,
            headers: { "Retry-After": String(limit.retryAfterSeconds) },
          }
        );
      }
    } else {
      // General API Rate Limit: 60 requests per minute
      const limit = checkRateLimit(`general_api_${clientIp}`, 60, 60000);
      if (!limit.allowed) {
        return NextResponse.json(
          { success: false, error: "Too many requests. Please slow down." },
          {
            status: 429,
            headers: { "Retry-After": String(limit.retryAfterSeconds) },
          }
        );
      }
    }
  }

  // 4. Supabase Session Management
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh auth token if expired
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
