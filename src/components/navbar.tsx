import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-background/60 backdrop-blur-xl transition-all">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Official Brand Lockup: The Speed P Icon + Bilingual Wordmark (No dividers/lines) */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group py-1">
          {/* Official Speed P Squircle Icon */}
          <div className="h-9 w-9 rounded-xl bg-[#18181b] border border-primary/30 flex items-center justify-center p-1.5 shadow-[0_0_12px_rgba(16,185,129,0.2)] group-hover:border-primary/60 transition-colors">
            <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
              <path d="M 10 40 L 14.5 8 L 28 8 C 36.5 8 40.5 12.5 39 21 C 37.5 29.5 31.5 32 23.5 32 L 17 32" stroke="#10b981" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="26" cy="20" r="5" fill="#ffffff" />
            </svg>
          </div>

          {/* Bilingual Typography without arbitrary divider lines */}
          <div className="flex items-baseline gap-2">
            <span className="font-latin text-xl sm:text-2xl font-black tracking-tight text-white leading-none" dir="ltr">
              Passy<span className="text-primary">li</span>
            </span>
            <span className="font-display text-lg sm:text-xl font-extrabold text-white leading-none">
              باصـ<span className="text-primary">يلي</span>
            </span>
          </div>
        </Link>

        {/* Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-1.5 text-sm font-medium">
          <Link
            href="/"
            className="px-3.5 py-1.5 rounded-full text-white font-bold bg-white/[0.06] hover:text-primary transition-all"
          >
            الملاعب
          </Link>
          <Link
            href="#matchmaking"
            className="px-3.5 py-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-all"
          >
            التقسيمات المفتوحة
          </Link>
          <Link
            href="#partner"
            className="px-3.5 py-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-all"
          >
            أضف ملعبك
          </Link>
          <Link
            href="#courts"
            className="px-3.5 py-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-all"
          >
            عن المنصة
          </Link>
        </nav>

        {/* CTA Button (Yalla Hagz Pill Shape - 44px min touch target) */}
        <div className="flex items-center gap-3">
          <Link
            href="#courts"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-primary px-5 sm:px-6 text-xs sm:text-sm font-black text-black hover:bg-primary-hover active:scale-[0.98] transition-all shadow-[0_2px_14px_rgba(16,185,129,0.3)]"
          >
            احجز الآن
          </Link>
        </div>

      </div>
    </header>
  );
}
