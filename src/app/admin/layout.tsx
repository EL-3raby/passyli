import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
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

  if (profile?.role !== "super_admin") {
    return (
      <div
        className="min-h-[80vh] bg-[#09090b] flex items-center justify-center p-4"
        dir="rtl"
      >
        <div className="max-w-md w-full rounded-3xl bg-[#141418] border border-rose-500/25 p-8 text-center space-y-5">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 mx-auto">
            <ShieldAlert className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="font-display text-xl font-black text-white">
              منطقة محمية — المشرف العام فقط
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
              لا تملك صلاحية الدخول إلى لوحة الإدارة العليا لمنصة باصيلي.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs px-6 transition-all"
          >
            <span>العودة للصفحة الرئيسية</span>
            <ArrowRight className="h-4 w-4 rotate-180" strokeWidth={2} />
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
