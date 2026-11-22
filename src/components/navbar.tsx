import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Pure Typographic Wordmark (No Icon in Header) */}
        <Link href="/" className="flex items-center gap-3 group py-1">
          <span className="font-latin text-2xl sm:text-[26px] font-black tracking-tight text-white leading-none" dir="ltr">
            Passy<span className="text-primary">li</span>
          </span>
          <span className="h-4 w-px bg-white/20" />
          <span className="font-display text-xl sm:text-[22px] font-extrabold text-white leading-none">
            باصـ<span className="text-primary">يلي</span>
          </span>
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
