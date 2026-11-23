import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-background/60 backdrop-blur-xl transition-all">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Pure Arabic Brand Wordmark */}
        <Link href="/" className="flex items-center group py-1">
          <span className="font-display text-2xl sm:text-[26px] font-black tracking-normal text-white leading-none">
            باصـ<span className="text-primary">يلي</span>
          </span>
        </Link>

        {/* Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-1.5 text-sm font-medium">
          <Link
            href="/courts"
            className="px-3.5 py-1.5 rounded-full text-white font-bold bg-white/[0.06] hover:text-primary transition-all"
          >
            الملاعب
          </Link>
          <Link
            href="/#matchmaking"
            className="px-3.5 py-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-all"
          >
            التقسيمات المفتوحة
          </Link>
          <Link
            href="/#partner"
            className="px-3.5 py-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-all"
          >
            أضف ملعبك
          </Link>
          <Link
            href="/#courts"
            className="px-3.5 py-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-all"
          >
            عن المنصة
          </Link>
        </nav>

        {/* CTA Button (Yalla Hagz Pill Shape - 44px min touch target) */}
        <div className="flex items-center gap-3">
          <Link
            href="/courts"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-primary px-5 sm:px-6 text-xs sm:text-sm font-black text-black hover:bg-primary-hover active:scale-[0.98] transition-all shadow-[0_2px_14px_rgba(16,185,129,0.3)]"
          >
            احجز الآن
          </Link>
        </div>

      </div>
    </header>
  );
}
