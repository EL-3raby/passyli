import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface PartnerWelcomePayload {
  ownerEmail: string;
  venueName: string;
  welcomeCredit: number;
  commissionPerSlot: number;
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

    if (!user) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as Partial<PartnerWelcomePayload>;
    const ownerEmail = body.ownerEmail?.trim();
    const venueName = body.venueName?.trim();

    if (!ownerEmail || !venueName) {
      return NextResponse.json(
        { success: false, skipped: true, reason: "MISSING_EMAIL_OR_VENUE" },
        { status: 200 }
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

    const welcomeCredit = Number(body.welcomeCredit ?? 150);
    const commissionPerSlot = Number(body.commissionPerSlot ?? 15);
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const dashboardUrl = `${appUrl}/dashboard`;

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
            <p style="margin:8px 0 0;font-size:13px;color:#a1a1aa;">تم اعتماد وتفعيل شراكة ملعبك بنجاح</p>
          </div>

          <div style="padding:24px;">
            <p style="margin:0 0 16px;font-size:14px;color:#e4e4e7;line-height:1.7;">
              أهلاً بشريكنا العزيز، يسعدنا إبلاغك بتفعيل ملعب <strong>${escapeHtml(venueName)}</strong> رسمياً على منصة باصيلي لاستقبال حجوزات اللاعبين.
            </p>

            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;background-color:#0e0e11;border:1px solid #27272a;border-radius:12px;">
              <tr>
                <td style="padding:12px 14px;color:#a1a1aa;border-bottom:1px solid #27272a;">الرصيد الترحيبي المضاف</td>
                <td style="padding:12px 14px;color:#10b981;font-weight:900;text-align:left;border-bottom:1px solid #27272a;">${welcomeCredit} ج.م</td>
              </tr>
              <tr>
                <td style="padding:12px 14px;color:#a1a1aa;">عمولة الحجز المؤكد للساعة</td>
                <td style="padding:12px 14px;color:#ffffff;font-weight:700;text-align:left;">${commissionPerSlot} ج.م</td>
              </tr>
            </table>

            <p style="margin:0 0 20px;font-size:13px;color:#a1a1aa;line-height:1.7;">
              يمكنك الآن تسجيل الدخول بنفس هذا البريد الإلكتروني لمتابعة الحجوزات، مراجعة إيصالات العربون، وإدارة ملاعبك الفرعية مباشرة.
            </p>

            <div style="text-align:center;">
              <a href="${dashboardUrl}" style="display:inline-block;background-color:#10b981;color:#000000;font-weight:900;font-size:13px;text-decoration:none;padding:12px 28px;border-radius:10px;">الدخول إلى لوحة الملعب</a>
            </div>
          </div>

          <div style="padding:16px 24px;background-color:#0e0e11;border-top:1px solid #27272a;text-align:center;font-size:11px;color:#71717a;">
            منصة باصيلي — شريكك الرقمي لإدارة الملاعب الرياضية
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
        to: [ownerEmail],
        subject: `تم تفعيل ملعب ${venueName} على منصة باصيلي`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend partner welcome email error:", errText);
      return NextResponse.json(
        { success: false, error: "RESEND_FAILED" },
        { status: 502 }
      );
    }

    const resendData = (await resendRes.json()) as { id?: string };
    return NextResponse.json({ success: true, emailId: resendData.id });
  } catch (err) {
    console.error("Partner welcome email route error:", err);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
