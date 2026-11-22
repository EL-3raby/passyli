import Link from "next/link";
import { MapPin, Navigation, Clock, ShieldCheck, ChevronLeft } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col gap-12 pb-24">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-border/40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            
            {/* Status Live Indicator Badge (Zero Emojis) */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary mb-6">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              خدمة حجز الملاعب الفورية في دمنهور والبحيرة
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15] mb-6">
              احجز ملعبك في ثواني، <br />
              <span className="text-primary">وكمّل ماتشك</span> على طول.
            </h1>

            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl leading-relaxed mb-8">
              قارن أسعار وساعات ملاعب كرة القدم الخماسي وملاعب البادل القريبة منك في دمنهور. احجز موعدك بضغطة زر وتأكيد فوري على الواتساب.
            </p>

            {/* Quick Filter Buttons (Strict 44px min touch targets) */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-primary px-6 text-sm font-extrabold text-black hover:bg-primary-hover active:scale-[0.98] transition-all"
              >
                تصفح كل الملاعب
              </button>
              <button
                type="button"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-bold text-foreground hover:bg-secondary active:scale-[0.98] transition-all"
              >
                ملاعب البادل
              </button>
              <button
                type="button"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-bold text-foreground hover:bg-secondary active:scale-[0.98] transition-all"
              >
                كرة قدم خماسي
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Featured Venues Section in Damanhour */}
      <section id="courts" className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
              أقرب الملاعب في دمنهور
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              مرتبة حسب المسافة التقديرية من موقعك الحالي
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg">
            <Navigation className="h-3.5 w-3.5" strokeWidth={1.5} />
            تحديد تلقائي للموقع
          </div>
        </div>

        {/* Court Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Court Card 1 (Padel) */}
          <div className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-primary/50 transition-all flex flex-col justify-between">
            <div>
              {/* Media Container */}
              <div className="relative h-48 w-full bg-surface border-b border-border/40 flex items-center justify-center overflow-hidden">
                <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-md bg-background/80 backdrop-blur-md border border-border px-2.5 py-1 text-xs font-bold text-white">
                  <MapPin className="h-3 w-3 text-primary" strokeWidth={1.5} />
                  يبعد 1.4 كم عنك
                </div>
                <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 rounded-md bg-primary/90 px-2.5 py-1 text-xs font-extrabold text-black">
                  بادل بانوراما
                </div>
                <div className="text-muted-foreground text-xs font-medium">
                  معاينة الملعب
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display text-lg font-bold text-white group-hover:text-primary transition-colors">
                    نادي دمنهور للبادل (Padel Club)
                  </h3>
                </div>

                <p className="text-xs text-muted-foreground mb-4">
                  شارع عبد السلام الشاذلي، دمنهور • زجاج بانوراما وإضاءة احترافية
                </p>

                {/* Slot Status Preview */}
                <div className="rounded-xl border border-border/40 bg-background/50 p-3 mb-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                      المواعيد المتاحة اليوم:
                    </span>
                    <span className="font-bold text-primary flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      4 فترات
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-lg bg-surface border border-primary/30 px-2.5 py-1 text-xs font-bold text-primary tabular-nums">
                      08:00 م
                    </span>
                    <span className="rounded-lg bg-surface border border-primary/30 px-2.5 py-1 text-xs font-bold text-primary tabular-nums">
                      09:30 م
                    </span>
                    <span className="rounded-lg bg-surface border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground line-through tabular-nums">
                      11:00 م
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Footer */}
            <div className="p-5 pt-0 flex items-center justify-between border-t border-border/30 mt-2">
              <div>
                <span className="text-xs text-muted-foreground block">سعر الساعة</span>
                <span className="font-bold text-white text-base tabular-nums">
                  280 <span className="text-xs text-muted-foreground">ج.م</span>
                </span>
              </div>

              <Link
                href="#book"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-extrabold text-black hover:bg-primary-hover active:scale-[0.98] transition-all"
              >
                <span>احجز الآن</span>
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            </div>
          </div>

          {/* Court Card 2 (Football 5-a-side) */}
          <div className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-primary/50 transition-all flex flex-col justify-between">
            <div>
              <div className="relative h-48 w-full bg-surface border-b border-border/40 flex items-center justify-center overflow-hidden">
                <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-md bg-background/80 backdrop-blur-md border border-border px-2.5 py-1 text-xs font-bold text-white">
                  <MapPin className="h-3 w-3 text-primary" strokeWidth={1.5} />
                  يبعد 2.1 كم عنك
                </div>
                <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 rounded-md bg-white/10 backdrop-blur-md border border-white/10 px-2.5 py-1 text-xs font-extrabold text-white">
                  خماسي ترتان
                </div>
                <div className="text-muted-foreground text-xs font-medium">
                  معاينة الملعب
                </div>
              </div>

              <div className="p-5">
                <h3 className="font-display text-lg font-bold text-white group-hover:text-primary transition-colors mb-1">
                  ملعب الأبطال الخماسي
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  طريق شبرا، دمنهور • نجيل صناعي تركي من الجيل الثالث وكشافات LED
                </p>

                <div className="rounded-xl border border-border/40 bg-background/50 p-3 mb-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                      المواعيد المتاحة اليوم:
                    </span>
                    <span className="font-bold text-primary flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      3 ساعات
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-lg bg-surface border border-primary/30 px-2.5 py-1 text-xs font-bold text-primary tabular-nums">
                      07:00 م
                    </span>
                    <span className="rounded-lg bg-surface border border-primary/30 px-2.5 py-1 text-xs font-bold text-primary tabular-nums">
                      08:00 م
                    </span>
                    <span className="rounded-lg bg-surface border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground line-through tabular-nums">
                      09:00 م
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0 flex items-center justify-between border-t border-border/30 mt-2">
              <div>
                <span className="text-xs text-muted-foreground block">سعر الساعة</span>
                <span className="font-bold text-white text-base tabular-nums">
                  200 <span className="text-xs text-muted-foreground">ج.م</span>
                </span>
              </div>

              <Link
                href="#book"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-extrabold text-black hover:bg-primary-hover active:scale-[0.98] transition-all"
              >
                <span>احجز الآن</span>
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            </div>
          </div>

          {/* Feature Highlight Card (Enterprise trust) */}
          <div className="rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/10 via-card to-card p-6 flex flex-col justify-between">
            <div>
              <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center mb-4">
                <ShieldCheck className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-xl font-bold text-white mb-2">
                حجز موثق ومضمون 100%
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                لا تعارض في المواعيد ولا حجز مزدوج. يتم قفل ميعادك لحظياً عند الدفع وإصدار تذكرة رقمية رسمية ترسل لك مباشرة على الواتساب.
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-2.5 text-xs text-foreground font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  تحويل مباشر عبر إنستاباي وفودافون كاش
                </div>
                <div className="flex items-center gap-2.5 text-xs text-foreground font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  إمكانية دفع عربون أو المبلغ كاملاً
                </div>
                <div className="flex items-center gap-2.5 text-xs text-foreground font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  تأجيل الموعد بمرونة قبل الحجز بـ 12 ساعة
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border/40 mt-6">
              <span className="text-xs font-bold text-primary block">
                منصة باصيلي (Passyli) — دمنهور
              </span>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
