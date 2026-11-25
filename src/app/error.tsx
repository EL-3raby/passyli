"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for observability
    console.error("App Root Error Boundary:", error);
  }, [error]);

  return (
    <div
      className="min-h-[70vh] flex items-center justify-center px-4 py-16"
      dir="rtl"
    >
      <div className="max-w-md w-full rounded-3xl bg-[#141418] border border-white/[0.08] p-8 text-center flex flex-col items-center gap-5 shadow-2xl">
        <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400">
          <AlertCircle className="h-7 w-7" strokeWidth={1.5} />
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-xl font-black text-white">
            حدث خطأ غير متوقع
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            نعتذر، واجه النظام مشكلة مؤقتة في تحميل هذه الصفحة. يرجى إعادة المحاولة
            أو العودة للصفحة الرئيسية.
          </p>
          {error.digest && (
            <span className="text-[10px] text-zinc-600 font-mono block tabular-nums">
              رمز الخطأ: {error.digest}
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-black font-black text-xs px-5 transition-all shadow-[0_2px_10px_rgba(16,185,129,0.2)]"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
            <span>إعادة المحاولة</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/[0.08] text-zinc-200 font-bold text-xs px-5 transition-all"
          >
            <Home className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
            <span>الرئيسية</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
