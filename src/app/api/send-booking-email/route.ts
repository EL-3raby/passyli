import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SendBookingEmailPayload {
  bookingReference: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json(
        { success: false, skipped: true, reason: "NO_AUTHENTICATED_EMAIL" },
        { status: 200 }
      );
    }

    const body = (await request.json()) as Partial<SendBookingEmailPayload>;
    const bookingRef = body.bookingReference?.trim().toUpperCase();

    if (!bookingRef) {
      return NextResponse.json(
        { success: false, error: "MISSING_BOOKING_REFERENCE" },
        { status: 400 }
      );
    }

    // Verify booking exists and fetch venue/court details from database
    const { data: booking, error } = await supabase
      .from("bookings")
      .select(
        "booking_reference, booker_id, booker_name, booking_date, start_time, total_price, deposit_paid, deposit_required, cash_remaining, status, courts(name, sport, slot_duration_minutes, venues(name, district, address, latitude, longitude))"
      )
      .eq("booking_reference", bookingRef)
      .maybeSingle();

    if (error || !booking) {
      return NextResponse.json(
        { success: false, error: "BOOKING_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Only email the authenticated user who owns the booking (or if booker_id matches)
    if (booking.booker_id && booking.booker_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json(
        {
          success: true,
          skipped: true,
          reason: "RESEND_API_KEY_NOT_CONFIGURED",
        },
        { status: 200 }
      );
    }

    const court = booking.courts as unknown as {
      name: string;
      sport: string;
      slot_duration_minutes: number;
      venues: {
        name: string;
        district: string;
        address: string;
        latitude: number;
        longitude: number;
      } | null;
    } | null;

    const venue = court?.venues;
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const ticketUrl = `${appUrl}/ticket/${encodeURIComponent(booking.booking_reference)}`;
    const mapsUrl = venue
      ? `https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`
      : `${appUrl}/courts`;

    const paidAmount = booking.deposit_paid || booking.deposit_required || 0;
    const statusText =
      booking.status === "confirmed"
        ? "مؤكد وجاهز للعب"
        : "تم استلام الإيصال وجاري المراجعة";

    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head><meta charset="utf-8" /></head>
      <body style="margin:0;padding:24px;background-color:#09090b;color:#f4f4f5;font-family:Arial,sans-serif;direction:rtl;">
        <div style="max-width:560px;margin:0 auto;background-color:#141418;border:1px solid #27272a;border-radius:16px;overflow:hidden;">
          <div style="padding:24px;background-color:#18181c;border-bottom:1px solid #27272a;text-align:center;">
            <div style="font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
              باصي<span style="color:#10b981;">لي</span>
            </div>
            <p style="margin:8px 0 0;font-size:13px;color:#a1a1aa;">تذكرة حجز رسمية — ${escapeHtml(statusText)}</p>
          </div>

          <div style="padding:24px;">
            <p style="margin:0 0 16px;font-size:14px;color:#e4e4e7;">
              أهلاً كابتن <strong>${escapeHtml(booking.booker_name)}</strong>، هذه نسخة من بيانات تذكرتك:
            </p>

            <div style="background-color:#0e0e11;border:1px solid #27272a;border-radius:12px;padding:16px;margin-bottom:16px;">
              <div style="font-size:11px;color:#a1a1aa;margin-bottom:4px;">كود الحجز المرجعي</div>
              <div style="font-size:18px;font-weight:900;color:#10b981;font-family:monospace;" dir="ltr">${escapeHtml(booking.booking_reference)}</div>
            </div>

            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
              <tr>
                <td style="padding:8px 0;color:#a1a1aa;border-bottom:1px solid #27272a;">الملعب</td>
                <td style="padding:8px 0;color:#ffffff;font-weight:700;text-align:left;border-bottom:1px solid #27272a;">${escapeHtml(venue?.name || "ملعب معتمد")} — ${escapeHtml(court?.name || "")}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#a1a1aa;border-bottom:1px solid #27272a;">التاريخ والميعاد</td>
                <td style="padding:8px 0;color:#ffffff;font-weight:700;text-align:left;border-bottom:1px solid #27272a;">${escapeHtml(booking.booking_date)} • ${escapeHtml(booking.start_time.slice(0, 5))}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#a1a1aa;border-bottom:1px solid #27272a;">المدفوع إلكترونياً</td>
                <td style="padding:8px 0;color:#10b981;font-weight:700;text-align:left;border-bottom:1px solid #27272a;">${paidAmount} ج.م</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#a1a1aa;">المتبقي كاش بالملعب</td>
                <td style="padding:8px 0;color:#ffffff;font-weight:900;text-align:left;">${booking.cash_remaining} ج.م</td>
              </tr>
            </table>

            <div style="text-align:center;margin-top:24px;">
              <a href="${ticketUrl}" style="display:inline-block;background-color:#10b981;color:#000000;font-weight:900;font-size:13px;text-decoration:none;padding:12px 24px;border-radius:10px;margin:0 4px 8px;">عرض التذكرة والفاتورة</a>
              <a href="${mapsUrl}" style="display:inline-block;background-color:#27272a;color:#ffffff;font-weight:700;font-size:13px;text-decoration:none;padding:12px 20px;border-radius:10px;margin:0 4px 8px;">موقع الملعب على الخريطة</a>
            </div>
          </div>

          <div style="padding:16px;background-color:#0e0e11;border-top:1px solid #27272a;text-align:center;font-size:11px;color:#71717a;">
            منصة باصيلي (Passyli) — احجز ملعبك، كمّل ماتشك
          </div>
        </div>
      </body>
      </html>
    `;

    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "Passyli <onboarding@resend.dev>";

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [user.email],
        subject: `تذكرة حجز باصيلي #${booking.booking_reference} — ${venue?.name || "ملعبك"}`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("Resend API error:", errBody);
      return NextResponse.json(
        { success: false, error: "EMAIL_DELIVERY_FAILED" },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, sentTo: user.email });
  } catch (err: unknown) {
    console.error("send-booking-email error:", err);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
