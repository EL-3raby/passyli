import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Official Brand Lockup (Speed P + Passyli + باصيلي) */}
        <Link href="/" className="flex items-center gap-3 group">
          {/* Speed P SVG Symbol */}
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface border border-primary/40 shadow-[0_0_15px_rgba(16,185,129,0.15)] group-hover:border-primary transition-colors">
            <svg width="26" height="26" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M 12 36 L 15 10 L 26 10 C 33 10 36.5 14 35 21 C 33.5 28 28.5 30 22 30 L 17 30"
                stroke="#10b981"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="23" cy="20" r="4.5" fill="#ffffff" />
            </svg>
          </div>

          {/* Bilingual Brand Typography */}
          <div className="flex items-center gap-2">
            <span className="font-latin text-xl font-black tracking-tight text-white leading-none" dir="ltr">
              Passy<span className="text-primary">li</span>
            </span>
            <span className="h-4 w-px bg-white/15" />
            <span className="font-display text-lg font-extrabold text-white leading-none">
              باصـ<span className="text-primary">يلي</span>
            </span>
          </div>
        </Link>

        {/* Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link href="/" className="text-foreground font-semibold hover:text-primary transition-colors">
            الملاعب
          </Link>
          <Link href="#matchmaking" className="hover:text-foreground transition-colors">
            التقسيمات المفتوحة
          </Link>
          <Link href="#bookings" className="hover:text-foreground transition-colors">
            سجل حجوزاتي
          </Link>
          <Link href="#partner" className="hover:text-foreground transition-colors">
            أضف ملعبك
          </Link>
        </nav>

        {/* CTA Button (Strict 44px min touch target) */}
        <div className="flex items-center gap-3">
          <Link
            href="#courts"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-primary px-5 text-sm font-extrabold text-black hover:bg-primary-hover active:scale-[0.98] transition-all"
          >
            احجز الآن
          </Link>
        </div>

      </div>
    </header>
  );
}
