import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  STAFF_COOKIE_NAME,
  encodeStaffCookie,
  getStaffSessionFromCookies,
} from "@/lib/staff-session";

export async function GET() {
  const session = await getStaffSessionFromCookies();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
  return NextResponse.json({
    authenticated: true,
    venueId: session.venueId,
    venueName: session.venueName,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { venueId?: string; pin?: string };
    const venueId = body.venueId?.trim();
    const pin = body.pin?.trim();

    if (!venueId || !pin) {
      return NextResponse.json(
        { success: false, error: "يرجى اختيار الملعب وإدخال رمز الدخول" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("staff_verify_pin", {
      p_venue_id: venueId,
      p_pin: pin,
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message || "تعذر التحقق من رمز الدخول" },
        { status: 500 }
      );
    }

    const res = data as unknown as {
      success: boolean;
      venue_id?: string;
      venue_name?: string;
      session_secret?: string;
      error?: string;
    };

    if (!res?.success || !res.venue_id || !res.venue_name || !res.session_secret) {
      return NextResponse.json(
        { success: false, error: res?.error || "رمز PIN غير صحيح" },
        { status: 401 }
      );
    }

    const token = encodeStaffCookie({
      venueId: res.venue_id,
      venueName: res.venue_name,
      secret: res.session_secret,
      exp: Date.now() + 12 * 60 * 60 * 1000, // 12-hour shift session
    });

    const response = NextResponse.json({
      success: true,
      venueId: res.venue_id,
      venueName: res.venue_name,
    });

    response.cookies.set({
      name: STAFF_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 12 * 60 * 60,
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "حدث خطأ غير متوقع أثناء تسجيل الدخول" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: STAFF_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
