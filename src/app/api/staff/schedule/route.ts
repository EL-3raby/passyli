import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { STAFF_COOKIE_NAME, getStaffSessionFromCookies } from "@/lib/staff-session";

export async function GET(request: Request) {
  const session = await getStaffSessionFromCookies();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "UNAUTHORIZED_STAFF_SESSION" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const dateParam =
    searchParams.get("date") || new Date().toISOString().split("T")[0];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_get_schedule", {
    p_venue_id: session.venueId,
    p_secret: session.secret,
    p_date: dateParam,
  });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message || "تعذر تحميل جدول المواعيد" },
      { status: 500 }
    );
  }

  const res = data as unknown as { success: boolean; error?: string };
  if (!res?.success) {
    const unauthorized = res?.error === "UNAUTHORIZED_STAFF_SESSION";
    const resp = NextResponse.json(
      {
        success: false,
        error: unauthorized
          ? "انتهت صلاحية الجلسة أو تم تغيير رمز PIN من الإدارة"
          : res?.error || "تعذر التحميل",
      },
      { status: unauthorized ? 401 : 400 }
    );
    if (unauthorized) {
      resp.cookies.set({
        name: STAFF_COOKIE_NAME,
        value: "",
        httpOnly: true,
        path: "/",
        maxAge: 0,
      });
    }
    return resp;
  }

  return NextResponse.json(res);
}

interface StaffActionBody {
  action: "walkin" | "complete" | "cancel";
  courtId?: string;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  bookerName?: string;
  bookerPhone?: string;
  amountPaid?: number;
  bookingId?: string;
  reason?: string;
}

export async function POST(request: Request) {
  const session = await getStaffSessionFromCookies();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "UNAUTHORIZED_STAFF_SESSION" },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as StaffActionBody;
    const supabase = await createClient();

    if (body.action === "walkin") {
      if (
        !body.courtId ||
        !body.bookingDate ||
        !body.startTime ||
        !body.endTime ||
        !body.bookerPhone
      ) {
        return NextResponse.json(
          { success: false, error: "يرجى استكمال بيانات الحجز الكاش" },
          { status: 400 }
        );
      }

      const { data, error } = await supabase.rpc("staff_create_walkin", {
        p_venue_id: session.venueId,
        p_secret: session.secret,
        p_court_id: body.courtId,
        p_booking_date: body.bookingDate,
        p_start_time: body.startTime,
        p_end_time: body.endTime,
        p_booker_name: body.bookerName || "حجز كاش",
        p_booker_phone: body.bookerPhone,
        p_amount_paid: Number(body.amountPaid ?? 0),
      });

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
      return NextResponse.json(data);
    }

    if (body.action === "complete") {
      if (!body.bookingId) {
        return NextResponse.json(
          { success: false, error: "معرف الحجز مفقود" },
          { status: 400 }
        );
      }

      const { data, error } = await supabase.rpc("staff_complete_attendance", {
        p_venue_id: session.venueId,
        p_secret: session.secret,
        p_booking_id: body.bookingId,
      });

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
      return NextResponse.json(data);
    }

    if (body.action === "cancel") {
      if (!body.bookingId) {
        return NextResponse.json(
          { success: false, error: "معرف الحجز مفقود" },
          { status: 400 }
        );
      }

      const { data, error } = await supabase.rpc("staff_cancel_booking", {
        p_venue_id: session.venueId,
        p_secret: session.secret,
        p_booking_id: body.bookingId,
        p_reason: body.reason || null,
      });

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
      return NextResponse.json(data);
    }

    return NextResponse.json(
      { success: false, error: "إجراء غير مدعوم" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "حدث خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
