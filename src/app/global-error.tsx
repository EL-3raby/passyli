"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Boundary caught:", error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl" className="dark">
      <body className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-4 font-sans antialiased">
        <div className="max-w-md w-full rounded-3xl bg-[#141418] border border-white/[0.08] p-8 text-center flex flex-col items-center gap-5 shadow-2xl">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400">
            <AlertCircle className="h-7 w-7" strokeWidth={1.5} />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-black text-white">
              حدث خطأ في النظام
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              تعذر تحميل التطبيق بالكامل. يرجى إعادة تحميل الصفحة.
            </p>
            {error.digest && (
              <span className="text-[10px] text-zinc-600 font-mono block tabular-nums">
                رمز الخطأ: {error.digest}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#10b981] hover:bg-[#059669] text-black font-black text-xs px-6 transition-all"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
            <span>إعادة تحميل الصفحة</span>
          </button>
        </div>
      </body>
    </html>
  );
}
