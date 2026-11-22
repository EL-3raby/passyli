import Link from "next/link";
import { ShieldCheck, MessageCircle, ArrowUpRight, Facebook, Instagram, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-[#141418] pt-16 pb-12 text-sm">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-border/30">
          
          {/* Brand & Mission Column */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-3 w-fit group">
              <span className="font-latin text-2xl font-black tracking-tight text-white leading-none" dir="ltr">
                Passy<span className="text-primary">li</span>
              </span>
              <span className="font-display text-xl font-extrabold text-white leading-none">
                باصـ<span className="text-primary">يلي</span>
              </span>
            </Link>

            <p className="text-muted-foreground text-xs leading-relaxed max-w-sm mt-1">
              المنصة الرياضية الأولى لحجز ملاعب كرة القدم الخماسي وملاعب البادل في دمنهور والبحيرة. نظام حجز فوري موثق يمنع التضارب ويضمن جاهزية ملعبك.
            </p>

            <div className="flex items-center gap-2 text-xs text-primary font-bold">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              تغطية حية لكافة ملاعب دمنهور والمراكز المجاورة
            </div>

            {/* Social Media & Email Links (Yalla Hagz Squircle Style) */}
            <div className="flex items-center gap-2.5 pt-1">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="صفحتنا على فيسبوك"
                className="h-10 w-10 rounded-xl bg-[#242427] border border-white/[0.06] hover:bg-[#2e2e33] hover:border-primary/40 flex items-center justify-center text-zinc-300 hover:text-primary transition-all"
              >
                <Facebook className="h-4 w-4" strokeWidth={1.5} />
              </a>

              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="حسابنا على إنستجرام"
                className="h-10 w-10 rounded-xl bg-[#242427] border border-white/[0.06] hover:bg-[#2e2e33] hover:border-primary/40 flex items-center justify-center text-zinc-300 hover:text-primary transition-all"
              >
                <Instagram className="h-4 w-4" strokeWidth={1.5} />
              </a>

              <a
                href="mailto:contact@passyli.com"
                aria-label="راسلنا عبر البريد الإلكتروني"
                className="h-10 w-10 rounded-xl bg-[#242427] border border-white/[0.06] hover:bg-[#2e2e33] hover:border-primary/40 flex items-center justify-center text-zinc-300 hover:text-primary transition-all"
              >
                <Mail className="h-4 w-4" strokeWidth={1.5} />
              </a>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="flex flex-col gap-3">
            <span className="font-display text-sm font-bold text-white mb-1">
              تصفح المنصة
            </span>
            <Link href="#courts" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              ملاعب دمنهور
            </Link>
            <Link href="#padel" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              ملاعب البادل
            </Link>
            <Link href="#football" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              ملاعب كرة القدم الخماسي
            </Link>
            <Link href="#matchmaking" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              التقسيمات المفتوحة (كمّل ماتشك)
            </Link>
          </div>

          {/* Partners & Legal Column */}
          <div className="flex flex-col gap-3">
            <span className="font-display text-sm font-bold text-white mb-1">
              أصحاب الملاعب والسياسات
            </span>
            <Link href="#partner" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              <span>انضم كشريك ملعب</span>
              <ArrowUpRight className="h-3 w-3 text-primary" strokeWidth={1.5} />
            </Link>
            <Link href="#terms" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              شروط وأحكام الحجز
            </Link>
            <Link href="#cancellation" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              سياسة الإلغاء واسترداد العربون
            </Link>
            <Link href="#privacy" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              الخصوصية وسرية البيانات
            </Link>
          </div>

          {/* Direct Support & Payment Column */}
          <div className="flex flex-col gap-3">
            <span className="font-display text-sm font-bold text-white mb-1">
              الدعم ووسائل الدفع
            </span>
            <a
              href="https://wa.me/201000000000"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/[0.08] bg-[#242427] hover:bg-[#28282c] px-4 text-xs font-bold text-white transition-all"
            >
              <MessageCircle className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <span>دعم واتساب الفوري</span>
            </a>

            <div className="rounded-[14px] border border-white/[0.06] bg-[#242427] p-3.5 text-[11px] text-muted-foreground space-y-1.5 mt-1">
              <div className="font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={1.5} />
                <span>دفع مؤمن وموثق</span>
              </div>
              <p className="leading-relaxed">إنستاباي (InstaPay) • فودافون كاش • أورانج كاش • إيصال معتمد</p>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Security Status */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p className="text-center sm:text-right">
            جميع الحقوق محفوظة © {new Date().getFullYear()} منصة باصيلي (Passyli). صُنعت لرياضيي دمنهور.
          </p>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              الخوادم تعمل بكفاءة 100%
            </span>
            <span className="h-3 w-px bg-border" />
            <span>نظام تشفير وحماية المواعيد</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
