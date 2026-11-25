import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, KeyRound, ArrowRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardProvider } from "@/components/dashboard/dashboard-provider";
import DashboardShell from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role;

  if (role !== "venue_owner" && role !== "super_admin") {
    const isStaff = role === "receptionist";

    return (
      <div
        className="min-h-[82vh] bg-[#09090b] flex items-center justify-center p-4"
        dir="rtl"
      >
        <div className="max-w-md w-full rounded-3xl bg-[#141418] border border-white/[0.08] p-8 text-center space-y-5 shadow-2xl">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary mx-auto">
            {isStaff ? (
              <KeyRound className="h-7 w-7" strokeWidth={1.5} />
            ) : (
              <Building2 className="h-7 w-7" strokeWidth={1.5} />
            )}
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-xl font-black text-white">
              {isStaff
                ? "لوحة الملاك فقط — انتقل لبوابة الاستقبال"
                : "منطقة مخصصة لأصحاب الملاعب الشريكة"}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              {isStaff
                ? "تم تصميم هذه اللوحة لملاك المنشآت لإدارة الحسابات والعمولات. للدخول إلى جدول اليوم وقفل المواعيد كاش استخدم بوابة الموظف برمز الـ PIN."
                : "إذا كنت صاحب ملعب أو نادٍ رياضي وتريد استقبال الحجوزات وإدارة مواعيدك عبر باصيلي، يمكنك تقديم طلب شراكة خلال دقيقة واحدة."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <Link
              href={isStaff ? "/staff" : "/partner"}
              className="w-full sm:w-auto inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs px-5 transition-all"
            >
              {isStaff ? (
                <>
                  <KeyRound className="h-4 w-4" strokeWidth={2} />
                  <span>فتح بوابة الموظف (PIN)</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" strokeWidth={2} />
                  <span>سجّل ملعبك كشريك</span>
                </>
              )}
            </Link>

            <Link
              href="/"
              className="w-full sm:w-auto inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-200 font-bold text-xs px-5 transition-all"
            >
              <span>العودة للرئيسية</span>
              <ArrowRight className="h-4 w-4 rotate-180" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
