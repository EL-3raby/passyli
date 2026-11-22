import Link from "next/link";
import {
  MapPin,
  Navigation,
  Clock,
  ShieldCheck,
  ChevronLeft,
  Users,
  CheckCircle2,
  Calendar,
  Zap,
  Smartphone,
  Check,
  Building2,
  MessageCircle,
  Wallet,
  Bell,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col gap-16 md:gap-24 pb-24">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-border/40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            {/* Live Indicator Status Badge (Zero Emojis) */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary mb-8">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              خدمة حجز الملاعب الفورية الأولى في دمنهور والبحيرة
            </div>

            <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-normal leading-[1.45] sm:leading-[1.4] lg:leading-[1.35] mb-8">
              احجز ملعبك في ثواني،
              <span className="block mt-2 sm:mt-3 text-primary">
                وكمّل ماتشك <span className="text-white">على طول.</span>
              </span>
            </h1>

            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl leading-relaxed mb-10">
              قارن أسعار وساعات ملاعب كرة القدم الخماسي وملاعب البادل القريبة منك في دمنهور. احجز موعدك بضغطة زر، اقفل الميعاد فوراً، واستلم تذكرتك الرسمية على الواتساب.
            </p>

            {/* Quick Action & Filter Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="#courts"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-extrabold text-black hover:bg-primary-hover active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(16,185,129,0.25)]"
              >
                <span>تصفح كل الملاعب</span>
                <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
              </Link>
              <Link
                href="#padel"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-bold text-foreground hover:bg-secondary active:scale-[0.98] transition-all"
              >
                ملاعب البادل
              </Link>
              <Link
                href="#football"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-bold text-foreground hover:bg-secondary active:scale-[0.98] transition-all"
              >
                كرة قدم خماسي
              </Link>
              <Link
                href="#matchmaking"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-5 text-sm font-bold text-primary hover:bg-primary/10 active:scale-[0.98] transition-all"
              >
                <Users className="h-4 w-4" strokeWidth={1.5} />
                <span>كمّل ماتشك</span>
              </Link>
            </div>

            {/* Trust Proof Bar */}
            <div className="mt-12 pt-8 border-t border-border/30 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" strokeWidth={2} />
                <span>ملاعب معتمدة داخل دمنهور</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" strokeWidth={2} />
                <span>قفل ذكي للميعاد </span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" strokeWidth={2} />
                <span>دفع مباشر بإنستاباي وفودافون كاش</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured Venues Section in Damanhour */}
      <section id="courts" className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
              أقرب الملاعب في دمنهور
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              مواعيد حية ومؤكدة مرتبة حسب المسافة التقديرية لموقعك
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-3.5 py-2 rounded-xl w-fit">
            <Navigation className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>نطاق البحث: دمنهور والمراكز المجاورة</span>
          </div>
        </div>

        {/* Court Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Court Card 1 (Padel) */}
          <div id="padel" className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-primary/50 transition-all flex flex-col justify-between">
            <div>
              {/* Media Container */}
              <div className="relative h-48 w-full bg-surface border-b border-border/40 flex items-center justify-center overflow-hidden">
                <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-md bg-background/85 backdrop-blur-md border border-border px-2.5 py-1 text-xs font-bold text-white">
                  <MapPin className="h-3 w-3 text-primary" strokeWidth={1.5} />
                  يبعد 1.4 كم عنك
                </div>
                <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 rounded-md bg-primary/95 px-2.5 py-1 text-xs font-extrabold text-black">
                  بادل بانوراما
                </div>
                <div className="text-muted-foreground text-xs font-medium flex flex-col items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-primary/60" />
                  <span>معاينة حية للملعب</span>
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
                <div className="rounded-xl border border-border/40 bg-background/50 p-3 mb-2">
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

            {/* Card Footer (Balanced Padding & 44px min button) */}
            <div className="px-5 py-4 flex items-center justify-between border-t border-border/40 mt-auto bg-surface/30">
              <div>
                <span className="text-xs text-muted-foreground block mb-1">سعر الساعة</span>
                <span className="font-extrabold text-white text-lg tabular-nums">
                  280 <span className="text-xs font-medium text-muted-foreground">ج.م</span>
                </span>
              </div>

              <Link
                href="#book"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-black hover:bg-primary-hover active:scale-[0.98] transition-all shadow-[0_2px_10px_rgba(16,185,129,0.2)]"
              >
                <span>احجز الآن</span>
                <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
              </Link>
            </div>
          </div>

          {/* Court Card 2 (Football 5-a-side) */}
          <div id="football" className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-primary/50 transition-all flex flex-col justify-between">
            <div>
              <div className="relative h-48 w-full bg-surface border-b border-border/40 flex items-center justify-center overflow-hidden">
                <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-md bg-background/85 backdrop-blur-md border border-border px-2.5 py-1 text-xs font-bold text-white">
                  <MapPin className="h-3 w-3 text-primary" strokeWidth={1.5} />
                  يبعد 2.1 كم عنك
                </div>
                <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 rounded-md bg-white/10 backdrop-blur-md border border-white/10 px-2.5 py-1 text-xs font-extrabold text-white">
                  خماسي ترتان
                </div>
                <div className="text-muted-foreground text-xs font-medium flex flex-col items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-primary/60" />
                  <span>معاينة حية للملعب</span>
                </div>
              </div>

              <div className="p-5">
                <h3 className="font-display text-lg font-bold text-white group-hover:text-primary transition-colors mb-1">
                  ملعب الأبطال الخماسي
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  طريق شبرا، دمنهور • نجيل صناعي تركي من الجيل الثالث وكشافات LED
                </p>

                <div className="rounded-xl border border-border/40 bg-background/50 p-3 mb-2">
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

            <div className="px-5 py-4 flex items-center justify-between border-t border-border/40 mt-auto bg-surface/30">
              <div>
                <span className="text-xs text-muted-foreground block mb-1">سعر الساعة</span>
                <span className="font-extrabold text-white text-lg tabular-nums">
                  200 <span className="text-xs font-medium text-muted-foreground">ج.م</span>
                </span>
              </div>

              <Link
                href="#book"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-black hover:bg-primary-hover active:scale-[0.98] transition-all shadow-[0_2px_10px_rgba(16,185,129,0.2)]"
              >
                <span>احجز الآن</span>
                <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
              </Link>
            </div>
          </div>

          {/* Court Card 3 (Padel Elite) */}
          <div className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-primary/50 transition-all flex flex-col justify-between">
            <div>
              <div className="relative h-48 w-full bg-surface border-b border-border/40 flex items-center justify-center overflow-hidden">
                <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-md bg-background/85 backdrop-blur-md border border-border px-2.5 py-1 text-xs font-bold text-white">
                  <MapPin className="h-3 w-3 text-primary" strokeWidth={1.5} />
                  يبعد 3.2 كم عنك
                </div>
                <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 rounded-md bg-primary/95 px-2.5 py-1 text-xs font-extrabold text-black">
                  بادل مغطى
                </div>
                <div className="text-muted-foreground text-xs font-medium flex flex-col items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-primary/60" />
                  <span>معاينة حية للملعب</span>
                </div>
              </div>

              <div className="p-5">
                <h3 className="font-display text-lg font-bold text-white group-hover:text-primary transition-colors mb-1">
                  أكاديمية النصر للبادل
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  شارع المعهد الديني، دمنهور • أرضية معتمدة دولياً وموقف سيارات خاص
                </p>

                <div className="rounded-xl border border-border/40 bg-background/50 p-3 mb-2">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                      المواعيد المتاحة اليوم:
                    </span>
                    <span className="font-bold text-primary flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      5 فترات
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-lg bg-surface border border-primary/30 px-2.5 py-1 text-xs font-bold text-primary tabular-nums">
                      06:30 م
                    </span>
                    <span className="rounded-lg bg-surface border border-primary/30 px-2.5 py-1 text-xs font-bold text-primary tabular-nums">
                      10:00 م
                    </span>
                    <span className="rounded-lg bg-surface border border-primary/30 px-2.5 py-1 text-xs font-bold text-primary tabular-nums">
                      11:30 م
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 flex items-center justify-between border-t border-border/40 mt-auto bg-surface/30">
              <div>
                <span className="text-xs text-muted-foreground block mb-1">سعر الساعة</span>
                <span className="font-extrabold text-white text-lg tabular-nums">
                  250 <span className="text-xs font-medium text-muted-foreground">ج.م</span>
                </span>
              </div>

              <Link
                href="#book"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-black hover:bg-primary-hover active:scale-[0.98] transition-all shadow-[0_2px_10px_rgba(16,185,129,0.2)]"
              >
                <span>احجز الآن</span>
                <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. How It Works Section (3 Enterprise Steps) */}
      <section className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border/60 bg-surface/40 p-8 sm:p-12 lg:p-16">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-extrabold text-primary tracking-wider uppercase block mb-2">
              تجربة مستخدم بدون تعقيد
            </span>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-white leading-[1.4] sm:leading-[1.35]">
              كيف يعمل باصيلي في 3 خطوات بسيطة؟
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base mt-3">
              وداعاً للاتصالات الطويلة والانتظار لمعرفة الأوقات الفاضية. احجز ماتشك في أقل من دقيقة.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative flex flex-col gap-4 p-6 rounded-2xl border border-border/40 bg-card">
              <div className="flex items-center justify-between">
                <span className="font-latin text-3xl font-black text-primary/80 tabular-nums">
                  01
                </span>
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Calendar className="h-5 w-5" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="font-display text-lg font-bold text-white">
                اختر الملعب والميعاد
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                استعرض ملاعب دمنهور، قارن نوع الأرضية (ترتان، نجيل، بادل بانوراما) والأسعار، واختر الساعة المناسبة لفريقك بدقة متناهية.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative flex flex-col gap-4 p-6 rounded-2xl border border-primary/30 bg-card shadow-[0_4px_20px_rgba(16,185,129,0.06)]">
              <div className="flex items-center justify-between">
                <span className="font-latin text-3xl font-black text-primary tabular-nums">
                  02
                </span>
                <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
                  <Zap className="h-5 w-5" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="font-display text-lg font-bold text-white">
                تأكيد الحجز والدفع السريع
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                حوّل العربون بسهولة عن طريق إنستاباي أو المحفظة الإلكترونية، وارفع الإيصال لتأكيد موعد ماتشك فوراً.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative flex flex-col gap-4 p-6 rounded-2xl border border-border/40 bg-card">
              <div className="flex items-center justify-between">
                <span className="font-latin text-3xl font-black text-primary/80 tabular-nums">
                  03
                </span>
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Smartphone className="h-5 w-5" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="font-display text-lg font-bold text-white">
                تأكيد وتذكرة على الواتساب
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                تصلك رسالة تأكيد فورية وتذكرة رقمية رسمية على رقم هاتفك بالواتساب تحتوي تفاصيل الحجز، كود التأكيد، وموقع الملعب الجغرافي.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Matchmaking Showcase ("كمّل ماتشك") */}
      <section id="matchmaking" className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-3xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-8 sm:p-12">

          {/* Text Content */}
          <div className="lg:col-span-6 flex flex-col gap-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary w-fit">
              <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
              خاصية كمّل ماتشك (Matchmaking)
            </div>

            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-[1.45] sm:leading-[1.4]">
              ناقصك لاعب لماتشك؟
              <span className="block text-primary mt-2">
                أو عايز تنزل تلعب دلوقتي؟
              </span>
            </h2>

            <p className="text-muted-foreground text-sm leading-relaxed">
              مشكلة كل أسبوع: الماتش هيتلغي عشان فيه اتنين اعتذروا في آخر لحظة! مع باصيلي، انشر التقسيمة في ثوانٍ وحدد المركز المطلوب (حارس، دفاع، هجوم) أو انضم لمباريات بادل وخماسي قائمة تبحث عن لاعبين في دمنهور.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="#matchmaking-posts"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-extrabold text-black hover:bg-primary-hover active:scale-[0.98] transition-all"
              >
                <span>استعرض التقسيمات المفتوحة</span>
                <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
              </Link>
              <Link
                href="#create-post"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-surface px-5 text-sm font-bold text-white hover:bg-secondary active:scale-[0.98] transition-all"
              >
                انشر تقسيمة جديدة
              </Link>
            </div>
          </div>

          {/* Interactive Live Match Cards Preview */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            {/* Open Match Card 1 */}
            <div className="p-5 rounded-2xl border border-border/70 bg-background/90 backdrop-blur-md flex flex-col gap-3 hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-bold text-white">ماتش خماسي • مطلوب لاعبين</span>
                </div>
                <span className="text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                  اليوم 09:00 م
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="text-white font-medium">ملعب الأبطال الخماسي — طريق شبرا</span>
                <span className="tabular-nums font-bold text-white">35 ج.م / للاعب</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                <span className="text-muted-foreground">المركز المطلوب: دفاع أو وسط</span>
                <button
                  type="button"
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-surface hover:bg-primary hover:text-black border border-border hover:border-primary px-3 text-xs font-bold text-foreground transition-all"
                >
                  <span>طلب انضمام</span>
                  <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Open Match Card 2 */}
            <div className="p-5 rounded-2xl border border-border/70 bg-background/90 backdrop-blur-md flex flex-col gap-3 hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-bold text-white">مباراة بادل زوجي • مطلوب لاعب رابع</span>
                </div>
                <span className="text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                  غداً 08:30 م
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="text-white font-medium">نادي دمنهور للبادل — عبد السلام الشاذلي</span>
                <span className="tabular-nums font-bold text-white">65 ج.م / للاعب</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                <span className="text-muted-foreground">المستوى: متوسط (Intermediate)</span>
                <button
                  type="button"
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-surface hover:bg-primary hover:text-black border border-border hover:border-primary px-3 text-xs font-bold text-foreground transition-all"
                >
                  <span>طلب انضمام</span>
                  <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 5. Venue Owners & Partners Section (High-Impact Edition) */}
      <section id="partner" className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-card via-[#0b1410] to-card p-8 sm:p-12 lg:p-16 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">

          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center relative z-10">

            {/* Right Column: Copy & Value Proposition */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary w-fit mb-1">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span>شركاء ملاعب باصيلي في دمنهور والبحيرة</span>
              </div>

              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-[1.5] sm:leading-[1.45]">
                ملعبك شغال بأعلى إشغال،
                <span className="block text-primary mt-2 sm:mt-3">
                  وفلوسك في جيبك قبل الماتش.
                </span>
              </h2>

              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                وداعاً للكشاكيل وحجوزات التليفون اللي بتتلغي في آخر لحظة والماتش يضيع عليك. مع باصيلي، حوّل ملعبك لنظام رقمي ذكي: العربون بيوصل حسابك مسبقاً، المواعيد بتتقفل آلياً، وملعبك بيظهر لآلاف اللعيبة في دمنهور على مدار الساعة.
              </p>

              {/* 3 High-Impact Value Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl border border-border/60 bg-surface/60 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs">
                    <Wallet className="h-4 w-4" strokeWidth={1.5} />
                    <span>عربونك مضمون فوري</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    تحويل مباشر عبر إنستاباي أو فودافون كاش قبل فتح كشافات الملعب.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border/60 bg-surface/60 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs">
                    <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
                    <span>انسي لخبطة المواعيد</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    السيستم بيقفل الساعة لحظياً، ومفيش حجزين هيدخلوا في بعض نهائياً.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border/60 bg-surface/60 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs">
                    <Smartphone className="h-4 w-4" strokeWidth={1.5} />
                    <span>إدارة تامة من موبايلك</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    لوحة تحكم خفيفة وسريعة، تفتح وتقفل الساعات وتعدل الأسعار بلمسة واحدة.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="#register-venue"
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-extrabold text-black hover:bg-primary-hover active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(16,185,129,0.25)]"
                >
                  <span>سجل ملعبك كشريك رسمي</span>
                  <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
                </Link>

                <a
                  href="https://wa.me/201000000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-bold text-foreground hover:bg-secondary transition-all"
                >
                  <MessageCircle className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  <span>تحدث مع مسؤول الملاعب بالواتساب</span>
                </a>
              </div>
            </div>

            {/* Left Column: Live Court Manager Mobile Notification Card (The Visual Hook) */}
            <div className="lg:col-span-5 flex flex-col gap-4">

              {/* Simulated Real-Time Booking Alert */}
              <div className="rounded-2xl border border-primary/40 bg-card/95 backdrop-blur-xl p-5 shadow-[0_12px_36px_rgba(0,0,0,0.5)] flex flex-col gap-4">

                {/* Alert Top Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                      <Bell className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block leading-tight">إشعار حجز فوري مؤكد</span>
                      <span className="text-[10px] text-muted-foreground">منذ دقيقتين • تم الاعتماد</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/30 px-2.5 py-0.5 text-[10px] font-extrabold text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    عربون مستلم
                  </span>
                </div>

                {/* Match & Booking Specs */}
                <div className="rounded-xl bg-surface/80 border border-border/40 p-3.5 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">ملعب الأبطال الخماسي</span>
                    <span className="text-xs font-extrabold text-primary tabular-nums">100 ج.م عربون</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-primary" strokeWidth={1.5} />
                      اليوم الجمعة • 09:00 م - 10:00 م
                    </span>
                    <span className="tabular-nums">ساعة كاملة</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-border/30">
                    <span className="text-muted-foreground">كابتن الفريق:</span>
                    <span className="text-white font-medium">أحمد محمود (01099887766)</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">وسيلة التحويل:</span>
                    <span className="text-primary font-bold">إنستاباي (InstaPay) — إيصال موثق</span>
                  </div>
                </div>

                {/* Automation Status Pills */}
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" strokeWidth={1.5} />
                    <span>تم قفل الساعة ومنع أي حجز آخر آلياً</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" strokeWidth={1.5} />
                    <span>تم إرسال تذكرة الحجز الرقمية للاعب على الواتساب</span>
                  </div>
                </div>

                {/* Mini Stats Bar */}
                <div className="pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-surface/50 border border-border/30">
                    <span className="text-[10px] text-muted-foreground block">إشغال اليوم</span>
                    <span className="text-sm font-black text-white tabular-nums">7 ساعات</span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface/50 border border-border/30">
                    <span className="text-[10px] text-muted-foreground block">نسبة الحضور</span>
                    <span className="text-sm font-black text-primary tabular-nums">100%</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. Why Passyli / What Makes Us Special Section */}
      <section className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span>ليه باصيلي مش مجرد موقع حجز؟</span>
          </div>

          <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-[1.45] sm:leading-[1.4]">
            إيه اللي بيميزنا؟
            <span className="block text-primary mt-2">
              عملنالك منصة تريّحك من وجع دماغ حجز الملاعب.
            </span>
          </h3>

          <p className="text-muted-foreground text-xs sm:text-sm mt-3 leading-relaxed">
            مفيش مكالمات طويلة، مفيش كشاكيل، ومفيش ميعاد هيضيع عليك.. كل حاجة بتخلص من موبايلك في ثواني.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-border/60 bg-card/70 hover:border-primary/40 transition-colors flex items-start gap-3.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="font-display text-sm font-bold text-white mb-1">
                ماتشك مضمون بالثانية
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                أول ما تحجز، الساعة بتتقفل باسمك فوراً ومستحيل ميعادك يتلغى أو يروح لحد تاني.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-border/60 bg-card/70 hover:border-primary/40 transition-colors flex items-start gap-3.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Clock className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="font-display text-sm font-bold text-white mb-1">
                تذكرتك بتوصلك على الواتساب
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                بتجيلك رسالة شيك فيها كل تفاصيل الميعاد ولوكيشن الملعب عشان تشيرها مع فرقتك بضغطة واحدة.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-border/60 bg-card/70 hover:border-primary/40 transition-colors flex items-start gap-3.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Zap className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="font-display text-sm font-bold text-white mb-1">
                سريعة وخفيفة على باقتك
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                المنصة بتفتح معاك في ثانية ومبتسحبش من باقة الموبايل، تحجز ماتشك في أقل من دقيقة وانت في الشارع.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-border/60 bg-card/70 hover:border-primary/40 transition-colors flex items-start gap-3.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="font-display text-sm font-bold text-white mb-1">
                فريق دعم في ضهرك
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                مفيش رد آلي ولا لف ودوران، فريق دعم معاك خطوة بخطوة بالواتساب والتليفون لأي استفسار.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Mobile App Coming Soon Banner */}
      <section className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-r from-surface via-card to-surface p-8 sm:p-12">

          {/* Subtle Ambient Glow */}
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-right">

            <div className="max-w-xl flex flex-col items-center lg:items-start gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span>قريباً في التحديثات القادمة • قيد التطوير</span>
              </div>

              <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-[1.35]">
                تطبيق باصيلي على موبايلك..
                <span className="block text-primary mt-1">
                  حجزك أسرع بكتير وإشعارات حية.
                </span>
              </h3>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                شغالين حالياً على إطلاق التطبيق الرسمي على متجري App Store و Google Play، عشان تتابع حجوزاتك وماتشاتك وتطلب لعيبة بلمسة واحدة ومن غير ما تفتح المتصفح.
              </p>
            </div>

            {/* App Store & Google Play Badges */}
            <div className="flex flex-col sm:flex-row items-center gap-4">

              {/* App Store Badge */}
              <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-background/80 px-5 py-3 text-right backdrop-blur-md opacity-90 hover:opacity-100 transition-opacity">
                <svg className="h-7 w-7 text-white fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 1.01-2.87-.96.04-2.13.64-2.79 1.41-.58.68-1.1 1.77-1.03 2.81 1.07.08 2.19-.57 2.81-1.35z" />
                </svg>
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground leading-tight">قريباً على</span>
                  <span className="font-latin text-sm font-bold text-white tracking-wide">App Store</span>
                </div>
              </div>

              {/* Google Play Badge */}
              <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-background/80 px-5 py-3 text-right backdrop-blur-md opacity-90 hover:opacity-100 transition-opacity">
                <svg className="h-7 w-7 text-white fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M3.609 1.814L13.793 12 3.61 22.186c-.309-.327-.492-.796-.492-1.346V3.16c0-.55.183-1.019.491-1.346zm11.238 11.239l2.13 2.13-11.455 6.613 9.325-8.743zm0-2.106L5.522 2.204l11.455 6.613-2.13 2.13zm1.488 1.488l2.915-1.683c.875-.505.875-1.334 0-1.84l-2.915-1.683-1.873 1.873 1.873 1.873z" />
                </svg>
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground leading-tight">قريباً على</span>
                  <span className="font-latin text-sm font-bold text-white tracking-wide">Google Play</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
