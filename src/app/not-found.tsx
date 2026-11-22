import Link from "next/link";
import { ChevronLeft, ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center flex flex-col items-center gap-6">
        <span className="font-latin text-7xl font-black text-primary/40 tracking-wider tabular-nums">
          404
        </span>

        <div className="flex flex-col gap-2">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            الصفحة غير موجودة
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            عذراً، الرابط الذي تحاول الوصول إليه غير موجود أو تم نقله. يمكنك العودة للصفحة الرئيسية واستكشاف ملاعب دمنهور.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-extrabold text-black hover:bg-primary-hover active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(16,185,129,0.2)]"
        >
          <span>العودة للرئيسية</span>
          <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  );
}
