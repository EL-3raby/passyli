"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Calendar } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard Segment Error:", error);
  }, [error]);

  return (
    <div className="rounded-3xl bg-[#141418] border border-rose-500/30 p-8 text-center space-y-4 max-w-lg mx-auto my-8">
      <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 mx-auto">
        <AlertCircle className="h-6 w-6" strokeWidth={1.5} />
      </div>

      <div className="space-y-1.5">
        <h2 className="font-display text-base font-black text-white">
          تعذر تحميل بيانات اللوحة
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          حدث خطأ أثناء الاتصال بالخادم أو معالجة بيانات المنشأة. يرجى إعادة المحاولة.
        </p>
        {error.digest && (
          <span className="text-[10px] text-zinc-600 font-mono block tabular-nums">
            رمز الخطأ: {error.digest}
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
        <button
          type="button"
          onClick={() => reset()}
          className="w-full sm:w-auto inline-flex min-h-[44px] px-5 rounded-xl bg-primary text-black font-black text-xs items-center justify-center gap-2 transition-all hover:bg-primary-hover"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
          <span>إعادة المحاولة</span>
        </button>

        <Link
          href="/dashboard"
          className="w-full sm:w-auto inline-flex min-h-[44px] px-5 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/[0.08] text-zinc-300 font-bold text-xs items-center justify-center gap-2 transition-all"
        >
          <Calendar className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
          <span>الجدول اليومي</span>
        </Link>
      </div>
    </div>
  );
}
